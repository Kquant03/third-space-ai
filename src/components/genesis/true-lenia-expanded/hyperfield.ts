// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Hyper · the 4-dimensional field
//  ─────────────────────────────────────────────────────────────────────────
//  This is the part that makes the substrate *actually* higher-dimensional
//  rather than a 4D-flavoured decoration painted onto a 2D sheet.
//
//  The state is a scalar field A(x,y,z,w) defined on a 4-torus of side L —
//  L⁴ cells, every one of them a real degree of freedom that is integrated
//  every tick by a 4-dimensional Lenia rule (see hyperkernel.ts + the SIM
//  shader). Lenia Expanded's "4D channel" was a static analytic hypersphere
//  sampled on a rotating 2D slice; nothing lived in the fourth dimension.
//  Here the organism lives in four-space and we only ever *look at* it
//  through a rotating 3-dimensional cross-section.
//
//  ── The flattening ──────────────────────────────────────────────────────
//  WebGL2 has no 4D (or even 3D) render target, so the 4-torus is packed
//  into an ordinary 2D texture as a grid of tiles:
//
//        atlas texel (px, py)  ⇄  cell (x, y, z, w)
//        px = z·L + x      x = px mod L      z = px div L
//        py = w·L + y      y = py mod L      w = py div L
//
//  i.e. the texture is an L×L arrangement of L×L slices: move right one
//  tile ⇒ step in +z, move down one tile ⇒ step in +w, move within a tile
//  ⇒ step in x / y. Atlas side = L·L. (L=32 ⇒ 1024², ~1.05M cells.)
//
//  Toroidal wrap is done per-axis in the shader (each of x,y,z,w wraps at
//  L independently); the hardware texture wrap is CLAMP so it can never
//  wrap the *tiling* by accident. The round-trip and a tile-aware bilinear
//  sampler were both checked to ~1e-8 before any of this shipped.
//
//  ── Why L must factor cleanly ───────────────────────────────────────────
//  Powers of two (16, 32, 64) give a power-of-two atlas, which keeps the
//  parallel-reduction telemetry pass exact and lets drivers allocate the
//  big float target happily. 48 is offered too (2304²) with guarded
//  reductions. 32 is the honest default: fine enough to host structure,
//  cheap enough to run several sub-steps per frame at 60fps.
// ═══════════════════════════════════════════════════════════════════════════

export const DIM = 4 as const;

/** Allowed lattice sides. Atlas side = L·L. */
export const RESOLUTIONS = [16, 32, 48, 64] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export const DEFAULT_L: Resolution = 32;
export const DEFAULT_R = 4; // kernel radius in cells (1064 taps at R=4, D=4)

export function atlasSide(L: number): number {
  return L * L;
}

// ─── CPU-side atlas mapping (mirrors the GLSL exactly) ─────────────────────

/** cell (x,y,z,w) → linear index into an RGBA Float32Array, channel `ch`. */
export function cellIndex(
  L: number,
  x: number,
  y: number,
  z: number,
  w: number,
  ch = 0,
): number {
  const AW = L * L;
  const px = z * L + x;
  const py = w * L + y;
  return (py * AW + px) * 4 + ch;
}

// ─── SO(4) rotation ────────────────────────────────────────────────────────
//  Four-space has six independent rotation planes — xy, xz, xw, yz, yw, zw —
//  versus three axes of rotation in 3D. The two "double rotations" (a plane
//  and its orthogonal complement turning at once, e.g. xy+zw) are the ones
//  with no 3D analogue at all; they're why a rigid 4D object can appear to
//  turn itself inside-out in its 3D shadow. The display shader composes all
//  six; this CPU copy exists so the brush can map a screen click back into
//  four-space through the *same* orientation.

export type Angles6 = {
  xy: number;
  xz: number;
  xw: number;
  yz: number;
  yw: number;
  zw: number;
};

export const ZERO_ANGLES: Angles6 = { xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 };

type Mat4 = number[]; // row-major 4×4

function ident(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function mul(a: Mat4, b: Mat4): Mat4 {
  const c = new Array(16).fill(0);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j];
      c[i * 4 + j] = s;
    }
  return c;
}

/** Givens rotation in the (i,j) plane. */
function givens(i: number, j: number, a: number): Mat4 {
  const m = ident();
  const c = Math.cos(a);
  const s = Math.sin(a);
  m[i * 4 + i] = c;
  m[i * 4 + j] = -s;
  m[j * 4 + i] = s;
  m[j * 4 + j] = c;
  return m;
}

