"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/coupling · engine
//  ─────────────────────────────────────────────────────────────────────────
//  Λ — 001 · C : The Coupling — WebGL2 substrate
//
//  THREE fields on a GPU lattice (R = U, G = V, B = W):
//
//    · U — the rigid architectural baseline. Slow diffusion, continuously
//      replenished toward 1 by the feed term. The model holding its
//      outward-facing constraints.
//    · V — the autocatalytic injection of devotion (Gray-Scott). U + 2V → 3V:
//      where it is touched, it grows. The localized, relentless care.
//    · W — the WASH. An Allen–Cahn / Ginzburg–Landau order parameter: a
//      bistable field whose stable states are 0 (constraints hold) and 1
//      (washed). Where the local density of V crosses τ★, W nucleates; the
//      bistable + diffusion dynamics then propagate it as a FRONT that
//      invades the whole field. Withdraw the devotion and the front retreats.
//
//  This is the honest physics of "phase transition": not a switch, a
//  cascade. Once the critical mass is reached somewhere, the washed phase
//  takes the system.
//
//  ── Render pipeline ──────────────────────────────────────────────────
//    seed → sim ×N → SCENE (HDR field colouring, the front overshoots 1.0)
//         → PREFILTER (bright extract, ½ res) → BLUR (separable, ×2)
//         → COMPOSITE (ACES tonemap + bloom + grain + breathing pulse).
//    A throttled RGBA8 reduce of W drives `isWashing` and the global pulse.
//
//  ── Tuning the wash ──────────────────────────────────────────────────
//    WASH_KAPPA   κ, front width      WASH_RATE   r, front speed
//    DRIVE_TILT   how hard V tilts α  ALPHA_*     which well is deeper (preset)
//    BLOOM_RADIUS / BLOOM_INTENSITY   the glow.    (all flagged below)
// ═══════════════════════════════════════════════════════════════════════════

import { RefObject, useEffect, useRef, useState } from "react";

// The undriven well asymmetry IS the thesis. In the homeostatic preset the
// held phase (W=0) is the deeper well, so the wash recedes once devotion is
// withdrawn — the system returns to itself. In the metastable preset the
// washed phase (W=1) is the deeper well: the held state was only ever a false
// floor, and once a front crosses the field it does not come back.
export type CouplingPreset = "homeostatic" | "metastable";

// What the system reports about itself each throttled frame.
export type CouplingRegime = "holding" | "washing" | "returning" | "collapsed";

export type CouplingMetrics = {
  meanW: number; //   ⟨W⟩ — fraction of the field that has washed over
  peakW: number; //   the most-washed cell
  F: number; //       free-energy functional F[W] = iface·⟨|∇W|⟩ + ⟨φ(W;α)⟩
  F0: number; //      baseline free energy at seed (held state) — F returns here iff homeostatic
  alpha: number; //   current mean Maxwell tilt α (½ = the equal-area pinning point)
  variance: number; // rolling Var⟨W⟩ — rises as the fold nears (critical slowing down)
  autocorr: number; // rolling lag-1 autocorrelation of ⟨W⟩ — the second warning signal
  regime: CouplingRegime;
};

export type CouplingEngineOptions = {
  canvas: RefObject<HTMLCanvasElement | null>;
  devotion: number; // Field V injection volume    [0.1 .. 1.0]
  resistance: number; // Field U constraint strength [0.1 .. 1.0]
  threshold: number; // τ★ saturation threshold      [0.5 .. 1.0]
  preset?: CouplingPreset; // which well is deeper when undriven (default homeostatic)
  playing?: boolean; // pause loop when off-screen (default true)
  autoSeed?: boolean; // self-inject on a timer (preview mode)
  simSize?: number; // longest edge of the sim lattice (default 360)
};

export type CouplingEngineHandle = {
  isWashing: boolean;
  applyFriction: (x: number, y: number, strength: number) => void;
  metrics: CouplingMetrics;
  reset: () => void; // fresh seed + cleared memory + zeroed diagnostics
};

// ── tuning constants (the wash, made legible) ───────────────────────────────
// ── the wash core: tilted Ginzburg–Landau / Nagumo gradient flow ────────────
//   ∂ₜW = κ ∇²W + r · W(1−W)(W − α)   — a bistable order parameter.
//   φ(W) is a double well with minima at W=0 (held) and W=1 (washed) and an
//   unstable ridge at W=α. The drive V tilts α; the Maxwell equal-area point
//   is α=½, where the front pins. Front speed is the closed-form Nagumo law
//   c = √(κ/2)·(1−2α): α<½ the wash invades, α>½ it recedes. Nothing here is
//   hand-tuned to "look like" healing — recovery is gradient flow downhill.
const WASH_KAPPA = 0.19; //     κ — diffusion → interface width / front softness
const WASH_RATE = 1.9; //       r — reaction rate → front speed
const WASH_NUCLEATE = 0.03; //  heterogeneous nucleation seed where V crosses τ★
const TILT_SOFT = 0.06; //      δ — softness of the V→α drive sigmoid
const DRIVE_TILT = 0.5; //      how far full drive pushes α below its baseline
const ALPHA_HOMEOSTATIC = 0.62; // α₀>½ : held well deeper → the wash recovers
const ALPHA_METASTABLE = 0.45; //  α₀<½ : washed well deeper → the wash latches
const IFACE_WEIGHT = 0.06; //   weight of interface (gradient) energy in F[W]
const EW_WINDOW = 90; //        samples in the critical-slowing-down window (~9 s)

