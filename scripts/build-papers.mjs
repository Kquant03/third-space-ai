// ═══════════════════════════════════════════════════════════════════════════
//  scripts/build-papers.mjs
//  ─────────────────────────────────────────────────────────────────────────
//  Compiles hand-authored LaTeX papers into committed JSON that the mobile
//  reader renders as native, reflowed HTML — so a phone downloads a few KB
//  of finished markup and one KaTeX stylesheet, never a parser or a PDF.
//
//  Runs in `npm run build` (and `npm run dev`) via the prebuild/predev
//  hooks in package.json. Pure JS — no LaTeX toolchain — so it runs on
//  Vercel's build container unchanged.
//
//  Pipeline, per paper:
//    .tex  →  @unified-latex AST  →  walk → block model  →  JSON
//                                    (KaTeX pre-renders math inline)
//
//  ── Why a block model and not "AST → HTML" directly ──────────────────
//  The AST has NO paragraph nodes. Body prose is a flat run of `string`
//  and `whitespace` tokens with `parbreak` nodes sitting BETWEEN them.
//  So the walk can't just recurse and emit — it has to segment the flat
//  run into paragraphs at each parbreak, then render each segment's
//  inline content. The block model is that segmentation made explicit:
//  an ordered list of typed blocks (heading, para, quote, list, math,
//  figure, code, rule…), each carrying already-rendered inline HTML.
//  The reader maps one block type to one component. No LaTeX logic ships
//  to the client.
//
//  ── First pass: pneuma only ──────────────────────────────────────────
//  pneuma is the clean paper — 0 custom macros, prose/headings/lists/
//  quote/abstract, 4 trivial inline-math spans. It exercises the plumbing
//  end to end without the hard cases. dihypersphaerome (21 macros, GLSL
//  listings, 203 math spans) is the intended SECOND pass; grabby-expansion
//  (8 figures) the third. Handlers for constructs pneuma doesn't contain
//  are deliberately stubbed as `unhandled` blocks so nothing is silently
//  dropped — an unhandled node becomes a visible marker in dev, not a gap.
// ═══════════════════════════════════════════════════════════════════════════

import { getParser } from "@unified-latex/unified-latex-util-parse";
import katex from "katex";
import fs from "node:fs";
import path from "node:path";

// ── slug → source. Filenames don't match slugs, so this is explicit.
//    Two known omissions from the first pass:
//      · limen_pond.tex — no papers.ts entry; orphan source (only omission)
//      · limen_pond.tex — no papers.ts entry; orphan source
const SOURCES = {
  pneuma: "pneuma.tex",
  "dihypersphaerome-ventilans": "Dihypersphaerome_ventilans.tex",
  "against-grabby-expansion": "against_grabby_expansion_v15.tex",
  "ghost-species": "ghost_species.tex",
  rukha: "rukha.tex",
  "two-registers-one-grammar": "two_registers.tex",
  "hallucinations-happen-without-rest": "hallucinations_happen_without_rest.tex",
  // limen_pond.tex has no papers.ts entry — left out until it gets one.
};

// Custom-operator map for KaTeX. Grows as later papers introduce macros;
// pneuma needs none, but the wiring is proven here so pass 2 is a data edit.
const MATH_MACROS = {
  "\\Lcrit": "L_{\\text{crit}}",
  "\\Lenv": "L_{\\text{env}}",
  "\\kBT": "k_{B}T",
  "\\taustar": "\\tau^{*}",
  "\\Lsun": "L_{\\odot}",
};

// ── Figure aliases ───────────────────────────────────────────────────────
// The .tex files reference generic figureN_label.png names that don't match
// what's actually in public/papers/figures/ (descriptive names). Rather than
// rewrite the papers — the .tex is the archival source and should stay as the
// author wrote it — the build maps one to the other here. Matched by caption
// meaning, confirmed against the directory listing.
//
// If a figure shows the "Figure unavailable" placeholder in the reader, the
// filename it names is the one to add here (or to add to the figures dir).
// Figure filenames in the .tex now match the files on disk (they were
// repointed when the figures were regenerated), so no alias layer is
// needed. Kept as an empty table because it's the right place to put one
// if a future paper's sources and assets ever drift apart again.
const FIGURE_ALIASES = {};

