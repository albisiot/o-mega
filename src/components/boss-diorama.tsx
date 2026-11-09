"use client";

import { memo, useEffect, useRef, useState } from "react";
import { currentHolders, type BossView } from "@/lib/boss";
import { bossScene } from "@/lib/threat-scene";

/** Beacon colours: cyan for the player, orange for the opponent (magenta would vanish on the panel). */
const MINE = 0x16c8ff;
const THEIRS = 0xff8a00;

/** For each front, the colour of whoever holds it after the last turn; null if nobody. */
export function frontColors(view: Pick<BossView, "fronts" | "rounds">): (number | null)[] {
  return currentHolders(view).map((holder) => (holder === "me" ? MINE : holder === "opponent" ? THEIRS : null));
}

/**
 * The boss's 3D diorama, as big as the biggest threats, with one beacon per front that
 * lights up in the colour of whoever holds it. Purely decorative: without a known
 * scene or WebGL, the boss's line from the seismograph fills the room instead.
 */
export const BossDiorama = memo(function BossDiorama({ view, fill = false }: { view: BossView; fill?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const scene = bossScene(view.boss.scene);
  // The scene reads the beacons on every frame: a ref keeps them current without remounting.
  const colors = useRef(frontColors(view));
  useEffect(() => {
    colors.current = frontColors(view);
  }, [view]);

  const name = view.boss.name;
  const fronts = view.fronts.length;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!scene || !canvas) return;
    let cancelled = false;
    let unmount: (() => void) | undefined;
    // Three.js is downloaded only when a match needs it.
    import("@/lib/threat-diorama")
      .then(({ mountThreatDiorama }) => {
        if (cancelled) return;
        unmount = mountThreatDiorama(
          canvas,
          { name, level: 6, scene, beacons: { count: fronts, colors: () => colors.current } },
          () => setFailed(true),
        );
      })
      .catch((cause: unknown) => {
        console.error("Boss diorama failed", cause);
        setFailed(true);
      });
    return () => {
      cancelled = true;
      unmount?.();
    };
    // `scene` follows from the boss's scene code, which never changes in a match.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, fronts, view.boss.scene]);

  if (!scene || failed) {
    return (
      <p
        className={`${fill ? "absolute inset-0" : ""} flex items-end overflow-hidden px-3 pb-1 text-[12px] font-bold italic leading-4 text-black/80`}
      >
        {view.boss.flavor}
      </p>
    );
  }
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`block cursor-grab touch-pan-y ${
        fill ? "absolute inset-0 h-full w-full" : "relative -mx-4 mb-1 h-[clamp(130px,24svh,200px)] w-[calc(100%+2rem)]"
      }`}
    />
  );
});