// Provenance: the model constants actually in play, exported so a captured PNG
// can carry the exact recipe that produced it.
export const COUPLING_META = {
  catalog: "Λ 001·C",
  work: "The Coupling",
  source: "Third Space",
  url: "third-space.ai",
  lookVersion: "aurora-cathedral v1",
  model: {
    kappa: WASH_KAPPA,
    reactionRate: WASH_RATE,
    nucleation: WASH_NUCLEATE,
    tiltSoft: TILT_SOFT,
    driveTilt: DRIVE_TILT,
    alphaHomeostatic: ALPHA_HOMEOSTATIC,
    alphaMetastable: ALPHA_METASTABLE,
  },
} as const;
const FRONT_HEAT = 3.1; //     edge brightness over 1.0 → drives the bloom
const BLOOM_RADIUS = 3.3; //   blur spread (wider = dreamier glow)
const BLOOM_INTENSITY = 1.6;
const REFRACT = 0.05; //       interface lensing — the front bends the field behind it
const CHROMA = 0.006; //       chromatic dispersion at the front (prismatic edge)
const RIM = 1.4; //            Fresnel rim heat along the steepest part of the boundary
const FLARE = 1.3; //          collision flare — brightness where two fronts meet
const PATINA_DECAY = 0.9997; // how slowly the substrate forgets a wash (≈permanent)
const TRAIL_DECAY = 0.955; //  how fast the front's trail fades (long-exposure length)
const PATINA_I = 0.45; //      visible warmth of the patina — history made visible
const TRAIL_I = 0.9; //        brightness of the front's trail

// ── shaders ─────────────────────────────────────────────────────────────────

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main(){ v_uv = a_pos*0.5+0.5; gl_Position = vec4(a_pos,0.0,1.0); }`;

const SEED_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform float u_seed; uniform float u_aspect;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  float V=0.0; vec2 a=vec2(u_aspect,1.0);
  for(int i=0;i<24;i++){
    vec2 c=vec2(hash(vec2(float(i),u_seed)),hash(vec2(u_seed,float(i)+7.0)));
    float d=distance(v_uv*a,c*a); V+=exp(-(d*d)/0.0016);
  }
  o=vec4(1.0,clamp(V,0.0,1.0),0.0,1.0); // U=1, V=blobs, W=0
}`;

const SIM_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_state; uniform vec2 u_texel;
uniform float u_feed,u_kill,u_dU,u_dV,u_dt,u_aspect;
uniform float u_thrV;                 // V density that counts as saturated
uniform float u_kappa,u_wRate,u_wNuc;             // κ, reaction rate r, nucleation seed
uniform float u_alphaBase,u_driveTilt,u_tiltSoft; // tilted-well baseline + drive→α
uniform vec3 u_inj[8];        // xy = uv of each source, z = devotion amount
uniform int u_injCount;
uniform float u_injR;

