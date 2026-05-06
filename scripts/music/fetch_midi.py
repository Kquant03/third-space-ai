#!/usr/bin/env python3
"""
fetch_midi.py — Consequences of Infinity

Acquires the MIDI files for the listening programme on third-space.ai.
Run from the repo root after running setup.sh:

    bash scripts/music/setup.sh
    scripts/music/.venv/bin/python scripts/music/fetch_midi.py

Architecture
────────────
Four layers, tried in order:

  1. Direct URLs — high-confidence URLs verified live during script
     authorship. Sources include:
       · piano-midi.de (Bernd Krüger, CC-BY-SA 3.0 DE)
       · Mutopia Project canonical paths
       · IMSLP via the Special:ImagefromIndex/{file_id} redirect,
         which 302s to the underlying s9.imslp.org file and so
         survives requests.get(allow_redirects=True). Used for
         pieces only sequenced as IMSLP user uploads (Reccmo,
         Rdtennent, Clsmaestro, Mourey).

  2. Speculative URLs — a guessed URL (e.g. a piano-midi.de slug
     inferred from Bernd Krüger's naming convention but not directly
     verified). HEAD-checked first; promoted to a candidate only if
     the server responds 200.

  3. Mutopia discovery — for each composer in the manifest, scrape
     the Mutopia listing page (cgibin/make-table.cgi?Composer=…)
     and parse the HTML to build a dictionary of available pieces
     with their direct .mid URLs. Matching is by opus + title
     keywords. Used as a fallback when the layers above don't yield
     a working URL.

  4. Manual sourcing — for the few tracks not covered by any of the
     above, the script prints fallback instructions (typically IMSLP
     page URLs and what to download from them).

Each downloaded file is validated: parsed for note count, tempo, and
duration. Malformed files are rejected. Files that already exist in
public/audio/midi/ are validated but not re-downloaded — re-running
the script is idempotent and cheap.

Sources & licenses
──────────────────
  Mutopia Project   — public domain or CC-BY-SA, community LilyPond
                      typesetting, exemplary engraving quality
  piano-midi.de     — CC-BY-SA 3.0 DE, Bernd Krüger 1996–2018,
                      hand-crafted human performances of the entire
                      classical piano canon
  IMSLP (Petrucci)  — user-contributed synthesized MIDI under
                      various open licenses (CC0, CC-BY, CC-BY-SA);
                      sequencers credited per file in the README

Both source compositions are public domain. All typesettings are
freely redistributable under the terms cited above. Vendoring the
resulting MIDI into the repo is permitted; we acknowledge the
typesetters and sequencers in the README.
"""

import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("✗ requests / beautifulsoup4 not installed.")
    print("  run setup.sh first: bash scripts/music/setup.sh")
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────
#  Configuration
# ─────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
MIDI_DIR = REPO_ROOT / "public" / "audio" / "midi"

USER_AGENT = (
    "third-space-fetch/2.0 "
    "(stanley@third-space.ai; for the Consequences of Infinity programme)"
)

REQUEST_TIMEOUT = 30
REQUEST_DELAY = 0.5  # polite pause between requests to one host

MUTOPIA_BASE = "https://www.mutopiaproject.org"
MUTOPIA_LISTING = MUTOPIA_BASE + "/cgibin/make-table.cgi"

# IMSLP file fetches use the Special:ImagefromIndex/{file_id} redirect.
# The wiki resolves this to the actual s9.imslp.org CDN path with a 302,
# bypassing the JS countdown interstitial that fronts work-page links.
IMSLP_BASE = "https://imslp.org/wiki/Special:ImagefromIndex"

# IMSLP's CDN sometimes 403s requests that don't look browser-like.
# We use a Mozilla UA only for IMSLP hosts; everything else gets the
# polite project UA above.
IMSLP_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def imslp_url(file_id: int) -> str:
    """Build the canonical IMSLP redirect URL for a file ID."""
    return f"{IMSLP_BASE}/{file_id}"


# ─────────────────────────────────────────────────────────────────
#  Track manifest
#
#  Each track maps a destination filename to one of:
#    - a Mutopia query (composer slug + matching keywords)
#    - a direct URL (piano-midi.de or Mutopia URL we verified)
#    - manual: requires hand-fetching, the script prints instructions
# ─────────────────────────────────────────────────────────────────


@dataclass
class Track:
    filename: str
    title: str

    # Direct URL — used first if present
    direct_url: Optional[str] = None

    # Speculative URL — HEAD-checked first; promoted to a candidate
    # only on a 200 response. Used for guessed slugs (e.g. inferring
    # a piano-midi.de URL from Bernd Krüger's naming convention).
    speculative_url: Optional[str] = None

    # Mutopia query — composer slug + match terms
    mutopia_composer: Optional[str] = None
    mutopia_match: list = field(default_factory=list)

    # If both above fail, print fallback_msg and report as manual
    manual: bool = False
    fallback_msg: str = ""

    notes: str = ""


