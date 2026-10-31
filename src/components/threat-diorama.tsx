"use client";

import { memo, useEffect, useRef, useState } from "react";
import { threatScene } from "@/lib/threat-scene";

/**
 * The threat's 3D diorama. Purely decorative: without an environment for this
 * threat, or without WebGL, the panel simply stays as it is.
 */
export const ThreatDiorama = memo(function ThreatDiorama({ name, level }: { name: string; level: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const scene = threatScene(name);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!scene || !canvas) return;
    let cancelled = false;
    let unmount: (() => void) | undefined;
    // Three.js is downloaded only when a match needs it.
    import("@/lib/threat-diorama")
      .then(({ mountThreatDiorama }) => {
        if (!cancelled) unmount = mountThreatDiorama(canvas, { name, level, scene }, () => setFailed(true));
      })
      .catch((cause: unknown) => {
        console.error("Threat diorama failed", cause);
        setFailed(true);
      });
    return () => {
      cancelled = true;
      unmount?.();
    };
    // `scene` follows from `name`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, level]);

  if (!scene || failed) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="relative -mx-4 mb-1 block h-[clamp(130px,24svh,200px)] w-[calc(100%+2rem)] cursor-grab touch-pan-y"
    />
  );
});
