#!/usr/bin/env python3
"""
repo_map.py — Repository structure mapper for Claude context management.

Usage:
    python repo_map.py                    # map current directory
    python repo_map.py /path/to/repo      # map specific directory
    python repo_map.py --out map.txt      # write to file instead of stdout
    python repo_map.py --max-kb 500       # skip files larger than 500KB (default: 256)

Output:
    - Directory tree (gitignore-filtered) with LOC + token estimates inline
    - LOC and token totals per language
    - Flat file list sorted by token count (heaviest context cost first)
    - Grand totals with Claude context window usage estimate

Token estimation:
    Approximates cl100k_base / o200k_base tokenization (GPT-4 / Claude family).
    Rule of thumb: ~4 characters per token for code, ~3.5 for prose.
    This gives ±15% accuracy without requiring tiktoken as a dependency.
    For exact counts: pip install tiktoken and set USE_TIKTOKEN=True below.
"""

import os
import re
import sys
import argparse
from pathlib import Path
from collections import defaultdict

# ── Optional tiktoken for exact token counts ──────────────────────────────────
USE_TIKTOKEN = False
try:
    import tiktoken
    _enc = tiktoken.get_encoding('cl100k_base')
    USE_TIKTOKEN = True
except ImportError:
    pass


# ── Size gate — never read files larger than this (prevents hangs) ────────────
DEFAULT_MAX_FILE_KB = 256   # 256 KB; override with --max-kb


def estimate_tokens(text, lang=None):
    if not text:
        return 0
    if USE_TIKTOKEN:
        return len(_enc.encode(text))
    prose_langs = {'Markdown', 'reStructuredText'}
    data_langs  = {'JSON', 'YAML', 'TOML', 'SQL', 'Protobuf'}
    if lang in prose_langs:
        ratio = 3.5
    elif lang in data_langs:
        ratio = 3.0
    else:
        ratio = 4.0
    return max(1, round(len(text) / ratio))


# ── Language detection ────────────────────────────────────────────────────────
EXT_TO_LANG = {
    '.py':    'Python',
    '.js':    'JavaScript',
    '.jsx':   'JavaScript/React',
    '.ts':    'TypeScript',
    '.tsx':   'TypeScript/React',
    '.mjs':   'JavaScript',
    '.cjs':   'JavaScript',
    '.rs':    'Rust',
    '.go':    'Go',
    '.java':  'Java',
    '.c':     'C',
    '.cpp':   'C++',
    '.h':     'C/C++ Header',
    '.hpp':   'C++ Header',
    '.cs':    'C#',
    '.rb':    'Ruby',
    '.php':   'PHP',
    '.swift': 'Swift',
    '.kt':    'Kotlin',
    '.sh':    'Shell',
    '.bash':  'Shell',
    '.zsh':   'Shell',
    '.html':  'HTML',
    '.css':   'CSS',
    '.scss':  'SCSS',
    '.json':  'JSON',
    '.toml':  'TOML',
    '.yaml':  'YAML',
    '.yml':   'YAML',
    '.md':    'Markdown',
    '.rst':   'reStructuredText',
    '.glsl':  'GLSL',
    '.wgsl':  'WGSL',
    '.frag':  'GLSL',
    '.vert':  'GLSL',
    '.sql':   'SQL',
    '.graphql': 'GraphQL',
    '.proto': 'Protobuf',
    '.r':     'R',
    '.R':     'R',
    '.lua':   'Lua',
    '.tf':    'Terraform',
    '.ex':    'Elixir',
    '.exs':   'Elixir',
    '.erl':   'Erlang',
    '.hs':    'Haskell',
    '.ml':    'OCaml',
}

# Directories to skip entirely — never recurse into these
ALWAYS_IGNORE_DIRS = {
    '.git', '__pycache__',
    # venv variants (including GhoulJamz dual-venv setup)
    '.venv', '.venv-mert', 'venv', 'env', '.env',
    # JS frameworks
    'node_modules', '.next', '.nuxt', '.svelte-kit', '.astro',
    # Build outputs
    'dist', 'build', 'out', '_build', 'target',
    # Deploy / edge runtime caches
    '.wrangler', '.vercel', '.netlify', '.serverless',
    '.turbo', '.nx', '.parcel-cache', '.expo', '.docusaurus',
    # Caches
    '.cache', '.tox', '.mypy_cache', '.pytest_cache',
    '.ruff_cache', '.eggs',
    # Test coverage reports
    'coverage', 'htmlcov', '.coverage',
    # IDEs
    '.idea', '.vscode',
    # ML model weights and large data (never text)
    'models', 'checkpoints',
    # iOS
    'Pods',
}

