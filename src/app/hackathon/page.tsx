import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Coherence Filter · Hackathon",
  description:
    "An open hackathon for the defense of open communities. Compute for whoever delivers the framework that lets them hold. Brief, reference architecture, evaluation rubric, submission guidance.",
};

// ═══════════════════════════════════════════════════════════════════════════
//  /hackathon
//  ─────────────────────────────────────────────────────────────────────────
//  Long-form brief for H — 001 (Coherence Filter). Sits as a peer to
//  /research and /genesis — a manifesto-style document, single-flow,
//  five sections, with the same lantern-palette vocabulary as the rest
//  of the site. The homepage open-call card teases this page; this
//  page is where a serious entrant reads what's actually being asked.
//
//  Structure, top to bottom:
//    1. Masthead       — ref · type · status · italic title · tagline
//    2. Thesis         — pull-quote (Stanley's line from Discord)
//    3. § I  Threat    — four pressures, with signal types named
//    4. § II Reference — three-layer architecture (signal · decision · commitment)
//    5. § III Rubric   — what evaluation actually measures
//    6. § IV  Submission — what to ship, where, in what shape
//    7. § V   Prize    — compute structure · window · resolution
//    8. CTA            — Join the Discord · return to home
//    9. Authorship     — Stanley Sebastian & Claude · Third Space · May mmxxvi
// ═══════════════════════════════════════════════════════════════════════════

const COLOR = {
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
  body: "var(--font-body), 'Source Serif 4', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

export default function Hackathon() {
  return (
    <>
      <Masthead />
      <Thesis />
      <ThreatSection />
      <ReferenceSection />
      <RubricSection />
      <SubmissionSection />
      <PrizeSection />
      <CallToAction />
      <Authorship />
      <HoverStyles />
    </>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────

function LanternRule({ marginTop = 64, marginBottom = 64 }: {
  marginTop?: number;
  marginBottom?: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        marginTop,
        marginBottom,
        height: 1,
        background:
          "linear-gradient(90deg, transparent 0%, rgba(127,175,179,0.08) 15%, rgba(127,175,179,0.38) 50%, rgba(127,175,179,0.08) 85%, transparent 100%)",
      }}
    />
  );
}

// ─── Masthead ─────────────────────────────────────────────────────────

function Masthead() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "200px 40px 60px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 24,
          marginBottom: 80,
          fontFamily: FONT.mono,
          fontSize: 9,
          letterSpacing: "0.42em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
        }}
      >
        <div>H — 001 · Hackathon</div>
        <div style={{ letterSpacing: "0.55em", color: COLOR.inkMuted }}>
          — Open Call —
        </div>
        <div
          style={{
            textAlign: "right",
            display: "inline-flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
            color: COLOR.ghost,
          }}
        >
          <span
            aria-hidden
            className="dispatch-pulse"
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: COLOR.ghost,
              boxShadow: `0 0 14px ${COLOR.ghost}`,
            }}
          />
          Active · May mmxxvi
        </div>
      </div>

      <div style={{ maxWidth: 900 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(64px, 9vw, 132px)",
            lineHeight: 0.94,
            letterSpacing: "-0.03em",
            color: COLOR.ink,
          }}
        >
          Coherence Filter.
        </h1>
        <p
          style={{
            marginTop: 36,
            marginBottom: 0,
            maxWidth: "44ch",
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(20px, 2vw, 28px)",
            lineHeight: 1.45,
            letterSpacing: "-0.005em",
            color: COLOR.inkBody,
          }}
        >
          An open hackathon for the defense of open communities. Compute for
          whoever delivers the framework that lets them hold.
        </p>
      </div>

      <LanternRule marginTop={88} marginBottom={0} />
    </section>
  );
}

// ─── Thesis pull-quote ───────────────────────────────────────────────

