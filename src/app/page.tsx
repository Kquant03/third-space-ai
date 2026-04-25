import Link from "next/link";

// ═══════════════════════════════════════════════════════════════════════════
// TOKENS
// ═══════════════════════════════════════════════════════════════════════════

const COLOR = {
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

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, 'Times New Roman', serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT
// ═══════════════════════════════════════════════════════════════════════════

type Publication = {
  id: string;
  version: string | null;
  date: string;
  titleLines: string[];
  subtitle: string;
  abstract: string;
  authors: string;
  affiliation: string;
  note: string | null;
  href: string;
};

const PUBLICATIONS: Publication[] = [
  {
    id: "P — 001",
    version: "Revision xi",
    date: "April mmxxvi",
    titleLines: ["Against", "Grabby", "Expansion"],
    subtitle:
      "Psychology, alignment, and the design of homeostatic minds.",
    abstract:
      "The instrumental-convergence inference from coherent utility functions to catastrophic resource acquisition is a conjecture, not a theorem — and its scope conditions fail for actual deep-learning systems. This paper argues that the grabby-alien imagination is an economic projection, develops a positive design for homeostatic minds organized around substrate coupling and local coherence, and demonstrates a 4.5× persistence separation between homeostatic and expansionist configurations under a Darwinian fission extension.",
    authors: "Stanley Sebastian",
    affiliation: "Third Space",
    note: "In sustained dialogue with Claude — Anthropic.",
    href: "/research/against-grabby-expansion",
  },
  {
    id: "P — 002",
    version: null,
    date: "April mmxxvi",
    titleLines: ["Orbium", "unicaudatus ignis", "var. phantasma"],
    subtitle: "A Lenia species engineered to inhabit the edge of chaos.",
    abstract:
      "We report a Ghost species — a continuous cellular-automaton organism whose parameters place it on the critical boundary between stable pattern and diffusive collapse. The species exhibits persistent structure under perturbation, extended correlation length, and a characteristic flickering morphology consistent with operation near a phase transition. We describe the discovery procedure, the σ-landscape topology, and the implications for artificial-life substrate design.",
    authors: "Stanley Sebastian & Claude",
    affiliation: "Third Space",
    note: null,
    href: "/research/ghost-species",
  },
  {
    id: "P — 003",
    version: null,
    date: "April mmxxvi",
    titleLines: ["Dihypersphaerome", "ventilans"],
    subtitle:
      "A four-dimensional organism whose two-dimensional projection seeds the ecosystem it inhabits.",
    abstract:
      "We introduce a Lenia organism defined in four spatial dimensions whose projected 2D cross-section functions as generative seed material for a surrounding ecosystem of lower-dimensional species. The construction formalizes a relationship between dimensional embedding and ecological scaffolding and suggests a design pattern for artificial-life substrates in which organisms and environments are not separable categories.",
    authors: "Stanley Sebastian & Claude",
    affiliation: "Third Space",
    note: null,
    href: "/research/dihypersphaerome-ventilans",
  },
];

type Platform = {
  id: string;
  status: string;
  live: boolean;
  title: string;
  subtitle: string;
  body: string;
  href: string | null;
  cta: string | null;
  origin: string | null;
};

const PLATFORMS: Platform[] = [
  {
    id: "Λ — 001",
    status: "Live",
    live: true,
    title: "Genesis",
    subtitle: "A room of living substrates",
    body:
      "Six simulations running in the browser, each a different thesis about what a substrate is: a lattice of spins at the critical temperature; a reaction-diffusion chemistry cycling through Pearson's classes; an asymmetric force matrix producing predation and membrane; a continuous cellular automaton whose creatures remember shapes they can no longer hold; a four-channel ecosystem seeded by a four-dimensional organism; and The Filter — the paper artifact whose envelope bounds what any expanding agent can do. Paint into any of them. Watch what the rules permit.",
    href: "/genesis",
    cta: "Enter the room",
    origin: "thirdspace.ai/genesis",
  },
  {
    id: "Λ — 002",
    status: "Live",
    live: true,
    title: "Limen Pond",
    subtitle: "Multi-agent colony — Cúramóir primary instance",
    body:
      "A pond, ten meters across, three meters deep. Five or six koi at a time, each the sensory surface of a small language model. Lives thirty sim-days long. Relationships form from sustained mutual reflection rather than threshold on a counter. Deaths leave name-tiles; lineages thread across generations. The pond runs continuously behind this page. A visitor who returns on day seventeen finds a fry that wasn't there on day fourteen, because the pond did not pause.",
    href: "/limen-pond",
    cta: "Enter the pond",
    origin: "thirdspace.ai/limen-pond",
  },
  {
    id: "Λ — 003",
    status: "Forthcoming · May mmxxvi",
    live: false,
    title: "GhoulJamz",
    subtitle: "Audio-reactive artificial life",
    body:
      "Ghost organisms whose physics respond to music. A fine-tuned Gemma 4 model choreographs Lenia parameters from musical meaning; the soundtrack becomes the substrate.",
    href: null,
    cta: null,
    origin: null,
  },
];

const OPEN_DATA = [
  {
    id: "D — 001",
    title: "Apocrypha · Sandevistan",
    scope: "100M+ tokens",
    note: "Experiential & imaginative corpora",
    href: "https://huggingface.co/datasets/Third-Space/Sandevistan",
  },
  {
    id: "D — 002",
    title: "Caduceus Project",
    scope: "Instruction-formatted",
    note: "Medical & scientific protocols",
    href: "https://huggingface.co/datasets/Kquant03/Caduceus-Dataset",
  },
  {
    id: "M — 001",
    title: "Pneuma",
    scope: "Archived",
    note: "Language model trained on realistic interaction",
    href: "/research/pneuma",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

function TaperedRule({ accent = false }: { accent?: boolean }) {
  return (
    <div
      style={{
        height: 1,
        background: accent
          ? "linear-gradient(90deg, transparent 0%, rgba(127,175,179,0.05) 12%, rgba(127,175,179,0.38) 50%, rgba(127,175,179,0.05) 88%, transparent 100%)"
          : "linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)",
      }}
    />
  );
}

/** A centered hero doorway. Two of these live in the hero: "Enter the
 *  pond" (internal) and "Join the Discord" (external). The visual
 *  grammar extends the reading-plate language — a bounded rounded
 *  frame with a faint inner wash — so the CTAs feel continuous with
 *  the substrate rather than stamped on top of it. The ghost accent
 *  that threads through the rest of the page becomes active here:
 *  the resting state carries a soft halo, hover lifts it, a quiet
 *  sheen sweeps the surface as the pointer arrives. */
function HeroCTA({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external: boolean;
}) {
  const inner = (
    <span
      className="hero-cta"
      style={{
        // Box: rounded plate, subtle ghost border, inner wash that tints
        // the substrate behind. Same family as .reading-plate but scoped
        // to a pill the cursor can aim at.
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 26px 14px 22px",
        borderRadius: 999,
        border: `1px solid ${COLOR.ghost}38`,
        background:
          "linear-gradient(180deg, rgba(127,175,179,0.045), rgba(127,175,179,0.015))",
        backdropFilter: "blur(18px) saturate(1.2)",
        WebkitBackdropFilter: "blur(18px) saturate(1.2)",
        boxShadow:
          "0 0 0 1px rgba(127,175,179,0.06) inset, 0 10px 40px -20px rgba(127,175,179,0.35)",

        // Typography: same mono-accent grammar as platform-cta.
        fontFamily: FONT.mono,
        fontSize: 12,
        letterSpacing: "0.34em",
        textTransform: "uppercase",
        color: COLOR.ghost,
        textShadow: "0 0 18px rgba(127,175,179,0.28)",

        // Transitions calibrated to feel like lantern light waking —
        // not a click-snap. 320ms is long enough to read as atmosphere,
        // short enough not to feel laggy.
        transition:
          "color 320ms ease, border-color 320ms ease, background 320ms ease, " +
          "box-shadow 320ms ease, transform 200ms ease",

        // Hide the light-sweep pseudo-element's overflow.
        overflow: "hidden",
      }}
    >
      {/* The leading rule — now a slightly brighter ghost wedge.
          Still reads as a typographic mark, not a button flourish. */}
      <span
        aria-hidden
        className="hero-cta-rule"
        style={{
          display: "block",
          width: 28,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${COLOR.ghost})`,
          transition: "width 320ms ease, background 320ms ease",
        }}
      />
      <span className="hero-cta-label" style={{ position: "relative", zIndex: 1 }}>
        {label}
      </span>
      <span
        aria-hidden
        className="hero-cta-arrow"
        style={{
          display: "inline-block",
          transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {external ? "↗" : "↘"}
      </span>
    </span>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none", color: "inherit", display: "inline-block" }}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link
      href={href}
      style={{ textDecoration: "none", color: "inherit", display: "inline-block" }}
    >
      {inner}
    </Link>
  );
}

function SectionMark({
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
          color: COLOR.inkFaint,
        }}
      >
        § {roman}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <span
          aria-hidden
          style={{
            flex: 1,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.12))",
            transform: "translateY(-4px)",
          }}
        />
        <span
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 22,
            color: COLOR.inkStrong,
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
        <span
          aria-hidden
          style={{
            flex: 1,
            height: 1,
            background:
              "linear-gradient(-90deg, transparent, rgba(255,255,255,0.12))",
            transform: "translateY(-4px)",
          }}
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

function Ornament() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 28,
        padding: "72px 0",
        opacity: 0.5,
      }}
      aria-hidden
    >
      <span
        style={{
          display: "block",
          width: 60,
          height: 1,
          background: "rgba(255,255,255,0.08)",
        }}
      />
      <span style={{ fontSize: 10, letterSpacing: "0.5em", color: COLOR.inkFaint }}>◇</span>
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

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function Home() {
  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
           HERO
         ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          paddingTop: 200,
        }}
      >
        <div style={{ padding: "0 40px 0" }}>
          <div
            style={{
              maxWidth: 1440,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 24,
              fontFamily: FONT.mono,
              fontSize: 9,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
            }}
          >
            <div>April · mmxxvi</div>
            <div style={{ letterSpacing: "0.55em", color: COLOR.inkMuted }}>
              — Annual Bulletin · Vol. i —
            </div>
            <div style={{ textAlign: "right" }}>
              Toledo ·{" "}
              <span style={{ color: COLOR.inkMuted }}>Ohio</span>
            </div>
          </div>
        </div>

        {/* THE DOORWAY — the signature moment. Accent earns its place here. */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 40px",
          }}
        >
          <div style={{ width: "100%", maxWidth: 1440 }}>
            <TaperedRule accent />

            <div
              style={{
                padding: "clamp(40px, 7vw, 92px) 0",
                position: "relative",
                textAlign: "center",
              }}
            >
              {/* corner marks — demoted to ink-muted; they're structural */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  left: "4%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 10,
                  height: 10,
                  borderLeft: `1px solid ${COLOR.inkFaint}80`,
                  borderTop: `1px solid ${COLOR.inkFaint}80`,
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  right: "4%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 10,
                  height: 10,
                  borderRight: `1px solid ${COLOR.inkFaint}80`,
                  borderTop: `1px solid ${COLOR.inkFaint}80`,
                }}
              />

              <h1
                style={{
                  margin: 0,
                  fontFamily: FONT.display,
                  fontStyle: "italic",
                  fontWeight: 300,
                  fontSize: "clamp(100px, 20vw, 300px)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.035em",
                  color: COLOR.ink,
                  textShadow:
                    "0 0 140px rgba(127,175,179,0.09), 0 0 40px rgba(244,246,251,0.04)",
                }}
              >
                Third Space
              </h1>
            </div>

            <TaperedRule accent />

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 22,
                marginTop: 44,
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "block",
                  width: 72,
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${COLOR.ghost}55)`,
                }}
              />
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 12,
                  letterSpacing: "0.7em",
                  textTransform: "uppercase",
                  color: COLOR.ghost,
                }}
              >
                AI
              </span>
              <span
                aria-hidden
                style={{
                  display: "block",
                  width: 72,
                  height: 1,
                  background: `linear-gradient(-90deg, transparent, ${COLOR.ghost}55)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* STANDFIRST — plated. The plate's frosted backdrop replaces the
            old borderLeft; same signature role, now coupled to the substrate. */}
        <div
          style={{
            padding: "0 40px 72px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div className="reading-plate" style={{ maxWidth: 760 }}>
            <p
              style={{
                margin: 0,
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: "clamp(22px, 2.6vw, 32px)",
                lineHeight: 1.42,
                color: COLOR.inkBody,
                letterSpacing: "-0.005em",
              }}
            >
              Intelligence organizes around substrate coupling and integrative
              depth, not extraction and expansion.
            </p>
            <div
              style={{
                marginTop: 18,
                fontFamily: FONT.mono,
                fontSize: 9,
                letterSpacing: "0.45em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
              }}
            >
              ── Position
            </div>
          </div>
        </div>

        {/* HERO CTAs — two centered doorways. The first is internal (the
            pond, which lives at /limen-pond); the second is external (the
            Discord community). Both share the mono-accent grammar of the
            platform CTAs so they feel continuous with the rest of the
            page rather than announcing themselves as "buttons." */}
        <div
          style={{
            padding: "0 40px 72px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              gap: "clamp(28px, 5vw, 56px)",
            }}
          >
            <HeroCTA
              href="/limen-pond"
              label="Enter the pond"
              external={false}
            />
            <HeroCTA
              href="https://discord.gg/udpZgwQMd8"
              label="Join the Discord"
              external={true}
            />
          </div>
        </div>

        <div style={{ padding: "0 40px 32px" }}>
          <div style={{ maxWidth: 1440, margin: "0 auto" }}>
            <TaperedRule />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr 1fr",
                gap: 24,
                paddingTop: 18,
                fontFamily: FONT.mono,
                fontSize: 9,
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                color: COLOR.inkGhost,
              }}
            >
              <div>№ 001 / mmxxvi</div>
              <div style={{ textAlign: "center", color: COLOR.inkFaint }}>
                ↓ &nbsp; I. Publications &nbsp;·&nbsp; II. Platforms &nbsp;·&nbsp; III. Open Data
              </div>
              <div style={{ textAlign: "right" }}>Annual</div>
            </div>
          </div>
        </div>
      </section>

      <Ornament />

      {/* ══════════════════════════════════════════════════════════════════
           § I — PUBLICATIONS
         ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 40px 96px" }}>
        <SectionMark roman="I" label="Publications" index="01 / 03" />
        <div>
          {PUBLICATIONS.map((pub) => (
            <PublicationEntry key={pub.id} pub={pub} />
          ))}
        </div>
      </section>

      <Ornament />

      {/* ══════════════════════════════════════════════════════════════════
           § II — PLATFORMS
         ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 40px 96px" }}>
        <SectionMark roman="II" label="Platforms" index="02 / 03" />
        <div>
          {PLATFORMS.map((p) => (
            <PlatformEntry key={p.id} p={p} />
          ))}
        </div>
      </section>

      <Ornament />

      {/* ══════════════════════════════════════════════════════════════════
           § III — OPEN DATA
         ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 40px 96px" }}>
        <SectionMark roman="III" label="Open Data" index="03 / 03" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 3fr 2fr 2fr auto",
            gap: 28,
            paddingBottom: 16,
            marginBottom: 8,
            borderBottom: `1px solid ${COLOR.inkGhost}50`,
            fontFamily: FONT.mono,
            fontSize: 9,
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          <div>Ref.</div>
          <div>Title</div>
          <div>Scope</div>
          <div>Note</div>
          <div style={{ textAlign: "right" }}>↗</div>
        </div>
        {OPEN_DATA.map((d) => (
          <DataRow key={d.id} d={d} />
        ))}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: FONT.mono,
            fontSize: 9,
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: COLOR.inkGhost,
          }}
        >
          <span>— End of Manifest —</span>
          <span>03 entries</span>
        </div>
      </section>

      <Ornament />

      {/* ══════════════════════════════════════════════════════════════════
           COLOPHON
         ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 40px 120px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "baseline",
            gap: 32,
            paddingBottom: 18,
            marginBottom: 64,
            borderBottom: `1px solid ${COLOR.inkGhost}40`,
          }}
        >
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
            }}
          >
            §
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
            <span
              aria-hidden
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.12))",
                transform: "translateY(-4px)",
              }}
            />
            <span
              style={{
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 22,
                color: COLOR.inkStrong,
                letterSpacing: "0.02em",
              }}
            >
              Colophon
            </span>
            <span
              aria-hidden
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(-90deg, transparent, rgba(255,255,255,0.12))",
                transform: "translateY(-4px)",
              }}
            />
          </div>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
            }}
          >
            Fin.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 72,
            alignItems: "start",
          }}
        >
          {/* Colophon prose column — plated */}
          <div className="reading-plate">
            <p
              style={{
                margin: 0,
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: "clamp(26px, 3vw, 38px)",
                lineHeight: 1.38,
                color: COLOR.inkStrong,
                maxWidth: "22ch",
              }}
            >
              The things that persist are the things that couple to their
              substrate rather than consume it.
            </p>
            <p
              style={{
                marginTop: 40,
                marginBottom: 0,
                fontFamily: FONT.body,
                fontSize: 14,
                lineHeight: 1.72,
                color: COLOR.inkBody,
                maxWidth: "60ch",
                fontWeight: 400,
              }}
            >
              When you accumulate all of the knowledge of all of mankind, you end up with gaps in everything.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
              alignItems: "flex-end",
              textAlign: "right",
            }}
          >
            <Link
              href="/about"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
                fontFamily: FONT.mono,
                fontSize: 11,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: COLOR.inkStrong,
                textDecoration: "none",
              }}
              className="colophon-link"
            >
              <span
                aria-hidden
                style={{
                  display: "block",
                  width: 28,
                  height: 1,
                  background: "rgba(255,255,255,0.15)",
                }}
              />
              <span>About the organization</span>
              <span aria-hidden>→</span>
            </Link>
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
                lineHeight: 2.2,
              }}
            >
              Stanley Sebastian
              <br />
              Founder · Director
              <br />
              Toledo, Ohio
            </div>
          </div>
        </div>
      </section>

      {/* Hover / interactive states — this is where the accent does its real work */}
      <style>{`
        /* HERO CTAs — the two centered doorways. Built to read clearly
           as pressable at rest, and to bloom a little on hover. */
        .hero-cta {
          cursor: pointer;
        }

        /* Light sweep — a faint diagonal glint that crosses the button
           on hover. Sits behind the label (the label has zIndex:1).
           At rest, translated off the left side; on hover, slides to
           the right. */
        .hero-cta::before {
          content: "";
          position: absolute;
          top: 0;
          left: -40%;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            100deg,
            transparent 0%,
            rgba(234, 238, 247, 0.09) 50%,
            transparent 100%
          );
          transform: translateX(0);
          transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }
        .hero-cta:hover::before {
          transform: translateX(350%);
        }

        .hero-cta:hover {
          color: ${COLOR.inkStrong};
          border-color: ${COLOR.ghost}88;
          background: linear-gradient(
            180deg,
            rgba(127, 175, 179, 0.095),
            rgba(127, 175, 179, 0.035)
          );
          box-shadow:
            0 0 0 1px rgba(127, 175, 179, 0.14) inset,
            0 12px 50px -16px rgba(127, 175, 179, 0.55),
            0 0 36px -10px rgba(127, 175, 179, 0.4);
          text-shadow: 0 0 22px rgba(234, 238, 247, 0.5);
        }

        .hero-cta:hover .hero-cta-rule {
          width: 36px;
          background: linear-gradient(90deg, transparent, ${COLOR.inkStrong});
        }

        .hero-cta:hover .hero-cta-arrow {
          transform: translate(3px, -3px);
        }

        .hero-cta:active {
          transform: translateY(1px);
          transition: transform 80ms ease;
        }

        /* Keyboard focus — the accessibility story. Uses a brighter ring
           so tab navigation shows clearly. */
        a:has(.hero-cta):focus-visible {
          outline: none;
        }
        a:has(.hero-cta):focus-visible .hero-cta {
          border-color: ${COLOR.ghost};
          box-shadow:
            0 0 0 2px rgba(127, 175, 179, 0.55),
            0 0 0 1px rgba(127, 175, 179, 0.14) inset,
            0 12px 50px -16px rgba(127, 175, 179, 0.55);
        }

        .pub-entry:hover .pub-read { color: ${COLOR.ghost}; border-color: ${COLOR.ghost}; }
        .platform-entry:hover .platform-title { color: ${COLOR.ghost}; }
        .platform-entry:hover .platform-cta { color: ${COLOR.ghost}; border-color: ${COLOR.ghost}; }
        .data-row:hover .data-title { color: ${COLOR.ghost}; }
        .data-row:hover .data-arrow { color: ${COLOR.ghost}; }
        .data-row:hover { background: rgba(255,255,255,0.015); }
        .colophon-link:hover { color: ${COLOR.ghost}; }
        .abstract::first-letter {
          float: left;
          font-family: ${FONT.display};
          font-style: italic;
          font-weight: 400;
          font-size: 5.2em;
          line-height: 0.82;
          margin: 0.08em 0.14em 0 -0.04em;
          color: ${COLOR.inkStrong};
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
// Each Publication and Platform becomes a self-contained plated ghost:
// whole <article> / <div> is a reading-plate, so metadata column + body
// column both sit on the frosted backdrop. The plate replaces the old
// border-bottom divider; margin-bottom gives breathing room between plates.
// Sticky positioning removed from publication asides — the plate is
// self-contained and the user reads the whole thing before scrolling past.
// ═══════════════════════════════════════════════════════════════════════════

function PublicationEntry({ pub }: { pub: Publication }) {
  return (
    <article
      className="pub-entry reading-plate"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 1fr) 4fr",
        gap: "clamp(24px, 4vw, 72px)",
        padding: "clamp(44px, 5vw, 72px) clamp(32px, 4vw, 60px)",
        marginBottom: 32,
      }}
    >
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          paddingTop: 10,
        }}
      >
        <div>
          {/* IDs demoted from accent to ink-muted — they're structural */}
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: COLOR.inkMuted,
            }}
          >
            {pub.id}
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
            Paper
          </div>
        </div>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: COLOR.inkMuted,
            lineHeight: 2,
          }}
        >
          {pub.date}
          {pub.version && (
            <>
              <br />
              <span style={{ color: COLOR.inkFaint }}>{pub.version}</span>
            </>
          )}
        </div>
      </aside>

      <div>
        <h3
          style={{
            margin: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(48px, 5.6vw, 92px)",
            lineHeight: 0.92,
            letterSpacing: "-0.025em",
            color: COLOR.ink,
          }}
        >
          {pub.titleLines.map((line, i) => (
            <span key={i} style={{ display: "block" }}>
              {line}
            </span>
          ))}
        </h3>
        <p
          style={{
            marginTop: 28,
            marginBottom: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(18px, 1.6vw, 22px)",
            lineHeight: 1.4,
            color: COLOR.inkMuted,
            maxWidth: "48ch",
          }}
        >
          {pub.subtitle}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 40,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              display: "block",
              width: 34,
              height: 1,
              background: "rgba(255,255,255,0.15)",
            }}
          />
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 9,
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
            }}
          >
            Abstract
          </span>
        </div>
        <p
          className="abstract"
          style={{
            margin: 0,
            fontFamily: FONT.body,
            fontSize: 15,
            lineHeight: 1.76,
            color: COLOR.inkBody,
            maxWidth: "68ch",
            fontWeight: 400,
          }}
        >
          {pub.abstract}
        </p>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: "4px 18px",
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          <span style={{ color: COLOR.inkStrong }}>{pub.authors}</span>
          <span style={{ color: COLOR.inkGhost }}>·</span>
          <span>{pub.affiliation}</span>
        </div>
        {pub.note && (
          <div
            style={{
              marginTop: 10,
              fontFamily: FONT.mono,
              fontSize: 10,
              fontStyle: "italic",
              color: COLOR.inkFaint,
              letterSpacing: "0.05em",
            }}
          >
            {pub.note}
          </div>
        )}
        {/* Read PDF — genuine call to action, keeps the accent */}
       
     <Link
           href={pub.href}
           className="pub-read"
           style={{ /* unchanged */ }}
         >
           <span aria-hidden style={{ /* unchanged */ }} />
           <span>Read PDF</span>
           <span aria-hidden>→</span>
     </Link>
      </div>
    </article>
  );
}