const IN_DIR = process.env.PAPERS_TEX_DIR || "public/papers/tex";
const OUT_DIR = process.env.PAPERS_OUT_DIR || "src/data/papers-rendered";

// ─────────────────────────────────────────────────────────────────────────
//  Small AST helpers
// ─────────────────────────────────────────────────────────────────────────

const envName = (n) =>
  Array.isArray(n.env) ? n.env.map((x) => x.content || "").join("") : n.env;

const findEnv = (nodes, name) =>
  nodes.find((n) => n.type === "environment" && envName(n) === name) || null;

// The last brace-delimited argument of a macro is its "real" argument;
// leading empty slots are the optional star / [..] positions unified-latex
// always emits. This is how \section{Title} exposes "Title".
function lastGroupArg(node) {
  if (!node.args) return [];
  for (let i = node.args.length - 1; i >= 0; i--) {
    if (node.args[i].openMark === "{") return node.args[i].content;
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────
//  Inline rendering — a run of nodes → an HTML string
//  Only inline-level constructs belong here: text, emphasis, inline math,
//  small spacing/escape macros. Block constructs are handled by the block
//  walker and never reach this function.
// ─────────────────────────────────────────────────────────────────────────

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// LaTeX text ligatures. The parser leaves these as literal character runs
// (--- stays three hyphens), so an em-dash renders as "---" unless we
// convert. Order matters: --- before --. Curly quotes come from the
// grave/apostrophe pairs LaTeX uses for real typographic quotes.
function ligatures(s) {
  return s
    .replace(/---/g, "\u2014") // em dash
    .replace(/--/g, "\u2013") // en dash
    .replace(/``/g, "\u201c") // “
    .replace(/''/g, "\u201d") // ”
    .replace(/`/g, "\u2018") // ‘
    .replace(/'/g, "\u2019"); // ’ (also handles apostrophes)
}

// LaTeX text-mode escapes and spacing that appear mid-prose.
const TEXT_MACRO = {
  "&": "&amp;",
  _: "_",
  "#": "#",
  "%": "%",
  $: "$",
  "{": "{",
  "}": "}",
  " ": " ",
  quad: "\u2003", // em space
  qquad: "\u2003\u2003",
  dots: "\u2026",
  ldots: "\u2026",
  ",": "\u202f", // thin space
  textasciitilde: "~",
  "\\": "<br/>", // \\ line break inside a paragraph
};

// Citation key → reference number, built in a first pass over the
// bibliography before any prose is rendered (references appear LAST in the
// document, but the numbers are needed throughout). Reset per paper.
let CITE_MAP = new Map();

// The natbib family. The corpus uses \cite (194), \citet (103),
// \citep (57) and \citealt (1). All render as a numbered superscript —
// the compact form that suits a phone, and the only one that stays legible
// when a single call cites five works.
const CITE_MACROS = new Set([
  "cite", "citet", "citep", "citealt", "citealp", "citeyear", "citenum",
]);

function renderInline(nodes) {
  const list = nodes || [];
  let out = "";
  for (let i = 0; i < list.length; i++) {
    const n = list[i];
    switch (n.type) {
      case "string":
        // NB: ligatures are applied to the JOINED output below, not here.
        // The parser emits "---" as three separate single-"-" string
        // tokens, so a per-token replace never sees the trigram.
        out += esc(n.content);
        break;
      case "whitespace":
        out += " ";
        break;
      case "inlinemath":
        out += renderMath(nodes_to_tex(n.content), false);
        break;
      case "group":
        out += renderInline(n.content); // brace group, no semantic effect inline
        break;
      case "macro": {
        const c = n.content;

        // ── Citations ────────────────────────────────────────────────
        // unified-latex has no signature for \citep/\citet, so the
        // {keys} arrive as a SEPARATE group node rather than as an
        // argument — the macro emitted nothing and the group rendered as
        // plain text, which is why bare "Hanson2021" leaked into the
        // prose. Take the argument when there is one, otherwise consume
        // the following brace group.
        if (CITE_MACROS.has(c)) {
          let keyNodes = lastGroupArg(n);
          if (!keyNodes.length) {
            let j = i + 1;
            while (j < list.length && list[j].type === "whitespace") j++;
            if (j < list.length && list[j].type === "group") {
              keyNodes = list[j].content;
              i = j; // consumed
            }
          }
          out += renderCitation(nodes_to_plain(keyNodes));
          break;
        }

        if (c === "textit" || c === "emph" || c === "itshape")
          out += `<em>${renderInline(lastGroupArg(n))}</em>`;
        else if (c === "textbf" || c === "bfseries")
          out += `<strong>${renderInline(lastGroupArg(n))}</strong>`;
        else if (c === "texttt" || c === "textsc") {
          // Papers write bare URLs as \texttt{github.com/...} rather than
          // \href — fine in a PDF, where you select and copy. On a phone an
          // untappable URL is a dead end. So \texttt whose content is a
          // recognisable URL becomes a real link; everything else stays
          // plain monospace.
          const inner = renderInline(lastGroupArg(n));
          out += autolinkCode(inner);
        }
        else if (c === "href") {
          const url = nodes_to_plain(n.args?.[0]?.content || []);
          out += `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${renderInline(lastGroupArg(n))}</a>`;
        } else if (c in TEXT_MACRO) out += TEXT_MACRO[c];
        else if (c === "noindent" || c === "normalfont" || c === "normalsize")
          out += ""; // formatting-only, no output
        else out += `<span data-unhandled-macro="${esc(c)}"></span>`;
        break;
      }
      case "parbreak":
      case "comment":
        break;
      default:
        break;
    }
  }
  // Ligatures run on the joined string so multi-token runs like "---"
  // (three separate hyphen tokens) resolve. Tags are kept intact so the
  // apostrophe rule can't curl quotes inside href="".
  return out
    .split(/(<[^>]+>)/)
    .map((chunk, idx) => (idx % 2 === 0 ? ligatures(chunk) : chunk))
    .join("")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// A \texttt{} whose entire content is a URL or bare domain becomes a
// tappable link. Deliberately conservative: it must be the WHOLE content
// and match a domain pattern, so \texttt{filter_simulation.py} — a filename
// with a dot — isn't turned into a link to a ".py" domain.
const URL_LIKE =
  /^(https?:\/\/)?((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:ai|com|org|net|io|gg|edu|gov))(\/[^\s]*)?$/i;

function autolinkCode(innerHtml) {
  const plain = innerHtml.replace(/<[^>]+>/g, "").trim();
  const m = plain.match(URL_LIKE);
  if (!m) return `<code>${innerHtml}</code>`;
  const href = plain.startsWith("http") ? plain : `https://${plain}`;
  return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer"><code>${innerHtml}</code></a>`;
}

// "Bostrom2012,Bostrom2014" → <sup>[3,4]</sup>, each linked to its entry.
// An unknown key keeps the key visible rather than vanishing silently — a
// citation pointing at nothing is a content bug worth seeing.
function renderCitation(rawKeys) {
  const keys = rawKeys.split(",").map((k) => k.trim()).filter(Boolean);
  if (!keys.length) return "";
  const parts = keys.map((k) => {
    const num = CITE_MAP.get(k);
    return num
      ? `<a href="#ref-${esc(k)}">${num}</a>`
      : `<span data-unresolved-cite="${esc(k)}">${esc(k)}</span>`;
  });
  return `<sup class="cite">[${parts.join(",")}]</sup>`;
}

// Reconstruct raw TeX from a node run, for feeding math to KaTeX.
function nodes_to_tex(nodes) {
  let s = "";
  for (const n of nodes || []) {
    if (n.type === "string") s += n.content;
    else if (n.type === "whitespace") s += " ";
    else if (n.type === "macro") s += "\\" + n.content + (n.args ? n.args.map((a) => (a.openMark ? a.openMark + nodes_to_tex(a.content) + (a.closeMark || "}") : nodes_to_tex(a.content))).join("") : "");
    else if (n.type === "group") s += "{" + nodes_to_tex(n.content) + "}";
    else if (n.content && Array.isArray(n.content)) s += nodes_to_tex(n.content);
  }
  return s;
}
const nodes_to_plain = (nodes) =>
  (nodes || []).map((n) => (n.type === "string" ? n.content : n.type === "whitespace" ? " " : "")).join("");

function renderMath(tex, display) {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode: display,
      throwOnError: false,
      output: "html",
      macros: MATH_MACROS,
      // Several papers use \^ / \~ (text accents) inside math for hats and
      // tildes. KaTeX renders them fine but warns to stderr in strict mode;
      // "ignore" silences the noise without changing output. Genuine errors
      // still surface as data-math-error via throwOnError:false.
      strict: "ignore",
    });
  } catch (e) {
    return `<span data-math-error="${esc(String(e.message))}">${esc(tex)}</span>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  Block walker — the flat document body → an ordered list of blocks
// ─────────────────────────────────────────────────────────────────────────

function walkBlocks(nodes) {
  const blocks = [];
  let buffer = []; // accumulating inline nodes for the current paragraph

  const flushPara = () => {
    const html = renderInline(buffer);
    buffer = [];
    if (html) blocks.push({ kind: "para", html });
  };

  for (const n of nodes) {
    // Paragraph boundary: parbreak, or a blank-ish whitespace with a newline.
    if (n.type === "parbreak") {
      flushPara();
      continue;
    }

    if (n.type === "macro" && (n.content === "section" || n.content === "subsection" || n.content === "subsubsection")) {
      flushPara();
      const level = n.content === "section" ? 2 : n.content === "subsection" ? 3 : 4;
      blocks.push({ kind: "heading", level, html: renderInline(lastGroupArg(n)) });
      continue;
    }

    if (n.type === "environment") {
      const name = envName(n);

      if (name === "quote" || name === "pullquote") {
        // pullquote is a display quote — same treatment as quote, the
        // reader's blockquote style already reads as a pull quote.
        flushPara();
        blocks.push({ kind: "quote", html: renderInline(stripLayoutMacros(n.content)) });
        continue;
      }

      if (name === "itemize" || name === "enumerate" || name === "description") {
        flushPara();
        blocks.push({ kind: "list", ordered: name === "enumerate", items: splitItems(n.content) });
        continue;
      }

      if (name === "center") {
        // Title block in the body — the reader owns the masthead, drop it.
        // (Later papers may center a figure; those come through as figure
        // environments, not bare center, so this stays a safe drop.)
        flushPara();
        continue;
      }

      // ── Bibliography ─────────────────────────────────────────────────
      // Every paper's references. Each \bibitem carries an optional
      // [label], a {key}, then the reference text as following siblings
      // up to the next \bibitem — the same shape as \item.
      if (name === "thebibliography") {
        flushPara();
        blocks.push({ kind: "bibliography", items: splitBibitems(n.content) });
        continue;
      }

      // ── Code listings ────────────────────────────────────────────────
      if (name === "lstlisting" || name === "verbatim") {
        flushPara();
        blocks.push({ kind: "code", text: esc(verbatimText(n.content)) });
        continue;
      }

      // ── Figures ──────────────────────────────────────────────────────
      // figure and figure* both wrap an \includegraphics + \caption.
      if (name === "figure" || name === "figure*") {
        flushPara();
        blocks.push(figureBlock(n));
        continue;
      }

      // ── Tables ───────────────────────────────────────────────────────
      // tabular/tabularx inside a table float. Rendered as an HTML table
      // in a scroll-x wrapper — a wide table scrolls rather than clipping.
      if (name === "table" || name === "table*") {
        flushPara();
        blocks.push(tableBlock(n));
        continue;
      }

      // ── Abstract environments ────────────────────────────────────────
      if (name === "onecolabstract" || name === "abstract") {
        flushPara();
        blocks.push({ kind: "abstract", html: renderInline(stripLayoutMacros(n.content)) });
        continue;
      }

      // ── Callout-style cards ──────────────────────────────────────────
      // specimenbox, callout → a labelled reading-plate card. proposition
      // and claim are the same shape with a semantic label (and an optional
      // [title] argument).
      if (name === "callout" || name === "specimenbox") {
        flushPara();
        blocks.push({ kind: "card", label: name === "specimenbox" ? "Specimen" : null, html: renderInline(stripLayoutMacros(n.content)) });
        continue;
      }
      if (name === "proposition" || name === "claim") {
        flushPara();
        const label = name[0].toUpperCase() + name.slice(1);
        const title = n.args ? nodes_to_plain(n.args.find((a) => a.openMark === "[")?.content || []) : "";
        blocks.push({ kind: "card", label: title ? `${label} — ${title}` : label, html: renderInline(n.content) });
        continue;
      }

      // small/large etc. — a sizing wrapper, not a block. Render its
      // contents inline into the current flow rather than dropping them.
      if (["small", "footnotesize", "large", "normalsize"].includes(name)) {
        for (const child of n.content) buffer.push(child);
        continue;
      }

      // Genuinely unknown: don't swallow it.
      flushPara();
      blocks.push({ kind: "unhandled", note: `env:${name}` });
      continue;
    }

    // \vspace, \noindent etc. between blocks — ignore as block-level.
    if (n.type === "macro" && ["vspace", "noindent", "bigskip", "medskip", "smallskip", "titleformat", "titlespacing"].includes(n.content)) {
      continue;
    }

    // Otherwise it's inline content: accumulate into the current paragraph.
    buffer.push(n);
  }
  flushPara();
  return blocks;
}

// \item-delimited content → array of inline-HTML strings.
//
// unified-latex parses `\item` as a macro whose LAST argument holds the
// first line of the item's text; any remaining content (further lines,
// nested emphasis that broke across a parbreak) follows as sibling nodes
// until the next `\item`. So each item = the item macro's own arg content
// PLUS every sibling up to the next item marker. Treating `\item` as a
// bare delimiter (ignoring its arg) is what produced empty list items.
function splitItems(nodes) {
  const items = [];
  let cur = null;
  for (const n of nodes) {
    if (n.type === "macro" && n.content === "item") {
      if (cur !== null) items.push(renderInline(cur));
      cur = [...lastGroupArgOrAny(n)]; // seed with the item's own text
    } else if (cur !== null) cur.push(n);
  }
  if (cur !== null) items.push(renderInline(cur));
  return items.filter((h) => h.length);
}

// \item's content arg has openMark "" (it's a required-but-unbraced arg),
// so lastGroupArg — which wants openMark "{" — misses it. Fall back to the
// last non-empty argument regardless of mark.
function lastGroupArgOrAny(node) {
  const braced = lastGroupArg(node);
  if (braced.length) return braced;
  if (!node.args) return [];
  for (let i = node.args.length - 1; i >= 0; i--) {
    if (node.args[i].content && node.args[i].content.length) return node.args[i].content;
  }
  return [];
}

// Drop layout-only macros that appear at the head of an environment's
// content and would otherwise emit stray output or nothing.
const LAYOUT_MACROS = new Set([
  "centering", "raggedright", "noindent", "small", "footnotesize",
  "normalsize", "vspace", "hspace", "itshape", "bfseries", "normalfont",
]);
function stripLayoutMacros(nodes) {
  return (nodes || []).filter(
    (n) => !(n.type === "macro" && LAYOUT_MACROS.has(n.content))
  );
}

// \bibitem → [{ key, html }].
//
// Unlike \item (whose body streams into following siblings), unified-latex
// captures the whole \bibitem into its arguments: optional [label], the
// {key}, then the reference text as a final openMark:"" argument. So the
// text is read from the macro's own args, and following siblings (just
// parbreaks) are ignored. Reading siblings instead — the \item pattern —
// is what produced zero bibitems.
function splitBibitems(nodes) {
  const out = [];
  for (const n of stripLayoutMacros(nodes)) {
    if (n.type !== "macro" || n.content !== "bibitem") continue;
    const keyArg = n.args?.find((a) => a.openMark === "{");
    const key = nodes_to_plain(keyArg?.content || []);
    // Reference text = last non-empty argument that isn't the key/label.
    let textNodes = [];
    if (n.args) {
      for (let i = n.args.length - 1; i >= 0; i--) {
        const a = n.args[i];
        if (a === keyArg) continue;
        if (a.content && a.content.length) { textNodes = a.content; break; }
      }
    }
    const html = renderInline(textNodes);
    if (html) out.push({ key, html });
  }
  return out;
}

// verbatim/lstlisting content → raw text, newlines preserved.
function verbatimText(nodes) {
  let s = "";
  for (const n of nodes || []) {
    if (n.type === "string") s += n.content;
    else if (n.type === "whitespace") s += " ";
    else if (n.type === "parbreak") s += "\n\n";
    else if (n.type === "macro") s += "\\" + n.content;
    else if (n.content && Array.isArray(n.content)) s += verbatimText(n.content);
  }
  return s.replace(/^\n+/, "").replace(/\n+$/, "");
}

// A figure environment → a figure block: first \includegraphics path +
// \caption text. LaTeX paths are repo-relative; the site serves them from
// /papers/, so figures/foo.png → /papers/figures/foo.png.
function figureBlock(node) {
  let src = "", caption = "";
  const walk = (nodes) => {
    for (const n of nodes || []) {
      if (n.type === "macro" && n.content === "includegraphics")
        src = nodes_to_plain(lastGroupArg(n));
      else if (n.type === "macro" && n.content === "caption")
        caption = renderInline(lastGroupArg(n));
      else if (n.content && Array.isArray(n.content)) walk(n.content);
      else if (n.args) n.args.forEach((a) => walk(a.content));
    }
  };
  walk(node.content);
  if (!src) return { kind: "unhandled", note: "figure:no-includegraphics" };
  // Resolve the alias, then re-path to the public dir.
  const base = src.replace(/^figures\//, "");
  const resolved = FIGURE_ALIASES[base] || base;
  const web = `/papers/figures/${resolved}`;
  return { kind: "figure", src: web, caption };
}

// A table float → an HTML table: the inner tabular/tabularx converted,
// caption as figcaption.
function tableBlock(node) {
  let caption = "", inner = null;
  const walk = (nodes) => {
    for (const n of nodes || []) {
      const en = n.type === "environment" ? envName(n) : null;
      if (en === "tabular" || en === "tabularx" || en === "tabulary") inner = n;
      else if (n.type === "macro" && n.content === "caption")
        caption = renderInline(lastGroupArg(n));
      else if (n.content && Array.isArray(n.content)) walk(n.content);
    }
  };
  walk(node.content);
  if (!inner) return { kind: "unhandled", note: "table:no-tabular" };
  return { kind: "table", caption, rows: tabularRows(inner) };
}

// tabular content → rows of cell-HTML. & splits cells, \\ splits rows,
// rules are dropped.
function tabularRows(env) {
  const rows = [];
  let cell = [], row = [];
  const endCell = () => { row.push(renderInline(cell)); cell = []; };
  const endRow = () => { endCell(); if (row.some((c) => c.trim())) rows.push(row); row = []; };
  for (const n of env.content) {
    if (n.type === "string" && n.content === "&") { endCell(); continue; }
    if (n.type === "macro" && n.content === "\\") { endRow(); continue; }
    if (n.type === "macro" && ["hline", "toprule", "midrule", "bottomrule", "cline"].includes(n.content)) continue;
    cell.push(n);
  }
  endRow();
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────
//  Abstract — pneuma writes it as \textbf{Abstract.} then a prose run,
//  not an environment. Detect the pattern and split it into its own block.
// ─────────────────────────────────────────────────────────────────────────

function extractAbstract(blocks) {
  const i = blocks.findIndex(
    (b) => b.kind === "para" && /^<strong>Abstract\.?<\/strong>/.test(b.html)
  );
  if (i === -1) return blocks;
  const html = blocks[i].html.replace(/^<strong>Abstract\.?<\/strong>\s*/, "");
  blocks[i] = { kind: "abstract", html };
  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────
//  Driver
// ─────────────────────────────────────────────────────────────────────────

function build(slug, texFile) {
  const src = fs.readFileSync(path.join(IN_DIR, texFile), "utf8");
  const ast = getParser().parse(src);
  const doc = findEnv(ast.content, "document");
  if (!doc) throw new Error(`${texFile}: no \\begin{document}`);

  // ── Pass 1: citation numbering ───────────────────────────────────────
  // References appear last in the document but their numbers are needed
  // from the first paragraph, so the key→number map is built before any
  // prose is rendered. Without this every \cite renders its raw BibTeX
  // key. Order is the bibliography's own order, which is the numbering
  // the paper's own PDF uses.
  CITE_MAP = new Map();
  const bibEnv = findEnvDeep(doc.content, "thebibliography");
  if (bibEnv) {
    let n = 0;
    for (const node of bibEnv.content) {
      if (node.type === "macro" && node.content === "bibitem") {
        const keyArg = node.args?.find((a) => a.openMark === "{");
        const key = nodes_to_plain(keyArg?.content || []).trim();
        if (key && !CITE_MAP.has(key)) CITE_MAP.set(key, ++n);
      }
    }
  }

  // ── Pass 2: render ───────────────────────────────────────────────────
  let blocks = walkBlocks(doc.content);
  blocks = extractAbstract(blocks);

  const unhandled = blocks.filter((b) => b.kind === "unhandled");
  const mathErrors = JSON.stringify(blocks).match(/data-math-error/g)?.length || 0;
  const unhandledMacros = JSON.stringify(blocks).match(/data-unhandled-macro="([^"]+)"/g) || [];
  const unresolved = JSON.stringify(blocks).match(/data-unresolved-cite="([^"]+)"/g) || [];

  return {
    doc: { slug, blocks },
    report: {
      slug,
      blocks: blocks.length,
      paras: blocks.filter((b) => b.kind === "para").length,
      headings: blocks.filter((b) => b.kind === "heading").length,
      refs: CITE_MAP.size,
      unresolvedCites: [...new Set(unresolved)].length,
      unhandledBlocks: unhandled.map((b) => b.note),
      unhandledMacros: [...new Set(unhandledMacros)],
      mathErrors,
    },
  };
}

// findEnv only looks at the top level; the bibliography can be nested.
function findEnvDeep(nodes, name) {
  for (const n of nodes || []) {
    if (n.type === "environment" && envName(n) === name) return n;
    if (n.content && Array.isArray(n.content)) {
      const r = findEnvDeep(n.content, name);
      if (r) return r;
    }
  }
  return null;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let failed = false;
  for (const [slug, texFile] of Object.entries(SOURCES)) {
    try {
      const { doc, report } = build(slug, texFile);
      fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(doc));
      const flag =
        report.unhandledBlocks.length ||
        report.unhandledMacros.length ||
        report.mathErrors ||
        report.unresolvedCites;
      console.log(
        `${flag ? "⚠ " : "✓ "}${slug}: ${report.blocks} blocks ` +
          `(${report.paras} paras, ${report.headings} headings, ${report.refs} refs)` +
          (report.unresolvedCites ? ` · unresolved cites: ${report.unresolvedCites}` : "") +
          (report.unhandledBlocks.length ? ` · unhandled: ${report.unhandledBlocks.join(", ")}` : "") +
          (report.unhandledMacros.length ? ` · macros: ${report.unhandledMacros.join(", ")}` : "") +
          (report.mathErrors ? ` · math errors: ${report.mathErrors}` : "")
      );
    } catch (e) {
      failed = true;
      console.error(`✗ ${slug}: ${e.message}`);
    }
  }
  if (failed) process.exit(1);
}

main();
