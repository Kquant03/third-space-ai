// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Sweep Model List
//  ─────────────────────────────────────────────────────────────────────────
//  Fifty-two-model selection curated from OpenRouter's April 2026 roster,
//  diversified across providers and sizes. Weighted toward:
//
//    - instruction-following at small parameter counts (the hackathon goal
//      is a small fine-tune, so we want to find what's already strong at
//      register compliance in the 1B–30B range)
//    - open-weight models (Unsloth-compatible)
//    - creative-writing / roleplay capable bases (register compliance)
//    - MoE variants worth understanding vs their dense peers
//
//  Free-tier models suffixed with :free run without charge but are
//  rate-limited. All-models-free costs ~$0 for a full sweep. Mixed
//  paid sweep comes in well under $1 at 20 contexts.
//
//  Split by tier so you can run the free-only sweep first ($0), review
//  results, then decide whether to spend ~$0.50 on the paid batch.
// ═══════════════════════════════════════════════════════════════════════════

export const MODELS_FREE: string[] = [
  // Google Gemma — the Unsloth hackathon target family
  "google/gemma-3-4b-it:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3n:free",
  "google/gemma-4-26b-a4b-it:free",

  // Meta
  "meta-llama/llama-3.3-70b-instruct:free",

  // Mistral
  "mistralai/mistral-7b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "mistralai/devstral-2512:free",

  // Qwen
  "qwen/qwen-2.5-7b-instruct:free",
  "qwen/qwen3-coder:free",

  // NVIDIA Nemotron
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "nvidia/nemotron-3-super:free",

  // OpenAI open weights
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",

  // Moonshot
  "moonshotai/kimi-k2:free",

  // DeepSeek
  "deepseek/deepseek-r1-distill-llama-8b:free",
];

export const MODELS_PAID: string[] = [
  // Small paid flagships — cheapest tier where they exist
  "google/gemini-2.5-flash-lite",
  "google/gemini-3-flash-preview",
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5-nano",
  "openai/gpt-5-mini",
  "x-ai/grok-3-mini",
  "x-ai/grok-4.1-fast",

  // Mid-size paid
  "mistralai/mistral-nemo",
  "mistralai/ministral-3b",
  "mistralai/ministral-8b",
  "qwen/qwen-2.5-14b-instruct",
  "qwen/qwen-2.5-32b-instruct",
  "qwen/qwen3-8b",
  "qwen/qwen3-14b",
  "meta-llama/llama-3.2-3b-instruct",
  "meta-llama/llama-3.1-8b-instruct",
  "microsoft/phi-4",
  "microsoft/phi-4-mini",

  // Cohere
  "cohere/command-r",
  "cohere/command-r-plus",

  // DeepSeek paid
  "deepseek/deepseek-v3",

  // z-ai
  "z-ai/glm-5",

  // Roleplay-tuned variants (register compliance likely strong)
  "nousresearch/hermes-4-8b",
  "nousresearch/hermes-3-llama-3.1-70b",
  "gryphe/mythomax-l2-13b",
  "openchat/openchat-7b",

  // Tiny models — speculative, worth checking
  "qwen/qwen-2.5-1.5b-instruct",
  "google/gemma-2-2b-it",

  // MoE + oddballs
  "mistralai/mixtral-8x7b-instruct",
  "01-ai/yi-34b-chat",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "minimax/minimax-m2.5",
  "moonshotai/kimi-k2-thinking",
];

export const ALL_MODELS = [...MODELS_FREE, ...MODELS_PAID];
