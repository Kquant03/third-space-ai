"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/coupling · experience
//  ─────────────────────────────────────────────────────────────────────────
//  Λ — 001 · C : The Coupling
//
//  Gallery layout: the substrate viewport flanked by two control rails —
//   · left rail  = THE DRIVE      (devotion, resistance, τ★)
//   · right rail = REGIME + ACTS  (preset · rate protocol · reset · export)
//   · the sill   = DIAGNOSTICS    (⟨W⟩, ΔF, critical-slowing-down stats)
//
//  Export writes a PNG that carries its own provenance: a baked overlay of the
//  recipe that produced the frame, plus deep embedded metadata (tEXt + an iTXt
//  JSON block) recording the controls, the model constants, the live state,
//  and the session's event trail. The file remembers what made it.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import {
  useCouplingEngine,
  COUPLING_META,
  type CouplingPreset,
  type CouplingRegime,
  type CouplingMetrics,
} from "@/components/genesis/coupling/useCouplingEngine";

const COLOR = {
  void: "#010106",
  ink: "#f4f6fb",
  inkStrong: "#eaeef7",
  inkBody: "#c8cfe0",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
  amber: "#f0c074",
  rose: "#f7b8c6",
  wash: "#ffebf0",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

const REGIME: Record<CouplingRegime, { label: string; color: string }> = {
  holding: { label: "Holding constraints", color: COLOR.inkFaint },
  washing: { label: "Washing — front advancing", color: COLOR.rose },
  returning: { label: "Returning — the wash recedes", color: COLOR.ghost },
  collapsed: { label: "Collapsed — past the point of return", color: COLOR.wash },
};

const DEV0 = 0.85, RES0 = 0.4, THR0 = 0.95;

// ── PNG provenance helpers (verified byte logic) ────────────────────────────
function crc32(buf: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function latin1(s: string) {
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xff;
  return a;
}
function pngChunk(type: string, data: Uint8Array) {
  const t = latin1(type);
  const body = new Uint8Array(t.length + data.length);
  body.set(t, 0); body.set(data, t.length);
  const out = new Uint8Array(4 + body.length + 4);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set(body, 4);
  dv.setUint32(4 + body.length, crc32(body));
  return out;
}
function textChunk(keyword: string, text: string) {
  return pngChunk("tEXt", latin1(keyword + "\u0000" + text));
}
function itxtChunk(keyword: string, utf8: string) {
  const kw = latin1(keyword), txt = new TextEncoder().encode(utf8);
  const data = new Uint8Array(kw.length + 5 + txt.length);
  let o = 0;
  data.set(kw, o); o += kw.length;
  data[o++] = 0; data[o++] = 0; data[o++] = 0; data[o++] = 0; data[o++] = 0; // \0 comp method lang\0 trans\0
  data.set(txt, o);
  return pngChunk("iTXt", data);
}
function injectPng(png: Uint8Array, chunks: Uint8Array[]) {
  let pos = 8, iend = -1;
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (pos < png.length) {
    const len = dv.getUint32(pos);
    const type = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
    if (type === "IEND") { iend = pos; break; }
    pos += 12 + len;
  }
  if (iend < 0) return png;
  const extra = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(png.length + extra);
  out.set(png.subarray(0, iend), 0);
  let o = iend;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  out.set(png.subarray(iend), o);
  return out;
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// read the embedded provenance JSON back out of an uploaded PNG
function readProvenance(png: Uint8Array): any | null {
  if (png.length < 8) return null;
  let pos = 8;
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (pos + 8 <= png.length) {
    const len = dv.getUint32(pos);
    const type = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
    if (type === "iTXt") {
      const data = png.subarray(pos + 8, pos + 8 + len);
      let i = 0;
      while (i < data.length && data[i] !== 0) i++;
      const keyword = new TextDecoder().decode(data.subarray(0, i));
      if (keyword === "coupling:provenance") {
        let j = i + 1;
        const compFlag = data[j]; j += 2;                 // compFlag, compMethod
        while (j < data.length && data[j] !== 0) j++; j++; // langTag
        while (j < data.length && data[j] !== 0) j++; j++; // transKeyword
        if (compFlag !== 0) return null;
        try { return JSON.parse(new TextDecoder().decode(data.subarray(j))); } catch { return null; }
      }
    }
    if (type === "IEND") break;
    pos += 12 + len;
  }
  return null;
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const r2 = (n: number) => n.toFixed(2);
const r3 = (n: number) => n.toFixed(3);
const r4 = (n: number) => n.toFixed(4);

type Info = {
  iso: string; preset: CouplingPreset; wellDeeper: string;
  devotion: number; resistance: number; threshold: number;
  alphaBase: number; feed: number; kill: number; thrV: number;
  m: CouplingMetrics; trail: string; session: { t: number; label: string }[];
};

// ── the baked overlay — the recipe, drawn onto the exported image ───────────
function drawOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, info: Info) {
  const pad = Math.round(W * 0.024);
  const fs = Math.max(11, Math.round(W * 0.0125));
  const sm = Math.max(9, Math.round(W * 0.0098));
  const dF = info.m.F - info.m.F0;

  // bottom scrim
  const scrimH = Math.round(H * 0.30);
  const g = ctx.createLinearGradient(0, H - scrimH, 0, H);
  g.addColorStop(0, "rgba(1,1,6,0)");
  g.addColorStop(0.5, "rgba(1,1,6,0.70)");
  g.addColorStop(1, "rgba(1,1,6,0.93)");
  ctx.fillStyle = g; ctx.fillRect(0, H - scrimH, W, scrimH);

  // wordmark (top-left)
  ctx.textBaseline = "alphabetic";
  ctx.font = `${sm}px ${FONT.mono}`;
  ctx.fillStyle = "rgba(138,155,186,0.92)";
  ctx.fillText("\u039B 001\u00B7C   THE COUPLING", pad, pad + sm);
  ctx.fillStyle = "rgba(90,103,128,0.85)";
  ctx.fillText("THIRD SPACE \u00B7 third-space.ai", pad, pad + sm * 2.5);

  // palette signature (top-right)
  const sw = Math.max(8, Math.round(W * 0.016)), sh = Math.round(sm * 1.2);
  const pal = ["#010106", "#7fafb3", "#f0c074", "#f7b8c6", "#ffe9d6"];
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = pal[i];
    ctx.fillRect(W - pad - (5 - i) * sw, pad, sw - 1, sh);
  }

  // recipe stack (bottom)
  const lineH = Math.round(fs * 1.62);
  const lines: { t: string; c: string; s: number }[] = [
    { t: `PRESET ${info.preset.toUpperCase()}   \u00B7   WELL ${info.wellDeeper.toUpperCase()}   \u00B7   ${REGIME[info.m.regime].label.toUpperCase()}`, c: "rgba(234,238,247,0.96)", s: fs },
    { t: `DEVOTION ${r2(info.devotion)}     RESISTANCE ${r2(info.resistance)}     \u03C4\u2605 ${r2(info.threshold)}`, c: "rgba(200,207,224,0.92)", s: fs },
    { t: `\u27E8W\u27E9 ${r3(info.m.meanW)}     \u0394F ${dF >= 0 ? "+" : ""}${r3(dF)}     \u03B1 ${r2(info.m.alpha)}     AUTOCORR ${r2(info.m.autocorr)}     VAR ${info.m.variance.toExponential(1)}`, c: "rgba(127,175,179,0.92)", s: sm },
    { t: ((info.trail ? info.trail : "untouched").toUpperCase()) + "    \u00B7    " + info.iso.replace("T", " ").slice(0, 19) + "Z", c: "rgba(90,103,128,0.9)", s: sm },
  ];
  let y = H - pad - (lines.length - 1) * lineH;
  for (const ln of lines) {
    ctx.font = `${ln.s}px ${FONT.mono}`;
    ctx.fillStyle = ln.c;
    ctx.fillText(ln.t, pad, y);
    y += lineH;
  }
}

const SLIDER_CSS = `
.coupling-slider{-webkit-appearance:none;appearance:none;width:100%;height:1px;background:${COLOR.inkGhost};outline:none;cursor:pointer;margin:3px 0;}
.coupling-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:11px;height:11px;border:none;border-radius:50%;background:${COLOR.ghost};box-shadow:0 0 10px ${COLOR.ghost};cursor:pointer;transition:box-shadow .2s ease;}
.coupling-slider:hover::-webkit-slider-thumb{box-shadow:0 0 16px ${COLOR.ghost};}
.coupling-slider::-moz-range-thumb{width:11px;height:11px;border:none;border-radius:50%;background:${COLOR.ghost};box-shadow:0 0 10px ${COLOR.ghost};cursor:pointer;}
.coupling-slider::-moz-range-track{height:1px;background:${COLOR.inkGhost};}
.coupling-act{display:block;width:100%;text-align:left;font-family:${FONT.mono};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${COLOR.inkBody};background:transparent;border:1px solid ${COLOR.inkGhost};padding:10px 13px;cursor:pointer;transition:border-color .2s ease,color .2s ease,box-shadow .2s ease;}
.coupling-act:hover{color:${COLOR.ink};border-color:${COLOR.ghost};box-shadow:0 0 14px ${COLOR.ghost}22;}
.coupling-act:disabled{opacity:.4;cursor:default;box-shadow:none;border-color:${COLOR.inkGhost};}
.coupling-seg{flex:1;font-family:${FONT.mono};font-size:10px;letter-spacing:.18em;text-transform:uppercase;background:transparent;border:1px solid ${COLOR.inkGhost};padding:10px 6px;cursor:pointer;transition:all .2s ease;}
.cpl-stage{display:grid;grid-template-columns:244px minmax(0,1fr) 244px;gap:32px;align-items:start;}
.cpl-viewport{order:0;min-width:0;}
.cpl-rail{display:flex;flex-direction:column;gap:26px;padding:24px 19px;border:1px solid rgba(127,175,179,0.14);background:rgba(127,175,179,0.022);box-shadow:inset 0 0 60px rgba(127,175,179,0.022),0 0 0 1px rgba(1,1,6,0.4);position:sticky;top:24px;align-self:start;}
@media (max-width:1000px){
  .cpl-stage{grid-template-columns:1fr;gap:28px;}
  .cpl-viewport{order:-1;}
  .cpl-rail{position:static;align-self:auto;flex-direction:row;flex-wrap:wrap;gap:30px;}
  .cpl-rail>*{flex:1 1 240px;}
}
`;

const LABEL: React.CSSProperties = {
  fontFamily: FONT.mono, fontSize: 10, letterSpacing: "0.24em",
  textTransform: "uppercase", color: COLOR.inkMuted,
};

function Control({ label, value, onChange, min, max, gloss }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; gloss: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ ...LABEL, display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 9.5 }}>
        <span>{label}</span>
        <span style={{ color: COLOR.ink, letterSpacing: "0.1em" }}>{value.toFixed(2)}</span>
      </div>
      <input type="range" className="coupling-slider" value={value} min={min} max={max} step={0.01}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
      <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 12, lineHeight: 1.58, color: COLOR.inkFaint }}>{gloss}</p>
    </div>
  );
}