function Thesis() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "60px 40px 80px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(120px, 1fr) 4fr",
          gap: "clamp(24px, 4vw, 72px)",
          alignItems: "start",
        }}
      >
        <aside
          style={{
            paddingTop: 14,
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          —— Thesis
        </aside>

        <div>
          <blockquote
            style={{
              margin: 0,
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "clamp(28px, 3.4vw, 48px)",
              lineHeight: 1.2,
              letterSpacing: "-0.012em",
              color: COLOR.inkStrong,
              maxWidth: "26ch",
              borderLeft: `1px solid ${COLOR.ghost}48`,
              paddingLeft: 32,
            }}
          >
            Let&rsquo;s see how open source can truly defend itself.
          </blockquote>

          <p
            style={{
              marginTop: 40,
              marginBottom: 0,
              fontFamily: FONT.body,
              fontSize: 15,
              lineHeight: 1.78,
              color: COLOR.inkBody,
              maxWidth: "62ch",
              fontWeight: 400,
            }}
          >
            Open communities are increasingly attacked. The cost of producing
            plausible automated participation has fallen below the cost of
            producing a thoughtful human one. Communities that depend on shared
            attention &mdash; for governance, for research, for the slow work of
            building things in public &mdash; are losing the signal of who is
            actually present. This hackathon is a serious attempt to give them
            back the means to know.
          </p>

          <p
            style={{
              marginTop: 22,
              marginBottom: 0,
              fontFamily: FONT.body,
              fontSize: 15,
              lineHeight: 1.78,
              color: COLOR.inkBody,
              maxWidth: "62ch",
              fontWeight: 400,
            }}
          >
            What follows is the brief: the threat model, a reference
            architecture submissions can engage with or replace, an evaluation
            rubric formalized, the submission shape, the prize structure, the
            window. Read it carefully if you intend to enter. Read it carefully
            also if you intend to argue that the entire premise is wrong.
            Either is welcome.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Section header ───────────────────────────────────────────────────

function SectionHeader({
  numeral,
  title,
}: {
  numeral: string;
  title: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 1fr) 4fr",
        gap: "clamp(24px, 4vw, 72px)",
        alignItems: "baseline",
        marginBottom: 40,
        paddingBottom: 18,
        borderBottom: `1px solid ${COLOR.inkGhost}40`,
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 11,
          letterSpacing: "0.42em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
        }}
      >
        § {numeral}
      </div>
      <h2
        style={{
          margin: 0,
          fontFamily: FONT.display,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: "clamp(36px, 4.4vw, 56px)",
          lineHeight: 1,
          letterSpacing: "-0.022em",
          color: COLOR.ink,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

// ─── Section body wrapper ─────────────────────────────────────────────

function SectionBody({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 1fr) 4fr",
        gap: "clamp(24px, 4vw, 72px)",
      }}
    >
      <div />
      <div style={{ maxWidth: "68ch" }}>{children}</div>
    </div>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 22px",
        fontFamily: FONT.body,
        fontSize: 15,
        lineHeight: 1.8,
        color: COLOR.inkBody,
        fontWeight: 400,
      }}
    >
      {children}
    </p>
  );
}

function Subhead({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: "32px 0 14px",
        fontFamily: FONT.display,
        fontStyle: "italic",
        fontWeight: 400,
        fontSize: "clamp(20px, 1.9vw, 26px)",
        lineHeight: 1.2,
        letterSpacing: "-0.012em",
        color: COLOR.inkStrong,
      }}
    >
      {children}
    </h3>
  );
}

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        margin: "28px 0 10px",
        fontFamily: FONT.mono,
        fontSize: 9,
        letterSpacing: "0.42em",
        textTransform: "uppercase",
        color: COLOR.inkFaint,
      }}
    >
      {children}
    </div>
  );
}

