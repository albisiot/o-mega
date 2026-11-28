"use client";

// The Scontro a squadre kit in a character's file (src/components/combat-kit-panel.tsx), without a
// server. A development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it
// is never part of the published site. The kit is Gantry's (a pilot), the numbers made up.
//   /prova-kit/             unlocked: the three moves and the passive
//   /prova-kit/?s=bloccato  locked: 37 wins of 50, the rule, no moves
//   /prova-kit/?s=giocate   locked, counting the matches played: 12 of 30
//   /prova-kit/?s=editor    the kit in the form of EDITOR → Scontro (src/components/combat-kit-form.tsx),
//                           checked by the engine as it changes; nothing is saved

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { validateCombatKit, type CombatKit } from "@o-mega/game-engine";
import { CombatKitForm } from "@/components/combat-kit-form";
import { CombatKitView } from "@/components/combat-kit-panel";
import { COMBAT_FAMILIES, combatRules, type CombatUnlocks } from "@/lib/combat";
import { COMBAT_PILOTS } from "@/lib/combat-pilot";
import { italianKitError } from "@/lib/combat-text";
import { useLockedScreen } from "@/lib/use-locked-screen";

const GANTRY = COMBAT_PILOTS[0];

const SCENES: Record<string, CombatUnlocks> = {
  "": { mode: "progress", basis: "wins", count: 50, since: null, needed: 5, progress: { [GANTRY.code]: 50 }, ready: 5 },
  bloccato: { mode: "progress", basis: "wins", count: 50, since: null, needed: 5, progress: { [GANTRY.code]: 37 }, ready: 2 },
  giocate: { mode: "progress", basis: "played", count: 30, since: null, needed: 5, progress: { [GANTRY.code]: 12 }, ready: 0 },
};

/** The editor of the kit, as on /gestione-scontro: the form, the engine's problems, no saving. */
function EditorScene() {
  useLockedScreen(true);
  const [kit, setKit] = useState<CombatKit>(() => structuredClone(GANTRY.kit));
  const errors = validateCombatKit(kit, COMBAT_FAMILIES, combatRules()).map(italianKitError);
  return (
    <div className="game-shell text-foreground">
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        <p className="shrink-0 text-[14px] font-extrabold">
          {GANTRY.name} <span className="text-faint">({GANTRY.code})</span> · prova, non si salva
        </p>
        <CombatKitForm kit={kit} onChange={setKit} errors={errors} abilities={[]} />
        <p className={`shrink-0 text-[12px] font-extrabold ${errors.length ? "text-comic-magenta" : "text-comic-cyan"}`}>
          {errors.length ? errors.join(" · ") : "Il kit è valido."}
        </p>
      </main>
    </div>
  );
}

function Scene() {
  const scene = useSearchParams().get("s") ?? "";
  if (scene === "editor") return <EditorScene />;
  const unlocks = SCENES[scene] ?? SCENES[""];
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