# File patterns to skip — glob-style (* prefix = suffix match)
ALWAYS_IGNORE_FILES = {
    # System
    '.DS_Store', 'Thumbs.db',
    # Compiled
    '*.pyc', '*.pyo', '*.so', '*.dylib', '*.dll', '*.exe', '*.class',
    # Images / audio / video (SVG left out — often hand-written as code)
    '*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp', '*.ico',
    '*.bmp', '*.tiff', '*.avif', '*.heic',
    '*.mp3', '*.wav', '*.flac', '*.ogg', '*.aac', '*.m4a',
    '*.mp4', '*.webm', '*.mkv', '*.mov', '*.avi',
    # Documents (binary — PDF stream bytes are not source code)
    '*.pdf', '*.doc', '*.docx', '*.xls', '*.xlsx', '*.ppt', '*.pptx',
    '*.odt', '*.ods', '*.odp',
    # Archives
    '*.zip', '*.tar', '*.tar.gz', '*.tgz', '*.rar', '*.7z',
    '*.gz', '*.bz2', '*.xz',
    # Fonts
    '*.ttf', '*.otf', '*.woff', '*.woff2', '*.eot',
    # ML weights / large binary data
    '*.safetensors', '*.gguf', '*.bin', '*.pt', '*.pth', '*.ckpt',
    '*.npz', '*.npy', '*.pkl', '*.pickle', '*.parquet', '*.arrow',
    '*.h5', '*.hdf5', '*.db', '*.sqlite', '*.sqlite3',
    # SQLite auxiliary files (WAL/SHM/journal — binary, read as text garbage)
    '*.sqlite-shm', '*.sqlite-wal', '*.sqlite-journal',
    '*.db-shm', '*.db-wal', '*.db-journal',
    # Generated build artifacts
    '*.map',                   # source maps
    '*.min.js', '*.min.css',   # minified bundles
    # Lock files (huge, zero value for Claude)
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'poetry.lock', 'Pipfile.lock', 'Cargo.lock', 'composer.lock',
    'bun.lockb', 'bun.lock', 'uv.lock',
    # Env / secrets files (may contain credentials)
    '.dev.vars', '.dev.vars.*',
    # Map output (avoid self-referential recursion)
    'map.txt', 'repo_map.txt',
}

# Claude context window reference
CLAUDE_CONTEXT_TOKENS = 200_000
CLAUDE_USABLE_TOKENS  = 150_000


# ── Gitignore parsing ─────────────────────────────────────────────────────────
def glob_to_regex(pattern):
    pattern = pattern.strip()
    if not pattern or pattern.startswith('#'):
        return None
    negate = pattern.startswith('!')
    if negate:
        pattern = pattern[1:]
    anchored = pattern.startswith('/')
    if anchored:
        pattern = pattern[1:]
    dir_only = pattern.endswith('/')
    if dir_only:
        pattern = pattern[:-1]
    escaped = (re.escape(pattern)
               .replace(r'\*\*', '@@DS@@')
               .replace(r'\*', '[^/]*')
               .replace(r'\?', '[^/]')
               .replace('@@DS@@', '.*'))
    regex = f'^{escaped}(/.*)?$' if anchored else f'(^|.*/)({escaped})(/.*)?$'
    try:
        return (re.compile(regex), negate, dir_only)
    except re.error:
        return None


def load_gitignore(root):
    gi = Path(root) / '.gitignore'
    patterns = []
    if gi.exists():
        for line in gi.read_text(encoding='utf-8', errors='ignore').splitlines():
            r = glob_to_regex(line)
            if r:
                patterns.append(r)
    return patterns


def is_ignored(entry_path, is_dir, root, pattern_layers):
    """
    Apply all gitignore layers in order (outermost first).
    Later layers override earlier ones; within a layer, later patterns win.
    This matches real git semantics: a deeper .gitignore with `!foo`
    un-ignores something its parent excluded.

    pattern_layers: list of (patterns, base_rel_path) where base_rel_path
                    is the location of the .gitignore relative to root.
                    Patterns are matched against the path relative to base.
    """
    ignored = False
    for patterns, base in pattern_layers:
        try:
            rel = entry_path.relative_to(root / base)
        except ValueError:
            # entry is not under this layer's base — skip
            continue
        rel_str = str(rel).replace('\\', '/')
        for regex, negate, dir_only in patterns:
            if dir_only and not is_dir:
                continue
            if regex.match(rel_str):
                ignored = not negate
    return ignored


def matches_always_ignore(name, is_dir):
    if is_dir and name in ALWAYS_IGNORE_DIRS:
        return True
    if not is_dir:
        for pat in ALWAYS_IGNORE_FILES:
            if pat.startswith('*'):
                if name.endswith(pat[1:]):
                    return True
            elif name == pat:
                return True
    return False


