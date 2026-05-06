#!/usr/bin/env bash
# setup.sh — bootstrap the MIDI fetcher's environment
#
# Run from the repo root:
#
#     bash scripts/music/setup.sh
#
# Then run the fetcher:
#
#     scripts/music/.venv/bin/python scripts/music/fetch_midi.py
#
# Or activate the venv and run normally:
#
#     source scripts/music/.venv/bin/activate
#     python scripts/music/fetch_midi.py
#
# Why a venv: Ubuntu 24 (and most modern Debian-derived distros) ship
# with PEP 668's externally-managed-environment lockdown. `pip install
# requests` against the system Python is refused by default. Rather
# than override that with --break-system-packages, we use a venv —
# the recommended workflow.

set -euo pipefail

# ── locate ourselves ───────────────────────────────────────────
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$HERE/.venv"

# ── prereqs ───────────────────────────────────────────────────
if ! command -v python3 >/dev/null 2>&1; then
  echo "✗ python3 not found in PATH"
  echo "  install with: sudo apt install python3 python3-venv"
  exit 1
fi

# Some distros split venv into a separate package
if ! python3 -c "import venv" 2>/dev/null; then
  echo "✗ python3-venv module not available"
  echo "  install with: sudo apt install python3-venv"
  exit 1
fi

# ── create venv ────────────────────────────────────────────────
if [ -d "$VENV" ]; then
  echo "· venv already exists at $VENV"
else
  echo "· creating venv at $VENV"
  python3 -m venv "$VENV"
fi

# ── install deps ───────────────────────────────────────────────
PIP="$VENV/bin/pip"
echo "· upgrading pip"
"$PIP" install --quiet --upgrade pip

echo "· installing requests + beautifulsoup4"
"$PIP" install --quiet \
  "requests>=2.31,<3" \
  "beautifulsoup4>=4.12,<5"

# ── done ──────────────────────────────────────────────────────
echo
echo "✓ setup complete"
echo
echo "  to fetch MIDI files, run:"
echo "    $VENV/bin/python $HERE/fetch_midi.py"
echo