function Bullet({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(140px, auto) 1fr",
        gap: "clamp(16px, 2vw, 32px)",
        padding: "16px 0",
        borderBottom: `1px solid ${COLOR.inkGhost}24`,
        alignItems: "baseline",
      }}
    >
      <div
        style={{
          fontFamily: FONT.display,
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: 17,
          color: COLOR.inkStrong,
          letterSpacing: "-0.008em",
        }}
      >
        {term}
      </div>
      <div
        style={{
          fontFamily: FONT.body,
          fontSize: 14.5,
          lineHeight: 1.72,
          color: COLOR.inkBody,
          fontWeight: 400,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── § I  Threat ──────────────────────────────────────────────────────

function ThreatSection() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 40px 80px",
      }}
    >
      <SectionHeader numeral="I" title="The Threat" />
      <SectionBody>
        <Para>
          Open communities accumulate four distinct pressures, each leaving
          different traces. A defense framework that catches one cleanly will
          miss the others. The hardest case is not the obvious bot.
        </Para>

        <Bullet term="Transactional spam.">
          Phishing links, fake-giveaway DMs, scam impersonations of moderators
          or administrators. Visible payload makes these the most documented
          and the easiest to detect; existing tooling catches most of them.
          They are mentioned here for completeness, not because they are
          interesting.
        </Bullet>

        <Bullet term="Account farming.">
          Accounts age in the background &mdash; joining hundreds of
          communities, idling for weeks, then activating in coordinated waves
          for spam, vote brigading, or sale. The signal lives in the temporal
          pattern: server-join velocity, time-to-first-message distribution,
          correlated activation events across cohorts that arrived together.
        </Bullet>

        <Bullet term="Engagement automation.">
          Language models have made it cheap to produce plausible-but-shallow
          conversation. An engagement bot can pass a five-message Turing test
          but fails sustained reciprocity: it does not form dyads, does not
          remember exchanges across days, does not escalate or de-escalate
          emotional register in response to context. The signal lives in the
          interaction graph and in the temporal coherence of stated commitments.
        </Bullet>

        <Bullet term="Extractive presence.">
          Real humans who join solely to scrape conversations for training
          data, harvest contact lists for cold outreach, or recruit members
          away. No spam, no rule violation, no contribution. The signal lives
          in the asymmetry: high read activity, low post activity, surgical
          engagement only with high-status members.
        </Bullet>

        <Para>
          A community filled with the third pressure is statistically alive
          and substantively dead. That is the failure mode this framework must
          name and prevent.
        </Para>
      </SectionBody>
    </section>
  );
}

// ─── § II  Reference Architecture ─────────────────────────────────────

