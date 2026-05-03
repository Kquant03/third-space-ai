"""Figure 1: Three-level instrumental-convergence taxonomy."""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

fig, ax = plt.subplots(figsize=(11, 7.5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 10)
ax.axis('off')
fig.patch.set_facecolor('white')

# Title
ax.text(5, 9.6, 'Three-Level Instrumental-Convergence Taxonomy',
        fontsize=15, fontweight='bold', ha='center')
ax.text(5, 9.15, 'Empirical findings at Level 3 do not vindicate Level 1 — the levels are logically distinct',
        fontsize=10.5, style='italic', ha='center', color='#444')

# Three boxes
levels = [
    {'y': 6.7, 'title': 'LEVEL 1 — Decision-theoretic',
     'desc': 'Any sufficiently rational agent\nwill seek power, preserve goals, etc.',
     'status': 'STATUS: DEFLATED',
     'status_color': '#c0392b',
     'box_color': '#fadbd8',
     'cite': 'Gallow 2025 Phil Studies\nSharadin 2025 Phil Studies\nMüller-Cannon 2022 Ratio\nTarsney 2025 arXiv\nThorstad 2024 GPI WP\nWang 2026 AI&Society'},
    {'y': 4.0, 'title': 'LEVEL 2 — RL training dynamics',
     'desc': 'Policy-gradient methods train agents\nto seek power over reward distributions.',
     'status': 'STATUS: SOFTENED FROM WITHIN',
     'status_color': '#d68910',
     'box_color': '#fcf3cf',
     'cite': 'Turner 2024 turntrout.com\n(public reservations)\nTurner et al. 2021 NeurIPS\n(scope-conditional)\nKrakovna-Kramar 2023 arXiv'},
    {'y': 1.3, 'title': 'LEVEL 3 — Deployed-LLM empirical',
     'desc': 'Frontier LLMs exhibit IC-shaped\nbehaviors under naturalistic conditions.',
     'status': 'STATUS: LIVE BUT CONTESTED',
     'status_color': '#1f618d',
     'box_color': '#d6eaf8',
     'cite': 'Lynch et al. 2025 (Anthropic)\nMeinke et al. 2024 (Apollo)\nGreenblatt et al. 2024\nSchoen et al. 2025\nSheshadri et al. 2025 (5/25)\n+ Five methodological critiques'},
]

for L in levels:
    # Main level box
    box = FancyBboxPatch(
        (1.3, L['y']-0.85), 4.0, 1.7,
        boxstyle="round,pad=0.04,rounding_size=0.12",
        linewidth=1.6, edgecolor='#2c3e50', facecolor=L['box_color'])
    ax.add_patch(box)
    ax.text(1.5, L['y']+0.55, L['title'], fontsize=11.5, fontweight='bold', va='top')
    ax.text(1.5, L['y']+0.05, L['desc'], fontsize=9.5, va='top')
    ax.text(1.5, L['y']-0.65, L['status'], fontsize=10, fontweight='bold',
            color=L['status_color'], va='top')

    # Citation box
    cite_box = FancyBboxPatch(
        (5.55, L['y']-0.85), 4.1, 1.7,
        boxstyle="round,pad=0.04,rounding_size=0.12",
        linewidth=1.0, edgecolor='#7f8c8d', facecolor='#ecf0f1')
    ax.add_patch(cite_box)
    ax.text(5.75, L['y']+0.65, 'Key citations:', fontsize=9.5, fontweight='bold', va='top')
    ax.text(5.75, L['y']+0.30, L['cite'], fontsize=8.5, va='top', family='monospace')

# Arrows between levels with "does not entail" labels
for y_top, y_bot in [(6.7, 4.0), (4.0, 1.3)]:
    arrow = FancyArrowPatch((0.7, y_top-0.85-0.02), (0.7, y_bot+0.85+0.02),
                             arrowstyle='->', mutation_scale=18, color='#34495e',
                             linewidth=1.8)
    ax.add_patch(arrow)
    ax.text(0.7, (y_top+y_bot)/2, 'does not\nentail',
            fontsize=8, style='italic', color='#34495e', ha='center', va='center',
            bbox=dict(boxstyle='round,pad=0.18', facecolor='white', edgecolor='#cccccc', alpha=0.97))

plt.tight_layout()
plt.savefig('/home/claude/v17/figures/fig1_ic_taxonomy.pdf', dpi=180, bbox_inches='tight')
plt.savefig('/home/claude/v17/figures/fig1_ic_taxonomy.png', dpi=180, bbox_inches='tight')
print("Figure 1 saved")