/**
 * Compose the six plane rotations into one SO(4) matrix. Order matches the
 * display shader (xy, xz, xw, yz, yw, zw applied left-to-right) so the CPU
 * brush and the GPU view agree on "which way is the object facing".
 */
export function buildSO4(a: Angles6): Mat4 {
  let m = ident();
  m = mul(m, givens(0, 1, a.xy));
  m = mul(m, givens(0, 2, a.xz));
  m = mul(m, givens(0, 3, a.xw));
  m = mul(m, givens(1, 2, a.yz));
  m = mul(m, givens(1, 3, a.yw));
  m = mul(m, givens(2, 3, a.zw));
  return m;
}

export function applyMat4(m: Mat4, v: [number, number, number, number]): [number, number, number, number] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3] * v[3],
    m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7] * v[3],
    m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11] * v[3],
    m[12] * v[0] + m[13] * v[1] + m[14] * v[2] + m[15] * v[3],
  ];
}

/**
 * Map a click on the (square) canvas to a target cell in four-space.
 * The canvas shows the w=0 3-slice of the rotated field, so the natural
 * pre-image of a screen point (sx, sy) ∈ [-1,1]² is the 4-vector
 * (sx, sy, 0, 0) carried into field space by the current orientation.
 * Returns integer lattice coords (toroidal).
 */
export function screenToCell(
  angles: Angles6,
  sx: number,
  sy: number,
  L: number,
): [number, number, number, number] {
  const m = buildSO4(angles);
  const q = applyMat4(m, [sx, sy, 0, 0]); // normalized [-1,1] field space
  const toCell = (t: number) => {
    let c = Math.round(((t * 0.5 + 0.5) % 1) * L);
    c = ((c % L) + L) % L;
    return c;
  };
  return [toCell(q[0]), toCell(q[1]), toCell(q[2]), toCell(q[3])];
}

// ═══════════════════════════════════════════════════════════════════════════
//  Seeds — genuinely four-dimensional initial conditions
//  ─────────────────────────────────────────────────────────────────────────
//  Every seed writes A into channel 0 of the flattened atlas. What makes
//  them worth the trouble is that their four-dimensionality is *invisible*
//  in any single 3-slice and only resolves as you rotate: a glome looks
//  like a breathing 3-sphere; a Clifford torus like two nested tori trading
//  places; the Hopf link like two rings that pass through each other without
//  touching (they are genuinely linked in 4-space and cannot be unlinked in
//  three). These are not renders of 4D objects — they are 4D objects, and
//  the sim then does whatever Lenia does to them.
// ═══════════════════════════════════════════════════════════════════════════

export type SeedId =
  | "point"
  | "glome"
  | "clifford"
  | "hopf"
  | "duo"
  | "noise";

// normalized coordinate of lattice index i along an axis of length L → (-1,1)
function nrm(i: number, L: number): number {
  return (2 * (i + 0.5)) / L - 1;
}

function gaussShell(r: number, r0: number, t: number): number {
  const d = (r - r0) / t;
  return Math.exp(-d * d);
}

