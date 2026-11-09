"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motionArtUrl } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the device asks for less motion; true while pre-rendering, so the exported HTML has no video. */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
}

/**
 * The looping video of an animated drawing, laid over the still drawing with the
 * same fit (`className`). Nothing when the drawing has no video or the device asks
 * for less motion; until the video actually plays (Low Power Mode, slow network,
 * a failed load) it stays invisible and the still drawing shows.
 */
export function ArtMotion({ artUrl, className }: { artUrl: string; className: string }) {
  const src = motionArtUrl(artUrl);
  const reduced = useReducedMotion();
  if (!src || reduced) return null;
  // A new drawing (another look on the card page) starts hidden again.
  return <MotionVideo key={src} src={withBasePath(src)} className={className} />;
}

function MotionVideo({ src, className }: { src: string; className: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    // iPhone autoplays inline only muted videos, and React sets `muted` as a property: set it before playing.
    element.muted = true;
    element.play().catch(() => {
      // Autoplay refused (Low Power Mode): the still drawing stays.
    });
  }, []);

  return (
    <video
      ref={video}
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      aria-hidden
      onPlaying={() => setPlaying(true)}
      className={`${className} transition-opacity duration-300 ${playing ? "opacity-100" : "opacity-0"}`}
    />
  );
}
