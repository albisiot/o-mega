"use client";

// The Scontro a squadre kit in a character's file (src/components/combat-kit-panel.tsx), without a
// server. A development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it
// is never part of the published site. The kit is Gantry's (a pilot), the numbers made up.
//   /prova-kit/             unlocked: the three moves and the passive
//   /prova-kit/?s=bloccato  locked: 37 wins of 50, the rule, no moves
//   /prova-kit/?s=giocate   locked, counting the matches played: 12 of 30

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CombatKitView } from "@/components/combat-kit-panel";
import type { CombatUnlocks } from "@/lib/combat";
import { COMBAT_PILOTS } from "@/lib/combat-pilot";

const GANTRY = COMBAT_PILOTS[0];

const SCENES: Record<string, CombatUnlocks> = {
  "": { mode: "progress", basis: "wins", count: 50, since: null, needed: 5, progress: { [GANTRY.code]: 50 }, ready: 5 },
  bloccato: { mode: "progress", basis: "wins", count: 50, since: null, needed: 5, progress: { [GANTRY.code]: 37 }, ready: 2 },
  giocate: { mode: "progress", basis: "played", count: 30, since: null, needed: 5, progress: { [GANTRY.code]: 12 }, ready: 0 },
};

function Scene() {
  const unlocks = SCENES[useSearchParams().get("s") ?? ""] ?? SCENES[""];
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-3 px-4 py-4 text-foreground">
      <h2 className="font-display text-2xl uppercase text-comic-yellow">Scheda di {GANTRY.name}</h2>
      <CombatKitView kit={GANTRY.kit} unlocks={unlocks} definitionId={GANTRY.code} name={GANTRY.name} />
    </main>
  );
}

export default function KitTestPage() {
  return (
    <Suspense>
      <Scene />
    </Suspense>
  );
}