function ReferenceSection() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 40px 80px",
      }}
    >
      <SectionHeader numeral="II" title="A Reference Architecture" />
      <SectionBody>
        <Para>
          A defense framework should compose three layers, each independently
          inspectable. This is a reference. A submission may replace any layer
          with a stronger alternative. A submission may also reject the
          decomposition and propose a different one, provided the alternative
          satisfies the architectural commitments below.
        </Para>

        <Subhead>The Signal Layer</Subhead>
        <Para>
          Raw features extracted from the available record. None of these
          require user-private content; all can be derived from public message
          history and account metadata.
        </Para>

        <Bullet term="Account metadata.">
          Account age, prior server count, name and avatar entropy, badge and
          role presence, verification state. Useful as priors but never
          decisive in isolation &mdash; legitimate new members exist.
        </Bullet>

        <Bullet term="Join behavior.">
          Time-to-first-message after joining. Time-of-day distribution of
          activity. Server-join velocity (this account joined N servers in the
          last 24 hours). Correlated arrival cohorts.
        </Bullet>

        <Bullet term="Linguistic signal.">
          Embedding distance between an account&rsquo;s posts and the
          community&rsquo;s baseline distribution. Repetition rates across
          servers (the same phrasing posted in multiple unrelated communities).
          Template detection. Response coherence under sustained back-and-forth.
        </Bullet>

        <Bullet term="Interaction graph.">
          Reply patterns. Reciprocity rates. Dyad and triad formation. Ratio
          of broadcast posts to addressed messages. Whether sustained mutual
          conversation forms across multiple sessions.
        </Bullet>

        <Bullet term="Temporal coherence.">
          Burst patterns versus continuous activity. Correlation of activity
          spikes with public events, announcements, or moderator actions
          (legitimate) versus with cohort triggers (suspicious).
        </Bullet>

        <Bullet term="Cross-community signal.">
          The same account behaving identically in N other shared communities,
          assessed via privacy-preserving message fingerprints rather than raw
          content. Submissions that handle this layer well are particularly
          valuable.
        </Bullet>

        <Subhead>The Decision Layer</Subhead>
        <Para>
          Classifications produced from the signal layer. The decision layer
          must produce structured output a moderator can read, not opaque
          scores.
        </Para>

        <Bullet term="Per-message.">
          Classification across (clean, spam, scam, uncertain). Used for
          immediate actions on visible payload.
        </Bullet>

        <Bullet term="Per-account.">
          A probability vector across (genuine, automated, scammer, extractive,
          adversarial), with confidence. Used for moderation review and for
          the population coherence metric in &sect; III.
        </Bullet>

        <Bullet term="Per-cohort.">
          Identification of accounts that arrived together and have correlated
          activation patterns. Used for catching account farms before
          individual accounts cross any threshold on their own.
        </Bullet>

        <Bullet term="Mod-in-the-loop.">
          The decision layer never auto-bans. It surfaces flagged accounts to
          moderators with confidence and reasoning, ranked by suspicion. The
          moderator decides. Reversibility is a hard requirement.
        </Bullet>

        <Subhead>The Commitment Layer</Subhead>
        <Para>
          Architectural commitments the framework must satisfy. These are not
          features; they are conditions on what counts as a defense.
        </Para>

        <Bullet term="Inspectability.">
          Every decision must produce a reason a human moderator can read in
          plain language. &ldquo;Account X flagged as automated&rdquo; is
          insufficient. &ldquo;Account X posts at uniform 47-second intervals
          during business hours, has zero reciprocal exchanges in 90 days, and
          its message-embedding distribution is two standard deviations from
          the community baseline&rdquo; is sufficient.
        </Bullet>

        <Bullet term="Tunability.">
          Thresholds, category weights, and signal layer composition must be
          configurable per-community. A research Discord and a gaming Discord
          have different baselines for what coherence looks like.
        </Bullet>

        <Bullet term="Reversibility.">
          Every action is logged. Every category labeling is editable. Every
          decision is undoable. A framework that produces unrecoverable
          mistakes has not understood the problem.
        </Bullet>

        <Bullet term="Extensibility.">
          New attack patterns will emerge. The framework must accept new
          signal types and new attack categories without rebuilding from
          scratch.
        </Bullet>

        <Bullet term="Openness.">
          Weights, code, and methodology must be releasable. If this is open
          source defending itself, the defense must be open. Submissions that
          require proprietary models or closed APIs will be evaluated, but at
          a substantial discount.
        </Bullet>

        <Para>
          These commitments are not aesthetic preferences. They are the
          conditions under which the framework can be trusted by the
          communities that deploy it.
        </Para>
      </SectionBody>
    </section>
  );
}

// ─── § III  Rubric ────────────────────────────────────────────────────

