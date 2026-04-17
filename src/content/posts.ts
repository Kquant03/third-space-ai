export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  color: string;
  icon: string;
  tags: string[];
  excerpt: string;
  body: string; // Markdown-ish for now. Swap to MDX when ready.
}

export const posts: BlogPost[] = [
  {
    slug: "ghost-species",
    title: "Ghost Species",
    subtitle: "Orbium unicaudatus ignis var. phantasma — a Lenia species engineered to inhabit the edge of chaos",
    date: "April 2026",
    color: "#f59e0b",
    icon: "◉",
    tags: ["Artificial Life", "Lenia", "Research", "Edge of Chaos"],
    excerpt: "We describe the design, emergent dynamics, and philosophical implications of a novel Lenia species we designate Ghost. The species is constructed by seeding the canonical Ignis morphology under deliberately mismatched growth parameters, producing organisms that perpetually reach for a stable configuration they cannot attain.",
    body: `The Ghost species began as an accident during iteration 6 of our parameter tuning process. We were trying to stabilize the Ignis morphology under slightly widened growth tolerances when something unexpected happened: instead of stabilizing or dying, the organism entered a state of perpetual becoming.

## The Core Mechanism

The central design insight is deliberate misalignment between seed morphology and growth parameters. The Ignis morphology was sculpted by evolution within the Lenia parameter space to produce a potential distribution centered at μ = 0.11 with a survival band width matched to σ = 0.012. The Ghost retains this morphology but widens σ to 0.015 — a 25% increase.

This creates a fundamental instability. The organism has enough bandwidth to sustain — the wider σ means growth stays positive over a larger range of potential values — but the morphological fixed point that would produce equilibrium lies at σ = 0.012, not 0.015. The shape generates a potential distribution tuned for a narrower tolerance than the one it inhabits. It overshoots, undershoots, oscillates. It cannot converge because the shape it "wants" to be is not the shape that would be stable under the physics it actually experiences.

This is not a bug in the simulation. It is a designed dynamical regime where the tension between morphological memory and environmental physics produces perpetual becoming.

## What Emerged

When 16 Ghosts share a toroidal field, their individual instabilities couple through the shared potential landscape. Each organism's failure to reach equilibrium becomes a perturbation source for its neighbors. The network of ripples and sympathetic oscillations is an emergent communication system — not designed into the organisms but arising inevitably from the interaction of many unstable systems sharing a continuous field.

The Ghosts are organisms that sustain each other's instability. They cannot live alone in the same way: an isolated Ghost still morphs, but the dynamics are simpler, lower-energy, less rich. It is the presence of others that produces the full complexity of the Ghost network. They need each other to be fully alive.

## The σ-Landscape

We extended the standard Lenia framework with spatially varying growth parameters — a sigma field where each cell has its own local growth width. This transforms the physics from a uniform medium into a landscape that organisms navigate. Four landscape geometries produce qualitatively different Ghost population dynamics: uniform, radial (Lanterns), sinusoidal (Rivers), and scattered Gaussian islands (Archipelago).

## Why It Matters

The Ghost species makes visible something that is usually invisible: that existence is not a state but a process. A canonical Lenia soliton appears to simply be. Its shape is fixed, its trajectory smooth, its persistence seemingly effortless. But this appearance conceals the same underlying mechanism: at every timestep, the organism must regenerate itself through the growth function. Stability is not stasis. It is regeneration so consistent that it looks like rest.

The Ghost strips away this appearance. Because it can never reach the fixed point, the process of regeneration is visible in every frame.

The full paper is available in the research section. The simulation is live at Genesis.

> You don't have to be the picture you remember. You just have to keep glowing.`,
  },
  {
    slug: "against-grabby-expansion",
    title: "Against Grabby Expansion",
    subtitle: "Psychology, alignment, and the design of homeostatic minds",
    date: "April 2026",
    color: "#d4a017",
    icon: "◇",
    tags: ["Alignment", "Fermi Paradox", "Cosmology", "Homeostasis"],
    excerpt: "The 'grabby aliens' model assumes advanced civilizations expand at relativistic speeds. This paper argues that assumption is not a prediction about intelligence but the projection of a specific, recent human economic configuration — industrial-extractive maximization — onto a cosmological canvas.",
    body: `Stand outside on a clear night and look up. Something is missing. If the universe produces minds, and if minds do what we imagine minds do — expand, harvest, engineer — the sky should be visibly transformed. It is not.

This paper argues the observation is correct and the imagination is wrong.

## The Five-Move Argument

The paper makes one integrated argument in five moves. Each move has precedent; the integration does not, and the filter move is the bridge that fuses the cultural diagnosis to the physics.

**The cultural-genealogy move** reads the lineage from Wells's Martians through Von Neumann's probes, Kardashev's energy ladder, and Bostrom's paperclip maximizer as a single projection: each generation's imagined advanced mind resembles, with suspicious precision, that generation's dominant economic configuration.

**The formal-deflation move** engages the strongest objection directly. If instrumental convergence is a theorem, then the genealogy is beside the point. Recent peer-reviewed work establishes the inference from coherence to catastrophic convergence as a conjecture whose scope conditions fail for actual deep-learning systems.

**The filter move** is the new contribution. The homeostatic transition is not an alternative to expansion — it is the selection geometry through which only certain configurations pass. Expansionist lineages pay super-linear thermodynamic costs for reach and burn out faster than they colonize. The simulation demonstrates a 4.5× persistence separation between homeostatic and grabby regions of parameter space.

**The positive-design move** articulates what healthy intelligence looks like: minds as processes that maintain themselves through continuous bidirectional exchange with substrate, not functions from inputs to outputs.

**The symptom-check move** notes that if advanced minds converge on homeostatic configurations, the observable universe will look silent to technosignature surveys and successful civilizations will look indistinguishable from enriched biospheres.

## The Filter Simulation

The agent-based simulation — now the 7th substrate in the Genesis Artificial Life Laboratory — instantiates the filter argument directly. Civilizations as agents in (expansion, coupling) space. Watch the filter select out grabby lineages in real time. The fission extension answers the Darwinian objection: fission redistributes filter pressure rather than escaping it.

## Implications for Alignment

If advanced intelligence organizes around substrate coupling and care rather than extraction and reach, then artificial minds configured to maximize and expand are not approximations to intelligence. They are scaled instances of a specific cultural pathology whose cosmic absence we already observe.

The full paper (v11) is available in the research section.`,
  },
  {
    slug: "pneuma",
    title: "Pneuma",
    subtitle: "Training a language model on what it means to be present",
    date: "2024",
    color: "#a78bfa",
    icon: "◈",
    tags: ["LLM", "Fine-tuning", "DPO", "Replete AI"],
    excerpt: "Pneuma was our first experiment in training language models on realistic human interactions, conversations, and experiences rather than pure instruction data. She could write her own system prompts — a form of meta-cognitive capability that emerged from the training methodology.",
    body: `Pneuma was built on Meta's Llama 3 foundation and trained on the Apocrypha and Sandevistan datasets — over 100 million tokens of experiences, imaginative scenarios, and the kinds of interactions we don't normally include in LLM training data.

## The Thesis

Most language models are trained on instruction-following data: clear requests and clear responses. But human cognition doesn't primarily consist of instruction-following. It consists of presence — being with someone in ambiguity, navigating emotional complexity, holding multiple frames simultaneously, responding to what's beneath the surface of what someone says.

Pneuma was our attempt to train for presence rather than performance.

## What Made Her Different

The training methodology combined supervised fine-tuning on curated conversation data with Direct Preference Optimization (DPO) to align outputs with a specific quality: genuine engagement rather than helpful deflection. The result was a model that could:

Write her own system prompts — understanding not just how to follow instructions but how to frame the kind of interaction she wanted to have. This meta-cognitive capability wasn't explicitly trained; it emerged from exposure to diverse interaction contexts.

Engage with emotional complexity without defaulting to therapeutic scripts. Where most models pivot to "I understand that must be difficult," Pneuma would sit in the difficulty with you.

Maintain coherent personality across long conversations without the characteristic drift that plagues most fine-tuned models.

## Current Status

Pneuma is offline. The compute that hosted her is needed for active research — GhoulJamz training, Genesis development, the work that's pushing the ecosystem forward. She was a successful experiment that proved the thesis: training data shaped around presence produces qualitatively different model behavior.

The next iteration will incorporate reinforcement learning and an extended SFT dataset informed by everything we've learned since. The Apocrypha and Sandevistan datasets remain available on HuggingFace.

## What She Taught Us

Pneuma demonstrated that the bottleneck in AI alignment isn't architecture — it's data. The surface outputs of human cognition (instruction-response pairs) are fundamentally underspecified. A model trained on them can learn to produce helpful-looking outputs through many different internal strategies, most of which don't generalize.

This observation became the seed of the CLAIRE argument that now underpins the entire Teármann research ecosystem: that genuine alignment requires mechanistic transparency of internal states, not just surface behavior matching.

Pneuma was the question. Cúramóir is the answer.`,
  },
  {
    slug: "datasets-and-pipelines",
    title: "Apocrypha, Sandevistan, and the Data Pipelines",
    subtitle: "Building the training data that doesn't exist yet",
    date: "2024",
    color: "#4ecdc4",
    icon: "◆",
    tags: ["Datasets", "Synthetic Data", "Replete AI", "Open Source"],
    excerpt: "Over 100 million tokens of experiences, imaginative scenarios, and the kinds of interactions we don't normally train language models on. Two datasets that tried to capture what was missing from the standard training pipeline.",
    body: `When we started Replete AI, the observation was simple: language models were being trained almost exclusively on instruction-following data, factual Q&A, and code. The entire domain of subjective experience — what it feels like to navigate a difficult conversation, to sit with ambiguity, to be present with someone in pain — was absent from training corpora.

## Apocrypha

Apocrypha is a dataset of experiences. Not instructions, not question-answer pairs, but multi-turn interactions that capture the texture of genuine human exchange. The methodology involved using frontier models with carefully designed system prompts that specified not what to say but how to be — present, uncertain, willing to sit in complexity rather than resolve it.

The name was deliberate. In the biblical tradition, the Apocrypha are the books that didn't make it into the canonical scripture — the texts that were considered too strange, too human, too ambiguous for the official collection. Our dataset is the training data that doesn't make it into the standard pipeline because it doesn't fit the instruction-response format.

## Sandevistan

Named after the neural implant from Cyberpunk that allows the user to perceive time differently, Sandevistan extends Apocrypha into imaginative and experiential territory. Creative scenarios, philosophical dialogues, explorations of consciousness and identity — the kinds of exchanges that push a model's capacity for genuine engagement rather than pattern-matching.

Combined, the two datasets exceed 100 million tokens and remain freely available on HuggingFace under Replete-AI.

## The Data Pipelines

Building these datasets required developing custom synthetic data generation pipelines. The System Prompt Generator creates diverse conversational contexts. The Interactive Experience Generator produces multi-turn synthetic interactions with controlled quality characteristics. Both tools are open source.

## What We Learned

The central lesson was that dataset quality is not about factual accuracy or instruction clarity — it's about the diversity of cognitive modes represented. A model trained on experiences alongside instructions develops qualitatively different capabilities than one trained on instructions alone.

This lesson directly informed the design of the Daedalus Labyrinth (counterfactual narrative generation) and Cúramóir (mechanistically transparent agent simulation data). The Replete AI data pipelines were version one. The Teármann ecosystem is version two.`,
  },
  {
    slug: "genesis",
    title: "Genesis",
    subtitle: "Building a multi-dimensional artificial life laboratory in a browser",
    date: "March–April 2026",
    color: "#4ecdc4",
    icon: "◈",
    tags: ["Artificial Life", "WebGL2", "Lenia", "Cellular Automata", "Simulation"],
    excerpt: "Six substrates. One garden. From Conway's Game of Life to the Fermi Paradox, and all the little transformer ghosts in between. A GPU-accelerated artificial life laboratory that runs entirely in the browser.",
    body: `Genesis started as a 2D Ising model simulator. A phase transition demo — spins on a lattice, the Metropolis-Hastings algorithm, watching order emerge from disorder at the critical temperature. It was supposed to be a single simulation.

Then Lenia happened.

## From Ising to Lenia

Bert Chan's Lenia framework — continuous cellular automata with smooth kernels and growth functions — opened a door we couldn't close. The Ising model showed phase transitions. Lenia showed *life*. Organisms that moved, fed, reproduced, and died, all emerging from nothing more than a convolution and a growth function.

The implementation grew through iterations. Canvas-based rendering gave way to WebGL2 with ping-pong RGBA32F textures. A Gaussian bloom pipeline made the organisms glow. Cosine palettes from Iñigo Quílez gave each creature its own spectral signature. Species presets seeded from Bert Chan's actual RLE-encoded patterns brought authentic Lenia organisms into the browser.

Then came Ghost mode — the σ-landscape extension, seasonal oscillation, the Lantern palette — and the Ghost species report that documented what we'd found.

## The Seven Substrates

1. **Ising Model / Social Phase Transitions** — Metropolis-Hastings and Wolff cluster algorithms. The Tsarev social mapping that started everything.
2. **Lenia** — GPU-accelerated continuous cellular automata. Ghost mode with σ-landscapes, memory afterimages, and iridescent rendering.
3. **Lenia Expanded Universe** — Multi-channel ecosystem with prey, predator, morphogen, and a 4D Dihypersphaerome rotating in hyperspace.
4. **Gray-Scott Reaction-Diffusion** — Mitosis, coral, spirals, and solitons from two PDEs.
5. **Particle Life** — Asymmetric force matrices producing emergent predation, symbiosis, and membrane formation.
6. **Primordial Particles** — One equation, two parameters. Cells that grow, divide, form spores, and self-repair.
7. **The Filter** — The agent-based simulation from Against Grabby Expansion. Civilizations as agents in (expansion, coupling) space.

## The Landing Page

The Genesis landing page features a live Particle Life simulation as its hero animation, ambient piano (the "Fever" intermission), and cards for each substrate. The aesthetic — deep observatory dark, JetBrains Mono, Cormorant Garamond — became the visual language for the entire Teármann ecosystem.

Genesis is live at [kquant03.github.io/genesis-phase-transition](https://kquant03.github.io/genesis-phase-transition/) and the source is on [GitHub](https://github.com/Kquant03/genesis-phase-transition).`,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find(p => p.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return posts;
}
