"use client";

import type { BossView } from "@/lib/boss";

/**
 * The boss above the fronts. Until its 3D scene is ready, the boss's line from the
 * seismograph fills the room the screen has left.
 */
export function BossDiorama({ view, fill = false }: { view: BossView; fill?: boolean }) {
  return (
    <p
      className={`${fill ? "absolute inset-0" : ""} flex items-end overflow-hidden px-3 pb-1 text-[12px] font-bold italic leading-4 text-black/80`}
    >
      {view.boss.flavor}
    </p>
  );
}
