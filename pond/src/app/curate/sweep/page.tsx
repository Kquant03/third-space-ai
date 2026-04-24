"use client";

import { useEffect, useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
//  Sweep leaderboard
//  ─────────────────────────────────────────────────────────────────────────
//  Per-model aggregates across sweep runs. Sortable columns. Tap any row
//  to expand sample outputs. Launch a new sweep with the free or full
//  model set.
// ═══════════════════════════════════════════════════════════════════════════

interface RunInfo {
  run_id: string;
  started_at: number;
  finished_at: number | null;
  status: string;
  model_count: number;
  context_count: number;
}

interface ModelRow {
  run_tag: string;
  model_id: string;
  total: number;
  valid_count: number;
  utter_count: number;
  avg_latency_ms: number | null;
  total_cost_usd: number | null;
  avg_tokens_out: number | null;
}

type SortKey = "model" | "valid_rate" | "utter_rate" | "cost" | "latency" | "tokens";

export default function SweepPage() {
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [rows, setRows] = useState<ModelRow[]>([]);
  const [activeRun, setActiveRun] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("valid_rate");
  const [asc, setAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<"free" | "paid" | "all" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [samples, setSamples] = useState<Record<string, SampleRow[]>>({});

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cog/sweep/list");
      if (res.status === 401) { window.location.href = "/curate/login"; return; }
      const data = await res.json() as { runs: RunInfo[]; models: ModelRow[] };
      setRuns(data.runs);
      setRows(data.models);
      if (!activeRun && data.runs[0]) setActiveRun(data.runs[0].run_id);
    } finally {
      setLoading(false);
    }
  }, [activeRun]);

  useEffect(() => { loadList(); }, [loadList]);

  const filtered = activeRun
    ? rows.filter((r) => r.run_tag === `sweep:${activeRun}`)
    : rows;

  const sorted = [...filtered].sort((a, b) => {
    const aV = metricFor(a, sort);
    const bV = metricFor(b, sort);
    if (aV === bV) return 0;
    const cmp = aV < bV ? -1 : 1;
    return asc ? cmp : -cmp;
  });

  const launch = async (kind: "free" | "paid" | "all") => {
    setLaunching(kind);
    try {
      // Fetch the model list from the worker's sweep module by running a
      // sweep with an explicit body. The site doesn't have access to the
      // sweep-models.ts module directly, so we pass model IDs via the
      // request — matching what you put in the worker's module.
      const body = {
        preset: kind,  // server-side resolves to MODELS_FREE / MODELS_PAID / ALL_MODELS
      };
      const res = await fetch("/api/sweep-launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json() as { run_id: string };
      setActiveRun(data.run_id);
      setTimeout(loadList, 2000);
    } catch (e) {
      alert(String(e));
    } finally {
      setLaunching(null);
    }
  };

  const toggleExpand = async (modelId: string) => {
    if (expanded === modelId) { setExpanded(null); return; }
    setExpanded(modelId);
    if (!samples[modelId] && activeRun) {
      const res = await fetch(`/api/cog/sweep/rows?run_id=${activeRun}&model=${encodeURIComponent(modelId)}`);
      const data = await res.json() as { rows: SampleRow[] };
      setSamples((s) => ({ ...s, [modelId]: data.rows }));
    }
  };

  const C = {
    bg: "#0a0a0a",
    fg: "#e4dfd3",
    mute: "#8a8577",
    border: "#242220",
    accent: "#c7a97a",
    good: "#7fc1b0",
    bad: "#a8341c",
    gold: "#d9b65c",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.fg,
      fontFamily: "system-ui, sans-serif",
      padding: "1rem",
      maxWidth: 1100,
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
            sweep
          </div>
          <div style={{ color: C.mute, fontSize: "0.8rem" }}>
            <a href="/curate" style={{ color: C.accent, textDecoration: "none" }}>← curate</a>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <LaunchButton label="run free" busy={launching === "free"} onClick={() => launch("free")} color={C.good} />
          <LaunchButton label="run paid" busy={launching === "paid"} onClick={() => launch("paid")} color={C.accent} />
          <LaunchButton label="run all"  busy={launching === "all"}  onClick={() => launch("all")}  color={C.gold} />
        </div>
      </div>

      {/* Runs selector */}
      {runs.length > 0 && (
        <div style={{
          display: "flex",
          gap: "0.4rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
          fontSize: "0.75rem",
        }}>
          {runs.map((r) => (
            <button
              key={r.run_id}
              onClick={() => setActiveRun(r.run_id)}
              style={{
                padding: "0.3rem 0.7rem",
                background: activeRun === r.run_id ? C.accent : "transparent",
                color: activeRun === r.run_id ? C.bg : C.mute,
                border: `1px solid ${activeRun === r.run_id ? C.accent : C.border}`,
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              {r.run_id.slice(-8)} · {r.model_count}×{r.context_count} · {r.status}
            </button>
          ))}
        </div>
      )}

      {loading && rows.length === 0 && (
        <div style={{ padding: "3rem", textAlign: "center", color: C.mute }}>…</div>
      )}

      {!loading && sorted.length === 0 && (
        <div style={{ padding: "3rem", textAlign: "center", color: C.mute, fontFamily: "serif", fontStyle: "italic" }}>
          no sweep data yet. run one.
        </div>
      )}

      {sorted.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.8rem",
          }}>
            <thead>
              <tr style={{ color: C.mute, textAlign: "left" }}>
                <Th label="model"     sortKey="model"      current={sort} asc={asc} onSort={(k, a) => { setSort(k); setAsc(a); }} />
                <Th label="valid %"   sortKey="valid_rate" current={sort} asc={asc} onSort={(k, a) => { setSort(k); setAsc(a); }} right />
                <Th label="utter %"   sortKey="utter_rate" current={sort} asc={asc} onSort={(k, a) => { setSort(k); setAsc(a); }} right />
                <Th label="cost"      sortKey="cost"       current={sort} asc={asc} onSort={(k, a) => { setSort(k); setAsc(a); }} right />
                <Th label="p50 ms"    sortKey="latency"    current={sort} asc={asc} onSort={(k, a) => { setSort(k); setAsc(a); }} right />
                <Th label="tokens"    sortKey="tokens"     current={sort} asc={asc} onSort={(k, a) => { setSort(k); setAsc(a); }} right />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const validRate = r.total > 0 ? r.valid_count / r.total : 0;
                const utterRate = r.total > 0 ? r.utter_count / r.total : 0;
                const isExpanded = expanded === r.model_id;
                return (
                  <ModelTableRow
                    key={r.model_id}
                    row={r}
                    validRate={validRate}
                    utterRate={utterRate}
                    isExpanded={isExpanded}
                    onClick={() => toggleExpand(r.model_id)}
                    samples={samples[r.model_id]}
                    C={C}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface SampleRow {
  id: string;
  model_id: string;
  utterance: string | null;
  intent_chosen: string | null;
  validation_status: string;
  latency_ms: number;
  cost_usd: number | null;
  tokens_out: number | null;
  raw_response: string | null;
}

function ModelTableRow({
  row, validRate, utterRate, isExpanded, onClick, samples, C,
}: {
  row: ModelRow;
  validRate: number;
  utterRate: number;
  isExpanded: boolean;
  onClick: () => void;
  samples?: SampleRow[];
  C: Record<string, string>;
}) {
  const validColor = validRate >= 0.8 ? C.good : validRate >= 0.5 ? C.accent : C.bad;
  const utterColor = utterRate >= 0.6 ? C.good : utterRate >= 0.3 ? C.accent : C.bad;

  return (
    <>
      <tr
        onClick={onClick}
        style={{
          borderBottom: `1px solid ${C.border}`,
          cursor: "pointer",
          background: isExpanded ? "#121110" : "transparent",
        }}
      >
        <td style={{ padding: "0.55rem 0.6rem", fontFamily: "monospace", color: C.accent }}>
          {row.model_id}
        </td>
        <td style={{ padding: "0.55rem 0.6rem", textAlign: "right", color: validColor, fontVariantNumeric: "tabular-nums" }}>
          {(validRate * 100).toFixed(0)}%
        </td>
        <td style={{ padding: "0.55rem 0.6rem", textAlign: "right", color: utterColor, fontVariantNumeric: "tabular-nums" }}>
          {(utterRate * 100).toFixed(0)}%
        </td>
        <td style={{ padding: "0.55rem 0.6rem", textAlign: "right", fontVariantNumeric: "tabular-nums", color: C.fg }}>
          {row.total_cost_usd != null ? `$${row.total_cost_usd.toFixed(5)}` : "—"}
        </td>
        <td style={{ padding: "0.55rem 0.6rem", textAlign: "right", fontVariantNumeric: "tabular-nums", color: C.mute }}>
          {row.avg_latency_ms != null ? row.avg_latency_ms.toFixed(0) : "—"}
        </td>
        <td style={{ padding: "0.55rem 0.6rem", textAlign: "right", fontVariantNumeric: "tabular-nums", color: C.mute }}>
          {row.avg_tokens_out != null ? row.avg_tokens_out.toFixed(0) : "—"}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} style={{ padding: "0.6rem 1rem 1.25rem", background: "#121110" }}>
            {!samples && <div style={{ color: C.mute, fontSize: "0.8rem" }}>loading samples…</div>}
            {samples && samples.length === 0 && <div style={{ color: C.mute, fontSize: "0.8rem" }}>no rows</div>}
            {samples && samples.length > 0 && (
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {samples.slice(0, 10).map((s) => (
                  <div key={s.id} style={{
                    padding: "0.6rem 0.75rem",
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    fontSize: "0.85rem",
                  }}>
                    <div style={{ color: C.mute, fontSize: "0.7rem", marginBottom: "0.25rem" }}>
                      {s.validation_status} · {s.latency_ms}ms · {s.tokens_out ?? "?"}t
                      {s.intent_chosen && ` · ${s.intent_chosen}`}
                    </div>
                    {s.utterance ? (
                      <div style={{ fontFamily: "serif", fontStyle: "italic", color: C.fg }}>
                        &ldquo;{s.utterance}&rdquo;
                      </div>
                    ) : (
                      <div style={{ color: C.mute, fontSize: "0.8rem" }}>
                        (no utterance)
                        {s.raw_response && (
                          <details style={{ marginTop: "0.3rem" }}>
                            <summary style={{ cursor: "pointer", fontSize: "0.7rem" }}>raw</summary>
                            <pre style={{
                              fontSize: "0.7rem",
                              color: C.mute,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              margin: "0.3rem 0 0",
                              maxHeight: 200,
                              overflowY: "auto",
                            }}>
                              {s.raw_response}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Th({
  label, sortKey, current, asc, onSort, right,
}: {
  label: string; sortKey: SortKey;
  current: SortKey; asc: boolean;
  onSort: (k: SortKey, asc: boolean) => void;
  right?: boolean;
}) {
  const active = current === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey, active ? !asc : false)}
      style={{
        padding: "0.5rem 0.6rem",
        textAlign: right ? "right" : "left",
        fontWeight: 400,
        fontSize: "0.7rem",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        cursor: "pointer",
        color: active ? "#c7a97a" : undefined,
        userSelect: "none",
      }}
    >
      {label} {active && (asc ? "↑" : "↓")}
    </th>
  );
}

function LaunchButton({
  label, busy, onClick, color,
}: { label: string; busy: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        padding: "0.5rem 0.9rem",
        background: busy ? "#333" : color,
        color: "#0a0a0a",
        border: "none",
        borderRadius: 4,
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: busy ? "wait" : "pointer",
        letterSpacing: "0.02em",
      }}
    >
      {busy ? "…" : label}
    </button>
  );
}

function metricFor(r: ModelRow, key: SortKey): number {
  switch (key) {
    case "model":      return r.model_id.charCodeAt(0);
    case "valid_rate": return r.total > 0 ? r.valid_count / r.total : 0;
    case "utter_rate": return r.total > 0 ? r.utter_count / r.total : 0;
    case "cost":       return r.total_cost_usd ?? Infinity;
    case "latency":    return r.avg_latency_ms ?? Infinity;
    case "tokens":     return r.avg_tokens_out ?? 0;
  }
}
