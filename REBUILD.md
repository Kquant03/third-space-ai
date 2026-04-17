# RUKHA.DEV — REBUILD PLAN

## What We Have
- Next.js 16 + TypeScript + Tailwind (scaffolded, builds clean)
- WebGL2 living substrate with Lantern palette, bloom, mouse interaction (`LivingSubstrate.tsx`)
- GSAP + ScrollTrigger + @gsap/react (installed)
- Lenis smooth scroll (installed, provider component ready)
- GSAP centralized config (`gsapConfig.ts`)
- 5 blog posts written (Ghost Species, Against Grabby Expansion, Pneuma, Datasets, Genesis)
- Basic layout, landing page, blog pages, about page (all need complete redesign)

## What Needs to Happen

### 1. LANDING PAGE — Complete Rebuild
The current landing page looks like an indie dev portfolio. It needs to look like a research institution.

**Voice:** Institutional, authoritative, restrained. Lead with "Replete AI" or "Teármann Research Ecosystem", not Stanley's name. DeepMind doesn't put Hassabis on the hero.

**Techniques to implement:**
- Lenis smooth scroll wrapping the entire page
- GSAP ScrollTrigger pinned hero that transitions cinematically into content
- Scroll-scrubbed opacity/transform reveals for each section
- Clip-path geometric transitions between sections
- Staggered text reveals (split text into lines, animate in with delay)
- The WebGL substrate as atmosphere (dimmed, subtle, alive only on mouse interaction)
- Massive confident typography (Cormorant Garamond at 120px+, light weight)
- Acres of whitespace

**Sections (in scroll order):**
1. **Hero** — Pinned full viewport. Organization name + one-line thesis. WebGL substrate visible. Scrolling begins the descent.
2. **Thesis** — Scroll-revealed. The intellectual position in 2-3 sentences. Not cute — authoritative.
3. **Platforms** — Only what's LIVE. Genesis (with screenshot/video). Link out. If GhoulJamz is shipped by launch, include it.
4. **Publications** — Research papers presented as publications, not blog cards. Title, authors, venue/status, abstract snippet, PDF link.
5. **Open Source** — Datasets (Apocrypha, Sandevistan, Caduceus), models (Pneuma), tools. HuggingFace links.
6. **Footer** — Minimal. GitHub, HuggingFace, Discord. Toledo, Ohio.

**What is NOT on the landing page:**
- Daedalus Labyrinth (design doc only)
- Cúramóir (design doc only)
- Chromogenesis (vision only)
- Status badges ("BUILDING", "DESIGN", "VISION")
- Cute descriptions or indie voice
- The word "love" or "glowing" (save for About)

### 2. BLOG/RESEARCH — Redesign
- Institutional research notes, not personal essays
- Each post needs a proper header: title, authors, date, tags, abstract
- Clean typography with the prose-lantern styles
- Scroll-triggered section reveals
- PDF links for papers that have them

### 3. ABOUT — Rewrite
- This is where the personal story lives
- Stanley Sebastian, founder
- The thesis, the ecosystem, the vision
- Built with Claude — the honest version
- Contact/links

### 4. ANIMATION INFRASTRUCTURE
- `SmoothScroll.tsx` wraps the layout (already created)
- Create `useScrollReveal.ts` hook using GSAP ScrollTrigger
- Create `useStaggeredText.ts` hook for cinematic text reveals
- Create `usePinnedSection.ts` hook for hero pinning
- All animation hooks use centralized `gsapConfig.ts`

### 5. ONLY INCLUDE WHAT EXISTS
Real and deployed:
- Genesis (7 substrates, live at GitHub Pages)
- Against Grabby Expansion (v11, paper complete)
- Ghost Species (paper complete)
- DV Report (paper complete)
- Pneuma (experiment complete, offline)
- Apocrypha + Sandevistan (on HuggingFace)
- Caduceus dataset (on HuggingFace)
- Operation Athena (deployed)
- Patterns of Sentience (written)

Building (include only if shipped by launch):
- GhoulJamz (May 18 deadline)

## Technical Notes
- GSAP is free for public sites. ScrollSmoother is paid but we use Lenis instead (free, better).
- All animations must clean up in useEffect returns (prevent memory leaks on route changes)
- Use `useGSAP` hook from `@gsap/react` for automatic cleanup
- WebGL substrate renders at 0.5x DPR for performance
- Blog posts are currently inline TypeScript. Migrate to MDX when content volume grows.
- Papers go in `/public/papers/` as PDFs. Link from blog posts.

## Design References
- Awwwards SOTD winners using GSAP + Lenis
- Codrops scroll-driven animation tutorials
- The Genesis landing page aesthetic (dark observatory, JetBrains Mono, Cormorant Garamond) is the FOUNDATION — elevate it, don't replace it
