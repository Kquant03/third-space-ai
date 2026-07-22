// ═══════════════════════════════════════════════════════════════════════════
//  EDITORIAL PRIMITIVES
//  ─────────────────────────────────────────────────────────────────────────
//  The design language, in one place.
//
//  These were copy-pasted per page. Not "similar" — SectionMark was
//  byte-for-byte identical in / and /about, Ornament differed only in how
//  Prettier had wrapped it, and COLOR and FONT matched exactly. The only
//  real divergence was TaperedRule, and only because it got fixed on the
//  home page and the About page never heard about it.
//
//  That's the failure mode of copy-paste primitives: they don't drift
//  because someone changed the design, they drift because someone fixed a
//  bug. The pages that didn't get the fix look identical in the diff and
//  wrong in the browser, and nothing tells you which is which.
//
//  So: one TaperedRule. One SectionMark. One Ornament. A fix here lands on
//  every page that imports it, including the ones that don't exist yet.
// ═══════════════════════════════════════════════════════════════════════════

export const COLOR = {
  void: "#010106",
  ink: "#f4f6fb",
  inkStrong: "#eaeef7",
  inkBody: "#c8cfe0",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
  ghostSoft: "#5d8a8e",
} as const;

export const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, 'Times New Roman', serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

/** A scotch rule.
 *
 *  This used to taper to a single bright point at 50% and ramp away in
 *  both directions — transparent 0%, 0.05 at 12%, 0.38 at 50%, and back.
 *  Which is a lens, not a rule. It reads as a rule on a desktop only
 *  because the bright band is a fixed ~18% of the width, and 18% of
 *  1400px is 258px, which is wide enough to pass. At 335px the same shape
 *  is 62px of bulge between two long fades. It doesn't break at a
 *  breakpoint; it degrades continuously, and the desktop is simply wide
 *  enough to hide it.
 *
 *  A scotch rule — the site's own word for it, see SiteHeader — is a
 *  plateau with defined ends, not a gradient with a peak. So hold the full
 *  value across the middle and taper by an amount that's a share of the
 *  width but clamped at both ends. clamp() is legal anywhere a
 *  <length-percentage> is, including a gradient stop.
 *
 *    1400px → 112px taper each end, 1176px of rule  (84% ink)
 *     335px →  27px taper each end,  281px of rule  (84% ink)
 *
 *  Same character at every width, so there's nothing left to branch on.
 */
export function TaperedRule({ accent = false }: { accent?: boolean }) {
  const taper = "clamp(20px, 8%, 112px)";
  const ink = accent ? "rgba(127,175,179,0.34)" : "rgba(255,255,255,0.09)";
  return (
    <div
      aria-hidden
      className={`tapered-rule${accent ? " tapered-rule--accent" : ""}`}
      style={{
        height: 1,
        background:
          `linear-gradient(90deg, transparent 0, ${ink} ${taper}, ` +
          `${ink} calc(100% - ${taper}), transparent 100%)`,
      }}
    />
  );
}

/** A chapter opening.
 *
 *    § I ──────────── Publications ──────────── 01 / 04
 *
 *  The .section-mark class is the hook globals.css uses to fold this into
 *  its octavo form below 720px — the two mono stamps join onto one folio
 *  line and the flanking rules become ornament arms:
 *
 *            § I · 01 / 04
 *        ──── Publications ────
 *
 *  The child order here is load-bearing: that CSS reorders by nth-child.
 *  roman, label, index — don't reshuffle without reading the rule.
 */
export function SectionMark({
  roman,
  label,
  index,
}: {
  roman: string;
  label: string;
  index: string;
}) {
  return (
    <div
      className="section-mark"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "baseline",
        gap: 32,
        paddingBottom: 18,
        marginBottom: 72,
        borderBottom: `1px solid ${COLOR.inkGhost}40`,
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          color: COLOR.inkMuted,
        }}
      >
        § {roman}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <span
          aria-hidden
          style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }}
        />
        <span
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 22,
            color: COLOR.inkStrong,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span
          aria-hidden
          style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }}
        />
      </div>

      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
          textAlign: "right",
        }}
      >
        {index}
      </div>
    </div>
  );
}

