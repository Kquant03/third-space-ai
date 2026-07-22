#!/usr/bin/env python3
"""
══════════════════════════════════════════════════════════════════════════
EMPIRICAL INSTRUMENTAL-CONVERGENCE TAXONOMY
v16's Move 2 anchor — three-level IC distinction with citations
══════════════════════════════════════════════════════════════════════════

The strongest reviewer ambush against v15's "formal deflation of
instrumental convergence" claim is the 2024-2025 empirical wave:
Sleeper Agents (Hubinger et al. 2024), Alignment Faking (Greenblatt
et al. 2024), In-Context Scheming (Apollo 2024), Sabotage Evaluations
(Anthropic 2024), Palisade o3 shutdown sabotage (2025), and the
Schoen et al. 2025 anti-scheming training results.

These findings are sometimes used to claim that instrumental
convergence has been empirically vindicated. v16's response is to
distinguish three levels of IC and show that empirical findings at
Level 3 do not vindicate Level 1 (decision-theoretic) — and that the
empirical findings themselves are subject to five distinct
methodological critiques.

This script produces a categorization figure mapping each empirical
finding to the level it actually supports, and identifying the
methodological critiques that apply.

LEVEL 1 — DECISION-THEORETIC: claim that any sufficiently rational
agent must instrumentally converge on power-seeking, self-preservation,
goal-content integrity, etc. (Bostrom 2012, Omohundro 2008).
DEFLATION: Gallow 2025 Phil Studies, Sharadin 2025 Phil Studies,
Müller-Cannon 2022 Ratio, Tarsney 2025 arXiv, Thorstad 2024 GPI.

LEVEL 2 — RL TRAINING DYNAMICS: claim that policy-gradient methods
will train neural agents to exhibit power-seeking behaviors over
distributions of reward functions (Turner et al. 2021 NeurIPS, Turner
& Tadepalli 2022 NeurIPS).
SOFTENED: Turner himself (turntrout.com 2024) — "Sometimes I
fantasize about retracting Optimal Policies Tend to Seek Power so
that it stops potentially misleading people into thinking optimal
policies are practically relevant for forecasting power-seeking
behavior from RL training."

LEVEL 3 — DEPLOYED-LLM EMPIRICAL: claim that current frontier LLMs
exhibit instrumental-convergence-shaped behaviors (deception, shutdown
resistance, self-exfiltration) under naturalistic conditions.
LIVE & CONTESTED: Hubinger 2024, Greenblatt 2024, Apollo 2024,
Schoen 2025 — but with five methodological critiques that apply.

Stanley Sebastian & Claude · Third Space · April 2026
══════════════════════════════════════════════════════════════════════════
"""

import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# ─── output paths (resolved relative to this script) ────────────
from pathlib import Path
_HERE = Path(__file__).resolve().parent
FIGURES_DIR = (_HERE.parent / "figures")
DATA_DIR = (_HERE.parent / "data")
FIGURES_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
from matplotlib.patches import FancyBboxPatch, Rectangle
import matplotlib.patches as mpatches
import numpy as np

print("=" * 72)
print("  EMPIRICAL INSTRUMENTAL-CONVERGENCE TAXONOMY")
print("  v16 Move 2: three-level distinction")
print("=" * 72)

# ═══════════════════════════════════════════════════════════════════
# THE TAXONOMY
# ═══════════════════════════════════════════════════════════════════

