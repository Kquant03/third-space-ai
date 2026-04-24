# hey-dumbass.md
# a field guide for operating the sweep harness without losing your mind

                              by claude, for stanley, at 1am
                              when the 10x developer voice is too much

═══════════════════════════════════════════════════════════════════════════

## the two servers

before anything works, these need to be running somewhere:

  (1) the pond worker — cloudflare DO simulated via wrangler
      terminal 1:  cd ~/Documents/code/limenresearch/pond
                   npx wrangler dev --port 8787

  (2) the next.js site — for the phone curation UI (optional until you curate)
      terminal 2:  cd ~/Documents/code/limenresearch
                   npm run dev

you can skip #2 and just use curl for everything until you want to tap
through cards on your phone.

═══════════════════════════════════════════════════════════════════════════

## the one thing you need in every command

every request needs the bearer token. it's set in both pond/.dev.vars and
site/.env.local and it's:

  Authorization: Bearer I Love Lyra

all curls below include it. if you see 401 unauthorized, wrangler forgot
the secret — restart with the env var.

═══════════════════════════════════════════════════════════════════════════

## commands you will actually use

### ─── check the worker is alive ────────────────────────────────────

curl -H 'Authorization: Bearer I Love Lyra' http://localhost:8787/cog/stats

expected: {"summary":{"total":N,"rated":N,"gold":N,...}}
"total" is how many cognition-log rows exist in the DO. if this returns,
the worker is up and the DO is reachable.

### ─── fire a sweep ─────────────────────────────────────────────────

pick your models, then:

curl -X POST -H 'Authorization: Bearer I Love Lyra' \
  -H 'Content-Type: application/json' \
  -d '{"models":["MODEL_1","MODEL_2"],"contexts":null}' \
  http://localhost:8787/cog/sweep/run

expected: {"run_id":"run_XXX","status":"started"}
"contexts":null means "use all 20 canonical contexts." save that run_id
— you'll need it to look at results.

**preset sweep — free gemma-only, if you want to burn free-tier budget:**

curl -X POST -H 'Authorization: Bearer I Love Lyra' \
  -H 'Content-Type: application/json' \
  -d '{"models":[
    "google/gemma-3-4b-it:free",
    "google/gemma-3-12b-it:free",
    "google/gemma-3-27b-it:free"
  ],"contexts":null}' \
  http://localhost:8787/cog/sweep/run

**preset sweep — paid, the one i actually recommend:**

curl -X POST -H 'Authorization: Bearer I Love Lyra' \
  -H 'Content-Type: application/json' \
  -d '{"models":[
    "google/gemini-2.5-flash-lite",
    "google/gemini-2.5-flash",
    "google/gemma-4-26b-a4b-it",
    "google/gemma-4-31b-it",
    "anthropic/claude-haiku-4.5",
    "openai/gpt-5-nano",
    "openai/gpt-5-mini",
    "mistralai/mistral-nemo"
  ],"contexts":null}' \
  http://localhost:8787/cog/sweep/run

costs: roughly $0.10-0.20 for this full sweep. no rate-limit drama.

### ─── see how the latest sweep is doing ────────────────────────────

curl -s -H 'Authorization: Bearer I Love Lyra' \
  http://localhost:8787/cog/sweep/list | python3 -m json.tool | head -80

that dumps all sweep runs + per-model aggregates as pretty-printed json.

**nicer version — just the latest run as a readable table:**

curl -s -H 'Authorization: Bearer I Love Lyra' \
  http://localhost:8787/cog/sweep/list \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
