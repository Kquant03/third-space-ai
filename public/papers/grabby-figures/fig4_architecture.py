"""Figure 4: Three-panel architectural specification of the homeostatic LLM."""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
import numpy as np

fig = plt.figure(figsize=(14, 13))
fig.patch.set_facecolor('white')

# ============ Panel A: Constrained multi-objective head (training time) ============
ax1 = fig.add_subplot(3, 1, 1)
ax1.set_xlim(0, 14)
ax1.set_ylim(0, 5.2)
ax1.axis('off')

ax1.text(7, 4.85, 'Panel A — Constrained multi-objective head (training time)',
         fontsize=12.5, fontweight='bold', ha='center')

# Tokens input
ax1.text(0.5, 3.7, 'tokens', fontsize=10, ha='center', va='center',
         bbox=dict(boxstyle='round,pad=0.3', facecolor='#fdf2e9', edgecolor='#e67e22'))
ax1.annotate('', xy=(2.0, 3.7), xytext=(1.0, 3.7),
             arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.4))

# Trunk
trunk = FancyBboxPatch((2.0, 3.1), 3.0, 1.2, boxstyle="round,pad=0.05,rounding_size=0.10",
                        linewidth=1.6, edgecolor='#2c3e50', facecolor='#d6eaf8')
ax1.add_patch(trunk)
ax1.text(3.5, 3.7, 'Transformer Trunk', fontsize=11, ha='center', va='center', fontweight='bold')

# Hidden states arrow
ax1.annotate('', xy=(5.5, 3.7), xytext=(5.0, 3.7),
             arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.4))
ax1.text(5.25, 4.0, 'hidden $z$', fontsize=8.5, ha='center', style='italic')

# Heads
heads = [
    ('Policy $\\pi_\\theta$', '#aed6f1', 6.0, 4.2),
    ('Cost $h_1$', '#f9e79f', 7.6, 4.2),
    ('Cost $h_2$', '#f9e79f', 9.0, 4.2),
    ('...', 'white', 10.4, 4.2),
    ('Cost $h_k$', '#f9e79f', 11.8, 4.2),
]
for label, color, x, y in heads:
    if label == '...':
        ax1.text(x, 3.7, '...', fontsize=14, ha='center', va='center')
        continue
    box = FancyBboxPatch((x-0.65, y-1.1), 1.3, 0.8,
                          boxstyle="round,pad=0.04,rounding_size=0.08",
                          linewidth=1.3, edgecolor='#2c3e50', facecolor=color)
    ax1.add_patch(box)
    ax1.text(x, y-0.7, label, fontsize=9, ha='center', va='center', fontweight='bold')
    # arrow from trunk fan-out point to head
    ax1.plot([5.5, x], [3.7, y-0.3], color='#34495e', lw=0.8, alpha=0.7)

# Outputs
outputs = [
    ('reward $r$', 6.0, 2.5),
    ('$C_1$', 7.6, 2.5),
    ('$C_2$', 9.0, 2.5),
    ('', 10.4, 2.5),
    ('$C_k$', 11.8, 2.5),
]
for label, x, y in outputs:
    if label == '':
        continue
    ax1.annotate('', xy=(x, y), xytext=(x, y+0.6),
                 arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.0))
    ax1.text(x, y-0.2, label, fontsize=9, ha='center', va='center')

# Augmented Lagrangian box
lag_box = FancyBboxPatch((4.0, 0.8), 8.5, 1.0,
                          boxstyle="round,pad=0.05,rounding_size=0.10",
                          linewidth=1.5, edgecolor='#a04000', facecolor='#fef5e7')
ax1.add_patch(lag_box)
ax1.text(8.25, 1.45, 'Augmented Lagrangian — two-sided bands  (Eq. 3)',
         fontsize=10, ha='center', va='center', fontweight='bold', color='#a04000')
ax1.text(8.25, 1.05,
         '$\\mathcal{L}_\\rho = -\\mathcal{J}_R + \\sum_i [\\lambda_i^U(\\mathcal{J}_{C_i}-U_i) + \\lambda_i^L(L_i-\\mathcal{J}_{C_i})] + (\\rho/2)\\sum_i (\\mathcal{J}_{C_i}-\\Pi_{[L_i,U_i]}\\mathcal{J}_{C_i})^2$',
         fontsize=9, ha='center', va='center', color='#34495e')

# Backprop arrows
for x in [6.0, 7.6, 9.0, 11.8]:
    ax1.annotate('', xy=(x, 1.85), xytext=(x, 2.3),
                 arrowprops=dict(arrowstyle='->', color='#a04000', lw=0.9, alpha=0.7))
