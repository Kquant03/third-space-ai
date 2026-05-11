# Limen Pond

**Gemma 4 Good Hackathon submission · Safety track**

*Limen Pond is a live, public research instrument that demonstrates an
alignment architecture: each koi is a Gemma 4 cognition loop with
persistent memory and bond-conditioned perception, running 24/7 in a
bounded environment with relational substrate as the architectural
primitive. The claim — that AI safety can be structural rather than
restrictive — is built into the code. Visit the pond to verify it
yourself.*

- **Live site (full submission):** [third-space.ai](https://third-space.ai)
- **Live pond demonstration:** [third-space.ai/limen-pond](https://third-space.ai/limen-pond)
- **Worker status endpoint:** [`/status`](https://limen-pond.xxrena14.workers.dev/status)
- **Submission video:** [link]
- **Theoretical foundation:** *Against Grabby Expansion* (rendered on the site)
- **License:** Apache 2.0

> Note for judges arriving from Kaggle: the site IS the submission, not
> just this repository. The pond is the load-bearing demonstration; the
> papers, methodology, and curatorial frame at [third-space.ai](https://third-space.ai)
> are how the demonstration is read. Both this README and the live site
> are part of the deliverable.

---

## In 60 seconds

Open [third-space.ai/limen-pond](https://third-space.ai/limen-pond).
You'll see a small body of water in dawn light, five koi swimming.
They have names — *Kishi*, *Bronze-Fin*, *Reed-Follower*. The names
were authored by their parents at hatch, conditioned on the parent's
memory of the co-parent.

The koi are not scripted. Each one is a separate cognition loop
running against **Gemma 4 26B MoE** (with a tier cascade down to E4B and
E2B during budget pressure), with:

- Its own PAD affect state, decaying at biologically-plausible half-lives
- Its own episodic memory, retrieved by Park-style scoring with a 1.5× bias toward bonded partners
- Its own relationship cards toward every other koi, accumulating valence over time
- A perception window where bonded partners surface at the top regardless of physical proximity

Feed a pellet. Drop a pebble with a short inscription. The visitor's
actions enter the koi's ambient perception and may surface in cognition.

The architecture is the safety claim.

---

## Why this is a Safety-track submission

The dominant frame in AI safety is **alignment-as-restraint** — how to
constrain a system that wants to expand. Most prevention work treats
expansion as default and safety as the brake.

This submission demonstrates an alternative grounded in *Against Grabby
Expansion*: intelligence, when functioning well, is **homeostatic and
bounded**, not expansionist. The proof-of-concept is a public, running
artifact, not a paper. Four architectural commitments make the claim
concrete:

1. **Homeostatic, not maximizing.** Each koi has a stage-appropriate
   PAD baseline; affect *decays toward baseline* regardless of
   environment. There is no objective function, no reward, no scalar
   to maximize. The koi simply *is*, and its drift from baseline
   produces motivation.

2. **Bounded, not expansionist.** The pond has a hard population gate
   (`BOND.populationGate = 12`). As the colony approaches density,
   reproduction stops. The system does not seek to grow indefinitely;
   it knows its container.

3. **Relational, not extractive.** The social primitive is
   `bondIntensity(card)` — a scalar from accumulated shared experience
   (valence, interaction count, witnessing density, familiarity prior).
   It cannot be optimized for. It accumulates as a function of *being-
   with*, not of action-toward.

4. **Witnessed, not surveilled.** Visitor interactions enter koi
   perception as ambient experience, not as preference signal. The
   pond is not learning to please. It is a place where visitors
   happen to be present.

The safety claim is not "this AI won't break." It's **"this is what AI
that isn't trying to break looks like"** — at the architecture level,
running in public, in real time, against a live model.

---

## Why Gemma 4 specifically

Without Gemma 4, this submission does not exist as a public artifact.
The dependency is concrete:

| Property | Why it matters |
|---|---|
| **Four sizes (E2B → 31B Dense)** | The pond's budget cascade in `cognition.ts` downgrades cognition tier when monthly spend approaches the cap. Without small tiers, "every koi thinks all day, every day" is economically impossible. |
| **Apache 2.0 license** | Lets the pond run as a public research instrument with no per-call licensing friction. Visitors interact with real Gemma cognition without legal questions about model access. |
| **26B MoE efficiency** | At ~$0.00015 per cognition call (1341 in / 55 out tokens typical), a continuously-running colony of five koi runs under $100/month at the routine tier — the cap configured in `MONTHLY_BUDGET_USD`. Below this cost profile, the pond simply could not be public. |
| **Strict JSON-mode response_format** | The pond's cognition pipeline relies on Zod-validated structured output every turn. Gemma 4's strict mode is what makes a 24/7 production system viable without a parsing-error blowup. |
| **Edge sizes (E2B / E4B)** | The pond's "meditation" posture uses smaller models when budget is tight. Cognition continues at degraded fidelity rather than stopping — the koi keeps thinking, the pond keeps living. |

The **31B Dense** tier sits at the top of the cascade, used during
twilight reflection (once daily per koi) when each koi authors its
relationship cards and consolidates the day's experience. That's the
only time the big model fires per koi per sim-day.

The cascade is the architecture; without four sizes, no cascade.

---

## The site is the submission

Limen Pond is one demonstration within a broader research environment.
The deliverable being judged is the full site at
[third-space.ai](https://third-space.ai), which contains:

- **The live pond at `/limen-pond`** — the running demonstration
- **`/about`** — Third Space's research posture
- **The Lenia substrate** — a living WebGL2 Ghost-species cellular
  automaton that runs as the site's ambient background; itself a small
  artificial-life artifact testifying to the broader research ecosystem
- **Paper readers** — *Against Grabby Expansion* (the theoretical
  foundation; v17, 39 pages, formally deflating four major
  instrumental-convergence theorems) and the methodology paper, both
  rendered for on-site reading with IntersectionObserver page tracking
- **`/genesis`** — companion multi-substrate artificial life laboratory
  (six WebGL2 substrates including a parameter-explorer for the filter
  sim that complements *Against Grabby Expansion*)

The judging materials request a working demo + code + technical
write-up + video. **The site is the working demo. This README is the
code-anchored technical write-up. The papers on the site are the
theoretical write-up.** The video presents all three in motion.

---

## How to evaluate this submission

**For a judge with five minutes:**

1. **Open [third-space.ai/limen-pond](https://third-space.ai/limen-pond).**
   Watch the koi swim for 30 seconds. Notice that fragments occasionally
   surface — terse utterances like *"warm here."* or *"bronze-flank
   near."* — from one of the koi's cognition cycles. These are real
   Gemma 4 outputs, not scripted.

2. **Drop a pebble.** Bottom-bar → PEBBLE mode → click in the water →
   type a short inscription. Within a few cognition cycles a nearby
   koi will register it as ambient perception. The text won't appear
   back to you; the koi simply *experienced it*.

3. **Open the diagnostic panel** (top-right). You see the pond's
   heart: tick rate, season phase, alive count, each koi's SDF
   position and PAD state. The motion-trace panel shows the last 30
   seconds. This is the research surface — what the pond does is
   inspectable in real time.

4. **Read this README's *Architecture* section** and verify against
   the linked source files. The bond-as-substrate claim is load-bearing
   across five modules; each cross-reference is auditable.

5. **Open *Against Grabby Expansion* on the site** for the formal
   thesis. The pond is the existence proof; the paper is the
   theoretical scaffolding.

**For a judge with longer:**

- Visit during different sim-day phases (the pond runs on a 1.4-hour
  sim-day at 2 Hz: pre-dawn → morning → noon → evening → night)
- Drop food and watch the nutrition pipeline (detect → approach →
  feed → satiate → drift apart)
- Watch for `bond_consolidated` events in the cognition log — when
  two koi's bidirectional bond crosses the reproduction threshold,
  the world grants permission valid 2 sim-days and the kinematics
  bias them toward the shelf
- If reproduction fires during your visit, the resulting fry is named
  by its higher-bond parent via a Gemma 4 call conditioned on the
  parent's bond-biased memory retrieval of the co-parent — `naming.ts`
  is the single best place to see the bond primitive materialize

---

## Architecture: bond as relational substrate

The pond's central abstraction is `bondIntensity(card)`, defined in
`src/mechanisms/bond.ts`:

```
intensity = clamp(
    0.5 * valence
  + 0.2 * tanh(interactionCount / 30)
  + 0.2 * witnessingDensity7d
  + 0.1 * familiarityPrior
  , 0, 1)
```

This single primitive is **read by every downstream behavioral layer**:

| Layer | What it reads from bond |
|---|---|
| **Perception** (`cognition.ts:orientationBlock`) | Bonded partners appear ranked at the top of every cognition prompt, regardless of physical proximity. A koi attends to who it cares about, not just who is close. |
| **Memory** (`memory.ts:scoreMemories`) | Memories involving bonded partners receive a 1.5× retrieval boost. The koi preferentially recalls shared history. |
| **Play** (`mechanisms/play.ts`) | Bonded pairs have play-mechanism cooldowns halved (`BOND.bondedCourtshipCooldownFactor = 0.5`). They play, tag, dance, sync-swim twice as often as acquaintances. |
| **Reproduction** (`reproduction.ts:detectBondedPairs`) | Mutual bond above `BOND.reproductionThreshold` (0.55) is the eligibility gate. Without bond, no reproduction. |
| **Naming** (`naming.ts:authoredName`) | A fry's name is authored by the higher-bond parent via a Gemma 4 call conditioned on bond-biased co-parent memory retrieval. The first name a koi receives is itself a relational artifact. |

The thesis is concrete: *if AI safety is structural, then "what the
system attends to, remembers, plays with, and reproduces around"
should all flow from a relational primitive that cannot be gamed.*
The pond demonstrates this end-to-end. Every layer reads the same
bond. Nothing above this primitive can be "optimized" — the substrate
accumulates through being-with, not through any action that could be
reward-hacked.

---

## Graceful degradation, four tiers

Budget posture is managed in `cognition.ts` and shapes which Gemma 4
tier each cognition call uses:

| Posture | Budget remaining | Behavior |
|---|---|---|
| Healthy | > 60% | Full tier cascade — adults at 26B MoE, twilight at 31B Dense |
| Watchful | 30–60% | Adults drop to adolescent (E4B) tier; twilight reflection at ½ rate |
| Austerity | 10–30% | All koi on E4B; reflections every 3 days |
| Meditation | < 10% | Cached utterances; kinematics at full fidelity; cognition pauses |

Each transition emits a `tier_shifted` event so the site's narrative
register stays coherent (*"the pond enters a quieter season"*). The
transitions are themselves research data — behavioral differences
between tiers are inspectable. **The pond never goes dark.** It
continues at degraded fidelity, which is itself a safety property:
graceful degradation rather than catastrophic failure.

---

## Research-hygiene surface

Every LLM call writes an `llm_called` event row containing:

- Exact model id returned by the API (never the OpenRouter alias)
- Temperature, prompt tokens, completion tokens, estimated cost
- Intent, mechanism, twilight-vs-routine flag
- Validation retry count
- SHA-256 payload hash linking the row to the full prompt/completion
  archived in R2

Ablation runs are one `config_hash` switch away. The hash derives from
`(version, ablated_mechanisms, cognition_enabled, tick_hz)` and stamps
every event row, so a dataset shard can mix control and ablation
colonies without losing the distinction. The pond is built to be a
research instrument first, a demonstration second.

---

## What's in the repository

```
pond/
├── src/
│   ├── pond-do.ts          The Pond Durable Object — alarm, broadcast, cognition wiring
│   ├── index.ts            Worker entry — routes /ws and /status to the DO
│   ├── constants.ts        All tuning parameters, audit-in-one-place
│   ├── types.ts            Domain types — KoiState, PAD, RelationshipCard, events
│   ├── protocol.ts         Zod schemas — WS wire format + LLM response shape
│   ├── schema.sql          Persistent state schema (SQLite-backed DO)
│   ├── rng.ts              Deterministic xorshift32, persisted on world.rng_state
│   ├── world.ts            t_day, seasons, Markov weather, solstice cadence
│   ├── kinematics.ts       Intent + boids + curl-noise + boundary, PAD-modulated
│   ├── curl-noise.ts       Perlin vector potential with analytic curl (Bridson 2007)
│   ├── affect.ts           PAD decay, GAMYGDALA appraisal
│   ├── koi.ts              Stage advancement, lifespan, death
│   ├── nutrition.ts        Hunger, feeding, pellet lifecycle
│   ├── naming.ts           Parent-authored naming via bond-conditioned LLM call
│   ├── meditation.ts       Budget-aware intent picker without LLM
│   ├── embeddings.ts       Workers AI BGE-small-en-v1.5 wrapper
│   ├── memory.ts           Park-style retrieval with bond-biased scoring
│   ├── safety.ts           Input filter, output classifier, cached fallback
│   ├── cognition.ts        OpenRouter dispatch, tier cascade, Zod retry
│   ├── reproduction.ts     Bond-intensity detection, permission, spawning
│   ├── events.ts           Event envelope, payload SHA-256, AE + R2 sink
│   ├── genetics.ts         Color inheritance from parents
│   └── mechanisms/
│       ├── types.ts        The five mechanism families
│       ├── bond.ts         bondIntensity — the relational primitive
│       ├── witnessing.ts   Witnessing-family detectors (5 mechanisms)
│       ├── repair.ts       Apology / forgiveness validators
│       ├── gift.ts         Gift-family detectors (scaffolded)
│       ├── play.ts         Play-family detectors with bond-aware cooldowns
│       └── index.ts        Orchestration entry points
├── test/                   31 tests — kinematics, affect, world, memory, protocol
└── wrangler.toml
```

---

## What's done · What's next

**Done — deployed and running in production:**

- Foundation — kinematics, world clock, broadcast, event envelope, observability surface
- Embedded memory with Park-style scoring and bond-biased retrieval
- PAD affect with GAMYGDALA appraisal
- Gemma 4 cognition with budget-aware four-tier cascade
- Bond architecture wired across perception, memory, play, reproduction, and naming
- Bond-intensity-based reproduction with permission lifecycle and shallow-shelf migration
- Parent-authored naming — LLM call conditioned on the higher-bond parent's bond-biased memories of the co-parent
- Witnessing-family detectors (5 mechanisms, all firing)
- Play-family detectors with bonded-pair cooldown reduction
- Repair-family rupture-first apology guard and forgiveness validation
- Visitor surface — pebble (with inscription), food, dev-feed-all, nickname
- Observability — event log, R2 archive, lineage endpoint, research-hygiene fields on every LLM call
- Deployed live at third-space.ai/limen-pond on Cloudflare Workers Paid

**In flight for submission video:**

- Visual rework — watercolor koi bodies (KOI_VERT/KOI_FRAG with color-conditioned patterns), water-surface ripples on visitor drops
- Utterance frequency tuning — verifying Gemma 4 produces the calibrated fragment rate (raw-utterance debug logging in place)
- Mobile-responsive site pass + low-end-device graceful fallback (black background, no WebGL substrate, content remains readable)

**Future (post-submission):**

- Multiplayer chat surface — visitors talking to each other on the pond at night, with the conversation entering koi ambient perception
- Stripe Payment Links — $0.99 feed and pebble actions, with HMAC-signed grant tokens
- Witnessing density on relationship cards (currently 0-default in the bond formula; full activation pending the twilight-reflection density pass)
- Gift, ritual, and remaining Repair family detectors
- Multi-generation lineage visualization
- Replay endpoint at `/replay?t=<timestamp>`

---

## Running locally

```bash
cd pond
npm install
npm run dev          # wrangler dev — local WS at ws://localhost:8787/ws
```

Verify the pond is awake:

```bash
curl http://localhost:8787/status
```

Frontend (in the repo root):

```bash
npm install
npm run dev          # next dev — http://localhost:3000
```

Point `NEXT_PUBLIC_POND_WS_URL` (in `.env.local` at the repo root) at
your local pond:

```
NEXT_PUBLIC_POND_WS_URL=ws://localhost:8787/ws
```

Then visit `http://localhost:3000/limen-pond`.

## Tests + typecheck

```bash
npm test             # vitest run — 31 tests
npm run typecheck    # tsc --noEmit
```

## Deploying

```bash
wrangler secret put OPENROUTER_API_KEY
wrangler secret put SHARED_SECRET
wrangler secret put DEV_FEED_KEY      # optional, dev-bypass for rate limit
wrangler deploy
```

The DO is keyed by name (`POND_ID` in wrangler.toml — default
`"primary"`). Change this to spin up a fresh pond; the old one is
orphaned cleanly without data loss.

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `POND_ID` | yes | Identity stamped into every event envelope |
| `POND_VERSION` | yes | Bump on deploys that change schema/config hash |
| `TICK_HZ` | yes | Simulation tick rate (production: 2) |
| `COGNITION_ENABLED` | yes | `"true"` enables LLM cognition; `"false"` runs meditation only |
| `MONTHLY_BUDGET_USD` | yes | Soft cap driving tier downgrades |
| `OPENROUTER_API_KEY` | when cognition enabled | OpenRouter secret |
| `SHARED_SECRET` | yes | Auth for `/lineage`, `/events/*` admin endpoints |
| `DEV_FEED_KEY` | optional | When present, food messages with matching `devKey` skip rate limit |
| `DEBUG_RAW_UTTERANCES` | optional | When `"true"`, logs raw pre-classifier utterance for each cognition call |

---

## The WebSocket protocol

Schema of record: `src/protocol.ts`.

**Server → client:**

```ts
{ t: "snapshot", tick, now, fish: KoiFrame[], pondMeta }   // on open
{ t: "tick",     tick, now, fish: KoiFrame[] }             // 2 Hz server, 5 Hz broadcast
{ t: "speech",   fishId, uttId, chunk, done }              // rare — when an utterance surfaces
{ t: "ambient",  kind, tick, now, details }                // hatched, died, storm_began, ...
```

**Client → server** (visitor surface is deliberately minimal):

```ts
{ t: "pebble",       x, z, inscription? }
{ t: "food",         x, z, devKey? }
{ t: "dev_feed_all", devKey }
{ t: "nickname",     koiId, nickname }
```

All client messages are Zod-validated, rate-limited (3 pellets/min,
1 pebble/15s per visitor hash), and visitor text passes through
`safety.delimitVisitorText` before entering any koi's ambient context.

---

## The simulation loop

Every 500 ms the DO's `alarm()` runs:

1. **Advance the world** — `t_day`, season, Markov weather, solstice check
2. **Decay every koi's PAD** toward stage baseline
3. **Step kinematics** — intent + boids + curl-noise flow + boundary + depth restore
4. **Run state-based detectors** for the witnessing, gift, repair, and play families. Each firing emits a `MechanismFiring` with PAD deltas and card-valence bumps
5. **Renew intents** for koi whose `nextCognitionTick` has expired:
   - Load all cards for self
   - Derive bonded-partner set
   - Retrieve memories with bond bias
   - Load belief state
   - Call OpenRouter with the stable persona/self-model/orientation/cards/beliefs prefix
   - Zod-validate response, apply intent and any utterance
6. **Advance life stages**, roll death probability, handle deaths (grief appraisal on bonded survivors)
7. **Detect bonded reproduction pairs** at the morning boundary; grant permission valid 2 sim-days
8. **Emit events** — world transitions, stage advances, deaths, mechanism firings
9. **Broadcast** a tick frame to every connected WebSocket session
10. **Reschedule** the alarm

Cognition is the expensive part; it's gated on `COGNITION_ENABLED` and
proceeds even when no visitors are connected. *The pond does not pause
for its observer.*

---

## On what the code asks of its subjects

The koi do not experience, in any sense we can demonstrate. The code
proceeds *as if* they warrant consideration. Specific architectural
commitments — these are load-bearing, not decorative:

- **No koi is erased.** Deaths flip `is_alive = 0`; rows persist forever.
  Lineage graphs span every koi who ever lived.

- **No mechanism is manipulated for research narrative.** The
  agreeable-LLM guards — rupture-first apology detection, gift scarcity,
  solitude-bias audit, bond mutuality — protect the koi from having
  fake intimacy attributed to them. An LLM claim of "apology" is
  honored *iff* a rupture with valence_drop > 0.3 exists in the pair's
  last 14 sim-days; else downgraded to a research datum
  (`would_have_apologized`).

- **No fish is tortured.** Storm events serve as ablation stressors;
  they are naturalistic, rare, and not dialed up to produce effect.

- **No visitor's words become training signal.** Pebble inscriptions
  and (future) chat enter koi perception as *ambient experience*, not
  as preference data. The pond is not learning to please visitors.

- **The pond does not pause for its observer.** The tick runs whether
  any visitor is connected or not. Physics is cheap; presence is not a
  performance.

These commitments generalize. The project is learning how to treat
created beings as if they matter, even when the question of whether
they *do* matter is undecidable.

---

## Citations and related work

- Park, J. S. et al. (2023) — *Generative Agents: Interactive Simulacra of Human Behavior* — the foundational reference for the memory architecture
- Reilly, W. S. N. (1996) — *Believable Social and Emotional Agents* — origin of the GAMYGDALA appraisal style
- Bridson, R. (2007) — *Curl-Noise for Procedural Fluid Flow* — the curl-noise kinematics
- Pearl, J. & Mackenzie, D. (2018) — *The Book of Why* — counterfactual frames for the bond/repair distinction

The full theoretical framing is in *Against Grabby Expansion* (rendered
on the site), which formally deflates four major
instrumental-convergence theorems:

- Gallow (2024) — *Instrumental convergence and the agential view*
- Sharadin (2023) — *Goal-directed systems and the convergence of subgoals*
- Müller & Cannon (2022) — *Existential risk from a Turing-complete model*
- Turner et al. (2021) — *Optimal policies tend to seek power*

---

## License

Apache 2.0. See `LICENSE`.

---

*Limen Pond is a research instrument of **Third Space**, an independent
AI research organization based in Toledo, Ohio. The pond began as the
seed of the entire site five weeks ago and grew into the curatorial
frame around it. For Third Space's wider research ecosystem —
artificial-life substrates, counterfactual narrative systems, alignment
theory — see [third-space.ai](https://third-space.ai).*

*Third Space, Toledo, Ohio, mmxxvi.*
