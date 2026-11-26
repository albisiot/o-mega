"use client";

// The challenges of the Scontro a squadre (stage 6a, src/components/combat-arena.tsx) without a
// server. A development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it
// is never part of the published site. The characters are the ten pilots, the names and numbers
// made up; nothing can be saved or played.
//   /prova-arena/             a defence, three opponents (one of the computer), two defences new
//   /prova-arena/?s=nuova     no defence yet: prepare it
//   /prova-arena/?s=rotta     a defence with a card the player no longer has, renewals ended
//   /prova-arena/?s=premio    Asso, first in the season, the prize of October to claim (6b)
//   /prova-arena/?s=classifica the board of the season as Classifiche → Scontro shows it (6b), the player 12th

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CombatArenaPanel } from "@/components/combat-arena";
import { CombatArenaBoardPanel } from "@/components/combat-arena-board";
import type { CombatArena, CombatArenaBoard, CombatCard } from "@/lib/combat";
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
  season: {
    season: "2026-11",
    label: "novembre 2026",
    ends_at: "2026-11-30T23:00:00Z",
    league: "recluta",
    next_league_at: 300,
    challenges: 3,
    min_challenges: 5,
    place: 4,
  },
  prizes: [],
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
  nuova: { ...BASE, points: 0, season: { ...BASE.season, challenges: 0, place: null }, defense: null, offers: [], refreshes_left: 5, paid_today: 0, defenses: [] },
  rotta: { ...BASE, defense: { ...BASE.defense!, ok: false }, refreshes_left: 0 },
  premio: {
    ...BASE,
    points: 1310,
    season: { ...BASE.season, league: "asso", next_league_at: 1800, challenges: 6, place: 1 },
    prizes: [{ season: "2026-10", label: "ottobre 2026", place: 2, league: "asso", points: 1240, coins: 100, packs: 1 }],
  },
};

const NAMES = ["Giacomo_T", "MartaR88", "Lupo_Nero", "Sere_Vale", "Kappa77", "Ombra_Blu", "Fede_Ricci", "Neon_Rita", "Tano_Z", "Ludo_Gamer"];
const LEAGUES = ["leggenda", "asso", "asso", "veterano", "veterano", "veterano", "vigilante", "vigilante", "vigilante", "recluta"] as const;
const BOARD: CombatArenaBoard = {
  season: "2026-11",
  label: "novembre 2026",
  ends_at: "2026-11-30T23:00:00Z",
  current: true,
  players: 23,
  top: NAMES.map((name, i) => ({
    place: i + 1,
    username: name,
    avatar_url: null,
    title: null,
    points: 1900 - i * 160,
    league: LEAGUES[i],
    challenges: 30 - i * 2,
    wins: 20 - i * 2,
    is_me: false,
  })),
  me: { place: 12, username: "Tu", avatar_url: null, title: null, points: 245, league: "recluta", challenges: 3, wins: 2, is_me: true },
  seasons: [{ season: "2026-10", label: "ottobre 2026" }],
};

function Scene() {
  const key = useSearchParams().get("s") ?? "";
  if (key === "classifica") {
    return (
      <main className="flex h-dvh flex-col gap-2 px-3 pb-4 pt-2 text-foreground">
        <p className="font-display text-2xl uppercase leading-8 text-comic-yellow">Classifiche · Scontro</p>
        <CombatArenaBoardPanel preview={BOARD} />
      </main>
    );
  }
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
