"use client";

import { useEffect, useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
//  Curate Batch — grid mode
//  ─────────────────────────────────────────────────────────────────────────
//  Shows 50 utterances at once in a grid. Tap each to cycle:
//    unmarked (default = keep)  →  reject (red)  →  gold (yellow)  →  unmarked
//
//  Submit button sends all ratings as a batch and loads the next 50.
//  Much faster than single-card mode for skimming big harvests where most
//  utterances are repetitive.
//
//  Complements /curate (single-card deep mode). Use batch for the first
//  sweep to cull duplicates, then single-card for deep curation of keeps.
// ═══════════════════════════════════════════════════════════════════════════

interface BatchRow {
  id: string;
  utterance: string;
  intent_chosen: string | null;
  model_id: string;
  run_tag: string;
}

type Marking = "unmarked" | "reject" | "gold";

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

export default function CurateBatchPage() {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [markings, setMarkings] = useState<Record<string, Marking>>({});
  const [totalUnrated, setTotalUnrated] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cog/batch?size=50");
      if (res.status === 401) {
        window.location.href = "/curate/login";
        return;
      }
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json() as {
        rows: BatchRow[]; total_unrated: number;
      };
      setRows(data.rows);
      setTotalUnrated(data.total_unrated);
      setMarkings({});  // default all unmarked (= keep)
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBatch(); }, [loadBatch]);

  const cycleMarking = (id: string) => {
    setMarkings((m) => {
      const cur = m[id] ?? "unmarked";
      const next: Marking = cur === "unmarked" ? "reject" : cur === "reject" ? "gold" : "unmarked";
      return { ...m, [id]: next };
    });
  };

  const submit = async () => {
    if (rows.length === 0) return;
    setSubmitting(true);
    try {
      // Default unmarked → "keep"
      const ratings = rows.map((r) => {
        const mark = markings[r.id] ?? "unmarked";
        const tag = mark === "unmarked" ? "keep" : mark;
        return { id: r.id, tag };
      });
      const res = await fetch("/api/cog/rate/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ratings }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      await loadBatch();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  // Stats for current batch
  const goldCount = Object.values(markings).filter((m) => m === "gold").length;
  const rejectCount = Object.values(markings).filter((m) => m === "reject").length;
  const keepCount = rows.length - goldCount - rejectCount;

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.fg,
      fontFamily: "system-ui, sans-serif",
      padding: "1rem",
      paddingBottom: "5rem",  // room for fixed submit bar
      maxWidth: 960,
      margin: "0 auto",
    }}>
      <div style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: "1rem",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}>
        <div>
          <div style={{ fontFamily: "serif", fontStyle: "italic", fontSize: "1.6rem" }}>
            batch curate
          </div>
          <div style={{ color: C.mute, fontSize: "0.78rem" }}>
            <a href="/curate" style={{ color: C.accent, textDecoration: "none" }}>
              single-card mode →
            </a>
            <span style={{ marginLeft: "0.75rem" }}>
              {totalUnrated.toLocaleString()} unrated total
            </span>
          </div>
        </div>

        <div style={{
          color: C.mute,
          fontSize: "0.75rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
        }}>
          <span style={{ color: C.gold }}>gold: {goldCount}</span>
          <span style={{ color: C.keep }}>keep: {keepCount}</span>
          <span style={{ color: C.reject }}>reject: {rejectCount}</span>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        background: "#121110",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "0.75rem 0.9rem",
        marginBottom: "1rem",
        fontSize: "0.78rem",
        color: C.mute,
      }}>
        Tap to cycle: default <span style={{ color: C.keep }}>keep</span> →{" "}
        <span style={{ color: C.reject }}>reject</span> →{" "}
        <span style={{ color: C.gold }}>gold</span> → keep.
        {" "}Submit applies all, loads next 50.
      </div>

      {error && (
        <div style={{
          color: C.reject,
          padding: "0.75rem",
          fontSize: "0.85rem",
          marginBottom: "1rem",
        }}>
          {error}
        </div>
      )}

      {loading && rows.length === 0 && (
        <div style={{ padding: "3rem", textAlign: "center", color: C.mute }}>…</div>
      )}

      {!loading && rows.length === 0 && (
        <div style={{
          padding: "3rem",
          textAlign: "center",
          color: C.mute,
          fontFamily: "serif",
          fontStyle: "italic",
        }}>
          no unrated utterances. the pond is quiet.
        </div>
      )}

      {/* Grid of cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "0.5rem",
      }}>
        {rows.map((r) => {
          const mark = markings[r.id] ?? "unmarked";
          let borderColor = C.border;
          let bg = "#121110";
          let opacity = 1;
          if (mark === "reject") { borderColor = C.reject; bg = "#2a1410"; opacity = 0.55; }
          if (mark === "gold")   { borderColor = C.gold;   bg = "#241e10"; }

          return (
            <button
              key={r.id}
              onClick={() => cycleMarking(r.id)}
              style={{
                background: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: 6,
                padding: "0.7rem 0.8rem",
                textAlign: "left",
                color: C.fg,
                fontSize: "0.85rem",
                fontFamily: "inherit",
                cursor: "pointer",
                opacity,
                transition: "all 0.12s ease",
                minHeight: 80,
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <div style={{
                fontFamily: "serif",
                fontStyle: "italic",
                fontSize: "0.95rem",
                lineHeight: 1.3,
                color: C.fg,
              }}>
                &ldquo;{r.utterance}&rdquo;
              </div>
              <div style={{
                fontSize: "0.65rem",
                color: C.mute,
                marginTop: "auto",
              }}>
                {r.intent_chosen ?? "—"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fixed submit bar */}
      {rows.length > 0 && (
        <div style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          background: "rgba(10, 10, 10, 0.92)",
          backdropFilter: "blur(8px)",
          borderTop: `1px solid ${C.border}`,
          padding: "0.75rem 1rem",
          display: "flex",
          justifyContent: "center",
          gap: "0.75rem",
        }}>
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              padding: "0.75rem 1.5rem",
              background: submitting ? "#333" : C.accent,
              color: C.bg,
              border: "none",
              borderRadius: 6,
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: submitting ? "wait" : "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {submitting ? "submitting…" : `submit ${rows.length} ratings`}
          </button>
        </div>
      )}
    </div>
  );
}