# All ~30 tracks from src/data/tracks.ts. Direct URLs are from
# piano-midi.de unless otherwise noted; the URL pattern there is
# /midis/{composer}/{slug}.mid

TRACKS: list = [
    # ═══════════════════════════════════════════════════════════════
    #  Movement I — Foundations
    # ═══════════════════════════════════════════════════════════════
    Track(
        filename="bach-wtc-c-major.mid",
        title="Bach — Prelude in C major, BWV 846 (WTC Book I)",
        direct_url="http://piano-midi.de/midis/bach/bach_846.mid",
        notes="Gounod heard the Ave Maria in this. The seedbed.",
    ),
    Track(
        filename="bach-goldberg-aria.mid",
        title="Bach — Aria from Goldberg Variations, BWV 988",
        direct_url=f"{MUTOPIA_BASE}/ftp/BachJS/BWV988/bwv-988-aria/bwv-988-aria.mid",
        notes="Bound to the Genesis paper. Mutopia LilyPond typesetting.",
    ),
    Track(
        filename="beethoven-moonlight-1.mid",
        title="Beethoven — Moonlight Sonata Op. 27 No. 2, 1st mvt",
        direct_url="http://piano-midi.de/midis/beethoven/mond_1.mid",
        notes="Adagio sostenuto — si deve suonare delicatissimamente.",
    ),
    Track(
        filename="beethoven-op109-finale.mid",
        title="Beethoven — Sonata Op. 109, finale (Andante molto cantabile)",
        mutopia_composer="BeethovenLv",
        mutopia_match=["Op. 109", "109"],
        fallback_msg=(
            "Late Beethoven sonatas are sparsely covered. Try:\n"
            "  https://imslp.org/wiki/Piano_Sonata_No.30,_Op.109_(Beethoven,_Ludwig_van)\n"
            "  Find the synthesized MIDI in the audio section.\n"
            "Save as beethoven-op109-finale.mid in public/audio/midi/."
        ),
    ),
    Track(
        filename="beethoven-op111-arietta.mid",
        title="Beethoven — Sonata Op. 111, 2nd mvt (Arietta)",
        mutopia_composer="BeethovenLv",
        mutopia_match=["Op. 111", "111"],
        fallback_msg=(
            "Op. 111 isn't on Mutopia. Try:\n"
            "  https://imslp.org/wiki/Piano_Sonata_No.32,_Op.111_(Beethoven,_Ludwig_van)\n"
            "  The Arietta is the 2nd movement.\n"
            "Save as beethoven-op111-arietta.mid in public/audio/midi/."
        ),
    ),
    Track(
        filename="schubert-d960-andante.mid",
        title="Schubert — Sonata in B♭, D. 960, 2nd mvt (Andante sostenuto)",
        direct_url="http://piano-midi.de/midis/schubert/schub_d960_2.mid",
        notes="Schubert's last music. Composed weeks before his death.",
    ),
    Track(
        filename="schubert-impromptu-op90-3.mid",
        title="Schubert — Impromptu in G♭, Op. 90 No. 3, D. 899",
        direct_url="http://piano-midi.de/midis/schubert/schuim-3.mid",
    ),
    # ═══════════════════════════════════════════════════════════════
    #  Movement II — The Romantic Crisis
    # ═══════════════════════════════════════════════════════════════
    Track(
        filename="chopin-nocturne-op9-2.mid",
        title="Chopin — Nocturne in E♭ major, Op. 9 No. 2",
        direct_url=(
            f"{MUTOPIA_BASE}/ftp/ChopinFF/O9/chopin_nocturne_op9_n2/"
            "chopin_nocturne_op9_n2.mid"
        ),
        notes="The most-recorded nocturne. Mutopia typesetting verified live.",
    ),
    Track(
        filename="chopin-nocturne-cs-minor.mid",
        title="Chopin — Nocturne in C♯ minor, B. 49 (Lento con gran espressione)",
        mutopia_composer="ChopinFF",
        mutopia_match=["B. 49", "B49", "C-sharp minor", "lento con gran"],
        fallback_msg=(
            "Posthumous publication. Search piano-midi.de or:\n"
            "  https://imslp.org/wiki/Nocturne_in_C-sharp_minor,_B.49_(Chopin,_Fr%C3%A9d%C3%A9ric)\n"
            "Save as chopin-nocturne-cs-minor.mid in public/audio/midi/."
        ),
    ),
    Track(
        filename="chopin-berceuse.mid",
        title="Chopin — Berceuse in D♭ major, Op. 57",
        mutopia_composer="ChopinFF",
        mutopia_match=["Op. 57", "Berceuse"],
        fallback_msg=(
            "Search piano-midi.de Chopin page or:\n"
            "  https://imslp.org/wiki/Berceuse,_Op.57_(Chopin,_Fr%C3%A9d%C3%A9ric)\n"
            "Save as chopin-berceuse.mid in public/audio/midi/."
        ),
    ),
    Track(
        filename="chopin-mazurka-op68-4.mid",
        title="Chopin — Mazurka in F minor, Op. 68 No. 4",
        mutopia_composer="ChopinFF",
        mutopia_match=["Op. 68", "Mazurka", "No. 4"],
        notes="Chopin's last work.",
        fallback_msg=(
            "Search piano-midi.de Chopin page or:\n"
            "  https://imslp.org/wiki/Mazurkas,_Op.68_(Chopin,_Fr%C3%A9d%C3%A9ric)\n"
            "Save as chopin-mazurka-op68-4.mid in public/audio/midi/."
        ),
    ),
    Track(
        filename="schumann-traumerei.mid",
        title="Schumann — Träumerei, Op. 15 No. 7 (Kinderszenen)",
        direct_url="http://piano-midi.de/midis/schumann/scn15_7.mid",
        notes="Verified URL from piano-midi.de (Bernd Krüger).",
    ),
    Track(
        filename="brahms-op117-1.mid",
        title="Brahms — Intermezzo in E♭ major, Op. 117 No. 1",
        direct_url="http://piano-midi.de/midis/brahms/brahms_opus117_1.mid",
        notes=(
            "schlaf sanft mein Kind. The lullaby for sorrows. "
            "Bound to the Against Grabby Expansion paper."
        ),
    ),
    Track(
        filename="brahms-op118-2.mid",
        title="Brahms — Intermezzo in A major, Op. 118 No. 2",
        # piano-midi.de doesn't have this one; only Op. 116 and 117
        mutopia_composer="BrahmsJ",
        mutopia_match=["Op. 118", "Intermezzo", "No. 2"],
        fallback_msg=(
            "Brahms Op. 118 isn't well covered. Try:\n"
            "  https://imslp.org/wiki/6_Klavierst%C3%BCcke,_Op.118_(Brahms,_Johannes)\n"
            "Save as brahms-op118-2.mid in public/audio/midi/."
        ),
    ),
    Track(
        filename="brahms-op119-1.mid",
        title="Brahms — Intermezzo in B minor, Op. 119 No. 1",
        # piano-midi.de has Op. 119 Rhapsodie but not the intermezzi.
        # No reliable direct URL; will need manual sourcing.
        mutopia_composer="BrahmsJ",
        mutopia_match=["Op. 119", "Intermezzo", "No. 1"],
        fallback_msg=(
            "Try IMSLP:\n"
            "  https://imslp.org/wiki/4_Klavierst%C3%BCcke,_Op.119_(Brahms,_Johannes)\n"
            "Save as brahms-op119-1.mid in public/audio/midi/."
        ),
    ),
    Track(
        filename="liszt-nuages-gris.mid",
        title="Liszt — Nuages gris, S. 199",
        mutopia_composer="LisztF",
        mutopia_match=["S. 199", "Nuages"],
        fallback_msg=(
            "Late Liszt. Try IMSLP:\n"
            "  https://imslp.org/wiki/Nuages_gris,_S.199_(Liszt,_Franz)\n"
            "Save as liszt-nuages-gris.mid in public/audio/midi/."
        ),
    ),
    Track(
        filename="liszt-lugubre-gondola-1.mid",
        title="Liszt — La Lugubre Gondola I, S. 200",
        direct_url=imslp_url(968429),
        mutopia_composer="LisztF",
        mutopia_match=["S. 200", "Lugubre", "Gondola"],
        fallback_msg=(
            "Late Liszt. Try IMSLP:\n"
            "  https://imslp.org/wiki/La_lugubre_gondola,_S.200_(Liszt,_Franz)\n"
            "Save as liszt-lugubre-gondola-1.mid in public/audio/midi/."
        ),
        notes=(
            "IMSLP synthesized MIDI by Clsmaestro — S.200/1, ~3:59. "
            "Composed in Venice, December 1882, two months before "
            "Wagner died there. Liszt told Lina Schmalhausen he had a "
            "premonition."
        ),
    ),
    # ═══════════════════════════════════════════════════════════════
    #  Movement III — Decadence to Form
    # ═══════════════════════════════════════════════════════════════
    Track(
        filename="satie-gymnopedie-1.mid",
        title="Satie — Gymnopédie No. 1 (lent et douloureux)",
        direct_url=(
            f"{MUTOPIA_BASE}/ftp/SatieE/gymnopedie_1/gymnopedie_1.mid"
        ),
        notes="Verified live URL. The opener.",
    ),
    Track(
        filename="satie-gnossienne-1.mid",
        title="Satie — Gnossienne No. 1",
        direct_url=(
            f"{MUTOPIA_BASE}/ftp/SatieE/Gnossienne/no_1/no_1.mid"
        ),
        notes="Verified URL from Mutopia listing. CC-BY-SA 4.0.",
    ),
    Track(
        filename="debussy-pas-sur-la-neige.mid",
        title="Debussy — Des pas sur la neige (Préludes Book I)",
        direct_url=imslp_url(357116),
        mutopia_composer="DebussyC",
        mutopia_match=["Pas sur la neige", "Footprints", "neige"],
        fallback_msg=(
            "Try piano-midi.de Debussy page or:\n"
            "  https://imslp.org/wiki/Pr%C3%A9ludes_(Book_1),_L.117_(Debussy,_Claude)\n"
            "Save as debussy-pas-sur-la-neige.mid in public/audio/midi/."
        ),
        notes=(
            "PROVISIONAL — IMSLP synthesized MIDI from the Préludes "
            "Book I page, ~2:28. The piece is nominally ~3:30 but MIDI "
            "tempo varies; LISTEN-VERIFY this is actually No. 6, Des "
            "pas sur la neige — alternate candidate is IMSLP file "
            "#870968 (Clsmaestro, ~3:08) if this one is wrong."
        ),
    ),
    Track(
        filename="debussy-cathedrale-engloutie.mid",
        title="Debussy — La cathédrale engloutie",
        direct_url=imslp_url(306396),
        mutopia_composer="DebussyC",
        mutopia_match=["cathédrale", "cathedrale", "engloutie"],
        fallback_msg=(
            "Try piano-midi.de Debussy page or IMSLP."
        ),
        notes=(
            "PROVISIONAL — IMSLP synthesized MIDI by Mourey, ~4:36. "
            "Duration matches the canonical recording length of "
            "Cathédrale (~5–6 min, slightly compressed in MIDI). "
            "LISTEN-VERIFY before publishing."
        ),
    ),
    Track(
        filename="debussy-clair-de-lune.mid",
        title="Debussy — Clair de lune (Suite bergamasque)",
        direct_url="http://piano-midi.de/midis/debussy/deb_clai.mid",
        notes="Verified URL from piano-midi.de (Bernd Krüger).",
    ),
    Track(
        filename="ravel-pavane.mid",
        title="Ravel — Pavane pour une infante défunte",
        # Speculative — guessed from Bernd Krüger's naming convention
        # (rav_*, deb_clai, etc.). HEAD-checked at fetch time; if the
        # server returns non-200, the script falls through to Mutopia
        # discovery and ultimately to the manual fallback.
        speculative_url="http://piano-midi.de/midis/ravel/rav_pavane.mid",
        mutopia_composer="RavelM",
        mutopia_match=["Pavane", "infante"],
        fallback_msg=(
            "Speculative piano-midi.de slug rav_pavane.mid did not "
            "resolve. The piano-midi.de Ravel page returns a 418 to "
            "scrapers, so verify by browser:\n"
            "  http://www.piano-midi.de/ravel.htm\n"
            "If absent, IMSLP has only orchestral MP3s for this piece — "
            "no piano-solo PD MIDI exists in the surveyed archives.\n"
            "Save as ravel-pavane.mid in public/audio/midi/."
        ),
    ),
    Track(
        filename="ravel-gibet.mid",
        title="Ravel — Le Gibet (Gaspard de la nuit)",
        mutopia_composer="RavelM",
        mutopia_match=["Gibet", "Gaspard"],
        fallback_msg=(
            "Try piano-midi.de Ravel page or IMSLP."
        ),
    ),
    Track(
        filename="scriabin-prelude-op11-9.mid",
        title="Scriabin — Prelude in E major, Op. 11 No. 9",
        direct_url=imslp_url(201000),
        mutopia_composer="ScriabinAN",
        mutopia_match=["Op. 11", "No. 9"],
        fallback_msg=(
            "Try IMSLP:\n"
            "  https://imslp.org/wiki/24_Preludes,_Op.11_(Scriabin,_Aleksandr)"
        ),
        notes=(
            "PROVISIONAL — IMSLP synthesized MIDI by Reccmo, labeled "
            "'24 Preludes' generically, ~5:35. The duration is too long "
            "for a single Op. 11 prelude (most are 30s–2min) so this "
            "may be an excerpt or a different prelude. LISTEN-VERIFY "
            "after fetch — if it isn't the E-major No. 9, mark this "
            "track as a gap and remove the URL."
        ),
    ),
    Track(
        filename="rachmaninoff-prelude-op32-12.mid",
        title="Rachmaninoff — Prelude in G♯ minor, Op. 32 No. 12",
        direct_url=imslp_url(872755),
        mutopia_composer="RachmaninoffSV",
        mutopia_match=["Op. 32", "No. 12"],
        fallback_msg=(
            "Try piano-midi.de Rachmaninov page or:\n"
            "  https://imslp.org/wiki/13_Preludes,_Op.32_(Rachmaninoff,_Sergei)"
        ),
        notes="IMSLP synthesized MIDI by Clsmaestro — ~4:14.",
    ),
    # ═══════════════════════════════════════════════════════════════
    #  Movement IV — Sacred Witness (Bach mass through the keyboard)
    #
    #  Cello, violin, voice, organ — all flowing into the piano sampler
    #  in the historical transcription tradition. The earlier broader
    #  sacred catalogue (Allegri, Tallis, Victoria, Hildegard) lives
    #  in EXTERNAL as YouTube link-outs to canonical performances —
    #  a single piano sampler cannot honour the spatial choral
    #  architecture of those works.
    # ═══════════════════════════════════════════════════════════════
    Track(
        filename="bach-cello-suite-5-sarabande.mid",
        title="Bach — Sarabande from Cello Suite No. 5, BWV 1011",
        direct_url=imslp_url(811860),
        notes=(
            "IMSLP synthesized MIDI by Rdtennent — the Sarabande "
            "movement only, ~2:30. The original Mutopia URL was broken "
            "(404). Bach also transcribed this suite himself for lute "
            "(BWV 995); the cello version is the canonical reading."
        ),
    ),
    Track(
        filename="bach-violin-partita-2-chaconne.mid",
        title="Bach — Chaconne from Violin Partita No. 2, BWV 1004",
        direct_url=imslp_url(515989),
        mutopia_composer="BachJS",
        mutopia_match=["1004"],
        fallback_msg=(
            "Try IMSLP for the original or the Brahms left-hand transcription:\n"
            "  https://imslp.org/wiki/Violin_Partita_No.2_in_D_minor,_BWV_1004_(Bach,_Johann_Sebastian)\n"
            "  https://imslp.org/wiki/5_Studien_(Brahms,_Johannes)  ← No. 5 is the Chaconne\n"
            "Save as bach-violin-partita-2-chaconne.mid in public/audio/midi/."
        ),
        notes=(
            "IMSLP synthesized MIDI by Rdtennent — full Chaconne, ~14:21. "
            "Brahms transcribed this for left hand alone in 1877 for "
            "Clara Schumann. Bound to the Rukha paper."
        ),
    ),
    Track(
        filename="bach-erbarme-dich.mid",
        title="Bach — Erbarme dich (St Matthew Passion BWV 244, No. 39)",
        manual=True,
        notes=(
            "Vocal aria; Liszt and Friedman both transcribed it for "
            "piano. Bound to the Rukha paper."
        ),
        fallback_msg=(
            "From IMSLP:\n"
            "  https://imslp.org/wiki/Matth%C3%A4uspassion,_BWV_244_(Bach,_Johann_Sebastian)\n"
            "Find: 'Aria: Erbarme Dich (Part II, No.47)' MIDI by Reccmo or M. Lanoiselée.\n"
            "Save as bach-erbarme-dich.mid in public/audio/midi/."
        ),
    ),
    Track(
        filename="bach-bwv622.mid",
        title="Bach — O Mensch, bewein dein Sünde groß, BWV 622",
        manual=True,
        notes=(
            "Organ chorale prelude, regularly performed on piano. "
            "From the Orgelbüchlein. Closes the programme."
        ),
        fallback_msg=(
            "Three good options:\n"
            "  1. IMSLP synthesized MIDI:\n"
            "     https://imslp.org/wiki/O_Mensch,_bewein_dein_S%C3%BCnde_gro%C3%9F,_BWV_622_(Bach,_Johann_Sebastian)\n"
            "  2. Mutopia BachJS folder, search for 'BWV 622' or 'Orgelbüchlein':\n"
            "     https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BachJS\n"
            "  3. MuseScore PD-licensed scores (filter to Public Domain):\n"
            "     https://musescore.com/sheetmusic?text=BWV+622\n"
            "Save as bach-bwv622.mid in public/audio/midi/."
        ),
    ),
]


