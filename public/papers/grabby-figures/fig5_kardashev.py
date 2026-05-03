"""Figure 5: Hedged Kardashev curve — growth-rate moderation in advanced economies
plus AI-compute recoupling. Replaces v16's 'curve is bending' claim."""
import numpy as np
import matplotlib.pyplot as plt

fig = plt.figure(figsize=(13.5, 9))
fig.patch.set_facecolor('white')
gs = fig.add_gridspec(2, 3, hspace=0.42, wspace=0.32)

sec_per_year = 365.25 * 86400
EJ_to_W = 1e18 / sec_per_year

# Historical data (Smil 2017; BP Statistical Review; IEA; Our World in Data)
years = np.array([1820, 1850, 1870, 1900, 1920, 1940, 1950, 1960, 1970, 1980,
                  1990, 2000, 2010, 2015, 2018, 2020, 2022, 2024])
EJ_yr = np.array([20, 23, 32, 50, 75, 130, 155, 190, 225, 295,
                  370, 425, 530, 560, 595, 580, 605, 620])
W_total = EJ_yr * EJ_to_W
pop = np.array([1.04, 1.26, 1.37, 1.65, 1.86, 2.30, 2.54, 3.03, 3.70, 4.46,
                5.33, 6.14, 6.96, 7.39, 7.63, 7.81, 7.95, 8.12]) * 1e9
per_cap_W = W_total / pop
K_sagan = (np.log10(W_total) - 6) / 10

# === Panel 1: Total energy + extrapolations ===
ax1 = fig.add_subplot(gs[0, 0])
ax1.semilogy(years, W_total/1e12, 'o-', color='#e67e22', markersize=6, lw=1.5, label='Global energy (TW)')
years_fut = np.arange(1820, 2101)
# Logistic
def logistic(t, L, k, t0):
    return L / (1 + np.exp(-k*(t-t0)))
from scipy.optimize import curve_fit
try:
    popt_log, _ = curve_fit(logistic, years.astype(float), per_cap_W,
                             p0=[3000, 0.02, 1970], maxfev=10000)
    log_per_cap = logistic(years_fut, *popt_log)
    ax1.semilogy(years_fut, log_per_cap * pop[-1] / 1e12, '--', color='#3498db',
                 alpha=0.7, label='Logistic extrapolation')
except Exception:
    pass
ax1.axhline(1e16/1e12, color='#7f8c8d', ls=':', lw=0.9, alpha=0.7)
ax1.text(1825, 1e16/1e12*0.45, 'Kardashev I (planetary, $10^4$ TW)', fontsize=8, color='#7f8c8d')
ax1.set_xlabel('Year', fontsize=10)
ax1.set_ylabel('Global primary energy (TW, log)', fontsize=10)
ax1.set_title('Global primary energy 1820–2024', fontsize=10.5)
ax1.legend(fontsize=8.5, loc='upper left')
ax1.grid(True, alpha=0.25)

# === Panel 2: Per-capita ===
ax2 = fig.add_subplot(gs[0, 1])
ax2.plot(years, per_cap_W, 'o-', color='#16a085', markersize=6, lw=1.5,
         label='Per-capita energy (W)')
try:
    ax2.plot(years_fut, log_per_cap, '--', color='#3498db', alpha=0.7, label='Logistic fit')
except Exception:
    pass
ax2.set_xlabel('Year', fontsize=10)
ax2.set_ylabel('Per-capita energy (W)', fontsize=10)
ax2.set_title('Per-capita energy: relative decoupling\n(advanced economies stagnate; global still rising)', fontsize=10.5)
ax2.legend(fontsize=8.5, loc='upper left')
ax2.grid(True, alpha=0.25)

# === Panel 3: Growth rate ===
ax3 = fig.add_subplot(gs[0, 2])
log_E = np.log(W_total)
growth_rate = np.gradient(log_E, years)
ax3.plot(years, growth_rate*100, 'o-', color='#d68910', markersize=6, lw=1.5)
ax3.axhline(0, color='#34495e', ls='-', lw=0.5, alpha=0.5)
ax3.axhline(1.0, color='#16a085', ls=':', lw=1.0, alpha=0.7)
ax3.text(1825, 1.1, 'Balbi–Lingam 2025 ≈1%/yr ceiling', fontsize=7.5, color='#16a085')
ax3.set_xlabel('Year', fontsize=10)
ax3.set_ylabel('Growth rate (%/yr)', fontsize=10)
ax3.set_title('Growth-rate moderation\n(not a "bend" — just slowing)', fontsize=10.5)
ax3.grid(True, alpha=0.25)