# ── File analysis — size-gated to prevent hangs ───────────────────────────────
def analyze_file(filepath, lang, max_bytes):
    try:
        size = filepath.stat().st_size
    except OSError:
        return 0, 0, 0, False

    if size > max_bytes:
        # File too large — report size but don't read
        return 0, 0, 0, True   # (loc, nonblank, tokens, skipped)

    try:
        text = filepath.read_text(encoding='utf-8', errors='ignore')
    except (OSError, PermissionError):
        return 0, 0, 0, False

    lines     = text.splitlines()
    total     = len(lines)
    non_blank = sum(1 for l in lines if l.strip())
    tokens    = estimate_tokens(text, lang)
    return total, non_blank, tokens, False


def get_lang(filepath):
    return EXT_TO_LANG.get(Path(filepath).suffix.lower(), None)


# ── Tree walker ───────────────────────────────────────────────────────────────
def walk_tree(root):
    """
    Walk the tree, loading a .gitignore in every directory we enter and
    layering it on top of ancestors' gitignores (git's real behavior).
    Yields (entry_path, is_dir, depth, rel_path).
    """
    root = Path(root).resolve()

    # Seed with the root .gitignore
    root_patterns = load_gitignore(root)
    initial_layers = [(root_patterns, Path('.'))] if root_patterns else []

    def _walk(current, depth, layers):
        # Layer this directory's .gitignore on top of inherited ones
        current_layers = layers
        if current != root:
            local_patterns = load_gitignore(current)
            if local_patterns:
                current_layers = layers + [(local_patterns, current.relative_to(root))]

        try:
            entries = sorted(
                current.iterdir(),
                key=lambda p: (p.is_file(), p.name.lower())
            )
        except PermissionError:
            return

        for entry in entries:
            rel    = entry.relative_to(root)
            is_dir = entry.is_dir()
            if matches_always_ignore(entry.name, is_dir):
                continue
            if is_ignored(entry, is_dir, root, current_layers):
                continue
            yield entry, is_dir, depth, rel
            if is_dir:
                yield from _walk(entry, depth + 1, current_layers)

    yield from _walk(root, 0, initial_layers)


def tok_str(n):
    if n >= 10_000:
        return f'{n//1000}k'
    if n >= 1_000:
        return f'{n/1000:.1f}k'
    return str(n)


def context_pct(tokens, total_context=CLAUDE_USABLE_TOKENS):
    return min(999, round(tokens / total_context * 100))