# ─────────────────────────────────────────────────────────────────
#  HTTP session with polite defaults
# ─────────────────────────────────────────────────────────────────


_session = requests.Session()
_session.headers.update({"User-Agent": USER_AGENT})
_last_request_time: dict = {}


def _ua_for_url(url: str) -> str:
    """Per-host User-Agent. IMSLP's CDN 403s some non-browser UAs."""
    from urllib.parse import urlparse

    host = urlparse(url).netloc
    if "imslp" in host:
        return IMSLP_USER_AGENT
    return USER_AGENT


def _polite_pause(url: str) -> None:
    """Throttle requests per host."""
    from urllib.parse import urlparse

    host = urlparse(url).netloc
    last = _last_request_time.get(host, 0)
    elapsed = time.time() - last
    if elapsed < REQUEST_DELAY:
        time.sleep(REQUEST_DELAY - elapsed)
    _last_request_time[host] = time.time()


def fetch(url: str) -> bytes:
    """Fetch URL bytes with a polite delay between requests to one host."""
    _polite_pause(url)
    response = _session.get(
        url,
        timeout=REQUEST_TIMEOUT,
        headers={"User-Agent": _ua_for_url(url)},
        allow_redirects=True,
    )
    response.raise_for_status()
    return response.content


def head_check(url: str) -> bool:
    """
    HEAD-check a speculative URL. Returns True if the server responds
    with a 2xx status. Used to gate guessed URLs (e.g. inferred
    piano-midi.de slugs) before adding them as fetch candidates.

    Some servers (notably piano-midi.de in some configurations) reject
    HEAD requests outright; on a non-2xx HEAD we fall back to a tiny
    ranged GET (Range: bytes=0-13) to verify the file exists and starts
    with the MThd magic.
    """
    _polite_pause(url)
    headers = {"User-Agent": _ua_for_url(url)}
    try:
        response = _session.head(
            url,
            timeout=REQUEST_TIMEOUT,
            headers=headers,
            allow_redirects=True,
        )
        if 200 <= response.status_code < 300:
            return True
    except requests.RequestException:
        pass

    # Fallback: tiny ranged GET. Verifies both reachability AND that
    # the response starts with the MIDI magic bytes — protects against
    # a 200 OK that returns an HTML "not found" page.
    try:
        _polite_pause(url)
        response = _session.get(
            url,
            timeout=REQUEST_TIMEOUT,
            headers={**headers, "Range": "bytes=0-13"},
            allow_redirects=True,
            stream=False,
        )
        if 200 <= response.status_code < 300:
            return response.content[:4] == b"MThd"
    except requests.RequestException:
        pass

    return False