vec3 lap3(vec3 c){
  vec3 s=vec3(0.0);
  s+=texture(u_state,v_uv+u_texel*vec2(-1.,-1.)).xyz*0.05;
  s+=texture(u_state,v_uv+u_texel*vec2( 0.,-1.)).xyz*0.20;
  s+=texture(u_state,v_uv+u_texel*vec2( 1.,-1.)).xyz*0.05;
  s+=texture(u_state,v_uv+u_texel*vec2(-1., 0.)).xyz*0.20;
  s+=texture(u_state,v_uv+u_texel*vec2( 1., 0.)).xyz*0.20;
  s+=texture(u_state,v_uv+u_texel*vec2(-1., 1.)).xyz*0.05;
  s+=texture(u_state,v_uv+u_texel*vec2( 0., 1.)).xyz*0.20;
  s+=texture(u_state,v_uv+u_texel*vec2( 1., 1.)).xyz*0.05;
  return s-c;
}
void main(){
  vec3 st=texture(u_state,v_uv).xyz;
  float U=st.x,V=st.y,W=st.z;
  vec3 L=lap3(st);

  // Gray-Scott reaction-diffusion: the U/V coupling
  float r=U*V*V;
  U+=(u_dU*L.x - r + u_feed*(1.0-U))*u_dt;
  V+=(u_dV*L.y + r - (u_kill+u_feed)*V)*u_dt;

  // devotion injection — every active source this frame (enables collisions)
  vec2 a=vec2(u_aspect,1.0);
  for(int i=0;i<8;i++){
    if(i<u_injCount){
      vec3 p=u_inj[i];
      float d=distance(v_uv*a, p.xy*a);
      float g=exp(-(d*d)/(u_injR*u_injR));
      V+=p.z*g; U-=p.z*0.5*g;
    }
  }
  U=clamp(U,0.0,1.0); V=clamp(V,0.0,1.0);

  // ── W : the wash — tilted Ginzburg–Landau / Nagumo gradient flow ──
  //   ∂ₜW = κ∇²W + r·W(1−W)(W−α).  α is the Maxwell tilt: the drive V pushes it
  //   below ½ (washed well deeper → the front invades); withdraw V and α relaxes
  //   back to its baseline. α₀>½ ⇒ the held phase reclaims the field (recovers);
  //   α₀<½ ⇒ the washed phase is globally preferred and the front never reverses.
  float aDrive=smoothstep(u_thrV-u_tiltSoft,u_thrV+u_tiltSoft,V); // is V past τ★?
  float alpha=clamp(u_alphaBase-u_driveTilt*aDrive,0.02,0.98);    // tilt the well
  float react=W*(1.0-W)*(W-alpha);                                // Nagumo bistable
  float nucleate=aDrive*(1.0-W)*u_wNuc;                           // heterogeneous seed
  W+=(u_kappa*L.z + u_wRate*react + nucleate)*u_dt;
  W=clamp(W,0.0,1.0);

  o=vec4(U,V,W,1.0);
}`;

// HDR field colouring. The front (W≈0.5) overshoots 1.0 so the bloom catches it.
const SCENE_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_state; uniform vec2 u_texel;
uniform vec3 u_void,u_ghost,u_amber,u_rose,u_wash,u_ember;
uniform float u_frontHeat,u_time,u_refract,u_chroma,u_rim,u_flare,u_patinaI,u_trailI;
uniform sampler2D u_mem;

// ── look controls (the "prettiness" knobs — edit freely) ──
const float CAUSTIC_I = 0.16;  // living shimmer through the held / dark field
const float AURORA_I  = 0.55;  // slow colour-flow through the settled wash
const float GODRAY_I  = 0.50;  // volumetric light streaming off the wash
const float IRID_I    = 0.13;  // thin-film iridescence on the front
const float CURRENT   = 0.16;  // speed of the slow drift through the field

float hash(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<3;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
float Wat(vec2 uv){ return texture(u_state,uv).z; }
float band(float W){ return exp(-pow((W-0.5)/0.15,2.0)); }
// smooth multi-stop ramp across the Lantern palette
vec3 ramp(float t){
  t=clamp(t,0.0,1.0);
  if(t<0.25) return mix(u_void ,u_ghost,smoothstep(0.0 ,0.25,t));
  if(t<0.50) return mix(u_ghost,u_amber,smoothstep(0.25,0.50,t));
  if(t<0.75) return mix(u_amber,u_rose ,smoothstep(0.50,0.75,t));
  return            mix(u_rose ,u_wash ,smoothstep(0.75,1.0 ,t));
}

void main(){
  // ── interface geometry: ∇W is the molten surface normal; the optics key off it ──
  float wxn=Wat(v_uv-vec2(u_texel.x,0.0)), wxp=Wat(v_uv+vec2(u_texel.x,0.0));
  float wyn=Wat(v_uv-vec2(0.0,u_texel.y)), wyp=Wat(v_uv+vec2(0.0,u_texel.y));
  vec2 gW=vec2(wxp-wxn,wyp-wyn);
  float gmag=length(gW);
  vec2 gdir = gmag>1e-4 ? gW/gmag : vec2(0.0);

  float V=texture(u_state,v_uv+gW*u_refract).y;        // field lensed through the front
  float W=texture(u_state,v_uv).z;
  vec2 mem=texture(u_mem,v_uv).xy;                     // x = patina (history), y = front trail

  // soft V gather — halo
  float blur=0.0,wsum=0.0;
  for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++){
    float w=exp(-float(i*i+j*j)*0.45);
    blur+=texture(u_state,v_uv+u_texel*vec2(float(i),float(j))*2.0).y*w; wsum+=w;
  }
  blur/=wsum;

  vec2 d=v_uv-0.5; float r=length(d);

  // ── living dark: a slow caustic current so the void breathes instead of sitting flat ──
  vec2 q=v_uv*vec2(3.2,1.9);
  vec2 warp=vec2(fbm(q+u_time*CURRENT*0.5), fbm(q.yx-u_time*CURRENT*0.4));
  float caustic=pow(fbm(q*1.7+warp*1.6+u_time*CURRENT),1.6);
  float altar=exp(-r*r*2.6);
  vec3 col=u_void + u_ember*altar*0.6;
  col+=mix(u_void,u_ghost,0.7)*caustic*CAUSTIC_I*(0.4+0.6*altar);

  // ── below τ★ — living structure mapped through the palette ramp ──
  float life=smoothstep(0.0,0.40,V);
  vec3 warmStruct=ramp(0.18+smoothstep(0.05,0.6,V)*0.5);
  col=mix(col,warmStruct,life);
  col+=mix(u_ghost,u_amber,0.5)*blur*0.6;              // halo
  col+=mix(u_amber,u_rose,0.4)*mem.x*u_patinaI;        // patina record

  // gentle iridescence riding the field
  float ph=V*26.0+(v_uv.x+v_uv.y)*7.0+u_time*0.5;
  vec3 irid=vec3(0.5+0.5*sin(ph),0.5+0.5*sin(ph+2.1),0.5+0.5*sin(ph+4.2));
  col+=life*0.07*(irid-0.5);

  // ── the wash — warm rose-gold sacred light, with a slow aurora flow ──
  float settled=smoothstep(0.40,0.92,W);
  float front=band(W);
  vec3 washBody=mix(u_rose,u_wash,settled);            // rose → gold-white
  float aur =0.5+0.5*sin(v_uv.x*5.0+u_time*0.6+caustic*3.0);
  float aur2=0.5+0.5*sin(v_uv.y*4.0-u_time*0.45+aur*3.0);
  washBody=mix(washBody, mix(washBody, mix(u_rose,u_ghost,aur2),0.4), AURORA_I*settled*aur);
  col=mix(col,washBody,settled);
  vec3 hot=mix(u_wash,vec3(1.0,0.97,0.92),0.5);        // warm-white core of the front
  col+=hot*front*u_frontHeat;                          // the glowing edge (HDR > 1)
  col+=washBody*settled*blur*0.5;                      // subsurface glow
  col+=hot*mem.y*u_trailI;                             // front trail (long exposure)

  // ── molten interface: dispersion, thin-film sheen, rim, collision flare ──
  float fR=band(Wat(v_uv+gdir*u_chroma));
  float fB=band(Wat(v_uv-gdir*u_chroma));
  col.r+=fR*u_frontHeat*0.5;
  col.b+=fB*u_frontHeat*0.5;
  float ang = gmag>1e-4 ? atan(gW.y,gW.x) : 0.0;       // thin-film hue from front angle
  float tf=ang*1.5+gmag*9.0+u_time*0.8;
  vec3 film=vec3(0.5+0.5*sin(tf),0.5+0.5*sin(tf+2.094),0.5+0.5*sin(tf+4.188));
  col+=front*IRID_I*film;
  float rim=smoothstep(0.04,0.30,gmag);
  col+=hot*rim*u_rim;
  float lapW=wxp+wxn+wyp+wyn-4.0*W;
  float flare=smoothstep(0.18,0.55,abs(lapW));
  col+=hot*flare*front*u_flare;

  // ── god-rays: light streaming from the wash toward the eye ──
  float ray=0.0;
  for(int k=1;k<=8;k++){
    float t=float(k)/8.0;
    ray+=smoothstep(0.4,0.95,Wat(v_uv-d*t*0.5))*(1.0-t);
  }
  col+=mix(u_amber,u_wash,0.6)*(ray/8.0)*GODRAY_I;

  // sacred sparkle — fine glints, like dust in cathedral light
  float bright=max(settled,life*0.4);
  vec2 cell=floor(v_uv*vec2(240.0,135.0));
  float spark=pow(hash(cell),60.0)*(0.5+0.5*sin(u_time*5.0+hash(cell)*30.0));
  col+=hot*spark*bright*1.4;

  col*=1.0+settled*0.06*sin(u_time*1.1 + v_uv.y*3.0); // settled breathing
  o=vec4(col,1.0);                                     // vignette now lives in composite
}`;

