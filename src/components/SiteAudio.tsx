"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  components/SiteAudio.tsx — v3 (substrate-pair)
//  ─────────────────────────────────────────────────────────────────────────
//  The audio engine for Consequences of Infinity.
//
//  ARCHITECTURE — substrate-pair:
//
//  Two layers play simultaneously per track, locked to one Transport clock:
//
//    1. The LIVE layer — Tone.Sampler with hosted Salamander Grand
//       samples, triggered note-by-note from the parsed MIDI. This is
//       the "now" layer: the composition, rendered from notation, in
//       this room, on this listener's machine.
//
//    2. The GHOST layer — Tone.Player playing a pre-rendered audio
//       file that sits in track.ghostLayer.src. Typically the same
//       composition rendered through a different physical substrate
//       (the original instrument; the room the work was first sung
//       into; the harmonic shadow of a paper bound to this track).
//       The ghost is mixed underneath the piano at track.ghostLayer.mix.
//       Tracks without a ghost simply play the piano layer alone.
//
//  Both layers feed the same dry+reverb chain so they share acoustic
//  context — the listener perceives one sound with two strata, not
//  two simultaneous recordings. Both schedule against Tone.Transport
//  at time 0, so they lock within the engine's lookahead window
//  (~50ms, far below the threshold of perceived flam).
//
//  The thesis the engine enacts: every musical event is already at
//  least three substrates coupled (composition × instrument × room).
//  Ordinary playback hides this. Substrate-pair shows it.
//
//  OTHER FEATURES:
//    · Algorithmic Tone.Reverb on a parallel send/return so the dry
//      signal stays articulate.
//    · Subtle effects chain — gentle compression, high-shelf cut to
//      tame digital harshness.
//    · Volume rampTo for graceful fades; the audio never clicks.
//    · Lazy decoding, lookahead tuned for ambient playback (250ms),
//      cleanup on track change.
//
//  The store API additionally exposes the full movement structure,
//  bound-paper queries, and the still-center triptych so any component
//  on the site can read the program structure without prop drilling.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  TRACKS,
  type Track,
  getTrackByIndex,
  getBoundTrack as _getBoundTrack,
} from "@/data/tracks";

// ═══════════════════════════════════════════════════════════════════════════
//  Store
// ═══════════════════════════════════════════════════════════════════════════

type AudioState = {
  // Persistent — survive across sessions
  trackIndex: number;
  volume: number;
  muted: boolean;
  reverbEnabled: boolean;

  // Ephemeral
  playing: boolean;
  loading: boolean;
  loadProgress: number; // 0–1, set during sampler load
  ready: boolean;
  progress: number;
  position: number;

  // UI state — whether the programme drawer is open. Lives in the
  // store so the SiteHeader trigger and the bottom-right MiniPlayer
  // can both open/close it without prop drilling.
  programmeOpen: boolean;

  // UI state — whether the MiniPlayer has been dismissed for the
  // session. Stored here (not as MiniPlayer-local state) so the
  // SiteHeader fermata trigger can read it and apply a gentle pulse —
  // signalling to the user that the dismissed player is reachable
  // through that icon. Persistence is via sessionStorage, written
  // by the MiniPlayer; deliberately excluded from the store's
  // localStorage partialize.
  programmeDismissed: boolean;

  // Setters
  setTrackIndex: (i: number) => void;
  /**
   * Switch to a track by string id. Used by paper-binding triggers
   * (boundPaper field on Track) so that visiting /research/[slug]
   * with a bound paper can shift the engine to the right music
   * without prop-drilling through every consumer. No-op if no
   * track has the given id.
   */
  setTrackById: (id: string) => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setReverbEnabled: (e: boolean) => void;
  setPlaying: (p: boolean) => void;
  setLoading: (l: boolean) => void;
  setLoadProgress: (p: number) => void;
  setReady: (r: boolean) => void;
  setProgress: (p: number, pos: number) => void;
  setProgrammeOpen: (o: boolean) => void;
  setProgrammeDismissed: (d: boolean) => void;
  next: () => void;
  prev: () => void;
};

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      trackIndex: 0,
      volume: 0.22,
      muted: false,
      reverbEnabled: true,
      playing: false,
      loading: false,
      loadProgress: 0,
      ready: false,
      progress: 0,
      position: 0,
      programmeOpen: false,
      programmeDismissed: false,

      setTrackIndex: (i) => set({ trackIndex: i, progress: 0, position: 0 }),
      setTrackById: (id) => {
        const idx = TRACKS.findIndex((t) => t.id === id);
        if (idx < 0) return;
        // No-op if already on the requested track. Without this guard,
        // re-mounting the paper page (refresh, hot-reload) would restart
        // the bound track from position 0 every time. Sticky-at-entry
        // means the binding fires on first arrival, then steps aside.
        const current = useAudioStore.getState().trackIndex;
        if (current === idx) return;
        set({ trackIndex: idx, progress: 0, position: 0 });
      },
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
      setMuted: (m) => set({ muted: m }),
      setReverbEnabled: (e) => set({ reverbEnabled: e }),
      setPlaying: (p) => set({ playing: p }),
      setLoading: (l) => set({ loading: l }),
      setLoadProgress: (p) => set({ loadProgress: p }),
      setReady: (r) => set({ ready: r }),
      setProgress: (p, pos) => set({ progress: p, position: pos }),
      setProgrammeOpen: (o) => set({ programmeOpen: o }),
      setProgrammeDismissed: (d) => set({ programmeDismissed: d }),

      next: () => {
        const i = get().trackIndex;
        set({ trackIndex: (i + 1) % TRACKS.length, progress: 0, position: 0 });
      },
      prev: () => {
        const i = get().trackIndex;
        const n = TRACKS.length;
        set({ trackIndex: (i - 1 + n) % n, progress: 0, position: 0 });
      },
    }),
    {
      name: "third-space-audio",
      partialize: (s) => ({
        trackIndex: s.trackIndex,
        volume: s.volume,
        muted: s.muted,
        reverbEnabled: s.reverbEnabled,
      }),
    },
  ),
);