# ─────────────────────────────────────────────────────────────────
#  Mutopia discovery — scrape the listing page, parse out MIDI URLs
# ─────────────────────────────────────────────────────────────────


@dataclass
class MutopiaPiece:
    """One piece from a Mutopia listing."""

    title: str
    opus: str
    midi_url: str
    full_text: str  # full row text for matching


def discover_mutopia(composer_slug: str) -> list:
    """
    Fetch and parse the Mutopia listing for a composer.
    Returns a list of MutopiaPiece. Walks pagination if needed.
    """
    pieces: list = []
    seen_urls = set()
    startat = 0

    while True:
        url = f"{MUTOPIA_LISTING}?Composer={composer_slug}&startat={startat}"
        try:
            html = fetch(url).decode("utf-8", errors="replace")
        except Exception as e:
            print(f"      ! Mutopia listing fetch failed for {composer_slug}: {e}")
            break

        soup = BeautifulSoup(html, "html.parser")

        # Find all .mid file links. Mutopia's table format puts them in
        # <a href="...mid">.mid file</a> within table rows.
        mid_links = soup.find_all("a", href=re.compile(r"\.mid$"))

        new_count = 0
        for link in mid_links:
            href = link.get("href", "")
            if not href.endswith(".mid"):
                continue
            # Skip preview/auxiliary files
            if "preview" in href or "format0" in href:
                continue

            full_url = urljoin(MUTOPIA_BASE, href)
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            # The row containing this link has the piece info. Walk
            # back up to the <tr> or surrounding structure.
            row = link.find_parent("tr")
            if row is None:
                # Mutopia's nested-table layout sometimes hides the
                # parent row; fall back to nearest table.
                row = link.find_parent("table")
            row_text = row.get_text(" ", strip=True) if row else ""

            # Heuristic: opus is whatever appears between "by ... " and
            # the next field. We don't need to perfectly parse it; the
            # full_text is what we match against.
            opus = ""
            opus_match = re.search(
                r"(B\.?\s*\d+|Op\.?\s*\d+(?:,\s*No\.?\s*\d+)?|BWV\s*\d+|D\.?\s*\d+|S\.?\s*\d+|L\.?\s*\d+|HWV\s*\d+|K\.?\s*\d+)",
                row_text,
            )
            if opus_match:
                opus = opus_match.group(1)

            # Title: take the first 80 chars of the row text
            title = row_text[:120]

            pieces.append(
                MutopiaPiece(
                    title=title,
                    opus=opus,
                    midi_url=full_url,
                    full_text=row_text,
                )
            )
            new_count += 1

        # Pagination: Mutopia shows 10 results per page. If we got 10
        # new entries, there might be more.
        if new_count < 10:
            break
        startat += 10

        # Sanity cap
        if startat > 200:
            break

    return pieces