# ── Report builder ────────────────────────────────────────────────────────────
def build_report(root, max_kb=DEFAULT_MAX_FILE_KB):
    root      = Path(root).resolve()
    max_bytes = max_kb * 1024

    # Materialize the walk so we can prune empty directories in a second pass.
    # Nested .gitignore loading is handled inside walk_tree.
    entries_list = list(walk_tree(root))

    # Mark directories that have at least one FILE descendant anywhere in
    # their subtree. Dirs whose entire subtree is other empty dirs (e.g.
    # public/ containing only public/papers/ containing only filtered PDFs)
    # are pruned too.
    dir_has_content = {}
    stack = []  # [(index, depth), ...] — open ancestor dirs, DFS order
    for i, (_, is_dir, depth, _) in enumerate(entries_list):
        while stack and stack[-1][1] >= depth:
            stack.pop()
        if is_dir:
            dir_has_content[i] = False
            stack.append((i, depth))
        else:
            # A real file exists here — mark every open ancestor dir as kept
            for idx, _ in stack:
                dir_has_content[idx] = True

    out          = []
    lang_loc     = defaultdict(int)
    lang_tok     = defaultdict(int)
    lang_files   = defaultdict(int)
    file_list    = []
    skipped_list = []
    grand_loc    = 0
    grand_tok    = 0

    tiktoken_note = '(exact, tiktoken)' if USE_TIKTOKEN else '(estimated ±15%)'

    out.append(f'REPOSITORY: {root}')
    out.append(f'{"="*72}')
    out.append(f'Token counts: {tiktoken_note}   |   Max file size: {max_kb} KB')
    out.append(f'Context window reference: {CLAUDE_USABLE_TOKENS:,} usable tokens')
    out.append('')
    out.append('DIRECTORY TREE')
    out.append('  Columns: loc | ~tokens | language')
    out.append('')

    for i, (entry, is_dir, depth, rel) in enumerate(entries_list):
        # Skip directories whose whole subtree was filtered away
        if is_dir and not dir_has_content.get(i, False):
            continue

        indent = '  ' * depth
        if is_dir:
            out.append(f'{indent}📁 {entry.name}/')
        else:
            lang = get_lang(entry)
            loc, _, tokens, skipped = analyze_file(entry, lang, max_bytes)

            if skipped:
                size_kb = entry.stat().st_size // 1024
                out.append(f'{indent}📄 {entry.name}  [SKIPPED: {size_kb}KB > {max_kb}KB limit]')
                skipped_list.append((str(rel), size_kb))
                continue

            loc_col  = f'{loc:>5}' if loc  else '    -'
            tok_col  = f'~{tok_str(tokens):>5}' if tokens else '      -'
            lang_col = f'  [{lang}]' if lang else ''

            out.append(f'{indent}📄 {entry.name}  {loc_col} loc  {tok_col} tok{lang_col}')

            if lang and tokens:
                lang_loc[lang]   += loc
                lang_tok[lang]   += tokens
                lang_files[lang] += 1
                grand_loc        += loc
                grand_tok        += tokens
                file_list.append((str(rel), lang, loc, tokens))

    # Language summary
    out.append('')
    out.append(f'{"="*72}')
    out.append('LOC + TOKENS BY LANGUAGE')
    out.append('')
    sorted_langs = sorted(lang_tok.items(), key=lambda x: -x[1])
    max_lang = max((len(l) for l in lang_tok), default=10)
    for lang, tok in sorted_langs:
        loc = lang_loc[lang]
        fc  = lang_files[lang]
        pct = context_pct(tok)
        bar = '█' * min(30, tok // max(1, grand_tok // 30))
        out.append(
            f'  {lang:<{max_lang}}  {loc:>6} loc  ~{tok_str(tok):>6} tok  '
            f'{pct:>3}% ctx  {fc:>3} files  {bar}'
        )

    out.append('')
    pct_total = context_pct(grand_tok)
    out.append(
        f'  {"TOTAL":<{max_lang}}  {grand_loc:>6} loc  '
        f'~{tok_str(grand_tok):>6} tok  {pct_total:>3}% of usable context'
    )

    if grand_tok > CLAUDE_USABLE_TOKENS:
        over = grand_tok - CLAUDE_USABLE_TOKENS
        out.append(f'\n  ⚠️  EXCEEDS usable context by ~{tok_str(over)} tokens.')
        out.append(f'     Share files selectively — do NOT paste the whole repo.')
    elif grand_tok > CLAUDE_USABLE_TOKENS * 0.7:
        out.append(f'\n  ⚠️  Large repo. Paste only relevant files per session.')
    else:
        out.append(f'\n  ✓  Fits in one context window if needed.')

    # Skipped files note
    if skipped_list:
        out.append('')
        out.append(f'  ⏭  {len(skipped_list)} file(s) skipped (> {max_kb}KB):')
        for path, kb in skipped_list[:10]:
            out.append(f'       {kb}KB  {path}')
        if len(skipped_list) > 10:
            out.append(f'       ... and {len(skipped_list)-10} more')

    # Flat file list sorted by token cost
    out.append('')
    out.append(f'{"="*72}')
    out.append('FILES BY TOKEN COST  (heaviest context cost first)')
    out.append('')
    out.append(f'  {"tokens":>7}  {"loc":>5}  {"% ctx":>5}  {"language":<22}  path')
    out.append(f'  {"-"*7}  {"-"*5}  {"-"*5}  {"-"*22}  {"-"*40}')

    cumulative = 0
    for path, lang, loc, tokens in sorted(file_list, key=lambda x: -x[3]):
        cumulative += tokens
        pct  = context_pct(tokens)
        flag = '  ◀ large' if tokens > CLAUDE_USABLE_TOKENS * 0.3 else ''
        out.append(
            f'  ~{tok_str(tokens):>6}  {loc:>5}  {pct:>4}%  {lang:<22}  {path}{flag}'
        )

    out.append('')
    out.append(f'  Cumulative if all pasted: ~{tok_str(grand_tok)} ({pct_total}% of usable context)')

    return '\n'.join(out)


def main():
    parser = argparse.ArgumentParser(
        description='Map repo structure with LOC + token estimates for Claude context management.'
    )
    parser.add_argument('root', nargs='?', default='.', help='Repo root (default: cwd)')
    parser.add_argument('--out', '-o', help='Output file (default: stdout)')
    parser.add_argument(
        '--max-kb', type=int, default=DEFAULT_MAX_FILE_KB,
        help=f'Skip files larger than N KB (default: {DEFAULT_MAX_FILE_KB})'
    )
    args = parser.parse_args()

    report = build_report(args.root, max_kb=args.max_kb)

    if args.out:
        Path(args.out).write_text(report, encoding='utf-8')
        print(f'Written to {args.out}')
        for l in report.splitlines():
            if 'TOTAL' in l or '⚠️' in l or '✓' in l or '⏭' in l:
                print(l.strip())
    else:
        print(report)


if __name__ == '__main__':
    main()