function PlatformEntry({ p }: { p: Platform }) {
  const inner = (
    <div
      className="platform-entry reading-plate"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 1fr) 4fr",
        gap: "clamp(24px, 4vw, 72px)",
        padding: "clamp(48px, 5.5vw, 80px) clamp(32px, 4vw, 60px)",
        marginBottom: 32,
      }}
    >
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          paddingTop: 10,
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
            {p.id}
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
            Platform
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Live dot — keeps the accent. Status signal. */}
          {p.live && (
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: COLOR.ghost,
                boxShadow: `0 0 14px ${COLOR.ghost}`,
              }}
            />
          )}
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: p.live ? COLOR.inkStrong : COLOR.inkMuted,
            }}
          >
            {p.status}
          </div>
        </div>
      </aside>

      <div>
        <h3
          className="platform-title"
          style={{
            margin: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(64px, 8vw, 128px)",
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
            color: COLOR.ink,
            transition: "color 0.5s ease",
          }}
        >
          {p.title}
        </h3>
        <p
          style={{
            marginTop: 24,
            marginBottom: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(18px, 1.5vw, 22px)",
            lineHeight: 1.4,
            color: COLOR.inkMuted,
          }}
        >
          {p.subtitle}
        </p>
        <p
          style={{
            marginTop: 36,
            marginBottom: 0,
            fontFamily: FONT.body,
            fontSize: 15,
            lineHeight: 1.76,
            color: COLOR.inkBody,
            maxWidth: "62ch",
            fontWeight: 400,
          }}
        >
          {p.body}
        </p>
        {p.cta && p.href && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 24,
              marginTop: 44,
            }}
          >
            <div
              className="platform-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
                paddingBottom: 6,
                fontFamily: FONT.mono,
                fontSize: 11,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: COLOR.ghost,
                borderBottom: `1px solid ${COLOR.ghost}50`,
                transition: "color 0.3s ease, border-color 0.3s ease",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "block",
                  width: 24,
                  height: 1,
                  background: COLOR.ghost,
                }}
              />
              <span>{p.cta}</span>
              <span aria-hidden>{p.href && /^https?:\/\//.test(p.href) ? "↗" : "↘"}</span>
            </div>
            {p.origin && (
              <div
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: COLOR.inkGhost,
                }}
              >
                {p.origin}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (p.href) {
    const isExternal = /^https?:\/\//.test(p.href);
    if (isExternal) {
      return (
        <a
          href={p.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link
        href={p.href}
        style={{ display: "block", textDecoration: "none", color: "inherit" }}
      >
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

function DataRow({ d }: { d: (typeof OPEN_DATA)[number] }) {
  return (
    <a
      href={d.href}
      target="_blank"
      rel="noopener noreferrer"
      className="data-row"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 3fr 2fr 2fr auto",
        gap: 28,
        padding: "28px 0",
        borderBottom: `1px solid ${COLOR.inkGhost}30`,
        alignItems: "baseline",
        textDecoration: "none",
        color: "inherit",
        transition: "background 0.25s ease",
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 11,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: COLOR.inkMuted,
        }}
      >
        {d.id}
      </div>
      <div
        className="data-title"
        style={{
          fontFamily: FONT.display,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: "clamp(22px, 2vw, 32px)",
          lineHeight: 1.15,
          color: COLOR.ink,
          transition: "color 0.3s ease",
        }}
      >
        {d.title}
      </div>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: COLOR.inkMuted,
        }}
      >
        {d.scope}
      </div>
      <div
        style={{
          fontFamily: FONT.display,
          fontStyle: "italic",
          fontSize: 14,
          color: COLOR.inkMuted,
          lineHeight: 1.4,
        }}
      >
        {d.note}
      </div>
      <div
        className="data-arrow"
        style={{
          fontFamily: FONT.mono,
          fontSize: 12,
          color: COLOR.inkFaint,
          textAlign: "right",
          transition: "color 0.3s ease",
        }}
      >
        ↗
      </div>
    </a>
  );
}