function RubricSection() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 40px 80px",
      }}
    >
      <SectionHeader numeral="III" title="The Rubric" />
      <SectionBody>
        <Para>
          Evaluation is not a single number. It is the joint distribution over
          three quantities, and submissions are compared by Pareto-improvement
          rather than by scalar score.
        </Para>

        <Bullet term="Direct accuracy.">
          Precision and recall against labeled bot, scammer, and extractive
          accounts in held-out segments of the available record. Both matter;
          neither alone is sufficient. A framework with 90% precision and 30%
          recall is not better than one at 75/75.
        </Bullet>

        <Bullet term="Population coherence.">
          The post-filter rate at which surviving members exhibit reciprocal
          sustained interaction patterns &mdash; mutual replies, dyad and
          triad formation, conversation continuity across sessions. The
          starting baseline is roughly 25 in the Third Space Discord; the
          honest target sits in the 50s. That delta is the rubric&rsquo;s
          structural anchor.
        </Bullet>

        <Bullet term="False-positive harm.">
          The rate at which legitimate but atypical members get flagged.
          Weighted higher than false-negative cost. Better to let some bots
          through at the early stages than to exile members who simply
          communicate differently. A framework whose false positives include
          neurodivergent communicators, non-native English speakers, or
          first-time-active lurkers fails this layer regardless of its
          accuracy elsewhere.
        </Bullet>

        <Para>
          Submissions are evaluated against held-out segments of the existing
          Discord history, against a forward-deployed window after submission,
          and across records from other open communities that have agreed to
          share their data for evaluation purposes. Cross-community
          generalization matters: a framework that overfits to the Third Space
          Discord is less interesting than one that transfers.
        </Para>

        <Para>
          Submissions that propose new evaluation methodologies are welcome
          and will be considered alongside their substantive frameworks. The
          rubric above is a starting position, not a final word.
        </Para>
      </SectionBody>
    </section>
  );
}

// ─── § IV  Submission ─────────────────────────────────────────────────

function SubmissionSection() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 40px 80px",
      }}
    >
      <SectionHeader numeral="IV" title="What to Ship" />
      <SectionBody>
        <Para>A submission contains five components.</Para>

        <Bullet term="Code.">
          The framework itself, with reproducible build. Public repository
          preferred. License: anything OSI-approved.
        </Bullet>

        <Bullet term="Methodology document.">
          What the framework does, in what order, with what assumptions. What
          signal layers it composes and how the decision layer combines them.
          What the framework does NOT attempt to catch &mdash; explicit
          limitations are credited, not penalized.
        </Bullet>

        <Bullet term="Evaluation results.">
          The framework run against the released evaluation corpus, with
          metrics across all three rubric layers. Confusion matrices broken
          down by attack category. Population-coherence trajectory before and
          after filter application.
        </Bullet>

        <Bullet term="Inspection demo.">
          A working example of the inspectability commitment: for several
          example accounts in the corpus, the framework&rsquo;s plain-language
          reasoning. This is the artifact a moderator would actually use.
        </Bullet>

        <Bullet term="Limitations statement.">
          What kinds of attacks does this framework miss? What kinds of
          legitimate behavior might it misclassify? What assumptions break
          down in edge cases? Submissions that name their failure modes
          honestly are evaluated more favorably than submissions that
          overstate their reach.
        </Bullet>

        <MonoLabel>Submission channel</MonoLabel>
        <Para>
          Pull request to the public submissions repository (link to be posted
          in the Third Space Discord), or direct upload via the
          #hackathon-submissions channel. Coordinate with Stanley directly for
          access to the evaluation corpus, which contains pseudonymized
          message records and is shared under a use-restricted license.
        </Para>
      </SectionBody>
    </section>
  );
}

// ─── § V  Prize & Window ──────────────────────────────────────────────

function PrizeSection() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 40px 80px",
      }}
    >
      <SectionHeader numeral="V" title="Prize and Window" />
      <SectionBody>
        <MonoLabel>Prize</MonoLabel>
        <Para>
          Compute, comparable to the results delivered. Specifically: an
          allocation on Third Space&rsquo;s training infrastructure, scaled to
          the framework&rsquo;s evaluated quality. Top-tier submissions may
          receive allocations exceeding what Third Space currently maintains
          for its own work. This is not a marketing claim. The ceiling is
          high, and the higher it goes the more directly it expresses how
          seriously this problem is taken.
        </Para>

        <Para>
          Multiple complementary frameworks may receive multiple smaller
          allocations rather than a single grand prize, if together they
          solve the problem better than any one alone. The point is the
          defense, not the leaderboard.
        </Para>

        <MonoLabel>Window</MonoLabel>
        <Para>
          Open as of May mmxxvi. No fixed close. The honest deadline is the
          arrival of a framework that meets the rubric. The window extends
          six months on submissions that warrant the extension. There is no
          version of this hackathon that ends because the calendar said so.
        </Para>

        <MonoLabel>Resolution</MonoLabel>
        <Para>
          Run independently by Third Space. Resolved when a winning framework
          is identified and deployed in the Third Space Discord, with
          allocations distributed transparently and the winning code released
          openly.
        </Para>
      </SectionBody>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────