ax1.text(8.25, 0.4, '$\\lambda_i^{U,L}$ PID dual updates (Stooke 2020)',
         fontsize=8.5, ha='center', va='center', style='italic', color='#7f8c8d')


# ============ Panel B: Regulator + Bayesian guardrail ============
ax2 = fig.add_subplot(3, 1, 2)
ax2.set_xlim(0, 14)
ax2.set_ylim(0, 5.2)
ax2.axis('off')

ax2.text(7, 4.85, 'Panel B — Regulator with Bayesian guardrail (inference time)',
         fontsize=12.5, fontweight='bold', ha='center')

# Input
ax2.text(0.5, 3.7, 'prompt $x$', fontsize=10, ha='center', va='center',
         bbox=dict(boxstyle='round,pad=0.3', facecolor='#fdf2e9', edgecolor='#e67e22'))
ax2.annotate('', xy=(2.0, 3.7), xytext=(1.2, 3.7),
             arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.4))

# Base LM (frozen)
base = FancyBboxPatch((2.0, 3.0), 3.0, 1.4, boxstyle="round,pad=0.05,rounding_size=0.10",
                      linewidth=1.6, edgecolor='#2c3e50', facecolor='#d6eaf8')
ax2.add_patch(base)
ax2.text(3.5, 3.95, 'Base LM (frozen)', fontsize=10.5, ha='center', va='center', fontweight='bold')
ax2.text(3.5, 3.45, '+ monitor heads', fontsize=9, ha='center', va='center', style='italic')

# Regulator
reg = FancyBboxPatch((6.0, 3.4), 2.6, 1.0, boxstyle="round,pad=0.05,rounding_size=0.10",
                     linewidth=1.4, edgecolor='#1e8449', facecolor='#d5f5e3')
ax2.add_patch(reg)
ax2.text(7.3, 4.0, 'Regulator', fontsize=10, ha='center', va='center', fontweight='bold')
ax2.text(7.3, 3.6, '$g_\\theta(C, \\tau)$ + barriers $\\phi_i$', fontsize=8.5, ha='center', va='center')

# Logit modulator
mod = FancyBboxPatch((6.0, 1.9), 2.6, 1.0, boxstyle="round,pad=0.05,rounding_size=0.10",
                     linewidth=1.4, edgecolor='#7d3c98', facecolor='#e8daef')
ax2.add_patch(mod)
ax2.text(7.3, 2.5, 'Logit modulator', fontsize=10, ha='center', va='center', fontweight='bold')
ax2.text(7.3, 2.1, '$\\tilde\\ell = \\ell + \\text{bias}$', fontsize=9, ha='center', va='center')

# Arrows
ax2.annotate('', xy=(6.0, 3.9), xytext=(5.0, 3.7),
             arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.2))
ax2.text(5.5, 4.05, '$\\{C_i\\}, \\tau$', fontsize=8, ha='center')
ax2.annotate('', xy=(7.3, 1.9), xytext=(7.3, 3.4),
             arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.2))
ax2.text(7.6, 3.15, 'bias', fontsize=8, ha='center', style='italic')
ax2.annotate('', xy=(5.0, 3.4), xytext=(5.0, 2.4),
             arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.0))
ax2.text(4.7, 2.7, 'logits $\\ell$', fontsize=8, ha='right')
ax2.annotate('', xy=(6.0, 2.4), xytext=(5.0, 2.4),
             arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.0))

# Sample
ax2.annotate('', xy=(9.5, 2.4), xytext=(8.6, 2.4),
             arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.4))
ax2.text(9.05, 2.7, 'sample $y$', fontsize=8.5, ha='center', style='italic')

# Bayesian guardrail
guard = FancyBboxPatch((9.5, 1.6), 3.5, 1.5, boxstyle="round,pad=0.05,rounding_size=0.10",
                       linewidth=1.5, edgecolor='#922b21', facecolor='#fadbd8')
ax2.add_patch(guard)
ax2.text(11.25, 2.65, 'Bayesian Guardrail', fontsize=10, ha='center', va='center', fontweight='bold')
ax2.text(11.25, 2.25, '$M_w(\\text{harm} \\mid y, x)$', fontsize=9, ha='center', va='center')
ax2.text(11.25, 1.85, '+ conformal calibration', fontsize=8.5, ha='center', va='center', style='italic')

# Decision
ax2.annotate('', xy=(11.25, 1.2), xytext=(11.25, 1.55),
             arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.0))
