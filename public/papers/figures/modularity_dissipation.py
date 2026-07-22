#!/usr/bin/env python3
"""
══════════════════════════════════════════════════════════════════════════
MODULARITY DISSIPATION
Boyd-Mandal-Crutchfield 2018 support for the L→D synthesis claim
══════════════════════════════════════════════════════════════════════════

Boyd, Mandal & Crutchfield's 'Thermodynamics of Modularity'
(Phys Rev X 8:031036, 2018) proves that fragmenting integrated
computation into modular sub-units that lack access to global
correlations incurs a strictly positive **modularity dissipation**
above and beyond Landauer.

Their result, reduced to its core: the work cost of executing a
computation is bounded below by Landauer's k_B T ln 2 per bit erased,
PLUS a 'modularity tax' that arises when the physical implementation
factors into independent modules that cannot share information
needed to extract work from correlations between them.

For v16's L→D rescaling claim — that architected fission into D
fragments inherits the same physical envelope as monolithic
coordination at L = 2L_d — this is the technical lemma that supplies
the formal mechanism. Fragments that maintain coordination pay the
inter-fragment Lieb-Robinson + radiative-export cost (the synthesis
of the v16 envelope). Fragments that lose coordination pay the
modularity dissipation tax (Boyd-Mandal-Crutchfield 2018) for being
unable to share global correlations.

Both costs are real, both compose, and the L→D claim is that they
TOGETHER prevent escape from the envelope by fission.

This script demonstrates the modularity-dissipation phenomenon on a
toy two-bit system and shows the cost of fragmenting it.

Stanley Sebastian & Claude · Third Space · April 2026
══════════════════════════════════════════════════════════════════════════
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# ─── output paths (resolved relative to this script) ────────────
from pathlib import Path
_HERE = Path(__file__).resolve().parent
FIGURES_DIR = (_HERE.parent / "figures")
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

# Constants
k_B = 1.381e-23  # J/K
T = 300  # K (room temperature for illustration)

print("=" * 72)
print("  MODULARITY DISSIPATION — Boyd-Mandal-Crutchfield 2018")
print("  v16 L→D synthesis lemma")
print("=" * 72)

# ═══════════════════════════════════════════════════════════════════
# THE TOY EXAMPLE
# ═══════════════════════════════════════════════════════════════════
# Consider a two-bit system AB with joint distribution p(a, b).
# Shannon entropy: H(AB) = -sum_{a,b} p(a,b) log p(a,b)
# Marginals: H(A), H(B). Correlation: I(A;B) = H(A) + H(B) - H(AB).
#
# Landauer-bounded cost to erase joint AB:    k_B T ln(2) × H(AB)
# Cost to erase A alone:                       k_B T ln(2) × H(A)
# Cost to erase B alone:                       k_B T ln(2) × H(B)
#
# A modular implementation that erases A and B independently — without
# access to their joint distribution — must pay:
#     k_B T ln(2) × [H(A) + H(B)]
#
# An integrated implementation can use the correlation I(A;B) as
# thermodynamic fuel and pay only:
#     k_B T ln(2) × H(AB) = k_B T ln(2) × [H(A) + H(B) - I(A;B)]
#
# THE MODULARITY TAX:
#     Δ = modular cost - integrated cost = k_B T ln(2) × I(A;B)
#
# This is the result Boyd-Mandal-Crutchfield 2018 generalize and
# prove rigorously. The tax is exactly the mutual information that
# the modular implementation cannot exploit.

def shannon_entropy(probs):
    """Shannon entropy in bits."""
    p = np.array(probs)
    p = p[p > 0]
    return -np.sum(p * np.log2(p))

def joint_to_marginals(p_joint):
    """Given joint p(a,b) as 2x2 array, return marginals p(a), p(b)."""
    p_A = p_joint.sum(axis=1)
    p_B = p_joint.sum(axis=0)
    return p_A, p_B

def mutual_information(p_joint):
    """I(A;B) in bits from joint distribution."""
    p_A, p_B = joint_to_marginals(p_joint)
    H_A = shannon_entropy(p_A)
    H_B = shannon_entropy(p_B)
    H_AB = shannon_entropy(p_joint.flatten())
    return H_A + H_B - H_AB

# Sweep correlation parameter ρ
# Joint distribution: p(0,0) = p(1,1) = (1+ρ)/4, p(0,1) = p(1,0) = (1-ρ)/4
# This gives mutual information from 0 (ρ=0) to 1 bit (ρ=±1)

rhos = np.linspace(0, 0.99, 100)
mod_taxes_J = []
mod_taxes_kBT_ln2 = []

for rho in rhos:
    p_joint = np.array([
        [(1 + rho) / 4, (1 - rho) / 4],
        [(1 - rho) / 4, (1 + rho) / 4]
    ])
    I_AB = mutual_information(p_joint)
    mod_tax = k_B * T * np.log(2) * I_AB  # Joules
    mod_taxes_J.append(mod_tax)
    mod_taxes_kBT_ln2.append(I_AB)  # in units of k_B T ln(2)

print(f"\n  Toy two-bit system, T = {T} K:")
print(f"  ρ = 0   (independent):     I(A;B) = {mod_taxes_kBT_ln2[0]:.4f} bits, "
      f"tax = {mod_taxes_J[0]:.3e} J")
print(f"  ρ = 0.5 (moderate corr.):  I(A;B) = {mod_taxes_kBT_ln2[50]:.4f} bits, "
      f"tax = {mod_taxes_J[50]:.3e} J")
print(f"  ρ → 1   (perfect corr.):   I(A;B) → 1.0 bit, "
      f"tax → {k_B * T * np.log(2):.3e} J = k_B T ln(2)")

# ═══════════════════════════════════════════════════════════════════
# SCALING TO MANY-BIT SYSTEMS
# ═══════════════════════════════════════════════════════════════════
# For a coordinated region with N bits and characteristic mutual
# information per bit-pair I_pair, the integrated implementation pays
# ~ k_B T ln(2) × N × H_avg, while the modular implementation that
# can't access cross-fragment correlations pays an additional
# ~ k_B T ln(2) × N(N-1)/2 × I_pair.
#
# For O(N^2)-correlated systems, the modularity tax is QUADRATIC in
# system size. This is the formal mechanism by which fragmentation
# pays for itself thermodynamically — the L→D claim's physical basis.

def modularity_tax_scaling(N_fragments, I_per_pair_bits):
    """Modularity tax for a system fragmented into N independent pieces."""
    n_pairs_lost = N_fragments * (N_fragments - 1) / 2
    return n_pairs_lost * I_per_pair_bits  # in bits

print(f"\n  Many-fragment scaling (modularity tax in bits at I_pair=0.1):")
for N in [2, 5, 10, 50, 100, 1000]:
    tax_bits = modularity_tax_scaling(N, 0.1)
    print(f"    N = {N:>5d} fragments → tax = {tax_bits:>10.0f} bits "
          f"= {tax_bits * k_B * T * np.log(2):.3e} J")

# ═══════════════════════════════════════════════════════════════════
# FIGURE
# ═══════════════════════════════════════════════════════════════════

fig, axes = plt.subplots(1, 2, figsize=(15, 7))
fig.set_facecolor('#0a0d14')

# Panel 1: Modularity tax in toy system as function of correlation
ax1 = axes[0]
ax1.set_facecolor('#0d1018')
ax1.plot(rhos, mod_taxes_kBT_ln2, color='#fbbf24', lw=2.5,
         label='Tax = I(A;B) bits')
ax1.fill_between(rhos, 0, mod_taxes_kBT_ln2, alpha=0.2, color='#fbbf24')

ax1.set_xlabel('Correlation parameter ρ between modules', color='#d4dae8', fontsize=11)
ax1.set_ylabel('Modularity tax (units of k_B T ln 2)', color='#d4dae8', fontsize=11)
ax1.set_title('Modularity tax in two-module toy system\n'
              'Boyd-Mandal-Crutchfield 2018 mechanism: lost cross-module\n'
              'correlations cannot be used as thermodynamic fuel',
              color='#d4dae8', fontsize=11, pad=10)
ax1.grid(True, alpha=0.12)
ax1.legend(fontsize=10, facecolor='#0d1018', edgecolor='#1a2236',
           labelcolor='#d4dae8')
ax1.tick_params(colors='#5a6b8a')
for s in ax1.spines.values(): s.set_color('#1a2236')

# Panel 2: Scaling with fragmentation depth
ax2 = axes[1]
ax2.set_facecolor('#0d1018')
N_range = np.logspace(0.5, 4, 100).astype(int)
for I_pair, color, label in [
    (0.01, '#4ecdc4', 'I_pair = 0.01 bits'),
    (0.1,  '#fbbf24', 'I_pair = 0.10 bits'),
    (0.5,  '#ec4899', 'I_pair = 0.50 bits'),
]:
    tax_bits = [modularity_tax_scaling(N, I_pair) for N in N_range]
    ax2.loglog(N_range, tax_bits, lw=2.2, color=color, label=label)

ax2.set_xlabel('Number of fragments N', color='#d4dae8', fontsize=11)
ax2.set_ylabel('Cumulative modularity tax (bits)', color='#d4dae8', fontsize=11)
ax2.set_title('Modularity tax scales as N(N-1)/2\n'
              'fragmenting a coordinated system into N pieces is\n'
              'thermodynamically QUADRATICALLY expensive',
              color='#d4dae8', fontsize=11, pad=10)
ax2.legend(fontsize=10, facecolor='#0d1018', edgecolor='#1a2236',
           labelcolor='#d4dae8', loc='lower right')
ax2.grid(True, alpha=0.12, which='both')
ax2.tick_params(colors='#5a6b8a')
for s in ax2.spines.values(): s.set_color('#1a2236')

fig.suptitle('Modularity dissipation — the L→D synthesis lemma\n'
             'Sebastian · Third Space · v16 · 2026',
             fontsize=13, color='#d4dae8', fontweight='bold', y=0.995)

plt.tight_layout()
plt.savefig(str(FIGURES_DIR / "modularity_dissipation.png"),
            dpi=180, bbox_inches='tight', facecolor=fig.get_facecolor())

print(f"\n  Saved figure: modularity_dissipation.png")

print("\n" + "=" * 72)
print("  KEY RESULT")
print("=" * 72)
print("""
  Boyd-Mandal-Crutchfield 2018 (Phys Rev X 8:031036) proves that
  fragmenting integrated computation pays a modularity tax equal to
  the cross-fragment mutual information that the modular
  implementation cannot exploit as thermodynamic fuel.

  For v16's L→D synthesis claim:

  - Coordinated fission (fragments maintain mutual information):
    inherits the L→D = 2L_d radiative-export envelope and the
    Lieb-Robinson coordination cost between fragments.

  - Uncoordinated fission (fragments lose mutual information):
    pays the modularity tax = k_B T ln(2) × I(fragments)
    which scales as N(N-1)/2 in fragment count.

  Either way, fragmentation does not escape the envelope. The L→D
  claim is now a synthesis of:

    1. Lieb-Robinson 1972 (relativistic information velocity)
    2. Boyd-Mandal-Crutchfield 2018 (modularity dissipation)
    3. Sivak-Crooks 2012 (finite-time tradeoffs)
    4. Wolpert-Korbel 2024 (stochastic-thermodynamic computation)
    5. Wright 2023 (radiative export bound)

  v16 must claim this as ORIGINAL SYNTHESIS composing five published
  results, NOT as a single theorem. The composition is novel; the
  ingredients are individually established.
""")