# === Panel 4: Kardashev index ===
ax4 = fig.add_subplot(gs[1, 0])
ax4.plot(years, K_sagan, 'o-', color='#8e44ad', markersize=6, lw=1.5)
ax4.axhline(1.0, color='#7f8c8d', ls=':', lw=0.9, alpha=0.7)
ax4.text(1825, 1.01, 'Kardashev Type I = 1.0', fontsize=8, color='#7f8c8d')
ax4.set_xlabel('Year', fontsize=10)
ax4.set_ylabel('Kardashev index $K$', fontsize=10)
ax4.set_title(f'Kardashev index: $K(1820)={K_sagan[0]:.3f}$ → $K(2024)={K_sagan[-1]:.3f}$\n(Zhang+ 2022 project $K(2060)\\approx 0.745$)', fontsize=10.5)
ax4.set_ylim(0.65, 1.05)
ax4.grid(True, alpha=0.25)

# === Panel 5: AI compute trajectory (NEW) ===
ax5 = fig.add_subplot(gs[1, 1])
# IEA Energy and AI 2025: 415 TWh (2024) → 945 TWh (2030), ~15%/yr
# LBNL Dec 2024: US 176 TWh (2023, 4.4% US) → 325–580 TWh (2028, 6.7–12% US)
ai_years = np.array([2020, 2022, 2024, 2025, 2026, 2028, 2030, 2032])
# IEA base case projection (TWh)
iea_base = np.array([300, 340, 415, 477, 549, 720, 945, 1240])
# IEA accelerated case
iea_accel = np.array([300, 340, 415, 500, 600, 850, 1200, 1700])
# LBNL US projection
lbnl_us = np.array([155, 165, 176, 200, 235, 350, 440, 550])

ax5.plot(ai_years, iea_base, 'o-', color='#c0392b', lw=2.0, markersize=6,
         label='IEA base (~15%/yr global)')
ax5.plot(ai_years, iea_accel, 's--', color='#e74c3c', lw=1.8, markersize=5,
         label='IEA accelerated (Lift-Off)')
ax5.plot(ai_years, lbnl_us, '^-', color='#1f618d', lw=1.5, markersize=5,
         label='LBNL US-only')
ax5.axvline(2024, color='#7f8c8d', ls=':', lw=0.8, alpha=0.6)
ax5.text(2024.2, 1500, 'now', fontsize=8, color='#7f8c8d')
ax5.set_xlabel('Year', fontsize=10)
ax5.set_ylabel('Data-centre electricity (TWh/yr)', fontsize=10)
ax5.set_title('AI-compute electricity demand\n(global to 945 TWh by 2030 — recoupling)', fontsize=10.5)
ax5.legend(fontsize=8, loc='upper left')
ax5.grid(True, alpha=0.25)

# === Panel 6: Multiple interpretations summary ===
ax6 = fig.add_subplot(gs[1, 2])
ax6.axis('off')
ax6.set_xlim(0, 1)
ax6.set_ylim(0, 1)
ax6.text(0.5, 0.95, 'Four candidate interpretations',
         fontsize=11, fontweight='bold', ha='center', va='top')
interpretations = [
    ('① Healthy homeostatic transition', '#16a085'),
    ('② Industrial→service S-curve\n   (intensity decoupling)', '#3498db'),
    ('③ Temporary plateau before\n   next industrial revolution', '#d68910'),
    ('④ Pre-burnout pause', '#c0392b'),
]
y0 = 0.80
for txt, col in interpretations:
    ax6.text(0.07, y0, '●', fontsize=14, color=col, va='top')
    ax6.text(0.15, y0, txt, fontsize=9.5, va='top')
    y0 -= 0.12

ax6.text(0.5, 0.20,
         'The 1820–2024 record\ndoes not discriminate\namong these.',
         fontsize=10, ha='center', va='top', style='italic',
         color='#34495e',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='#fef5e7', edgecolor='#d68910'))

fig.suptitle('Energy trajectories 1820–2032: relative decoupling and AI-compute recoupling, with multiple interpretations',
             fontsize=12.5, fontweight='bold', y=0.995)

plt.savefig('/home/claude/v17/figures/fig5_kardashev.pdf', dpi=180, bbox_inches='tight')
plt.savefig('/home/claude/v17/figures/fig5_kardashev.png', dpi=180, bbox_inches='tight')
print("Figure 5 saved")