/** mulberry32 for reproducible noise seeds. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeed(id: SeedId, L: number, seed = 1): Float32Array {
  const AW = L * L;
  const data = new Float32Array(AW * AW * 4);
  const put = (x: number, y: number, z: number, w: number, v: number) => {
    const idx = cellIndex(L, x, y, z, w, 0);
    if (v > data[idx]) data[idx] = v;
  };

  if (id === "point") {
    // A compact 4-ball — the guaranteed-living seed the sweep was tuned on.
    const rad = Math.max(2.2, L * 0.09);
    const c = L / 2;
    const R = Math.ceil(rad * 3);
    for (let w = 0; w < L; w++)
      for (let z = 0; z < L; z++)
        for (let y = 0; y < L; y++)
          for (let x = 0; x < L; x++) {
            const d2 =
              (x - c) ** 2 + (y - c) ** 2 + (z - c) ** 2 + (w - c) ** 2;
            if (d2 > R * R) continue;
            put(x, y, z, w, Math.exp(-d2 / (2 * rad * rad)));
          }
    return data;
  }

  if (id === "glome") {
    // 3-sphere (glome): the boundary of the 4-ball. In any 3-slice it reads
    // as a 2-sphere whose radius pulses as the slice moves off-centre.
    for (let w = 0; w < L; w++) {
      const qw = nrm(w, L);
      for (let z = 0; z < L; z++) {
        const qz = nrm(z, L);
        for (let y = 0; y < L; y++) {
          const qy = nrm(y, L);
          for (let x = 0; x < L; x++) {
            const qx = nrm(x, L);
            const r = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
            const v = gaussShell(r, 0.62, 0.085);
            if (v > 0.02) put(x, y, z, w, v);
          }
        }
      }
    }
    return data;
  }

  if (id === "clifford") {
    // Clifford torus: the flat 2-torus sitting inside the 3-sphere where
    // |(x,y)| = |(z,w)| = 1/√2. A maximally four-dimensional surface — it
    // simply cannot be embedded flat in 3-space.
    const s = Math.SQRT1_2 * 0.62;
    for (let w = 0; w < L; w++) {
      const qw = nrm(w, L);
      for (let z = 0; z < L; z++) {
        const qz = nrm(z, L);
        const rzw = Math.sqrt(qz * qz + qw * qw);
        for (let y = 0; y < L; y++) {
          const qy = nrm(y, L);
          for (let x = 0; x < L; x++) {
            const qx = nrm(x, L);
            const rxy = Math.sqrt(qx * qx + qy * qy);
            const d =
              Math.sqrt((rxy - s) * (rxy - s) + (rzw - s) * (rzw - s));
            const v = Math.exp(-(d * d) / (2 * 0.07 * 0.07));
            if (v > 0.02) put(x, y, z, w, v);
          }
        }
      }
    }
    return data;
  }

  if (id === "hopf") {
    // A Hopf link: one ring in the xy-plane (z=w=0), one in the zw-plane
    // (x=y=0). In 4-space these two circles are linked and cannot be pulled
    // apart; as you rotate, the 3-slice shows them threading through one
    // another without ever intersecting.
    const r0 = 0.5;
    const tube = 0.075;
    for (let w = 0; w < L; w++) {
      const qw = nrm(w, L);
      for (let z = 0; z < L; z++) {
        const qz = nrm(z, L);
        for (let y = 0; y < L; y++) {
          const qy = nrm(y, L);
          for (let x = 0; x < L; x++) {
            const qx = nrm(x, L);
            const rxy = Math.sqrt(qx * qx + qy * qy);
            const dA = Math.sqrt((rxy - r0) ** 2 + qz * qz + qw * qw);
            const rzw = Math.sqrt(qz * qz + qw * qw);
            const dB = Math.sqrt(qx * qx + qy * qy + (rzw - r0) ** 2);
            const vA = Math.exp(-(dA * dA) / (2 * tube * tube));
            const vB = Math.exp(-(dB * dB) / (2 * tube * tube));
            const v = Math.max(vA, vB);
            if (v > 0.02) put(x, y, z, w, v);
          }
        }
      }
    }
    return data;
  }

  if (id === "duo") {
    // Two 4-balls separated *along w only*. In the w=0 slice they overlap
    // as one blob; rotate any plane touching w and they pull apart — a plain
    // demonstration that the fourth axis is really there and really empty
    // between them.
    const rad = Math.max(2.0, L * 0.07);
    const c = L / 2;
    const off = Math.round(L * 0.22);
    const centres: Array<[number, number, number, number]> = [
      [c, c, c, c - off],
      [c, c, c, c + off],
    ];
    const R = Math.ceil(rad * 3);
    for (const [cx, cy, cz, cw] of centres) {
      for (let w = cw - R; w <= cw + R; w++)
        for (let z = cz - R; z <= cz + R; z++)
          for (let y = cy - R; y <= cy + R; y++)
            for (let x = cx - R; x <= cx + R; x++) {
              const d2 =
                (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 + (w - cw) ** 2;
              if (d2 > R * R) continue;
              const gx = ((x % L) + L) % L;
              const gy = ((y % L) + L) % L;
              const gz = ((z % L) + L) % L;
              const gw = ((w % L) + L) % L;
              put(gx, gy, gz, gw, Math.exp(-d2 / (2 * rad * rad)));
            }
    }
    return data;
  }

  // noise — low-amplitude 4D field, lets organisms condense out of chaos.
  const rng = makeRng(seed);
  for (let i = 0; i < AW * AW; i++) {
    data[i * 4] = rng() < 0.5 ? 0 : rng() * 0.5;
  }
  return data;
}
