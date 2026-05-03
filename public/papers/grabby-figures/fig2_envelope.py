"""Figure 2: The composed feasibility envelope (Stefan-Boltzmann + Lieb-Robinson)."""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm

# Constants (SI)
c = 2.998e8         # m/s
k_B = 1.381e-23     # J/K
sigma = 5.670e-8    # W m^-2 K^-4
ly = 9.461e15       # m
AU = 1.496e11       # m
sec_per_year = 365.25 * 86400
T_CMB = 2.725

def tau_min_SB(lambda_c, T_op):
    """Stefan-Boltzmann tooth: minimum response time at granularity λ, temperature T_op."""
    return k_B * np.log(2) / (4 * np.pi * sigma * T_op**3 * lambda_c**2)

fig, axes = plt.subplots(1, 2, figsize=(13.5, 6))
fig.patch.set_facecolor('white')

# Panel A: τ_min as function of T_op for three granularities
ax1 = axes[0]
T_range = np.logspace(np.log10(T_CMB), 3.2, 200)
configs = [
    (1e-9, '#e67e22', 'λ = 1 nm (atomic)'),
    (1e-12, '#16a085', 'λ = 1 pm (sub-atomic)'),
    (1e-6, '#8e44ad', 'λ = 1 μm (mesoscopic)'),
]
for lam, color, label in configs:
    tau_arr = np.array([tau_min_SB(lam, T) for T in T_range])
    ax1.loglog(T_range, tau_arr, lw=2.4, color=color, label=label)

ax1.axvline(T_CMB, color='#7f8c8d', ls=':', lw=1.2, alpha=0.7)
ax1.text(T_CMB*1.1, 1e-15, '$T_{\\rm CMB} = 2.725$ K', fontsize=8.5, color='#7f8c8d')

ax1.set_xlabel('Operational temperature $T_{\\rm op}$ (K)', fontsize=11)
ax1.set_ylabel('Minimum response time $\\tau_{\\rm min}$ (s)', fontsize=11)
ax1.set_title('Panel A — Stefan–Boltzmann tooth\n$\\tau_{\\rm min}=k_B\\ln 2 / (4\\pi\\sigma T_{\\rm op}^3 \\lambda^2)$',
              fontsize=11.5, pad=10)
ax1.legend(fontsize=9, loc='upper right', framealpha=0.95)
ax1.grid(True, alpha=0.25, which='both')

# Panel B: composed envelope L vs τ
ax2 = axes[1]
tau_range = np.logspace(-3, np.log10(1e7 * sec_per_year), 500)
L_relativistic = c * tau_range / 2

ax2.loglog(tau_range / sec_per_year, L_relativistic / ly, lw=2.6,
           color='#c0392b', label='$L_R = c\\tau/2$ (relativistic)', zorder=4)

# Stefan-Boltzmann τ floors
sb_lines = [
    (1e-9, 300, '#16a085', '$\\lambda{=}1\\,\\rm nm,\\ T{=}300\\,K$'),
    (1e-9, 10, '#1f618d', '$\\lambda{=}1\\,\\rm nm,\\ T{=}10\\,K$'),
    (1e-9, T_CMB, '#8e44ad', '$\\lambda{=}1\\,\\rm nm,\\ T{=}T_{\\rm CMB}$'),
]
for lam, T, color, label in sb_lines:
    tau_floor = tau_min_SB(lam, T)
    ax2.axvline(tau_floor / sec_per_year, color=color, ls='--', lw=1.4,
                alpha=0.85, label=f'$\\tau_{{\\min}}$ {label}')

# Forbidden region (above relativistic tooth)
ax2.fill_between(tau_range / sec_per_year, L_relativistic / ly, 1e10,
                 color='#fdedec', alpha=0.6, zorder=1, label='Forbidden')

# Reference distances
distances = [
    ('Earth–Moon', 384400e3 / ly),
    ('1 AU', AU / ly),
    ('Heliopause (~120 AU)', 120 * AU / ly),
    ('Proxima Centauri', 4.24),
    ('100 ly', 100),
    ('Galactic disc (~$10^5$ ly)', 1e5),
]
for name, d_ly in distances:
    ax2.axhline(d_ly, color='#95a5a6', ls=':', lw=0.7, alpha=0.55)
    ax2.text(2e-6, d_ly * 1.18, name, fontsize=8, color='#7f8c8d')

ax2.set_xlim(1e-6, 1e7)
ax2.set_ylim(1e-10, 1e6)
ax2.set_xlabel('Response timescale $\\tau$ (years)', fontsize=11)
ax2.set_ylabel('Coordinated extent $L$ (light-years)', fontsize=11)
ax2.set_title('Panel B — Composed envelope\nrelativistic tooth dominates at agent-plausible $\\tau$',
              fontsize=11.5, pad=10)
ax2.legend(fontsize=8, loc='lower right', framealpha=0.95)
ax2.grid(True, alpha=0.25, which='both')

plt.tight_layout()
plt.savefig('/home/claude/v17/figures/fig2_envelope.pdf', dpi=180, bbox_inches='tight')
plt.savefig('/home/claude/v17/figures/fig2_envelope.png', dpi=180, bbox_inches='tight')
print("Figure 2 saved")