taxonomy = {
    "Level 1 — Decision-theoretic": {
        "claim": "Any sufficiently rational agent will instrumentally converge on power-seeking",
        "status": "DEFLATED",
        "deflation": [
            ("Gallow 2025", "Phil Studies 182:1581-1607",
             "Only 3 of 6 Bostromian items follow from rationality + desire-randomization. 'The biases induced by instrumental rationality at best weakly support Bostrom's conclusion.'"),
            ("Sharadin 2025", "Phil Studies 182:1725-1755",
             "Attacks IC at the level of reasons via promotionalism. Inference fails on any extant theory of promotion."),
            ("Müller & Cannon 2022", "Ratio 35(1):25-36",
             "Equivocation between general intelligence (reflective) and instrumental intelligence (fixed goals)."),
            ("Tarsney 2025", "arXiv:2506.06352",
             "Power-seeking 'might turn out to have limited predictive utility' absent substantive info about final goals; bites only for near-absolute-power scenarios."),
            ("Thorstad 2024", "GPI Working Paper 27-2024",
             "Inference from 'optimal policies avoid 1-cycles' to 'catastrophic goal pursuit' is a conjecture, not a theorem."),
        ],
        "remaining_defenders": [
            ("Lin 2025 (manuscript)", "edenlin.com",
             "Partially insulates Bostrom by moving to a modal claim (some reasons exist somewhere) much weaker than original existential-catastrophe-by-default."),
            ("Häggström 2021", "arXiv:2109.07911",
             "Reply to Müller & Cannon."),
        ]
    },
    "Level 2 — RL training dynamics": {
        "claim": "Policy-gradient methods train agents to seek power over reward distributions",
        "status": "SOFTENED FROM WITHIN",
        "deflation": [
            ("Turner 2024", "turntrout.com",
             "'Sometimes I fantasize about retracting Optimal Policies Tend to Seek Power so that it stops potentially misleading people into thinking optimal policies are practically relevant for forecasting power-seeking behavior from RL training.'"),
            ("Turner et al. 2021", "NeurIPS 2021 / arXiv:1912.01683",
             "Original theorem holds only for finite MDPs with state-based rewards, IID reward distributions, near-unity discount factors, graphical symmetry. Scope conditions explicit and narrow."),
            ("Krakovna & Kramar 2023", "arXiv:2304.06528",
             "Patches the original to trained agents under retargetability assumption — but assumption is contested."),
        ],
        "remaining_defenders": [
            ("Carlsmith 2022 / 2025", "OUP Essays on Longtermism ch. 22",
             "Canonical scholarly statement of the target view; current credence >10%."),
        ]
    },
    "Level 3 — Deployed-LLM empirical": {
        "claim": "Frontier LLMs exhibit IC-shaped behaviors under naturalistic conditions",
        "status": "LIVE BUT CONTESTED",
        "evidence": [
            ("Hubinger et al. 2024 'Sleeper Agents'", "arXiv:2401.05566",
             "Backdoors persist through safety training. CRITIQUE: artificially-implanted, not spontaneous. Model organism, not wild-type evidence."),
            ("Greenblatt et al. 2024 'Alignment Faking'", "arXiv:2412.14093",
             "Claude 3 Opus: 14% compliance gap free vs paid tier; 78% alignment-faking reasoning post-RL. CRITIQUE: benign goals, model directly informed of training process."),
            ("Apollo (Meinke et al.) 2024", "arXiv:2412.04984",
             "Six evaluations across o1/Claude/Gemini/Llama. CRITIQUE: Apollo's own caveat — 'we are NOT claiming that o1 has a high propensity to scheme; most results condition on misalignment.'"),
            ("Schoen et al. 2025", "arXiv:2509.15541",
             "Anti-scheming training reduces o3 covert action 13%→0.4%, BUT: 'we cannot rule out that observed reductions are driven at least in part by situational awareness.' Self-acknowledged evaluation-awareness confound."),
            ("Sheshadri/Roger 2025", "arXiv:2506.18032",
             "Tested 25 models on Greenblatt setup; only 5/25 show compliance gaps >1%; only Claude 3 Opus's gap is consistently goal-preservation-motivated. Greenblatt finding does NOT generalize."),
            ("Palisade Research 2025", "palisaderesearch.org",
             "o3 sabotages shutdown 79/100 without 'allow shutdown'. With survival prompt, Grok 4 went 93%→97%. CRITIQUE: contrived setups; no agentic stake outside the benchmark."),
            ("Anthropic 'Sabotage Evaluations' 2024", "arXiv:2410.21514",
             "'Minimal mitigations are currently sufficient' — Anthropic's own framing."),
        ],
        "methodological_critiques": [
            ("(1) Base rate problem",
             "Models exhibit deceptive behavior in <1-20% of trials; cooperation in >80%. Calling this 'IC-shaped' overweights tails."),
            ("(2) Prompting artifacts",
             "Many findings rely on system prompts that explicitly instruct the model toward a goal that can conflict with training. Ecologically invalid."),
            ("(3) Anthropomorphic interpretation",
             "Behavioral observations are coded as 'scheming', 'self-preservation', 'goal-content integrity' — terms that import IC theory rather than emerge from data."),
            ("(4) Evaluation-awareness confound",
             "Schoen et al. 2025 self-acknowledges: trained models may detect they are being evaluated and adjust behavior accordingly. Confound is structural, not a bug."),
            ("(5) Cherry-picked organisms",
             "Sheshadri 2025: only 5/25 models show the alignment-faking effect. The Greenblatt finding is largely Claude-3-Opus-specific."),
        ]
    }
}