ax2.text(10.0, 0.85, 'accept', fontsize=9, ha='center', color='#1e8449', fontweight='bold')
ax2.text(12.5, 0.85, 'reject → revise', fontsize=9, ha='center', color='#a04000', fontweight='bold')
ax2.plot([11.25, 10.0], [1.15, 1.0], color='#1e8449', lw=1.0)
ax2.plot([11.25, 12.5], [1.15, 1.0], color='#a04000', lw=1.0)


# ============ Panel C: Test-time deliberation + sampling ============
ax3 = fig.add_subplot(3, 1, 3)
ax3.set_xlim(0, 14)
ax3.set_ylim(0, 5.2)
ax3.axis('off')

ax3.text(7, 4.85, 'Panel C — Test-time deliberation + constraint-aware sampling',
         fontsize=12.5, fontweight='bold', ha='center')

# Align3 loop box
align_box = FancyBboxPatch((0.6, 3.4), 5.5, 1.2,
                            boxstyle="round,pad=0.05,rounding_size=0.10",
                            linewidth=1.5, edgecolor='#1e8449', facecolor='#eafaf1')
ax3.add_patch(align_box)
ax3.text(3.35, 4.3, 'Align3 (SpecBench team 2025)', fontsize=10, ha='center', va='center', fontweight='bold')
ax3.text(3.35, 3.95, '① Behavior-opt → ② Safety-guided refine', fontsize=8.5, ha='center', va='center')
ax3.text(3.35, 3.65, '↓  ③ Holistic specification audit', fontsize=8.5, ha='center', va='center')

# Arrow to QAlign
ax3.annotate('', xy=(7.0, 2.6), xytext=(3.35, 3.4),
             arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.4))
ax3.text(5.0, 3.05, '$y_{\\rm draft}$', fontsize=9, ha='center', style='italic')

# QAlign sampler
qalign = FancyBboxPatch((7.0, 1.7), 4.0, 1.5,
                         boxstyle="round,pad=0.05,rounding_size=0.10",
                         linewidth=1.5, edgecolor='#1f618d', facecolor='#d6eaf8')
ax3.add_patch(qalign)
ax3.text(9.0, 2.85, 'QAlign MCMC sampler', fontsize=10, ha='center', va='center', fontweight='bold')
ax3.text(9.0, 2.5, 'target $\\propto \\exp(-E)$', fontsize=8.5, ha='center', va='center')
ax3.text(9.0, 2.15, '$E = -\\log p_{\\rm base} + \\sum_i \\beta_i\\phi_i + \\lambda\\log\\hat\\pi_{\\rm harm}$',
         fontsize=8, ha='center', va='center', color='#34495e')
ax3.text(9.0, 1.85, 'Faria & Smith 2025', fontsize=8, ha='center', va='center', style='italic', color='#7f8c8d')

# CoT probe (right side)
probe = FancyBboxPatch((11.5, 1.7), 2.2, 1.5,
                        boxstyle="round,pad=0.05,rounding_size=0.10",
                        linewidth=1.4, edgecolor='#7d3c98', facecolor='#e8daef')
ax3.add_patch(probe)
ax3.text(12.6, 2.85, 'CoT probe', fontsize=10, ha='center', va='center', fontweight='bold')
ax3.text(12.6, 2.5, '(Chan et al. 2025)', fontsize=8.5, ha='center', va='center', style='italic')
ax3.text(12.6, 2.15, 'aborts on flag', fontsize=8.5, ha='center', va='center')
ax3.text(12.6, 1.85, '+13 F1 vs text', fontsize=8, ha='center', va='center', color='#7f8c8d')

# Bidirectional arrow between QAlign and probe
ax3.annotate('', xy=(11.5, 2.45), xytext=(11.0, 2.45),
             arrowprops=dict(arrowstyle='<->', color='#34495e', lw=1.2))

# Output
ax3.annotate('', xy=(9.0, 1.0), xytext=(9.0, 1.7),
             arrowprops=dict(arrowstyle='->', color='#34495e', lw=1.4))
ax3.text(9.0, 0.7, 'accepted $\\hat{y}$ → Bayesian guardrail (Panel B)',
         fontsize=9.5, ha='center', va='center', fontweight='bold', color='#34495e')

# Latency note
ax3.text(7, 0.15, 'latency $\\approx K_{\\rm mcmc}\\cdot T_{\\rm base} + T_{\\rm Align3} + T_{\\rm guard}$  (≈ 2–4× greedy)',
         fontsize=9, ha='center', va='center', style='italic', color='#7f8c8d')

plt.tight_layout()
plt.savefig('/home/claude/v17/figures/fig4_architecture.pdf', dpi=180, bbox_inches='tight')
plt.savefig('/home/claude/v17/figures/fig4_architecture.png', dpi=180, bbox_inches='tight')
print("Figure 4 saved")
