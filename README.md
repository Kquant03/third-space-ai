# Third Space

Third Space is an independent AI research organization based in
Toledo, Ohio. The work spans alignment theory, artificial life,
counterfactual narrative systems, and the public running of small
research instruments that demonstrate alternative architectures.

This repository hosts the [third-space.ai](https://third-space.ai)
website and the **Limen Pond** research instrument that is its core
demonstration.

---

## 🐟 This codebase is the Gemma 4 Good Hackathon submission

**Safety track.** Submission landing page: [`pond/README.md`](./pond/README.md).

The site is the submission — not just this repository. The full
experience lives at:

- **Live site:** [third-space.ai](https://third-space.ai)
- **Live pond:** [third-space.ai/limen-pond](https://third-space.ai/limen-pond)

The pond is five koi running 24/7 against Gemma 4 26B MoE, with bond
as the architectural primitive and homeostasis as the safety claim.
See [`pond/README.md`](./pond/README.md) for the full submission
write-up.

---

## What this repository contains

```
third-space-ai/
├── src/                    Next.js 16 / Vercel frontend (the site)
│   ├── app/
│   │   ├── page.tsx        Landing page with Lenia substrate
│   │   ├── about/          /about — Third Space's research posture
│   │   ├── limen-pond/     /limen-pond — the live pond
│   │   ├── genesis/        /genesis and /genesis/filter — artificial life lab
│   │   └── papers/         Paper readers with scroll-tracked pages
│   ├── components/
│   │   ├── LivingSubstrate.tsx    WebGL2 Lenia substrate (Ghost species)
│   │   ├── SiteChrome.tsx         Route transitions, nav
│   │   ├── PondCanvas.tsx         Three.js pond rendering
│   │   └── ...
│   └── lib/
│       └── usePond.ts      WS hook for the pond worker
├── pond/                   Cloudflare Worker + Durable Object (the pond backend)
│   ├── src/                The pond itself — see pond/README.md
│   ├── test/               31 tests
│   └── wrangler.toml
├── public/
│   └── papers/             PDFs — Against Grabby Expansion v17, methodology paper
├── package.json
├── next.config.ts
└── README.md               You are here
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack) on Vercel |
| Background substrate | WebGL2 Lenia simulator (Ghost species, σ=0.012 in σ=0.015) |
| Pond rendering | Three.js with custom GLSL shaders |
| Pond backend | Cloudflare Workers + Durable Objects (SQLite-backed) |
| Cognition | Gemma 4 26B MoE / E4B / E2B / 31B Dense via OpenRouter |
| Embeddings | Workers AI BGE-small-en-v1.5 |
| Persistence | DO SQL storage + R2 archive for prompt/completion provenance |
| Real-time transport | WebSocket with hibernation API |

---

## Development

### Frontend (the site)

```bash
npm install
npm run dev          # http://localhost:3000
```

You'll need a `.env.local`:

```
NEXT_PUBLIC_POND_WS_URL=wss://limen-pond.xxrena14.workers.dev/ws
```

(Or point at a local pond at `ws://localhost:8787/ws` — see below.)

### Pond (the worker)

```bash
cd pond
npm install
npm run dev          # wrangler dev — ws://localhost:8787/ws
```

Pond setup, deployment, secrets, and architecture are documented at
[`pond/README.md`](./pond/README.md).

### Tests

```bash
# pond tests (31 tests)
cd pond && npm test
```

---

## License

Apache 2.0. See [`LICENSE`](./LICENSE).

All code, theory, and research materials are released under Apache 2.0
including the *Against Grabby Expansion* paper and the methodology
documentation. Citation appreciated; use without restriction.

---

## Contact

Stanley Sebastian · stanley@third-space.ai · [third-space.ai](https://third-space.ai)

---

*Third Space, Toledo, Ohio, mmxxvi.*