/** A fleuron — the breath between sections.
 *
 *  Also the narrow-measure form of a divider, which is why TaperedRule
 *  doesn't need to become one: the vocabulary already has both, they're
 *  just used at different scales.
 */
export function Ornament() {
  return (
    <div
      aria-hidden
      className="ornament"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "72px 0",
        opacity: 0.5,
      }}
    >
      <span
        style={{
          display: "block",
          width: 60,
          height: 1,
          background: "rgba(255,255,255,0.08)",
        }}
      />
      <span style={{ fontSize: 11, color: COLOR.inkGhost }}>◇</span>
      <span
        style={{
          display: "block",
          width: 60,
          height: 1,
          background: "rgba(255,255,255,0.08)",
        }}
      />
    </div>
  );
}

/** A section, its chapter opening, and its standfirst rail.
 *
 *  ── Why this component's CSS is in here and not globals.css ──────
 *
 *  Because its layout broke three times running, and every time the cause
 *  was the same shape: the hook (className) ships in the JS chunk, the
 *  rule ships in the CSS chunk, and the two can arrive out of sync. Once
 *  because globals.css hadn't been copied across. Once because the built
 *  CSS was stale while the JS was fresh — which renders an element that
 *  looks correctly annotated in the source and lays out like it's 2011,
 *  with nothing anywhere to say why.
 *
 *  A rule whose only job is to serve one component has no business living
 *  in a file that component doesn't import. Here the hook and the rule are
 *  the same module: they cannot desync, a stale stylesheet cannot strip
 *  the responsive behaviour, and there is no second file to remember. It's
 *  also the pattern the rest of the site already uses — SiteHeader,
 *  LimenLoader and the pages all carry their own <style> blocks.
 *
 *  (Five SectionShells on /about means five identical <style> tags. They
 *  are idempotent and ~600 bytes each — a fair price for a class of bug
 *  that has already cost more than it ever will again.)
 */
export function SectionShell({
  roman,
  label,
  index,
  date,
  children,
}: {
  roman: string;
  label: string;
  index: string;
  date: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 40px 96px" }}
    >
      <style>{`
        @media (max-width: 720px) {
          /* minmax(180px, 1fr) minmax(0, 4fr): below ~700px the aside takes
             its 180px floor and the plate gets whatever's left — about
             170px at phone width, which is two words to a line. */
          .section-shell {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 18px !important;
          }
          /* Stacked, a sticky rail pinned under the header is worse than
             useless: it covers the prose it exists to label as you scroll
             past it. It becomes a standfirst rail instead — which is what
             every other stacked entry on this site does with its
             metadata. */
          .section-shell-aside {
            position: static !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: baseline !important;
            gap: 6px 16px !important;
            padding-top: 0 !important;
          }
          .section-shell-aside > div {
            display: flex;
            align-items: baseline;
            gap: 10px;
          }
        }
      `}</style>

      <SectionMark roman={roman} label={label} index={index} />

      <div
        className="section-shell"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px, 1fr) minmax(0, 4fr)",
          gap: "clamp(24px, 5vw, 96px)",
        }}
      >
        <aside
          className="section-shell-aside"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            paddingTop: 8,
            position: "sticky",
            // Measured, not guessed — SiteHeader publishes its own height
            // as --header-height from a ResizeObserver on its own box.
            top: "calc(var(--header-height, 128px) + 16px)",
            alignSelf: "start",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: COLOR.inkMuted,
              }}
            >
              § {roman}
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: FONT.mono,
                fontSize: 9,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
              }}
            >
              {label}
            </div>
          </div>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: COLOR.inkMuted,
            }}
          >
            {date}
          </div>
        </aside>

        <div className="reading-plate">{children}</div>
      </div>
    </section>
  );
}