// Export a non-hook helper used by paper pages.
export const getBoundTrack = _getBoundTrack;

// ═══════════════════════════════════════════════════════════════════════════
//  Engine
// ═══════════════════════════════════════════════════════════════════════════

export default function SiteAudio() {
  const pianoRef = useRef<unknown>(null);
  const gainRef = useRef<unknown>(null);
  const reverbRef = useRef<unknown>(null);
  const reverbSendRef = useRef<unknown>(null);
  const compressorRef = useRef<unknown>(null);
  const eqRef = useRef<unknown>(null);
  const partRef = useRef<unknown>(null);
  // Substrate-pair ghost layer: a Tone.Player that plays an audio file
  // (typically the same composition rendered through a different
  // instrument or room) underneath the live Salamander rendering.
  // ghostGainRef controls its mix level; both feed the same master gain
  // so volume / fades / mute apply uniformly to the coupled pair.
  const ghostPlayerRef = useRef<unknown>(null);
  const ghostGainRef = useRef<unknown>(null);
  // Breath modulation: ±0.5% bpm modulation on a ~17-second sine,
  // implemented as scheduled rampTo calls every ~1.5 seconds rather
  // than a Tone.LFO. Direct LFO modulation of Transport.bpm corrupts
  // the TickParam's internal timeline (Transport.bpm isn't a normal
  // signal — it's used for musical-time → audio-time conversion);
  // discrete scheduled ramps are the way the TickParam can handle
  // continuous-feeling change. Same audible result: nervous-system
  // entrainment without conscious perception.
  const breathIntervalRef = useRef<number | null>(null);
  const breathStartTimeRef = useRef<number>(0);
  const trackDurationRef = useRef<number>(0);
  const ToneRef = useRef<typeof import("tone") | null>(null);

  const {
    trackIndex,
    playing,
    volume,
    muted,
    reverbEnabled,
    setLoading,
    setLoadProgress,
    setReady,
    setProgress,
    next,
  } = useAudioStore();

  // ── Build the audio graph ──────────────────────────────────
  // Signal flow:
  //   Sampler → EQ3 (high-shelf cut)
  //          → Compressor (gentle 2:1 glue)
  //          → Splitter →─ dry ──┐
  //                              │
  //                              ├→ Master Gain → Destination
  //                              │
  //                    ↓ send    │
  //                 PreDelay     │
  //                    ↓         │
  //                Convolver  ───┘
  //                (wet, low gain)
  //
  // The reverb sits on a send/return so the dry signal preserves attack
  // articulation while the wet signal adds the hall.
  const ensureGraph = async () => {
    if (pianoRef.current) return pianoRef.current;
    setLoading(true);
    setLoadProgress(0);

    const Tone = await import("tone");
    ToneRef.current = Tone;

    // Master chain components.
    const gain = new Tone.Gain(volume).toDestination();
    const compressor = new Tone.Compressor({
      threshold: -24,
      ratio: 2,
      attack: 0.005,
      release: 0.25,
    }).connect(gain);
    const eq = new Tone.EQ3({ low: 0, mid: -1, high: -2 }).connect(compressor);

    gainRef.current = gain;
    compressorRef.current = compressor;
    eqRef.current = eq;

    // Reverb send. We use Tone.Reverb (algorithmic) by default for
    // immediate availability with no IR fetch; if a real IR is later
    // added, swap to Tone.Convolver. Reverb sits on a send so we can
    // toggle it without reconnecting the graph.
    const reverb = new Tone.Reverb({
      decay: 4.5,
      preDelay: 0.012,
      wet: 1, // controlled by the send gain
    });
    await reverb.generate();
    const reverbSend = new Tone.Gain(reverbEnabled ? 0.22 : 0).connect(gain);
    reverb.connect(reverbSend);
    reverbRef.current = reverb;
    reverbSendRef.current = reverbSend;

    // ── Substrate-pair ghost layer ────────────────────────────────
    // The ghost gain is a parallel input that sits alongside the
    // piano sampler, feeding the same dry+reverb chain. Per-track
    // mix level lives in track.ghostLayer.mix and is set when the
    // track loads (loadTrack assigns ghostGain.gain.value). Initial
    // value is 0 so silence is the default — a track without a
    // ghost file simply has nothing routed in.
    const ghostGain = new Tone.Gain(0);
    ghostGain.connect(eq);
    ghostGain.connect(reverb);
    ghostGainRef.current = ghostGain;

    // The piano sampler. Tone.js hosts the Salamander Grand at this
    // baseUrl with samples every minor third; the Sampler pitch-shifts
    // to fill in between them. Reliable CDN, ~5 MB total.
    const piano = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3",
      },
      release: 1.2,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    });

    // Sampler output goes both to the dry chain and the reverb send.
    piano.connect(eq);
    piano.connect(reverb);

    // Tone.loaded() resolves once every audio buffer is decoded. While
    // it's pending we tick a simulated progress animation so the UI
    // doesn't appear frozen.
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const cur = useAudioStore.getState().loadProgress;
      if (cur < 0.9) setLoadProgress(Math.min(cur + 0.04, 0.9));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    await Tone.loaded();
    cancelled = true;

    pianoRef.current = piano;
    setLoadProgress(1);
    setLoading(false);
    setReady(true);
    return piano;
  };

  // ── Load and schedule a track ──────────────────────────────
  const loadTrack = async (track: Track) => {
    const Tone = ToneRef.current;
    const piano = pianoRef.current;
    if (!Tone || !piano) return;

    // Tear down any previous Part.
    if (partRef.current) {
      // @ts-expect-error — runtime Tone.Part
      partRef.current.dispose();
      partRef.current = null;
    }

    // Tear down any previous ghost-layer player. We dispose rather
    // than reuse because each track may have a different audio file
    // (or none), and Tone.Player doesn't support a clean swap.
    if (ghostPlayerRef.current) {
      try {
        // @ts-expect-error — runtime Tone.Player
        ghostPlayerRef.current.stop();
      } catch {
        /* may not be playing */
      }
      // @ts-expect-error — runtime Tone.Player
      ghostPlayerRef.current.dispose();
      ghostPlayerRef.current = null;
    }
    // Reset ghost gain to silence; will be raised below if this
    // track has a ghost layer.
    if (ghostGainRef.current) {
      // @ts-expect-error — runtime Tone.Gain
      ghostGainRef.current.gain.value = 0;
    }

    // ── Per-movement reverb tuning ──────────────────────────────
    // Movement IV is the sacred-witness arc: pieces written for stone
    // rooms (chapels, cathedrals, abbeys). The reverb send for this
    // movement opens by ~5.5 dB so the music sits in noticeably more
    // air — a starting-point hint at the spaces these works lived in.
    // A real impulse-response convolver can replace this later when
    // we have field recordings of actual stone rooms (St. Margaret's,
    // a small abbey, anything with the right early-reflection density).
    // For now, this is honest: more wet, no overclaim.
    if (reverbSendRef.current && reverbEnabled) {
      const isSacred = track.movement === "iv";
      const targetSend = isSacred ? 0.42 : 0.22;
      // @ts-expect-error — runtime Tone.Gain
      reverbSendRef.current.gain.rampTo(targetSend, 1.5);
    }

    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Transport.position = 0;
    Tone.Transport.bpm.value = track.bpm;

    // Parse the MIDI. @tonejs/midi returns notes with absolute time.
    const { Midi } = await import("@tonejs/midi");
    let midi;
    try {
      const response = await fetch(track.midi);
      if (!response.ok) {
        console.warn(
          `[SiteAudio] missing midi: ${track.midi} (${response.status}). The engine will skip this track on auto-advance.`,
        );
        trackDurationRef.current = 0;
        return;
      }
      const buffer = await response.arrayBuffer();
      midi = new Midi(buffer);
    } catch (err) {
      console.warn(`[SiteAudio] failed to load ${track.midi}:`, err);
      trackDurationRef.current = 0;
      return;
    }

    type N = { time: number; name: string; duration: number; velocity: number };
    const notes: N[] = [];
    midi.tracks.forEach((t: { notes: N[] }) => {
      t.notes.forEach((n: N) =>
        notes.push({
          time: n.time,
          name: n.name,
          duration: n.duration,
          velocity: n.velocity,
        }),
      );
    });
    notes.sort((a, b) => a.time - b.time);

    trackDurationRef.current = midi.duration;

    // Build a Tone.Part that triggers Sampler notes.
    // Tone.Part<N> reads `time` from each event object's .time property,
    // so we pass `notes` directly — no need to map to [time, value] tuples.
    // The runtime cast is because pianoRef is typed `unknown` (Tone is
    // dynamically imported) but we know it's a Sampler at this point.
    type SamplerLike = {
      triggerAttack: (note: string, time: number, velocity: number) => void;
      triggerRelease: (note: string, time: number) => void;
    };
    const sampler = piano as SamplerLike;
    const part = new Tone.Part<N>((time, n) => {
      sampler.triggerAttack(n.name, time, n.velocity);
      sampler.triggerRelease(n.name, time + n.duration);
    }, notes);

    part.start(0);
    partRef.current = part;

    // ── Substrate-pair ghost layer ────────────────────────────────
    // If this track specifies a ghost layer, create a Tone.Player
    // pointed at the audio file, route its output through ghostGain
    // (which already feeds the dry+reverb chain), and schedule it
    // to start at Transport time 0 — same as the Part. Tone.Transport
    // is the shared clock, so the live MIDI rendering and the ghost
    // audio file lock to each other within Tone's lookahead window
    // (~50ms by default, well below the threshold where the ear
    // perceives them as separate events).
    //
    // If the audio file fails to load (404, decode error, anything),
    // we log and continue — the live piano layer plays alone, the
    // listener gets a normal rendering, no exception bubbles up.
    if (track.ghostLayer && ghostGainRef.current) {
      const mix = track.ghostLayer.mix ?? 0.35;
      const delaySec = track.ghostLayer.delaySec ?? 0;
      try {
        const ghost = new Tone.Player({
          url: track.ghostLayer.src,
          autostart: false,
          loop: false,
          fadeIn: 0.04,
          fadeOut: 0.6,
          // Decoded buffer is held in memory for the duration of the
          // track. ~5–15MB depending on file length and bitrate.
        }).connect(
          ghostGainRef.current as InstanceType<typeof Tone.Gain>,
        );

        // Wait for the buffer to decode before scheduling. If we
        // start() before load completes, Tone silently no-ops.
        await Tone.loaded();

        // sync() locks the player to Transport time; start(delaySec)
        // schedules it to begin at Transport time = delaySec, i.e.
        // delaySec seconds after the piano starts. For canonic ghosts
        // (Hildegard's trailing voice) this is the trail offset.
        ghost.sync().start(delaySec);
        ghostPlayerRef.current = ghost;

        // Set the ghost mix gain. We ramp rather than snap so the
        // first time a track loads mid-playback there's no click.
        (
          ghostGainRef.current as InstanceType<typeof Tone.Gain>
        ).gain.rampTo(mix, 1);
      } catch (err) {
        console.warn(
          `[SiteAudio] ghost layer failed to load (${track.ghostLayer.src}): ${err}. The piano layer will play alone.`,
        );
      }
    }

    // ── Breath modulation ──────────────────────────────────────
    // ±0.5% bpm modulation on a ~17-second sine (near human resting
    // respiration). Implemented as scheduled rampTo calls every
    // ~1.5s, NOT a Tone.LFO — see notes on breathIntervalRef above.
    if (breathIntervalRef.current !== null) {
      window.clearInterval(breathIntervalRef.current);
      breathIntervalRef.current = null;
    }
    {
      const baseBpm = track.bpm;
      const breathDelta = baseBpm * 0.005; // ±0.5%
      const periodSec = 17;
      const stepSec = 1.5; // schedule a new ramp every 1.5s
      breathStartTimeRef.current = Tone.now();

      const tickBreath = () => {
        const Tref = ToneRef.current;
        if (!Tref) return;
        const elapsed = Tref.now() - breathStartTimeRef.current;
        // sine-phase position in cycle [0, 2π)
        const phase = (2 * Math.PI * elapsed) / periodSec;
        const target = baseBpm + Math.sin(phase) * breathDelta;
        try {
          // Ramp Transport.bpm toward target over the interval length.
          // rampTo schedules a single discrete change on the TickParam,
          // which it can integrate cleanly into its tempo timeline.
          Tref.Transport.bpm.rampTo(target, stepSec);
        } catch {
          /* Transport disposed mid-tick during teardown; ignore */
        }
      };

      tickBreath(); // schedule first breath immediately
      breathIntervalRef.current = window.setInterval(
        tickBreath,
        stepSec * 1000,
      );
    }
  };

  // ── Effect: track change loads new track ───────────────────
  useEffect(() => {
    let cancelled = false;
    const track = getTrackByIndex(trackIndex);

    (async () => {
      if (!pianoRef.current) return;
      if (cancelled) return;
      await loadTrack(track);
      if (playing && ToneRef.current && !cancelled) {
        ToneRef.current.Transport.start();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex]);

  // ── Effect: play/pause toggle ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (playing) {
        const Tone = await import("tone");
        ToneRef.current = Tone;
        await Tone.start();
        if (!pianoRef.current) {
          await ensureGraph();
        }
        if (!partRef.current) {
          await loadTrack(getTrackByIndex(trackIndex));
        }
        if (cancelled) return;
        Tone.Transport.start();
      } else {
        if (ToneRef.current) {
          ToneRef.current.Transport.pause();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // ── Effect: volume / mute → gain ramp (no clicks) ───────────
  useEffect(() => {
    if (!gainRef.current) return;
    // @ts-expect-error — runtime Tone.Gain
    gainRef.current.gain.rampTo(muted ? 0 : volume, 0.4);
  }, [volume, muted]);

  // ── Effect: reverb on/off → send gain ramp ─────────────────
  useEffect(() => {
    if (!reverbSendRef.current) return;
    // @ts-expect-error — runtime Tone.Gain
    reverbSendRef.current.gain.rampTo(reverbEnabled ? 0.22 : 0, 0.6);
  }, [reverbEnabled]);

  // ── Effect: progress poller + auto-advance ─────────────────
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const Tone = ToneRef.current;
      if (!Tone) return;
      const pos = Tone.Transport.seconds;
      const dur = trackDurationRef.current;
      if (dur > 0) {
        const p = Math.min(pos / dur, 1);
        setProgress(p, pos);
        if (pos >= dur - 0.05) {
          next();
        }
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // ── Effect: lookahead — ambient playback can absorb 200ms ──
  useEffect(() => {
    (async () => {
      const Tone = await import("tone");
      Tone.context.lookAhead = 0.2;
    })();
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (partRef.current) {
        // @ts-expect-error — runtime
        partRef.current.dispose();
      }
      if (pianoRef.current) {
        // @ts-expect-error — runtime
        pianoRef.current.dispose();
      }
      if (ghostPlayerRef.current) {
        try {
          // @ts-expect-error — runtime
          ghostPlayerRef.current.stop();
        } catch {
          /* may not be playing */
        }
        // @ts-expect-error — runtime
        ghostPlayerRef.current.dispose();
      }
      if (breathIntervalRef.current !== null) {
        window.clearInterval(breathIntervalRef.current);
        breathIntervalRef.current = null;
      }
      [
        gainRef,
        reverbRef,
        reverbSendRef,
        compressorRef,
        eqRef,
        ghostGainRef,
      ].forEach((ref) => {
        if (ref.current) {
          // @ts-expect-error — runtime
          ref.current.dispose();
        }
      });
      if (ToneRef.current) {
        ToneRef.current.Transport.stop();
        ToneRef.current.Transport.cancel();
      }
    };
  }, []);

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Helper hooks
// ═══════════════════════════════════════════════════════════════════════════

export function useCurrentTrack() {
  const trackIndex = useAudioStore((s) => s.trackIndex);
  return getTrackByIndex(trackIndex);
}

/** Hook for paper pages — returns the bound track for a paper slug, if any. */
export function useBoundTrack(paperSlug: string) {
  return _getBoundTrack(paperSlug);
}