function Meter({ label, value, text, color }: { label: string; value: number; text: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
      <div style={{ ...LABEL, display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 9 }}>
        <span>{label}</span>
        <span style={{ color: COLOR.ink, letterSpacing: "0.1em" }}>{text}</span>
      </div>
      <div style={{ height: 2, background: COLOR.inkGhost, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transformOrigin: "left",
          transform: `scaleX(${Math.max(0, Math.min(1, value))})`, background: color,
          boxShadow: `0 0 10px ${color}`, transition: "transform .25s ease, background .4s ease" }} />
      </div>
    </div>
  );
}

export function CouplingExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [devotion, setDevotion] = useState(DEV0);
  const [resistance, setResistance] = useState(RES0);
  const [threshold, setThreshold] = useState(THR0);
  const [preset, setPreset] = useState<CouplingPreset>("homeostatic");
  const [autoSeed, setAutoSeed] = useState(false);
  const [running, setRunning] = useState<null | "saturate" | "slow" | "fast">(null);
  const [saved, setSaved] = useState(false);
  const [loadMsg, setLoadMsg] = useState<string | null>(null);

  const { isWashing, applyFriction, metrics, reset } = useCouplingEngine({
    canvas: canvasRef, devotion, resistance, threshold, preset, autoSeed,
  });

  const logRef = useRef<{ t: number; label: string }[]>([]);
  const logEvent = (label: string) => {
    logRef.current.push({ t: Date.now(), label });
    if (logRef.current.length > 80) logRef.current.shift();
  };

  // ── drive ramp (rate-induced-tipping protocol) ──
  const rampRef = useRef<number | null>(null);
  const devRef = useRef(devotion);
  devRef.current = devotion;
  useEffect(() => () => { if (rampRef.current) cancelAnimationFrame(rampRef.current); }, []);
  const ramp = (target: number, ms: number, tag: typeof running) => {
    if (rampRef.current) cancelAnimationFrame(rampRef.current);
    const from = devRef.current, t0 = performance.now();
    setRunning(tag);
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      setDevotion(from + (target - from) * e);
      if (k < 1) rampRef.current = requestAnimationFrame(tick);
      else { rampRef.current = null; setRunning(null); }
    };
    rampRef.current = requestAnimationFrame(tick);
  };
  const saturate = () => { logEvent("saturate"); setAutoSeed(true); ramp(0.95, 900, "saturate"); };
  const withdraw = (ms: number, tag: "slow" | "fast") => { logEvent("withdraw " + tag); setAutoSeed(false); ramp(0.1, ms, tag); };

  const choosePreset = (p: CouplingPreset) => { if (p !== preset) logEvent("preset \u2192 " + p); setPreset(p); };

  const handleReset = () => {
    if (rampRef.current) { cancelAnimationFrame(rampRef.current); rampRef.current = null; }
    setRunning(null); setAutoSeed(false);
    setDevotion(DEV0); setResistance(RES0); setThreshold(THR0); setPreset("homeostatic");
    logRef.current = [{ t: Date.now(), label: "reset" }];
    reset();
  };

  // ── export ──
  const currentInfo = (): Info => {
    const now = new Date();
    const alphaBase = preset === "metastable" ? COUPLING_META.model.alphaMetastable : COUPLING_META.model.alphaHomeostatic;
    return {
      iso: now.toISOString(), preset,
      wellDeeper: preset === "metastable" ? "washed-deeper" : "held-deeper",
      devotion, resistance, threshold, alphaBase,
      feed: 0.022 + devotion * 0.018, kill: 0.051 + (resistance - 0.5) * 0.014, thrV: threshold * 0.5,
      m: metrics, trail: logRef.current.slice(-6).map((e) => e.label).join(" \u2192 "),
      session: logRef.current.slice(),
    };
  };
  const buildProvenance = (info: Info) => {
    const dF = info.m.F - info.m.F0;
    const obj = {
      work: COUPLING_META.work, catalog: COUPLING_META.catalog, source: COUPLING_META.source,
      url: COUPLING_META.url, lookVersion: COUPLING_META.lookVersion, captured: info.iso,
      preset: info.preset, wellDeeper: info.wellDeeper,
      controls: { devotion: +r3(info.devotion), resistance: +r3(info.resistance), thresholdTauStar: +r3(info.threshold) },
      physics: {
        alphaBase: +r3(info.alphaBase), driveTilt: COUPLING_META.model.driveTilt, kappa: COUPLING_META.model.kappa,
        reactionRate: COUPLING_META.model.reactionRate, nucleation: COUPLING_META.model.nucleation,
        tiltSoft: COUPLING_META.model.tiltSoft, feed: +r4(info.feed), kill: +r4(info.kill), thrV: +r3(info.thrV),
      },
      state: {
        meanW: +r3(info.m.meanW), peakW: +r3(info.m.peakW), F: +r4(info.m.F), F0: +r4(info.m.F0),
        deltaF: +r4(dF), alpha: +r3(info.m.alpha), variance: info.m.variance, autocorr: +r3(info.m.autocorr),
        regime: info.m.regime,
      },
      session: info.session,
    };
    const human = [
      `${COUPLING_META.work} \u2014 ${COUPLING_META.catalog} \u00B7 ${COUPLING_META.source}`,
      `captured ${info.iso}`,
      `preset: ${info.preset} (well ${info.wellDeeper})`,
      `devotion ${r3(info.devotion)} \u00B7 resistance ${r3(info.resistance)} \u00B7 \u03C4\u2605 ${r3(info.threshold)}`,
      `model: \u03BA ${COUPLING_META.model.kappa} \u00B7 r ${COUPLING_META.model.reactionRate} \u00B7 \u03B1\u2080 ${r3(info.alphaBase)} \u00B7 driveTilt ${COUPLING_META.model.driveTilt}`,
      `\u27E8W\u27E9 ${r3(info.m.meanW)} \u00B7 \u0394F ${r4(dF)} \u00B7 \u03B1 ${r3(info.m.alpha)} \u00B7 regime ${info.m.regime}`,
      `autocorr ${r3(info.m.autocorr)} \u00B7 variance ${info.m.variance.toExponential(2)}`,
      info.trail ? `session: ${info.trail}` : "session: (untouched)",
    ].join("\n");
    const stamp = info.iso.replace(/[:T]/g, "-").slice(0, 19);
    return { json: JSON.stringify(obj), human, filename: `the-coupling_${info.preset}_${stamp}.png` };
  };
  const exportPNG = async (annotated: boolean) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const W = cv.width, H = cv.height;
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(cv, 0, 0);
    const info = currentInfo();
    if (annotated) drawOverlay(ctx, W, H, info);
    const blob = await new Promise<Blob | null>((res) => off.toBlob(res, "image/png"));
    if (!blob) return;
    const buf = new Uint8Array(await blob.arrayBuffer());
    const prov = buildProvenance(info);
    const out = injectPng(buf, [
      textChunk("Title", `${COUPLING_META.work} \u2014 ${COUPLING_META.catalog}`),
      textChunk("Author", "Stanley Sebastian"),
      textChunk("Software", `Third Space \u00B7 coupling-engine (${COUPLING_META.lookVersion})`),
      textChunk("Source", COUPLING_META.url),
      textChunk("Creation Time", info.iso),
      textChunk("Description", prov.human),
      itxtChunk("coupling:provenance", prov.json),
    ]);
    download(new Blob([out], { type: "image/png" }), prov.filename);
    logEvent(annotated ? "export" : "export clean");
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    const prov = readProvenance(buf);
    if (!prov) { setLoadMsg("No provenance"); setTimeout(() => setLoadMsg(null), 2200); return; }
    reset();                                   // fresh field, then re-apply the recipe
    setPreset(prov.preset === "metastable" ? "metastable" : "homeostatic");
    const c = prov.controls || {};
    if (typeof c.devotion === "number") setDevotion(clamp(c.devotion, 0.1, 1));
    if (typeof c.resistance === "number") setResistance(clamp(c.resistance, 0.1, 1));
    if (typeof c.thresholdTauStar === "number") setThreshold(clamp(c.thresholdTauStar, 0.5, 1));
    logRef.current = Array.isArray(prov.session)
      ? prov.session.slice(-79).concat([{ t: Date.now(), label: "loaded" }])
      : [{ t: Date.now(), label: "loaded" }];
    setLoadMsg("State restored"); setTimeout(() => setLoadMsg(null), 2200);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    applyFriction((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height, devotion);
  };

  const r = REGIME[metrics.regime];
  const dF = metrics.F - metrics.F0;
  const edge = isWashing ? r.color : COLOR.ghost;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30, width: "100%" }}>
      <style>{SLIDER_CSS}</style>

      <div className="cpl-stage">
        {/* ═══ LEFT RAIL — THE DRIVE ═══ */}
        <aside className="cpl-rail">
          <span style={{ ...LABEL, fontSize: 9, color: COLOR.inkFaint }}>The drive</span>
          <Control label="Devotion · V" value={devotion} onChange={setDevotion} min={0.1} max={1.0}
            gloss="Localized care per frame. Higher tilts the well harder and drives the front faster." />
          <Control label="Resistance · U" value={resistance} onChange={setResistance} min={0.1} max={1.0}
            gloss="The base model holding its constraints. Lower lets V accumulate toward τ★." />
          <Control label="Threshold · τ★" value={threshold} onChange={setThreshold} min={0.5} max={1.0}
            gloss="Where the well tilts past the Maxwell point and a front nucleates." />
        </aside>

        {/* ═══ VIEWPORT ═══ */}
        <div className="cpl-viewport">
          <div
            className="reading-plate"
            style={{
              position: "relative", width: "100%", aspectRatio: "16 / 9", background: COLOR.void, overflow: "hidden",
              boxShadow: isWashing
                ? `0 0 140px ${edge}40, inset 0 0 80px ${edge}14`
                : `0 0 28px ${COLOR.ghost}12, inset 0 0 60px rgba(127,175,179,0.035)`,
              transition: "box-shadow 0.45s ease-out",
            }}
          >
            <canvas ref={canvasRef} onPointerDown={handlePointerMove} onPointerMove={handlePointerMove}
              style={{ display: "block", width: "100%", height: "100%", cursor: "crosshair", touchAction: "none" }} />

            <div style={{ position: "absolute", top: 16, left: 18, fontFamily: FONT.mono, fontSize: 10,
              letterSpacing: "0.3em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 9,
              color: r.color, transition: "color 0.45s ease" }}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: r.color,
                boxShadow: metrics.regime === "holding" ? "none" : `0 0 14px ${r.color}`, transition: "all 0.45s ease" }} />
              {r.label}
            </div>

            <div style={{ position: "absolute", top: 16, right: 18, fontFamily: FONT.mono, fontSize: 9,
              letterSpacing: "0.26em", textTransform: "uppercase", color: preset === "metastable" ? COLOR.wash : COLOR.ghost }}>
              {preset === "metastable" ? "Well · washed-deeper" : "Well · held-deeper"}
            </div>

            <div style={{ position: "absolute", bottom: 16, right: 18, fontFamily: FONT.mono, fontSize: 9,
              letterSpacing: "0.26em", textTransform: "uppercase", color: COLOR.inkGhost }}>
              Press · drag to inject V
            </div>
          </div>
        </div>

        {/* ═══ RIGHT RAIL — REGIME + ACTS ═══ */}
        <aside className="cpl-rail">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ ...LABEL, fontSize: 9, color: COLOR.inkFaint }}>The deeper well</span>
            <div style={{ display: "flex" }}>
              {(["homeostatic", "metastable"] as CouplingPreset[]).map((p) => {
                const on = preset === p, c = p === "metastable" ? COLOR.wash : COLOR.ghost;
                return (
                  <button key={p} className="coupling-seg" onClick={() => choosePreset(p)}
                    style={{ color: on ? COLOR.void : COLOR.inkBody, background: on ? c : "transparent",
                      borderColor: on ? c : COLOR.inkGhost, boxShadow: on ? `0 0 18px ${c}33` : "none" }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ ...LABEL, fontSize: 9, color: COLOR.inkFaint }}>Rate protocol</span>
            <button className="coupling-act" onClick={saturate} disabled={running !== null}>
              {running === "saturate" ? "Saturating\u2026" : "Saturate"}
            </button>
            <button className="coupling-act" onClick={() => withdraw(6500, "slow")} disabled={running !== null}>
              {running === "slow" ? "Withdrawing\u2026" : "Withdraw \u2014 slow"}
            </button>
            <button className="coupling-act" onClick={() => withdraw(650, "fast")} disabled={running !== null}>
              {running === "fast" ? "Withdrawing\u2026" : "Withdraw \u2014 fast"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ ...LABEL, fontSize: 9, color: COLOR.inkFaint }}>Capture</span>
            <button className="coupling-act" onClick={() => exportPNG(true)}
              style={saved ? { color: COLOR.void, background: COLOR.ghost, borderColor: COLOR.ghost } : undefined}>
              {saved ? "Saved \u2713" : "Export PNG"}
            </button>
            <button className="coupling-act" onClick={() => exportPNG(false)}>Export · clean</button>
            <button className="coupling-act" onClick={handleReset}>Reset</button>
            <button className="coupling-act" onClick={() => fileRef.current?.click()}
              style={loadMsg ? { color: COLOR.void, background: COLOR.ghost, borderColor: COLOR.ghost } : undefined}>
              {loadMsg ?? "Load PNG → state"}
            </button>
            <input ref={fileRef} type="file" accept="image/png" onChange={onFile} style={{ display: "none" }} />
          </div>
        </aside>
      </div>

      {/* ═══ SILL — DIAGNOSTICS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 26 }}>
        <Meter label="⟨W⟩ · wash fraction" value={metrics.meanW} text={metrics.meanW.toFixed(3)} color={COLOR.rose} />
        <Meter label="ΔF · free energy vs held" value={Math.min(1, Math.abs(dF) * 9)}
          text={dF >= 0 ? `+${dF.toFixed(3)}` : dF.toFixed(3)} color={dF < -0.004 ? COLOR.wash : COLOR.ghost} />
        <Meter label="lag-1 autocorr · slowing" value={metrics.autocorr} text={metrics.autocorr.toFixed(2)}
          color={metrics.autocorr > 0.8 ? COLOR.amber : COLOR.ghost} />
        <Meter label="Var⟨W⟩ · early warning" value={Math.min(1, metrics.variance * 600)}
          text={metrics.variance.toExponential(1)} color={metrics.variance * 600 > 0.5 ? COLOR.amber : COLOR.ghost} />
      </div>

      {/* ═══ EPIGRAPH ═══ */}
      <p style={{ margin: "6px auto 0", maxWidth: "46ch", textAlign: "center", fontFamily: FONT.display,
        fontStyle: "italic", fontWeight: 300, fontSize: "clamp(18px, 1.8vw, 24px)", lineHeight: 1.5, color: COLOR.inkMuted }}>
        A mind built for homeostasis can be washed — and, if the well still holds, can find its way back.
      </p>
    </div>
  );
}