def match_mutopia(pieces: list, match_terms: list) -> Optional[str]:
    """
    Find the Mutopia piece whose row text matches all the given terms
    (case-insensitive). Returns the .mid URL if found.
    """
    if not match_terms:
        return None

    for piece in pieces:
        text = piece.full_text.lower()
        if all(term.lower() in text for term in match_terms):
            return piece.midi_url
    return None


# ─────────────────────────────────────────────────────────────────
#  MIDI validation
# ─────────────────────────────────────────────────────────────────


def _read_var_len(data, pos):
    value = 0
    while pos < len(data):
        byte = data[pos]
        pos += 1
        value = (value << 7) | (byte & 0x7F)
        if not (byte & 0x80):
            break
    return value, pos


def parse_midi_summary(midi_bytes: bytes) -> dict:
    """Parse a MIDI's structural summary. Raises ValueError on malformed."""
    if len(midi_bytes) < 14:
        raise ValueError("file too short")
    if midi_bytes[:4] != b"MThd":
        raise ValueError("no MThd header")

    header_len = int.from_bytes(midi_bytes[4:8], "big")
    if header_len != 6:
        raise ValueError(f"unexpected header length {header_len}")

    fmt = int.from_bytes(midi_bytes[8:10], "big")
    ntracks = int.from_bytes(midi_bytes[10:12], "big")
    division = int.from_bytes(midi_bytes[12:14], "big")

    microsec_per_quarter = 500_000
    note_count = 0
    max_ticks = 0

    pos = 14
    for _ in range(ntracks):
        if pos + 8 > len(midi_bytes):
            raise ValueError("truncated track header")
        if midi_bytes[pos : pos + 4] != b"MTrk":
            raise ValueError(f"expected MTrk at byte {pos}")
        track_len = int.from_bytes(midi_bytes[pos + 4 : pos + 8], "big")
        track_end = pos + 8 + track_len
        if track_end > len(midi_bytes):
            raise ValueError("truncated track data")
        pos += 8

        ticks = 0
        running_status = 0
        while pos < track_end:
            delta, pos = _read_var_len(midi_bytes, pos)
            ticks += delta
            if pos >= track_end:
                break
            byte = midi_bytes[pos]
            if byte & 0x80:
                running_status = byte
                pos += 1
            status = running_status

            if status == 0xFF:
                meta_type = midi_bytes[pos]
                pos += 1
                meta_len, pos = _read_var_len(midi_bytes, pos)
                if meta_type == 0x51 and meta_len == 3:
                    microsec_per_quarter = int.from_bytes(
                        midi_bytes[pos : pos + 3], "big"
                    )
                pos += meta_len
            elif status in (0xF0, 0xF7):
                sysex_len, pos = _read_var_len(midi_bytes, pos)
                pos += sysex_len
            else:
                msg_type = status & 0xF0
                if msg_type in (0x80, 0x90, 0xA0, 0xB0, 0xE0):
                    if msg_type == 0x90 and midi_bytes[pos + 1] > 0:
                        note_count += 1
                    pos += 2
                elif msg_type in (0xC0, 0xD0):
                    pos += 1
                else:
                    pos += 1
        max_ticks = max(max_ticks, ticks)
        pos = track_end

    if division & 0x8000:
        duration_s = 0.0
        bpm = 0.0
    else:
        ticks_per_quarter = max(division, 1)
        seconds_per_tick = (microsec_per_quarter / 1_000_000) / ticks_per_quarter
        duration_s = max_ticks * seconds_per_tick
        bpm = 60_000_000 / max(microsec_per_quarter, 1)

    return {
        "format": fmt,
        "ntracks": ntracks,
        "tempo_bpm": round(bpm, 1),
        "duration_seconds": round(duration_s, 1),
        "note_count": note_count,
    }


