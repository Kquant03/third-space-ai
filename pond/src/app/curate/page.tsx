"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════
//  Curate — the phone rating surface
//  ─────────────────────────────────────────────────────────────────────────
//  One card at a time. Context above, utterance in the middle, three
//  tap-buttons below. Optional stars and rewrite. Phone-optimized.
// ═══════════════════════════════════════════════════════════════════════════

interface Card {
  id: string;
  created_at: number;
  run_tag: string;
  model_id: string;
  tier: string;
  pond_context: Record<string, unknown>;
  koi_state: Record<string, unknown>;
  perception: Record<string, unknown>;
  utterance: string | null;
  intent_chosen: string | null;
  mechanism: string | null;
  fired_mechanism: string | null;
  latency_ms: number;
  cost_usd: number | null;
}

type Filter = "any" | "live" | "sweep";

export default function CuratePage() {
  const [filter, setFilter] = useState<Filter>("any");
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stars, setStars] = useState<number | null>(null);
  const [rewrite, setRewrite] = useState("");
  const [stats, setStats] = useState<{
    total: number; rated: number; gold: number; keep: number; reject: number;
  } | null>(null);
  const [showContext, setShowContext] = useState(true);
  const lastFetch = useRef(0);

  const loadNext = useCallback(async () => {
    lastFetch.current = Date.now();
    const fetchId = lastFetch.current;
    setLoading(true);
    setError(null);
    setCard(null);
    setStars(null);
    setRewrite("");
    try {
      const params = new URLSearchParams();
      if (filter !== "any") params.set("filter", filter);
      const res = await fetch(`/api/cog/next?${params}`);
      if (res.status === 401) {
        window.location.href = "/curate/login";
        return;
      }
      if (!res.ok) throw new Error(`status ${res.status}`);
      if (fetchId !== lastFetch.current) return;  // a newer fetch is in flight
      const data = await res.json() as { row: Card | null };
      setCard(data.row);
    } catch (e) {
      setError(String(e));
    } finally {
      if (fetchId === lastFetch.current) setLoading(false);
    }
  }, [filter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/cog/stats");
      if (!res.ok) return;
      const data = await res.json() as { summary: typeof stats };
      setStats(data.summary);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadNext(); loadStats(); }, [loadNext, loadStats]);

  const rate = async (tag: "gold" | "keep" | "reject") => {
    if (!card) return;
    try {
      await fetch("/api/cog/rate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: card.id,
          tag,
          stars: stars ?? undefined,
          rewrite: rewrite.length > 0 ? rewrite : undefined,
        }),
      });
      loadNext();
      loadStats();
    } catch (e) {
      setError(String(e));
    }
  };

  // Keyboard shortcuts for desktop testing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!card) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "1" || e.key === "r") rate("reject");
      if (e.key === "2" || e.key === "k") rate("keep");
      if (e.key === "3" || e.key === "g") rate("gold");
      if (e.key === "n" || e.key === " ") loadNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card]);

  const C = {
    bg: "#0a0a0a",
    fg: "#e4dfd3",
    mute: "#8a8577",
    border: "#242220",
    accent: "#c7a97a",
    gold: "#d9b65c",
    keep: "#7fc1b0",
    reject: "#a8341c",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.fg,
      fontFamily: "system-ui, sans-serif",
      padding: "1rem",
      paddingBottom: "2rem",
      maxWidth: 720,
      margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: "1rem",
        fontSize: "0.85rem",
      }}>
        <div style={{ fontFamily: "serif", fontStyle: "italic", fontSize: "1.4rem" }}>
          curate
        </div>
        {stats && (
          <div style={{ color: C.mute, fontSize: "0.75rem" }}>
            {stats.rated}/{stats.total} rated · <span style={{ color: C.gold }}>{stats.gold} gold</span> · <span style={{ color: C.keep }}>{stats.keep} keep</span> · <span style={{ color: C.reject }}>{stats.reject} reject</span>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1rem",
        fontSize: "0.85rem",
      }}>
        {(["any", "live", "sweep"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "0.4rem 0.9rem",
              background: filter === f ? C.accent : "transparent",
              color: filter === f ? C.bg : C.mute,
              border: `1px solid ${filter === f ? C.accent : C.border}`,
              borderRadius: 4,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ color: C.reject, padding: "1rem", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {loading && !card && (
        <div style={{ padding: "3rem 1rem", textAlign: "center", color: C.mute }}>
          …
        </div>
      )}

      {!loading && !card && (
        <div style={{ padding: "3rem 1rem", textAlign: "center", color: C.mute, fontFamily: "serif", fontStyle: "italic" }}>
          nothing to rate. the pond is quiet.
        </div>
      )}

      {card && (
        <>
          {/* Model bar */}
          <div style={{
            fontSize: "0.7rem",
            color: C.mute,
            marginBottom: "0.5rem",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}>
            <span style={{ fontFamily: "monospace", color: C.accent }}>
              {card.model_id}
            </span>
            <span>
              {card.latency_ms}ms
              {card.cost_usd != null && ` · $${card.cost_usd.toFixed(6)}`}
              {` · ${card.tier}`}
            </span>
          </div>

          {/* Context (collapsible) */}
          <div style={{
            background: "#121110",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "0.85rem",
            marginBottom: "1rem",
            fontSize: "0.8rem",
          }}>
            <div
              onClick={() => setShowContext((v) => !v)}
              style={{
                color: C.mute,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: "0.65rem",
                marginBottom: showContext ? "0.6rem" : 0,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              context {showContext ? "−" : "+"}
            </div>
            {showContext && (
              <>
                <ContextSection label="pond"  data={card.pond_context} color={C.fg} mute={C.mute} />
                <ContextSection label="koi"   data={card.koi_state}    color={C.fg} mute={C.mute} />
                <ContextSection label="perception" data={card.perception} color={C.fg} mute={C.mute} />
              </>
            )}
          </div>

          {/* Utterance — the main event */}
          <div style={{
            background: "#121110",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "1.5rem 1rem",
            marginBottom: "1rem",
            textAlign: "center",
          }}>
            <div style={{
              fontFamily: "serif",
              fontStyle: "italic",
              fontSize: "1.4rem",
              lineHeight: 1.4,
              color: C.fg,
            }}>
              &ldquo;{card.utterance}&rdquo;
            </div>
            {(card.intent_chosen || card.mechanism) && (
              <div style={{
                marginTop: "0.75rem",
                fontSize: "0.7rem",
                color: C.mute,
                letterSpacing: "0.05em",
              }}>
                {card.intent_chosen && <span>intent: <span style={{ color: C.accent }}>{card.intent_chosen}</span></span>}
                {card.mechanism && <span> · mech: <span style={{ color: C.accent }}>{card.mechanism}</span></span>}
                {card.fired_mechanism && card.fired_mechanism !== card.mechanism && (
                  <span> · fired: <span style={{ color: C.gold }}>{card.fired_mechanism}</span></span>
                )}
              </div>
            )}
          </div>

          {/* Stars */}
          <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.75rem", justifyContent: "center" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setStars(stars === n ? null : n)}
                style={{
                  width: "2.4rem",
                  height: "2.4rem",
                  background: stars !== null && n <= stars ? C.gold : "transparent",
                  color: stars !== null && n <= stars ? C.bg : C.mute,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                ★
              </button>
            ))}
          </div>

          {/* Rewrite */}
          <textarea
            value={rewrite}
            onChange={(e) => setRewrite(e.target.value)}
            placeholder="rewrite (optional) — what should the fish have said?"
            rows={2}
            style={{
              width: "100%",
              background: "#121110",
              color: C.fg,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "0.75rem",
              fontSize: "0.9rem",
              fontFamily: "serif",
              fontStyle: "italic",
              resize: "vertical",
              marginBottom: "1rem",
              outline: "none",
            }}
          />

          {/* Rate buttons — big, tappable */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            <RateButton label="reject" color={C.reject} onClick={() => rate("reject")} />
            <RateButton label="keep"   color={C.keep}   onClick={() => rate("keep")} />
            <RateButton label="gold"   color={C.gold}   onClick={() => rate("gold")} />
          </div>

          {/* Skip */}
          <button
            onClick={loadNext}
            style={{
              display: "block",
              margin: "1rem auto 0",
              padding: "0.5rem 1rem",
              background: "transparent",
              color: C.mute,
              border: "none",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            skip →
          </button>
        </>
      )}
    </div>
  );
}

function ContextSection({
  label, data, color, mute,
}: { label: string; data: Record<string, unknown>; color: string; mute: string }) {
  const entries = Object.entries(data ?? {}).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return null;
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={{ color: mute, fontSize: "0.65rem", textTransform: "uppercase", marginRight: "0.5rem" }}>
        {label}
      </span>
      {entries.map(([k, v], i) => (
        <span key={k} style={{ color, fontSize: "0.8rem" }}>
          <span style={{ color: mute }}>{k}:</span>{" "}
          {typeof v === "object" ? (
            <span style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>
              {JSON.stringify(v)}
            </span>
          ) : (
            String(v)
          )}
          {i < entries.length - 1 && <span style={{ color: mute }}> · </span>}
        </span>
      ))}
    </div>
  );
}

function RateButton({
  label, color, onClick,
}: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "1.25rem 0.5rem",
        background: color,
        color: "#0a0a0a",
        border: "none",
        borderRadius: 6,
        fontSize: "1rem",
        fontWeight: 600,
        cursor: "pointer",
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </button>
  );
}
