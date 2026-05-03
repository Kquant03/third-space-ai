"""Figure 3: Modularity dissipation — Watanabe-rigorous bound vs v16 heuristic vs achievability."""
import numpy as np
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.5))
fig.patch.set_facecolor('white')

# ===== Panel A: BMC two-module dissipation =====
ax1 = axes[0]
ax1.set_xlim(0, 10)
ax1.set_ylim(-0.3, 8)
ax1.axis('off')

# Title at top
ax1.text(5, 7.7, 'Panel A — Boyd–Mandal–Crutchfield two-subsystem theorem',
         fontsize=11.5, fontweight='bold', ha='center')

# Two coupled boxes — top region (y = 5.5 to 6.9)
from matplotlib.patches import FancyBboxPatch
box_X = FancyBboxPatch((1.0, 5.5), 2.0, 1.4, boxstyle="round,pad=0.05,rounding_size=0.10",
                       linewidth=1.6, edgecolor='#2c3e50', facecolor='#aed6f1')
box_Y = FancyBboxPatch((6.5, 5.5), 2.0, 1.4, boxstyle="round,pad=0.05,rounding_size=0.10",
                       linewidth=1.6, edgecolor='#2c3e50', facecolor='#f5b7b1')
ax1.add_patch(box_X)
ax1.add_patch(box_Y)
ax1.text(2.0, 6.2, '$X$', fontsize=18, ha='center', va='center', fontweight='bold')
ax1.text(7.5, 6.2, '$Y$', fontsize=18, ha='center', va='center', fontweight='bold')
ax1.text(2.0, 5.25, 'controlled\nsubsystem', fontsize=8.5, ha='center', va='top', style='italic')
ax1.text(7.5, 5.25, 'uncontrolled\nsubsystem', fontsize=8.5, ha='center', va='top', style='italic')

# Wavy correlation channel
xs = np.linspace(3.0, 6.5, 50)
ys = 6.2 + 0.18 * np.sin(np.linspace(0, 6*np.pi, 50))
ax1.plot(xs, ys, color='#8e44ad', lw=2.0)
ax1.text(4.75, 6.95, '$I(X;Y)$', fontsize=11, color='#8e44ad', ha='center', fontweight='bold')

# Bar comparison — middle/lower region (y = 1.6 to 3.4)
bar_y_global = 3.2
bar_y_mod = 2.1
bar_h = 0.55
ax1.barh([bar_y_global], [3.5], height=bar_h, left=1.6, color='#27ae60',
         edgecolor='#1e8449', linewidth=1.2)
ax1.barh([bar_y_mod], [6.0], height=bar_h, left=1.6, color='#e67e22',
         edgecolor='#a04000', linewidth=1.2)
# Hatch the difference (the modularity excess portion)
ax1.barh([bar_y_mod], [2.5], height=bar_h, left=5.1, color='none',
         edgecolor='#a04000', hatch='//', linewidth=1.0)

ax1.text(1.45, bar_y_global+bar_h/2, '$\\Delta F_{\\rm global}$',
         fontsize=10.5, ha='right', va='center')
ax1.text(1.45, bar_y_mod+bar_h/2, '$\\Delta F_{\\rm mod}$',
         fontsize=10.5, ha='right', va='center')

# Annotation arrow pointing at the hatched difference region
ax1.annotate('modularity excess\n$\\geq k_B T \\Delta I(X;Y)$',
             xy=(6.3, bar_y_mod+bar_h/2), xytext=(8.0, 1.05),
             arrowprops=dict(arrowstyle='->', color='#a04000', lw=1.2),
             fontsize=9.5, color='#a04000', va='center', ha='center')

ax1.text(5, 0.0,
         'Eq. (C1):  $\\Delta F_{\\rm mod}-\\Delta F_{\\rm global}\\geq k_B T[\\,I_{p_0}(X;Y)-I_{p_\\tau}(X;Y)\\,]$',
         fontsize=9.5, ha='center', color='#34495e', style='italic')

# ===== Panel B: N-module scaling =====
ax2 = axes[1]
N_range = np.logspace(0.3, 6, 200)

# Curve (a) — heuristic N(N-1)/2 with I_pair = 1 bit
heuristic = N_range * (N_range - 1) / 2
ax2.loglog(N_range, heuristic, '--', color='#7f8c8d', lw=2.0,
           label='$\\propto N(N{-}1)/2$ heuristic (v16)')

# Curve (b-upper) — Watanabe worst case: ~Θ(N²)
worst = N_range**2 * 0.5
ax2.loglog(N_range, worst, color='#3498db', lw=2.4,
           label='Watanabe upper envelope (worst case)')

# Curve (b-typical) — Θ(N log N)
typical = N_range * np.log2(N_range + 1) * 0.8
ax2.loglog(N_range, typical, color='#3498db', lw=1.6, alpha=0.7,
           label='Watanabe typical (structured input)')

# Curve (c) — constructive circumvention floor
floor = 5.0 * np.ones_like(N_range)
ax2.loglog(N_range, floor, color='#27ae60', lw=2.4,
           label='Constructive circumvention floor')

# Shade achievable region between c and typical
ax2.fill_between(N_range, floor, typical, color='#d5f5e3', alpha=0.55,
                 label='Achievable architectures', zorder=1)

ax2.set_xlabel('Number of modules / fragments $N$', fontsize=11)
ax2.set_ylabel('Modularity excess (units of $k_B T \\ln 2$)', fontsize=11)
ax2.set_title('Panel B — $N$-module scaling: rigorous Watanabe bound\nvs. heuristic vs. achievable architectures',
              fontsize=11.5, pad=10)
ax2.legend(fontsize=8.5, loc='upper left', framealpha=0.95)
ax2.grid(True, alpha=0.25, which='both')
ax2.set_xlim(2, 1e6)
ax2.set_ylim(1, 1e12)

plt.tight_layout()
plt.savefig('/home/claude/v17/figures/fig3_modularity.pdf', dpi=180, bbox_inches='tight')
plt.savefig('/home/claude/v17/figures/fig3_modularity.png', dpi=180, bbox_inches='tight')
print("Figure 3 saved")