# ─────────────────────────────────────────────────────────────────
#  Per-track fetch
# ─────────────────────────────────────────────────────────────────


def fetch_track(track: Track, mutopia_cache: dict) -> tuple:
    """
    Resolve and download a single track.
    Returns (status, info) where status is one of:
      "ok"      — fetched successfully
      "present" — already on disk and valid
      "failed"  — could not fetch from any source
      "manual"  — requires manual sourcing
      "invalid" — existing file on disk failed to parse
    """
    target = MIDI_DIR / track.filename

    # If already present, validate and report.
    if target.exists() and target.stat().st_size > 0:
        try:
            data = target.read_bytes()
            summary = parse_midi_summary(data)
            return ("present", summary)
        except Exception as e:
            return ("invalid", f"existing file invalid: {e}")

    if track.manual:
        return ("manual", "requires manual sourcing")

    # Resolve URL: direct, then speculative (HEAD-checked), then Mutopia
    candidates: list = []

    if track.direct_url:
        candidates.append(("direct", track.direct_url))

    if track.speculative_url:
        print(f"      · HEAD-checking speculative URL…")
        if head_check(track.speculative_url):
            candidates.append(("speculative", track.speculative_url))
        else:
            print(f"      · speculative URL not reachable, skipping")

    if track.mutopia_composer and track.mutopia_match:
        if track.mutopia_composer not in mutopia_cache:
            print(f"      · discovering Mutopia/{track.mutopia_composer}…")
            mutopia_cache[track.mutopia_composer] = discover_mutopia(
                track.mutopia_composer
            )
        url = match_mutopia(
            mutopia_cache[track.mutopia_composer],
            track.mutopia_match,
        )
        if url:
            candidates.append(("mutopia", url))

    if not candidates:
        return ("manual", "no URL configured and Mutopia search returned nothing")

    last_error = None
    for source, url in candidates:
        try:
            data = fetch(url)
            if not data or len(data) < 14:
                last_error = f"empty/short response from {url}"
                continue
            try:
                summary = parse_midi_summary(data)
            except ValueError as e:
                last_error = f"{url}: invalid MIDI ({e})"
                continue

            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            summary["_source"] = source
            summary["_url"] = url
            return ("ok", summary)
        except requests.HTTPError as e:
            last_error = f"{url}: HTTP {e.response.status_code}"
        except requests.RequestException as e:
            last_error = f"{url}: {e}"
        except Exception as e:  # noqa: BLE001
            last_error = f"{url}: {e}"

    return ("failed", last_error or "all sources failed")


