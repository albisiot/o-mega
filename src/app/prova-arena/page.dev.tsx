"use client";

// The challenges of the Scontro a squadre (stage 6a, src/components/combat-arena.tsx) without a
// server. A development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it
// is never part of the published site. The characters are the ten pilots, the names and numbers
// made up; nothing can be saved or played.
//   /prova-arena/             a defence, three opponents (one of the computer), two defences new
//   /prova-arena/?s=nuova     no defence yet: prepare it
//   /prova-arena/?s=rotta     a defence with a card the player no longer has, renewals ended

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CombatArenaPanel } from "@/components/combat-arena";
import type { CombatArena, CombatCard } from "@/lib/combat";
import { COMBAT_PILOTS } from "@/lib/combat-pilot";

// The pilots as owned cards: their code stands for the copy and the character.
const CARDS: CombatCard[] = COMBAT_PILOTS.map((p) => ({
  instanceId: p.code,
  definitionId: p.code,
  code: p.code,
  name: p.name,
  rarity: "delta",
  faction: p.faction,
  stats: {},
  kit: p.kit,
}));
const codes = (from: number) => CARDS.slice(from, from + 5).map((c) => c.code);

const BASE: CombatArena = {
  points: 245,
  defense: { card_instance_ids: codes(0), definition_ids: codes(0), tactics: { strategy: "defensive", priority: null, orders: {} }, ok: true },
  offers: [
    { kind: "player", name: "Giacomo_T", points: 260, definition_ids: codes(5) },
    { kind: "player", name: "MartaR88", points: 198, definition_ids: [CARDS[1].code, CARDS[3].code, CARDS[5].code, CARDS[7].code, CARDS[9].code] },
    { kind: "computer", name: "Squadra del computer", points: 231, definition_ids: [CARDS[0].code, CARDS[2].code, CARDS[4].code, CARDS[6].code, CARDS[8].code] },
  ],
  refreshes_left: 4,
  paid_today: 2,
  paid_daily: 5,
  defenses: [
    { attacker: "Giacomo_T", held: false, draw: false, points: -9, finished_at: "2026-11-26T15:10:00Z", new: true },
    { attacker: "Lupo_Nero", held: true, draw: false, points: 7, finished_at: "2026-11-26T12:40:00Z", new: true },
    { attacker: "MartaR88", held: false, draw: true, points: 0, finished_at: "2026-11-25T20:05:00Z", new: false },
  ],
};

const SCENES: Record<string, CombatArena> = {
  "": BASE,
  nuova: { ...BASE, points: 0, defense: null, offers: [], refreshes_left: 5, paid_today: 0, defenses: [] },
  rotta: { ...BASE, defense: { ...BASE.defense!, ok: false }, refreshes_left: 0 },
};

function Scene() {
  const key = useSearchParams().get("s") ?? "";
  const arena = SCENES[key] ?? SCENES[""];
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2 px-3 pb-4 pt-2 text-foreground">
      <p className="font-display text-2xl uppercase leading-8">Scontro a squadre</p>
      <CombatArenaPanel key={key} cards={CARDS} codeOf={(id) => id} closed={false} busy={false} onChallenge={() => {}} initial={arena} />
    </main>
  );
}

export default function ArenaTestPage() {
  return (
    <Suspense>
      <Scene />
    </Suspense>
  );
}