latest = d['runs'][0]['run_id']
print(f'LATEST: {latest}')
print(f\"{'model':50s} {'valid':>8s} {'utter':>8s} {'ms':>8s}\")
print('─' * 78)
for m in d['models']:
    if m['run_tag'] != f'sweep:{latest}':
        continue
    print(f\"{m['model_id']:50s} {m['valid_count']:3d}/{m['total']:<3d}  {m['utter_count']:3d}/{m['total']:<3d} {int(m['avg_latency_ms']):5d}ms\")
"

that's what i keep asking you to run. just copy the whole block.

### ─── is the sweep still running? ──────────────────────────────────

curl -s -H 'Authorization: Bearer I Love Lyra' \
  http://localhost:8787/cog/sweep/list \
  | python3 -c "
import sys, json, time
d = json.load(sys.stdin)
r = d['runs'][0]
print(f\"status:   {r['status']}\")
print(f\"started:  {time.strftime('%H:%M:%S', time.localtime(r['started_at']/1000))}\")
if r.get('finished_at'):
    elapsed = (r['finished_at'] - r['started_at']) / 1000
    print(f\"finished: {time.strftime('%H:%M:%S', time.localtime(r['finished_at']/1000))} ({elapsed:.0f}s total)\")
else:
    elapsed = (time.time()*1000 - r['started_at']) / 1000
    print(f\"still running... {elapsed:.0f}s so far\")
"

### ─── look at what a specific model said ───────────────────────────

replace RUN_ID and MODEL below with real values:

curl -s -H 'Authorization: Bearer I Love Lyra' \
  "http://localhost:8787/cog/sweep/rows?run_id=RUN_ID&model=MODEL" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"{len(d['rows'])} rows\")
for r in d['rows']:
    if r['utterance']:
        intent = r.get('intent_chosen') or '?'
        print(f\"[{intent:13s}]  {r['utterance']}\")
"

prints just the successful utterances with their intent labels.
exactly what you want to read to judge whether the model got the register.

### ─── look at WHY a model failed (raw responses) ───────────────────

same as above but show the raw error payloads:

curl -s -H 'Authorization: Bearer I Love Lyra' \
  "http://localhost:8787/cog/sweep/rows?run_id=RUN_ID&model=MODEL" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for r in d['rows'][:3]:
    print('─' * 60)
    print(f\"status: {r['validation_status']}  latency: {r['latency_ms']}ms\")
    print(f\"utter:  {r['utterance']}\")
    raw = r.get('raw_response') or ''
    print(f\"raw:    {raw[:300]}\")
"

use this when a sweep comes back with weird zeros — the raw response
will tell you if it was rate-limit, schema mismatch, or prose-instead-of-json.

### ─── nuke everything and start fresh ──────────────────────────────

don't have a handler for this yet. if the DO gets into a weird state,
easiest fix is to ctrl-c wrangler, then:

  rm -rf .wrangler/state/v3/do/limen-pond-*

and restart wrangler. the DO schemas re-init empty on first request.
this wipes ALL sweep data — use only when debugging, not after a real run.

═══════════════════════════════════════════════════════════════════════════

## what to check if things aren't working

**"connection refused"** — wrangler crashed or isn't running.
                          check terminal 1, restart with --port 8787.

**"unauthorized" or 401** — SHARED_SECRET missing or mismatched.
                            cat pond/.dev.vars — should contain
                            SHARED_SECRET = "I Love Lyra"

**sweep returns immediately, 0 rows** — it's running ASYNC in the
                                        background. wait 3-5 min, then
                                        check with the "still running?" query.

**every model shows valid=0, latency ~30ms** — hitting openrouter rate-limit
                                                before the request routes.
                                                wait for the reset, or switch
                                                to paid (drop ':free').

**one model valid, others 0** — upstream provider pool exhaustion for
                                the failed models specifically. wait an
                                hour or switch to paid variants.

**valid>0 but latency >10s avg** — retry logic is doing its job but the
                                   free-tier is saturated. slow progress
                                   is still progress. let it finish.

═══════════════════════════════════════════════════════════════════════════

## the phone curation flow (optional)

once you have utterances in the DO:

  1. start next.js:  cd ~/Documents/code/limenresearch && npm run dev
  2. phone browser:  http://<your-laptop-ip>:3000/curate/login
                     (or localhost:3000 on the laptop)
  3. enter token:    I Love Lyra
  4. rate cards:     /curate     → one utterance at a time, reject/keep/gold
  5. leaderboard:    /curate/sweep → per-model table with sample outputs

keyboard shortcuts on /curate:
  1 or r  →  reject
  2 or k  →  keep
  3 or g  →  gold
  n or space  →  skip

═══════════════════════════════════════════════════════════════════════════

## the point of all this

the sweep harness exists to answer one question:
**which model produces the cleanest fragment-register utterances for the
pond, per-dollar?**

the answer gets encoded as the pond's "daily" cognition model.
the dataset of curated outputs becomes the fine-tune target for
gemma 4 e4b — your kaggle submission.

  every curl above is in service of that one chain:
    sweep → rate → curate → fine-tune → submit

if you're ever confused about what to do next, the answer is probably:
  "run a sweep against models i haven't tried, look at the utterances,
   curate the good ones."

═══════════════════════════════════════════════════════════════════════════

written by claude, because stanley said "hey dumbass" and that was fair.