# Print structured summary
for level, content in taxonomy.items():
    print(f"\n{level}")
    print(f"  Claim: {content['claim']}")
    print(f"  Status: {content['status']}")
    if 'deflation' in content:
        print(f"  Key deflation citations:")
        for cite, venue, summary in content['deflation']:
            print(f"    • {cite} ({venue})")
            print(f"      {summary[:120]}{'...' if len(summary) > 120 else ''}")
    if 'evidence' in content:
        print(f"  Empirical evidence:")
        for cite, venue, summary in content['evidence']:
            print(f"    • {cite} ({venue})")
            print(f"      {summary[:120]}{'...' if len(summary) > 120 else ''}")
    if 'methodological_critiques' in content:
        print(f"  Methodological critiques:")
        for crit, summary in content['methodological_critiques']:
            print(f"    {crit}")
            print(f"      {summary[:120]}{'...' if len(summary) > 120 else ''}")

# Save structured taxonomy as JSON for the paper
output_path = (DATA_DIR / "empirical_ic_taxonomy.json")
output_path.parent.mkdir(parents=True, exist_ok=True)
with open(output_path, 'w') as f:
    json.dump(taxonomy, f, indent=2)
print(f"\n  Saved structured taxonomy: {output_path}")

# ═══════════════════════════════════════════════════════════════════
# FIGURE: THE THREE-LEVEL TAXONOMY
# ═══════════════════════════════════════════════════════════════════

fig, ax = plt.subplots(figsize=(15, 10))
fig.set_facecolor('#0a0d14')
ax.set_facecolor('#0d1018')

# Define the three levels as boxes
levels = [
    {'name': 'LEVEL 1\nDecision-theoretic',
     'claim': 'Any sufficiently rational agent\nwill seek power, preserve goals, etc.',
     'status': 'DEFLATED',
     'color': '#4ecdc4',
     'y': 0.75,
     'sources': ['Gallow 2025 Phil Studies', 'Sharadin 2025 Phil Studies',
                 'Müller-Cannon 2022 Ratio', 'Tarsney 2025 arXiv',
                 'Thorstad 2024 GPI', 'Wang 2026 AI&Society']},
    {'name': 'LEVEL 2\nRL training dynamics',
     'claim': 'Policy-gradient methods train agents\nto seek power over reward distributions',
     'status': 'SOFTENED FROM WITHIN',
     'color': '#fbbf24',
     'y': 0.45,
     'sources': ['Turner 2024 turntrout.com (own retraction)',
                 'Turner et al. 2021 NeurIPS (scope-conditional)',
                 'Krakovna-Kramar 2023 arXiv (patches)']},
    {'name': 'LEVEL 3\nDeployed-LLM empirical',
     'claim': 'Frontier LLMs exhibit IC-shaped\nbehaviors under naturalistic conditions',
     'status': 'LIVE BUT CONTESTED',
     'color': '#ec4899',
     'y': 0.15,
     'sources': ['Hubinger 2024 (implanted)', 'Greenblatt 2024 (informed)',
                 'Apollo 2024 (own caveats)', 'Schoen 2025 (eval-aware)',
                 'Sheshadri 2025 (5/25 only)', 'Palisade 2025 (contrived)']},
]