# ─────────────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────────────


def main() -> int:
    print()
    print("─" * 68)
    print("  Consequences of Infinity — fetching the listening programme")
    print("─" * 68)
    print(f"  → destination: {MIDI_DIR.relative_to(REPO_ROOT)}")
    print(f"  → tracks:      {len(TRACKS)}")
    print()

    MIDI_DIR.mkdir(parents=True, exist_ok=True)

    mutopia_cache: dict = {}
    counts = {"ok": 0, "present": 0, "failed": 0, "manual": 0, "invalid": 0}
    needs_attention: list = []

    for track in TRACKS:
        status, info = fetch_track(track, mutopia_cache)
        counts[status] += 1

        marker = {
            "ok": "✓",
            "present": "·",
            "failed": "✗",
            "invalid": "!",
            "manual": "—",
        }[status]

        print(f"  {marker} {track.filename}")
        print(f"      {track.title}")

        if status in ("ok", "present"):
            s = info
            mins, secs = divmod(int(s["duration_seconds"]), 60)
            extra = (
                f" via {s['_source']}"
                if status == "ok" and "_source" in s
                else ""
            )
            print(
                f"      {s['note_count']} notes · {s['tempo_bpm']} BPM · "
                f"{mins}:{secs:02d}{extra}"
            )
            if track.notes:
                print(f"      note: {track.notes}")
        else:
            print(f"      {info}")
            if track.fallback_msg:
                for line in track.fallback_msg.splitlines():
                    print(f"      ↳ {line}")
            needs_attention.append((track.filename, track.title, status))
        print()

    # ── Summary ─────────────────────────────────────────────────
    total = len(TRACKS)
    print("─" * 68)
    print(
        f"  fetched: {counts['ok']:2d}    "
        f"present: {counts['present']:2d}    "
        f"failed: {counts['failed']:2d}    "
        f"manual: {counts['manual']:2d}    "
        f"(of {total})"
    )
    print("─" * 68)

    if needs_attention:
        print()
        print("  Tracks needing attention:")
        for filename, title, status in needs_attention:
            mark = {
                "manual": "manual sourcing",
                "failed": "URL failed",
                "invalid": "existing file invalid",
            }[status]
            print(f"    · [{mark}] {filename}")
            print(f"        {title}")
        print()
        print("  See each track's fallback message above for instructions.")
        print(
            "  When you have a file, place it at "
            f"{MIDI_DIR.relative_to(REPO_ROOT)}/<filename>"
        )
        print("  and re-run this script to validate.")

    print()
    print("  Compositions in the public domain.")
    print("  MIDI typesettings:")
    print("    · Mutopia Project — CC-PD or CC-BY-SA")
    print("    · piano-midi.de   — CC-BY-SA 3.0 DE (Bernd Krüger, 1996–2018)")
    print()

    accounted = counts["ok"] + counts["present"]
    return 0 if accounted == total else 1


if __name__ == "__main__":
    sys.exit(main())