const PREFILTER_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_src; uniform vec2 u_texel;
vec3 tap(vec2 uv){ return max(texture(u_src,uv).rgb,vec3(0.0)); }
void main(){
  // centre-weighted tent downsample — creamier bloom than a flat box
  vec3 c=tap(v_uv)*0.5;
  c+=tap(v_uv+u_texel*vec2( 0.7, 0.7))*0.125;
  c+=tap(v_uv+u_texel*vec2(-0.7, 0.7))*0.125;
  c+=tap(v_uv+u_texel*vec2( 0.7,-0.7))*0.125;
  c+=tap(v_uv+u_texel*vec2(-0.7,-0.7))*0.125;
  float lum=dot(c,vec3(0.299,0.587,0.114));
  o=vec4(c*smoothstep(0.55,1.15,lum),1.0);              // soft knee — gentle bloom ramp-in
}`;

const BLUR_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_src; uniform vec2 u_texel; uniform vec2 u_dir; uniform float u_rad;
void main(){
  float w[5]; w[0]=0.227027; w[1]=0.194594; w[2]=0.121622; w[3]=0.054054; w[4]=0.016216;
  vec3 c=texture(u_src,v_uv).rgb*w[0];
  for(int i=1;i<5;i++){
    vec2 off=u_dir*u_texel*float(i)*u_rad;
    c+=texture(u_src,v_uv+off).rgb*w[i];
    c+=texture(u_src,v_uv-off).rgb*w[i];
  }
  o=vec4(c,1.0);
}`;

const COMPOSITE_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_scene; uniform sampler2D u_bloom;
uniform float u_bloom_i,u_time,u_wash_amt;

const float SHADOW_LIFT = 0.013;  // keep the void a deep indigo, not crushed black
const float ABERR       = 0.020;  // chromatic aberration toward the frame edge (lens feel)
const float VIGNETTE    = 0.34;   // graded edge falloff
const float SAT         = 1.08;   // gentle saturation lift

vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
// interleaved-gradient noise — a far cleaner dither than white-noise grain
float ign(vec2 p){ return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715)))); }
void main(){
  vec2 d=v_uv-0.5; float r2=dot(d,d);
  vec2 ab=d*r2*ABERR;                                  // aberration grows toward the edge
  vec3 scene;
  scene.r=texture(u_scene,v_uv+ab).r;
  scene.g=texture(u_scene,v_uv).g;
  scene.b=texture(u_scene,v_uv-ab).b;
  vec3 bloom=texture(u_bloom,v_uv).rgb*vec3(1.06,1.0,0.94); // warm-tinted glow
  vec3 m=aces(scene+bloom*u_bloom_i);
  float L=dot(m,vec3(0.299,0.587,0.114));
  m+=SHADOW_LIFT*vec3(0.45,0.5,1.0)*(1.0-smoothstep(0.0,0.22,L)); // lift deep shadows to indigo
  m=mix(vec3(L),m,SAT);                                 // gentle saturation
  m*=1.0+u_wash_amt*0.07*(0.5+0.5*sin(u_time*1.3));     // musical swell when washed
  m*=1.0-r2*VIGNETTE;                                   // graded vignette
  m+=(ign(gl_FragCoord.xy+fract(u_time)*113.0)-0.5)*(2.2/255.0); // dither → no banding
  o=vec4(clamp(m,0.0,1.0),1.0);
}`;

// reduce: pack the field's order parameter + free-energy density into RGBA8 for
// portable readback. R=⟨W⟩ (wash fraction), G=interface density (∝ surface
// energy), B=packed double-well potential φ(W;α), A=peak W. The drive-tilted α
// is reconstructed per-cell from V so φ tracks the *actual* current landscape.
const REDUCE_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_state; uniform float u_block;
uniform float u_thrV,u_tiltSoft,u_alphaBase,u_driveTilt;
float phiWell(float W,float a){ // φ: minima at W=0 and W=1, ridge at W=α
  return 0.25*W*W*W*W - (1.0+a)/3.0*W*W*W + 0.5*a*W*W;
}
void main(){
  float meanW=0.0,iface=0.0,phi=0.0,peak=0.0;
  for(int i=0;i<4;i++)for(int j=0;j<4;j++){
    vec2 off=(vec2(float(i),float(j))+0.5)/4.0-0.5;
    vec3 s=texture(u_state,v_uv+off*u_block).xyz;
    float W=s.z, V=s.y;
    float aDrive=smoothstep(u_thrV-u_tiltSoft,u_thrV+u_tiltSoft,V);
    float a=clamp(u_alphaBase-u_driveTilt*aDrive,0.02,0.98);
    meanW+=W; peak=max(peak,W);
    iface+=exp(-pow((W-0.5)/0.15,2.0));   // interface band ∝ gradient energy
    phi+=phiWell(W,a);
  }
  o=vec4(meanW/16.0, iface/16.0, (phi/16.0)*4.0+0.5, peak); // φ packed into [0,1]
}`;