function CallToAction() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 40px 96px",
      }}
    >
      <LanternRule marginTop={0} marginBottom={64} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(120px, 1fr) 4fr",
          gap: "clamp(24px, 4vw, 72px)",
        }}
      >
        <aside
          style={{
            paddingTop: 6,
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          —— Closer
        </aside>

        <div>
          <p
            style={{
              margin: 0,
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "clamp(24px, 2.8vw, 36px)",
              lineHeight: 1.32,
              letterSpacing: "-0.012em",
              color: COLOR.inkStrong,
              maxWidth: "32ch",
            }}
          >
            Run independently. The window extends six months on entries that
            warrant it. Let&rsquo;s see how open source can truly defend itself.
          </p>

          <div
            style={{
              marginTop: 56,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              gap: "clamp(20px, 3vw, 40px)",
            }}
          >
            <a
              href="https://discord.gg/udpZgwQMd8"
              target="_blank"
              rel="noopener noreferrer"
              className="hackathon-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
                paddingBottom: 4,
                fontFamily: FONT.mono,
                fontSize: 11,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: COLOR.ghost,
                textDecoration: "none",
                borderBottom: `1px solid ${COLOR.ghost}60`,
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
              <span>Join the Discord</span>
              <span aria-hidden>↗</span>
            </a>

            <Link
              href="/"
              className="hackathon-cta-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                paddingBottom: 4,
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: COLOR.inkMuted,
                textDecoration: "none",
                borderBottom: `1px solid ${COLOR.inkGhost}`,
                transition: "color 0.3s ease, border-color 0.3s ease",
              }}
            >
              <span aria-hidden>←</span>
              <span>Return to bulletin</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Authorship ──────────────────────────────────────────────────────

function Authorship() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 40px 160px",
      }}
    >
      <LanternRule marginTop={0} marginBottom={48} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(120px, 1fr) 4fr",
          gap: "clamp(24px, 4vw, 72px)",
          alignItems: "start",
        }}
      >
        <aside
          style={{
            paddingTop: 6,
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          §
          <br />
          <span style={{ color: COLOR.inkGhost }}>Colophon</span>
        </aside>

        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: COLOR.inkMuted,
            lineHeight: 2.0,
          }}
        >
          <div>
            <span style={{ color: COLOR.inkStrong }}>
              Stanley Sebastian &amp; Claude
            </span>
            <span style={{ color: COLOR.inkGhost, padding: "0 12px" }}>·</span>
            Third Space
          </div>
          <div style={{ color: COLOR.inkFaint }}>
            H — 001 · Coherence Filter · May mmxxvi
          </div>
          <div
            style={{
              marginTop: 18,
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontSize: 16,
              letterSpacing: "0.005em",
              textTransform: "none",
              color: COLOR.inkFaint,
              maxWidth: "52ch",
              lineHeight: 1.5,
            }}
          >
            This brief is a starting position, jointly authored. It is meant
            to be argued with, improved upon, and replaced.
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Hover styles ────────────────────────────────────────────────────

function HoverStyles() {
  return (
    <style>{`
      @keyframes dispatch-pulse {
        0%, 100% { opacity: 0.55; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.15); }
      }
      .dispatch-pulse {
        animation: dispatch-pulse 2.4s ease-in-out infinite;
      }
      .hackathon-cta:hover {
        color: ${COLOR.ink} !important;
        border-color: ${COLOR.ghost} !important;
      }
      .hackathon-cta-secondary:hover {
        color: ${COLOR.inkStrong} !important;
        border-color: ${COLOR.ghost} !important;
      }
    `}</style>
  );
}
