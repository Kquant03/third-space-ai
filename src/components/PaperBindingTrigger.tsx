"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  components/PaperBindingTrigger.tsx
//  ─────────────────────────────────────────────────────────────────────────
//  When a /research/[slug] page mounts and the slug is bound to a track
//  via the boundPaper field on Track, swap the audio engine to that
//  track — but ONLY if audio is already playing. The reader who has
//  chosen to listen gets the right music for what they are reading;
//  the reader who has chosen silence is not ambushed.
//
//  This is the "narrow + sticky at entry" interpretation we settled on.
//  Sticky means: once we've switched on entry, the user is in control
//  until they navigate to another bound paper. We do NOT restore the
//  previous track on unmount. The binding is a one-shot suggestion at
//  page-entry time, not a session-long lock.
//
//  This is a Server Component-friendly client wrapper: it renders
//  null and only runs its effect on the client. Mount it inside any
//  Server Component page that wants paper-binding behavior.
//
//  Thesis-coherence note: an autoplay paper page would impose audio
//  on the reader. A binding-respecting page couples to whatever the
//  reader has already chosen — silent or musical — and shifts within
//  their existing choice. The narrow version IS the substrate-coupling
//  thesis applied to the page itself: tend, don't impose.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect } from "react";
import { useAudioStore } from "@/components/SiteAudio";
import { getBoundTrack } from "@/data/tracks";

type Props = {
  /** The paper slug from the dynamic route param. */
  slug: string;
};

export default function PaperBindingTrigger({ slug }: Props) {
  const setTrackById = useAudioStore((s) => s.setTrackById);

  useEffect(() => {
    const bound = getBoundTrack(slug);
    if (!bound) return;

    // Read playing state at effect time (NOT subscribed). We don't
    // want to re-trigger this effect when playing flips later — the
    // binding is a one-shot at page-entry, not a continuous watcher.
    const isPlaying = useAudioStore.getState().playing;
    if (!isPlaying) return;

    setTrackById(bound.id);
    // The audio engine's track-change effect will pick up the new
    // trackIndex, tear down the previous Part, load the bound MIDI,
    // and start playback at Transport time 0. Movement IV reverb
    // ramps in if the bound track is in Movement IV. Breath
    // modulation re-anchors to the new bpm. Substrate-pair ghost
    // layer (when present) loads alongside.
  }, [slug, setTrackById]);

  return null;
}