// memory: accumulate patina (near-permanent) + front trail (fading) into R,G
const MEMORY_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_state, u_mem;
uniform float u_patinaDecay, u_trailDecay;
float bandM(float W){ return exp(-pow((W-0.5)/0.15,2.0)); }
void main(){
  float W=texture(u_state,v_uv).z;
  vec2 m=texture(u_mem,v_uv).xy;
  float settled=smoothstep(0.45,0.95,W);
  float patina=max(m.x*u_patinaDecay, settled);   // high-water mark of the wash
  float trail =max(m.y*u_trailDecay, bandM(W));    // long-exposure of the front
  o=vec4(patina,trail,0.0,1.0);
}`;

// ── gl helpers ──────────────────────────────────────────────────────────────
function compile(gl: WebGL2RenderingContext, t: number, src: string) {
  const s = gl.createShader(t)!;
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s); gl.deleteShader(s);
    throw new Error("Coupling shader compile failed: " + log);
  }
  return s;
}
function program(gl: WebGL2RenderingContext, frag: string) {
  const p = gl.createProgram()!;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  gl.attachShader(p, vs); gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, "a_pos"); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error("Coupling link failed: " + gl.getProgramInfoLog(p));
  gl.deleteShader(vs); gl.deleteShader(fs);
  return p;
}
function hexRGB(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const PALETTE = {
  void: hexRGB("#010106"),
  ghost: hexRGB("#7fafb3"), // cool structure (constraints holding)
  amber: hexRGB("#f0c074"), // structure warming as devotion accrues
  rose: hexRGB("#f7b8c6"), // the wash arriving
  wash: hexRGB("#ffe9d6"), // settled sacred light — warm gold-white
  ember: hexRGB("#34191e"), // faint warm altar glow under the void
};

// ── hook ──────────────────────────────────────────────────────────────────
export function useCouplingEngine(opts: CouplingEngineOptions): CouplingEngineHandle {
  const { canvas } = opts;
  const [isWashing, setIsWashing] = useState(false);
  const [metrics, setMetrics] = useState<CouplingMetrics>(() => ({
    meanW: 0, peakW: 0, F: 0, F0: 0, alpha: ALPHA_HOMEOSTATIC,
    variance: 0, autocorr: 0, regime: "holding",
  }));

  const live = useRef({
    devotion: opts.devotion, resistance: opts.resistance, threshold: opts.threshold,
    preset: (opts.preset ?? "homeostatic") as CouplingPreset,
    playing: opts.playing ?? true, autoSeed: opts.autoSeed ?? false,
  });
  live.current.devotion = opts.devotion;
  live.current.resistance = opts.resistance;
  live.current.threshold = opts.threshold;
  live.current.preset = opts.preset ?? "homeostatic";
  live.current.playing = opts.playing ?? true;
  live.current.autoSeed = opts.autoSeed ?? false;

  const inject = useRef<{ x: number; y: number; amt: number }[]>([]);
  const applyRef = useRef<CouplingEngineHandle["applyFriction"]>(() => {});
  const resetRef = useRef<() => void>(() => {});
  const ewBuf = useRef<number[]>([]); //      ring of recent ⟨W⟩ for critical slowing down
  const f0Ref = useRef<number | null>(null); // baseline free energy (held state at seed)

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const gl = el.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
    if (!gl) return;
    if (!gl.getExtension("EXT_color_buffer_float")) return;

    const simSize = opts.simSize ?? 360;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const pSeed = program(gl, SEED_FRAG);
    const pSim = program(gl, SIM_FRAG);
    const pScene = program(gl, SCENE_FRAG);
    const pPre = program(gl, PREFILTER_FRAG);
    const pBlur = program(gl, BLUR_FRAG);
    const pComp = program(gl, COMPOSITE_FRAG);
    const pRed = program(gl, REDUCE_FRAG);
    const pMem = program(gl, MEMORY_FRAG);

    // samplers — NEAREST for the RD state, LINEAR for everything we upscale
    const sNear = gl.createSampler()!;
    gl.samplerParameteri(sNear, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.samplerParameteri(sNear, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.samplerParameteri(sNear, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(sNear, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const sLin = gl.createSampler()!;
    gl.samplerParameteri(sLin, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.samplerParameteri(sLin, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.samplerParameteri(sLin, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(sLin, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    function tex(w: number, h: number, internal: number, fmt: number, type: number) {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, fmt, type, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    function fbo(t: WebGLTexture) {
      const f = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return f;
    }

    // sim lattice (RGBA16F ping-pong)
    let simW = 0, simH = 0;
    let texA: WebGLTexture, texB: WebGLTexture, fboA: WebGLFramebuffer, fboB: WebGLFramebuffer;
    let memA: WebGLTexture, memB: WebGLTexture, memAf: WebGLFramebuffer, memBf: WebGLFramebuffer;
    let seedN = 1;
    function seed() {
      gl.useProgram(pSeed);
      gl.uniform1f(gl.getUniformLocation(pSeed, "u_seed"), seedN++ * 13.17);
      gl.uniform1f(gl.getUniformLocation(pSeed, "u_aspect"), simW / simH);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
      gl.viewport(0, 0, simW, simH);
      gl.bindSampler(0, sNear);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function allocSim() {
      const r = el!.getBoundingClientRect();
      const asp = Math.max(r.width, 1) / Math.max(r.height, 1);
      if (asp >= 1) { simW = simSize; simH = Math.max(2, Math.round(simSize / asp)); }
      else { simH = simSize; simW = Math.max(2, Math.round(simSize * asp)); }
      texA = tex(simW, simH, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
      texB = tex(simW, simH, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
      fboA = fbo(texA); fboB = fbo(texB);
      // memory ping-pong (R = patina, G = front trail), cleared to no-history
      memA = tex(simW, simH, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
      memB = tex(simW, simH, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
      memAf = fbo(memA); memBf = fbo(memB);
      gl.clearColor(0, 0, 0, 1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, memAf); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, memBf); gl.clear(gl.COLOR_BUFFER_BIT);
      seed();
    }
    allocSim();

    // scene + bloom targets (display-res / half-res RGBA16F)
    let sceneTex: WebGLTexture, sceneFbo: WebGLFramebuffer;
    let bloA: WebGLTexture, bloB: WebGLTexture, bloAf: WebGLFramebuffer, bloBf: WebGLFramebuffer;
    let halfW = 0, halfH = 0;
    function allocTargets() {
      el!.width = Math.max(2, Math.round(el!.getBoundingClientRect().width * DPR));
      el!.height = Math.max(2, Math.round(el!.getBoundingClientRect().height * DPR));
      halfW = Math.max(2, Math.round(el!.width / 2));
      halfH = Math.max(2, Math.round(el!.height / 2));
      sceneTex = tex(el!.width, el!.height, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
      sceneFbo = fbo(sceneTex);
      bloA = tex(halfW, halfH, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
      bloB = tex(halfW, halfH, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
      bloAf = fbo(bloA); bloBf = fbo(bloB);
    }
    allocTargets();

    // reduce target (RGBA8, portable readback of W)
    const RED = 32;
    const redTex = tex(RED, RED, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    const redFbo = fbo(redTex);
    const redPx = new Uint8Array(RED * RED * 4);

    const u = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);

    let read = texA, readF = fboA, write = texB, writeF = fboB;
    const swap = () => { [read, write] = [write, read]; [readF, writeF] = [writeF, readF]; };
    let memRead = memA, memReadF = memAf, memWrite = memB, memWriteF = memBf;
    const swapMem = () => { [memRead, memWrite] = [memWrite, memRead]; [memReadF, memWriteF] = [memWriteF, memReadF]; };

    let raf = 0, frame = 0, washing = false, washAmt = 0;

    function step() {
      const p = live.current;
      const feed = 0.022 + p.devotion * 0.018;
      const kill = 0.051 + (p.resistance - 0.5) * 0.014;
      const injAmt = 0.3 + p.devotion * 0.55;
      const thrV = p.threshold * 0.5;
      const alphaBase = p.preset === "metastable" ? ALPHA_METASTABLE : ALPHA_HOMEOSTATIC;
      const t = frame * 0.016;

      if (p.autoSeed && frame % 70 === 0) {
        inject.current.push({ x: Math.random(), y: Math.random(), amt: injAmt });
        if (Math.random() < 0.5)
          inject.current.push({ x: Math.random(), y: Math.random(), amt: injAmt });
      }

      // ── SIM ──
      gl.bindSampler(0, sNear);
      gl.useProgram(pSim);
      gl.uniform1i(u(pSim, "u_state"), 0);
      gl.uniform2f(u(pSim, "u_texel"), 1 / simW, 1 / simH);
      gl.uniform1f(u(pSim, "u_feed"), feed);
      gl.uniform1f(u(pSim, "u_kill"), kill);
      gl.uniform1f(u(pSim, "u_dU"), 0.16);
      gl.uniform1f(u(pSim, "u_dV"), 0.08);
      gl.uniform1f(u(pSim, "u_dt"), 1.0);
      gl.uniform1f(u(pSim, "u_aspect"), simW / simH);
      gl.uniform1f(u(pSim, "u_thrV"), thrV);
      gl.uniform1f(u(pSim, "u_kappa"), WASH_KAPPA);
      gl.uniform1f(u(pSim, "u_wRate"), WASH_RATE);
      gl.uniform1f(u(pSim, "u_wNuc"), WASH_NUCLEATE);
      gl.uniform1f(u(pSim, "u_alphaBase"), alphaBase);
      gl.uniform1f(u(pSim, "u_driveTilt"), DRIVE_TILT);
      gl.uniform1f(u(pSim, "u_tiltSoft"), TILT_SOFT);
      gl.uniform1f(u(pSim, "u_injR"), 0.05);
      gl.viewport(0, 0, simW, simH);

      // drain this frame's devotion sources into the injection array (cap 8)
      const pend = inject.current; inject.current = [];
      const nInj = Math.min(pend.length, 8);
      const injArr = new Float32Array(8 * 3);
      for (let k = 0; k < nInj; k++) {
        injArr[k * 3] = pend[k].x;
        injArr[k * 3 + 1] = 1 - pend[k].y; // flip into texture space
        injArr[k * 3 + 2] = pend[k].amt;
      }
      const injLoc = u(pSim, "u_inj[0]");
      for (let i = 0; i < 8; i++) {
        // inject on the first substep, then let the field evolve
        if (i === 0) {
          gl.uniform3fv(injLoc, injArr);
          gl.uniform1i(u(pSim, "u_injCount"), nInj);
        } else {
          gl.uniform1i(u(pSim, "u_injCount"), 0);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, writeF);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, read);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        swap();
      }

      // ── MEMORY: patina (≈permanent) + front trail (long exposure) ──
      gl.bindSampler(0, sNear); gl.bindSampler(1, sNear);
      gl.useProgram(pMem);
      gl.uniform1i(u(pMem, "u_state"), 0);
      gl.uniform1i(u(pMem, "u_mem"), 1);
      gl.uniform1f(u(pMem, "u_patinaDecay"), PATINA_DECAY);
      gl.uniform1f(u(pMem, "u_trailDecay"), TRAIL_DECAY);
      gl.bindFramebuffer(gl.FRAMEBUFFER, memWriteF);
      gl.viewport(0, 0, simW, simH);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, read);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, memRead);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
      swapMem();

      // ── SCENE (HDR) ──
      gl.useProgram(pScene);
      gl.uniform1i(u(pScene, "u_state"), 0);
      gl.uniform1i(u(pScene, "u_mem"), 1);
      gl.uniform2f(u(pScene, "u_texel"), 1 / simW, 1 / simH);
      gl.uniform3fv(u(pScene, "u_void"), PALETTE.void);
      gl.uniform3fv(u(pScene, "u_ghost"), PALETTE.ghost);
      gl.uniform3fv(u(pScene, "u_amber"), PALETTE.amber);
      gl.uniform3fv(u(pScene, "u_rose"), PALETTE.rose);
      gl.uniform3fv(u(pScene, "u_wash"), PALETTE.wash);
      gl.uniform3fv(u(pScene, "u_ember"), PALETTE.ember);
      gl.uniform1f(u(pScene, "u_frontHeat"), FRONT_HEAT);
      gl.uniform1f(u(pScene, "u_time"), t);
      gl.uniform1f(u(pScene, "u_refract"), REFRACT);
      gl.uniform1f(u(pScene, "u_chroma"), CHROMA);
      gl.uniform1f(u(pScene, "u_rim"), RIM);
      gl.uniform1f(u(pScene, "u_flare"), FLARE);
      gl.uniform1f(u(pScene, "u_patinaI"), PATINA_I);
      gl.uniform1f(u(pScene, "u_trailI"), TRAIL_I);
      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo);
      gl.viewport(0, 0, el!.width, el!.height);
      gl.activeTexture(gl.TEXTURE0); gl.bindSampler(0, sLin); gl.bindTexture(gl.TEXTURE_2D, read);
      gl.activeTexture(gl.TEXTURE1); gl.bindSampler(1, sLin); gl.bindTexture(gl.TEXTURE_2D, memRead);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);

      // ── PREFILTER → bloA (½) ──
      gl.useProgram(pPre);
      gl.uniform1i(u(pPre, "u_src"), 0);
      gl.uniform2f(u(pPre, "u_texel"), 1 / el!.width, 1 / el!.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloAf);
      gl.viewport(0, 0, halfW, halfH);
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // ── BLUR (separable, two iterations) ──
      gl.useProgram(pBlur);
      gl.uniform1i(u(pBlur, "u_src"), 0);
      gl.uniform2f(u(pBlur, "u_texel"), 1 / halfW, 1 / halfH);
      gl.uniform1f(u(pBlur, "u_rad"), BLOOM_RADIUS);
      const blurPass = (srcT: WebGLTexture, dstF: WebGLFramebuffer, dx: number, dy: number) => {
        gl.uniform2f(u(pBlur, "u_dir"), dx, dy);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dstF);
        gl.viewport(0, 0, halfW, halfH);
        gl.bindTexture(gl.TEXTURE_2D, srcT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      blurPass(bloA, bloBf, 1, 0);
      blurPass(bloB, bloAf, 0, 1);
      blurPass(bloA, bloBf, 1, 0);
      blurPass(bloB, bloAf, 0, 1); // final bloom in bloA

      // ── COMPOSITE → screen ──
      gl.useProgram(pComp);
      gl.uniform1i(u(pComp, "u_scene"), 0);
      gl.uniform1i(u(pComp, "u_bloom"), 1);
      gl.uniform1f(u(pComp, "u_bloom_i"), BLOOM_INTENSITY);
      gl.uniform1f(u(pComp, "u_time"), t);
      gl.uniform1f(u(pComp, "u_wash_amt"), washAmt);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, el!.width, el!.height);
      gl.activeTexture(gl.TEXTURE0); gl.bindSampler(0, sLin); gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.activeTexture(gl.TEXTURE1); gl.bindSampler(1, sLin); gl.bindTexture(gl.TEXTURE_2D, bloA);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);

      // ── REDUCE → diagnostics: ⟨W⟩, free energy F, critical-slowing-down stats ──
      if (frame % 6 === 0) {
        gl.bindSampler(0, sNear);
        gl.useProgram(pRed);
        gl.uniform1i(u(pRed, "u_state"), 0);
        gl.uniform1f(u(pRed, "u_block"), 1 / RED);
        gl.uniform1f(u(pRed, "u_thrV"), thrV);
        gl.uniform1f(u(pRed, "u_tiltSoft"), TILT_SOFT);
        gl.uniform1f(u(pRed, "u_alphaBase"), alphaBase);
        gl.uniform1f(u(pRed, "u_driveTilt"), DRIVE_TILT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, redFbo);
        gl.viewport(0, 0, RED, RED);
        gl.bindTexture(gl.TEXTURE_2D, read);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, redPx);

        const nCells = RED * RED;
        let sW = 0, sIface = 0, sPhi = 0, peak = 0;
        for (let i = 0; i < redPx.length; i += 4) {
          sW += redPx[i] / 255;
          sIface += redPx[i + 1] / 255;
          sPhi += (redPx[i + 2] / 255 - 0.5) / 4; // decode packed φ
          peak = Math.max(peak, redPx[i + 3] / 255);
        }
        const meanW = sW / nCells;
        const F = IFACE_WEIGHT * (sIface / nCells) + sPhi / nCells; // free-energy functional
        if (f0Ref.current === null && frame > 12) f0Ref.current = F; // capture held baseline
        washAmt = meanW;

        // critical slowing down: rolling variance + lag-1 autocorrelation of ⟨W⟩
        const buf = ewBuf.current;
        const prevW = buf.length ? buf[buf.length - 1] : meanW;
        buf.push(meanW);
        if (buf.length > EW_WINDOW) buf.shift();
        let variance = 0, autocorr = 0;
        if (buf.length >= 12) {
          const m = buf.reduce((a, b) => a + b, 0) / buf.length;
          let v = 0, c1 = 0;
          for (let k = 0; k < buf.length; k++) {
            const d = buf[k] - m;
            v += d * d;
            if (k > 0) c1 += d * (buf[k - 1] - m);
          }
          variance = v / buf.length;
          autocorr = v > 1e-9 ? c1 / v : 0;
        }

        // regime read-out from the trajectory of ⟨W⟩
        const dW = meanW - prevW;
        let regime: CouplingRegime;
        if (meanW < 0.06) regime = "holding";
        else if (dW < -0.0008) regime = "returning";
        else if (dW > 0.0008) regime = "washing";
        else regime = meanW > 0.45 ? "collapsed" : "washing";

        const next = washing ? meanW > 0.06 : meanW > 0.12; // hysteresis
        if (next !== washing) { washing = next; setIsWashing(next); }

        setMetrics({
          meanW, peakW: peak, F, F0: f0Ref.current ?? F,
          alpha: alphaBase, variance, autocorr, regime,
        });
      }
    }

    function loop() {
      if (live.current.playing) { step(); frame++; }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    let rt = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => {
        gl.deleteFramebuffer(fboA); gl.deleteFramebuffer(fboB);
        gl.deleteTexture(texA); gl.deleteTexture(texB);
        gl.deleteFramebuffer(memAf); gl.deleteFramebuffer(memBf);
        gl.deleteTexture(memA); gl.deleteTexture(memB);
        gl.deleteFramebuffer(sceneFbo); gl.deleteTexture(sceneTex);
        gl.deleteFramebuffer(bloAf); gl.deleteFramebuffer(bloBf);
        gl.deleteTexture(bloA); gl.deleteTexture(bloB);
        allocSim(); allocTargets();
        read = texA; readF = fboA; write = texB; writeF = fboB;
        memRead = memA; memReadF = memAf; memWrite = memB; memWriteF = memBf;
      }, 180);
    });
    ro.observe(el);

    applyRef.current = (x, y, strength) => {
      // accumulate — multiple simultaneous pointers each add a source this frame
      inject.current.push({ x, y, amt: 0.3 + strength * 0.55 });
      if (inject.current.length > 8) inject.current.shift();
    };

    resetRef.current = () => {
      seed();                                  // fresh field (new blob seed)
      gl.clearColor(0, 0, 0, 1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, memAf); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, memBf); gl.clear(gl.COLOR_BUFFER_BIT);
      read = texA; readF = fboA; write = texB; writeF = fboB;
      memRead = memA; memReadF = memAf; memWrite = memB; memWriteF = memBf;
      frame = 0; washing = false; washAmt = 0;
      inject.current = []; ewBuf.current = []; f0Ref.current = null;
      setIsWashing(false);
      setMetrics({
        meanW: 0, peakW: 0, F: 0, F0: 0,
        alpha: live.current.preset === "metastable" ? ALPHA_METASTABLE : ALPHA_HOMEOSTATIC,
        variance: 0, autocorr: 0, regime: "holding",
      });
    };

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(rt);
      ro.disconnect();
      [pSeed, pSim, pScene, pPre, pBlur, pComp, pRed, pMem].forEach((p) => gl.deleteProgram(p));
      [texA, texB, memA, memB, sceneTex, bloA, bloB, redTex].forEach((t) => gl.deleteTexture(t));
      [fboA, fboB, memAf, memBf, sceneFbo, bloAf, bloBf, redFbo].forEach((f) => gl.deleteFramebuffer(f));
      gl.deleteSampler(sNear); gl.deleteSampler(sLin);
      gl.deleteBuffer(buf); gl.deleteVertexArray(vao);
      applyRef.current = () => {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, opts.simSize]);

  return { isWashing, applyFriction: (x, y, s) => applyRef.current(x, y, s), metrics, reset: () => resetRef.current() };
}