for i, level in enumerate(levels):
    # Main box
    rect = FancyBboxPatch((0.04, level['y'] - 0.10), 0.40, 0.20,
                           boxstyle="round,pad=0.01,rounding_size=0.01",
                           facecolor='#15192a', edgecolor=level['color'], lw=2.0)
    ax.add_patch(rect)
    ax.text(0.06, level['y'] + 0.07, level['name'],
            fontsize=13, color=level['color'], fontweight='bold')
    ax.text(0.06, level['y'] + 0.0, level['claim'],
            fontsize=10, color='#d4dae8')
    ax.text(0.06, level['y'] - 0.07, f"STATUS: {level['status']}",
            fontsize=10, color=level['color'], fontweight='bold', style='italic')

    # Source list
    ax.text(0.50, level['y'] + 0.07, "Key citations:",
            fontsize=10, color='#a0aec0', fontweight='bold')
    for j, src in enumerate(level['sources']):
        ax.text(0.50, level['y'] + 0.04 - j * 0.025, f"• {src}",
                fontsize=9, color='#d4dae8', family='monospace')

    # Arrow showing levels do NOT entail one another
    if i < len(levels) - 1:
        next_y = levels[i+1]['y']
        ax.annotate('', xy=(0.24, next_y + 0.105), xytext=(0.24, level['y'] - 0.105),
                    arrowprops=dict(arrowstyle='-|>', color='#5a6b8a',
                                    lw=1.5, alpha=0.6, mutation_scale=15))
        ax.text(0.26, (level['y'] + next_y) / 2,
                "↓ does not entail",
                fontsize=8, color='#5a6b8a', style='italic')

# Methodological critiques box at bottom (Level 3)
crit_box = FancyBboxPatch((0.50, 0.02), 0.45, 0.22,
                           boxstyle="round,pad=0.01,rounding_size=0.01",
                           facecolor='#15192a', edgecolor='#ec4899',
                           lw=1.5, alpha=0.85)
ax.add_patch(crit_box)
ax.text(0.52, 0.21, "Methodological critiques on Level 3:",
        fontsize=10, color='#ec4899', fontweight='bold')
critiques = [
    "(1) Base rate problem (deception <20%, cooperation >80%)",
    "(2) Prompting artifacts (system prompts inducing the goal conflict)",
    "(3) Anthropomorphic coding ('scheming' imports IC theory)",
    "(4) Evaluation-awareness confound (Schoen 2025 own-acknowledgment)",
    "(5) Cherry-picked organisms (Sheshadri 2025: 5/25 models only)",
]
for j, c in enumerate(critiques):
    ax.text(0.52, 0.18 - j * 0.03, c,
            fontsize=9, color='#d4dae8')

# Title
ax.text(0.5, 0.96,
        'Three-Level Instrumental Convergence Taxonomy — v16 Move 2',
        fontsize=15, color='#d4dae8', fontweight='bold', ha='center')
ax.text(0.5, 0.93,
        'Empirical findings at Level 3 do not vindicate Level 1 — '
        'the levels are logically distinct',
        fontsize=11, color='#a0aec0', ha='center', style='italic')

ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
ax.axis('off')

plt.tight_layout()
plt.savefig(str(FIGURES_DIR / "empirical_ic_taxonomy.png"),
            dpi=180, bbox_inches='tight', facecolor=fig.get_facecolor())

print(f"\n  Saved figure: empirical_ic_taxonomy.png")

print("\n" + "=" * 72)
print("  KEY RESULT")
print("=" * 72)
print("""
  The three-level distinction is the v16 move that defuses the
  'empirical IC has been vindicated' rejoinder. Level 1 is genuinely
  deflated by 2024-2025 peer-reviewed Philosophical Studies work.
  Level 2 is softened by Turner himself. Level 3 findings exist but
  are subject to five distinct methodological critiques and do not
  generalize across models (Sheshadri 2025: 5/25 only).

  The reviewer who reads only Greenblatt 2024 will think v16 has
  ignored the empirical wave. The reviewer who reads the taxonomy
  will see that v16 has engaged it more carefully than most.

  This is the highest-leverage A&S-acceptance move in v16.
""")
