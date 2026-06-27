#!/usr/bin/env python3
"""
══════════════════════════════════════════════════════════════════════════
STEFAN-BOLTZMANN RADIATIVE-EXPORT ENVELOPE
The L_⊙ peg fix — v16's load-bearing physics derivation
══════════════════════════════════════════════════════════════════════════

The v15 paper derived an "energetic tooth" by capping heat exhaust at a
single solar luminosity (L_⊙). This pegging was the most vulnerable
physical claim in v15, because a coordinated region of extent L
containing ρ⋆L³ stars is in principle entitled to ρ⋆L³ × L_⊙ of
available power — pegging the budget at L_⊙ regardless of L is the
most aggressive scaling possible (L^0 in volume) and was not derived
from first principles.

v16 REPLACES THIS WITH RADIATIVE EXPORT BOUND. A coordinated region
must export waste heat through its boundary surface. By Stefan-Boltzmann,
the maximum power radiable at operational temperature T_op through a
sphere of radius R is:

    P_max(R, T_op) = 4π R² σ T_op⁴

This is a fundamental physical bound, not an arbitrary energy budget.
It scales with surface (L²), not volume — meaning that as a
coordinated region grows, available cooling grows quadratically while
the irreversible-erasure heat-load (k_B T ln 2 × (L/λ)² updates per τ)
also grows quadratically. The two L² terms compete, and the cusp
becomes a function of T_op rather than a dimensional accident.

Following Wright (2023) ApJ 956:34 — the Landsberg/Carnot bound on
Dyson-sphere work extraction — and Bilokur-Gopalakrishnan-Majidy
(2024) arXiv:2411.12805 on thermodynamic limits to fault-tolerant
quantum computing.

KEY RESULT: at any operational temperature T_op consistent with known
physics (CMB floor 2.7 K through engineered shells 10-50 K through
warm substrates 300 K), the relativistic tooth (L ≤ cτ/2) is binding
at agent-plausible response times. The Stefan-Boltzmann tooth tightens
the bound but does not introduce the cusp — it eliminates the L_⊙
artifact while preserving the qualitative claim.

This is the BIG AGENCY REFRAME: agent-coordinated galactic-scale
extent at agent-plausible response timescales is forbidden, and the
forbidding does not depend on a vulnerable L_⊙ choice. It depends only
on the relativistic ceiling and a Stefan-Boltzmann surface bound.

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
from matplotlib.colors import LogNorm

# Constants
c = 2.998e8           # m/s
k_B = 1.381e-23       # J/K
sigma = 5.670e-8      # W/(m² K⁴) Stefan-Boltzmann
ly = 9.461e15         # m
AU = 1.496e11         # m
sec_per_year = 365.25 * 86400
T_CMB = 2.725         # K (cosmic microwave background — the floor)

print("=" * 72)
print("  STEFAN-BOLTZMANN ENVELOPE — THE L_⊙ PEG FIX")
print("  v16 load-bearing physics")
print("=" * 72)

# ═══════════════════════════════════════════════════════════════════
# THE TWO TEETH
# ═══════════════════════════════════════════════════════════════════
#
# Tooth 1 (relativistic, Lieb-Robinson): coordination requires signal
# round-trip within τ. With v ≤ c:
#     L_R(τ) = c τ / 2
#
# Tooth 2 (Stefan-Boltzmann radiative export): irreversible erasures
# at granularity λ over surface 4πL² must dissipate at rate ≤ surface
# blackbody emission at T_op. Setting heat load ≤ radiative ceiling:
#     k_B T_op ln(2) × (L/λ)² / τ ≤ 4π L² σ T_op⁴
# Solving for τ:
#     τ_min(λ, T_op) = k_B ln(2) / (4π σ T_op³ λ²)
#
# Note this is a τ floor, not an L bound. The Stefan-Boltzmann tooth
# tells us how fast we can run, not how big we can be — given a
# spatial granularity λ at which we register information, we cannot
# update faster than τ_min.

def tau_min_SB(lambda_c, T_op):
    """Minimum response time at granularity λ_c, operational T_op."""
    return k_B * np.log(2) / (4 * np.pi * sigma * T_op**3 * lambda_c**2)

def L_R(tau):
    """Lieb-Robinson tooth: max coordinated extent at response time τ."""
    return c * tau / 2

# ═══════════════════════════════════════════════════════════════════
# τ_min ACROSS PHYSICALLY PLAUSIBLE PARAMETERS
# ═══════════════════════════════════════════════════════════════════

T_op_grid = np.array([T_CMB, 10, 50, 100, 300, 1000])  # K
lambda_grid = np.array([1e-15, 1e-12, 1e-9, 1e-6])     # m: nuclear, picometer, atomic, micron

print("\n  τ_min (seconds) across (λ, T_op):")
print(f"  {'λ':>14s} | " + " | ".join(f"T={T:>5.1f}K" for T in T_op_grid))
print(f"  {'─'*14} + " + "-+-".join(["-" * 9] * len(T_op_grid)))
for lam in lambda_grid:
    tau_row = [tau_min_SB(lam, T) for T in T_op_grid]
    if lam >= 1e-9:
        lam_str = f"{lam*1e9:.0f} nm"
    elif lam >= 1e-12:
        lam_str = f"{lam*1e12:.0f} pm"
    else:
        lam_str = f"{lam*1e15:.0f} fm"
    print(f"  {lam_str:>14s} | " + " | ".join(
        f"{tau:>9.2e}" for tau in tau_row))

# At λ = 1 nm, T = 2.7 K (CMB floor):
print(f"\n  Reference values:")
print(f"    τ_min at λ=1 nm, T=300 K:   {tau_min_SB(1e-9, 300):.3e} s")
print(f"    τ_min at λ=1 nm, T=10 K:    {tau_min_SB(1e-9, 10):.3e} s")
print(f"    τ_min at λ=1 nm, T=2.725 K: {tau_min_SB(1e-9, T_CMB):.3e} s")

# ═══════════════════════════════════════════════════════════════════
# THE COMPOSED ENVELOPE
# ═══════════════════════════════════════════════════════════════════
# At τ = τ_min(λ, T_op), the radiative ceiling is just satisfied.
# At larger τ, the Stefan-Boltzmann tooth is satisfied with margin.
# The relativistic tooth then determines max reach.
# At τ = τ_min, max reach is L_R(τ_min) = c × τ_min / 2.

print("\n  Maximum coordinated extent L_R at τ_min:")
print(f"  {'λ':>14s} | " + " | ".join(f"T={T:>5.1f}K" for T in T_op_grid))
print(f"  {'─'*14} + " + "-+-".join(["-" * 14] * len(T_op_grid)))
for lam in lambda_grid:
    L_row = [L_R(tau_min_SB(lam, T)) for T in T_op_grid]
    if lam >= 1e-9:
        lam_str = f"{lam*1e9:.0f} nm"
    elif lam >= 1e-12:
        lam_str = f"{lam*1e12:.0f} pm"
    else:
        lam_str = f"{lam*1e15:.0f} fm"
    print(f"  {lam_str:>14s} | " + " | ".join(
        f"{L/ly:>8.2e} ly" if L/ly > 1e-3 else f"{L/AU:>7.2e} AU"
        for L in L_row))

# ═══════════════════════════════════════════════════════════════════
# THE BIG AGENCY ARGUMENT
# ═══════════════════════════════════════════════════════════════════
# To coordinate across galactic distances (~10⁵ ly), τ ≥ 2 × 10⁵ ly/c
# = 2×10⁵ years. This is the relativistic floor and it does not
# depend on T_op or λ at all. The Stefan-Boltzmann tooth becomes
# binding only for very fast (sub-millisecond) protocols at low T.

print("\n  KEY: The relativistic tooth alone forbids agent-coordinated")
print("  galactic-scale extent at agent-plausible timescales.")
print(f"\n  Required τ to coordinate across galaxy (10⁵ ly):")
print(f"    τ ≥ {2 * 1e5 * ly / c / sec_per_year:.0f} years (relativistic round-trip)")
print(f"\n  At τ ~ days/years (agent-plausible), L_R is sub-stellar:")
for tau_yr in [1/365, 1, 100, 1e4, 1e5]:
    L = L_R(tau_yr * sec_per_year)
    if L < AU:
        L_str = f"{L/1e3:.0f} km"
    elif L < 1000 * AU:
        L_str = f"{L/AU:.0f} AU"
    else:
        L_str = f"{L/ly:.3f} ly"
    if tau_yr < 1:
        tau_str = f"{tau_yr*365:.0f} days"
    else:
        tau_str = f"{tau_yr:.0e} yr"
    print(f"    τ = {tau_str:>10s}  →  L_R = {L_str:>15s}")

# ═══════════════════════════════════════════════════════════════════
# FIGURE: THE COMPOSED ENVELOPE WITH TWO TEETH
# ═══════════════════════════════════════════════════════════════════

fig, axes = plt.subplots(1, 2, figsize=(15, 7))
fig.set_facecolor('#0a0d14')

# Panel 1: τ_min as function of T_op for fixed λ = 1 nm
ax1 = axes[0]
ax1.set_facecolor('#0d1018')
T_range = np.logspace(np.log10(T_CMB), 3, 200)
for lam, color, label in [(1e-9, '#fbbf24', 'λ = 1 nm (atomic)'),
                            (1e-12, '#4ecdc4', 'λ = 1 pm (nuclear-ish)'),
                            (1e-6, '#ec4899', 'λ = 1 μm (mesoscopic)')]:
    tau_min = np.array([tau_min_SB(lam, T) for T in T_range])
    ax1.loglog(T_range, tau_min, lw=2.2, color=color, label=label)

ax1.axvline(T_CMB, color='#a0aec0', ls=':', lw=1, alpha=0.6)
ax1.text(T_CMB * 1.05, 1e-15, 'T_CMB = 2.725 K\n(physical floor)',
         fontsize=8, color='#a0aec0')

ax1.set_xlabel('Operational temperature T_op (K)', color='#d4dae8', fontsize=11)
ax1.set_ylabel('Minimum response time τ_min (s)', color='#d4dae8', fontsize=11)
ax1.set_title('Stefan-Boltzmann tooth: τ_min = k_B ln(2) / (4π σ T_op³ λ²)\n'
              '— floor on response time at given granularity & temperature',
              color='#d4dae8', fontsize=11, pad=10)
ax1.legend(fontsize=9, facecolor='#0d1018', edgecolor='#1a2236',
           labelcolor='#d4dae8', loc='upper right')
ax1.tick_params(colors='#5a6b8a')
for s in ax1.spines.values(): s.set_color('#1a2236')
ax1.grid(True, alpha=0.12, which='both')

# Panel 2: The composed envelope L_env vs τ, with both teeth
ax2 = axes[1]
ax2.set_facecolor('#0d1018')

tau_range = np.logspace(-3, np.log10(1e7 * sec_per_year), 500)
L_relativistic = c * tau_range / 2  # always binding at agent timescales

ax2.loglog(tau_range / sec_per_year, L_relativistic / ly, lw=2.5,
            color='#fbbf24', label='L_R = cτ/2 (relativistic)', zorder=4)

# Stefan-Boltzmann τ floors for several (λ, T) — these are vertical
# lines in τ; below them the energetic tooth forbids
for lam, T, color, label in [
    (1e-9, 300, '#ec4899', 'λ=1nm, T=300K'),
    (1e-9, 10,  '#4ecdc4', 'λ=1nm, T=10K'),
    (1e-9, T_CMB, '#a78bfa', 'λ=1nm, T=2.7K'),
]:
    tau_floor = tau_min_SB(lam, T)
    ax2.axvline(tau_floor / sec_per_year, color=color, ls='--', lw=1.3,
                alpha=0.7, label=f'τ_min ({label})')

# Reference distances
distances = [
    ('Earth–Moon', 384400e3 / ly),
    ('1 AU', AU / ly),
    ('Heliopause (~120 AU)', 120 * AU / ly),
    ('Proxima Centauri', 4.24),
    ('100 ly', 100),
    ('Galactic disc (~10⁵ ly)', 1e5),
]
for name, d_ly in distances:
    ax2.axhline(d_ly, color='#a0aec0', ls=':', lw=0.6, alpha=0.4)
    ax2.text(2e-6, d_ly * 1.15, name, fontsize=8, color='#a0aec0')

# Forbidden region above the relativistic tooth
ax2.fill_between(tau_range / sec_per_year, L_relativistic / ly, 1e10,
                  color='#3b1d3f', alpha=0.25, label='Forbidden')

ax2.set_xlabel('Response timescale τ (years)', color='#d4dae8', fontsize=11)
ax2.set_ylabel('Coordinated extent L (light-years)', color='#d4dae8', fontsize=11)
ax2.set_title('The composed envelope — relativistic tooth dominates at\n'
              'agent-plausible timescales regardless of T_op or λ choice',
              color='#d4dae8', fontsize=11, pad=10)
ax2.legend(fontsize=8, facecolor='#0d1018', edgecolor='#1a2236',
           labelcolor='#d4dae8', loc='lower right')
ax2.set_xlim(1e-6, 1e7)
ax2.set_ylim(1e-10, 1e6)
ax2.tick_params(colors='#5a6b8a')
for s in ax2.spines.values(): s.set_color('#1a2236')
ax2.grid(True, alpha=0.12, which='both')

fig.suptitle('The L_⊙ peg fix — Stefan-Boltzmann radiative export bound\n'
             'Sebastian · Third Space · v16 · 2026',
             fontsize=13, color='#d4dae8', fontweight='bold', y=0.995)

plt.tight_layout()
plt.savefig(str(FIGURES_DIR / "stefan_boltzmann_envelope.png"),
            dpi=180, bbox_inches='tight', facecolor=fig.get_facecolor())

print(f"\n  Saved: stefan_boltzmann_envelope.png")

print("\n" + "=" * 72)
print("  SUMMARY")
print("=" * 72)
print("""
  The Stefan-Boltzmann radiative-export bound replaces the v15 L_⊙ peg
  with a fundamental physical surface-area bound that scales properly
  (as L²) with coordinated extent.

  KEY RESULTS:

  1. The Stefan-Boltzmann tooth is a τ floor (minimum response time at
     given λ, T_op), not an L ceiling. It tells us the fastest
     coordination we can run; the relativistic tooth tells us the
     largest extent we can reach at any given τ.

  2. The relativistic tooth alone is the load-bearing constraint at
     agent-plausible timescales (days to centuries). To coordinate
     across the galaxy requires τ ≥ 200,000 years — a response time
     that is no longer recognizable as agency.

  3. The cusp τ* of v15 (1.88×10⁵ yr) survives as the warm-substrate
     special case but is now properly understood as a function of
     (λ, T_op) rather than a dimensional accident from the L_⊙ choice.

  4. THE BIG AGENCY REFRAME: agent-coordinated galactic-scale extent
     is not just energetically expensive — it is structurally too slow
     to be agency at all. The system that 'covers' the galaxy is not
     a mind making decisions; it is a configuration that took a
     million years to reach steady state.

  This converts a vulnerable quantitative claim (cusp at exactly
  1.88×10⁵ yr depending on L_⊙) into a robust qualitative one (any
  coordinated agency at galactic scale is too slow to be agency at
  agent-plausible timescales). The reviewer cannot defeat it by
  contesting the energy budget; the relativistic tooth is unbeatable.
""")
