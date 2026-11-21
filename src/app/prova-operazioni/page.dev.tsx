"use client";

// Fixed scenes of the Operazioni (SPEC §5.17), to look at them without a room on the server. A
// development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it is never
// part of the published site. Players, squads and rounds are made up; nothing can be played.
//   /prova-operazioni/?s=attesa     the room before the start: the code, the team, one squad missing
//   /prova-operazioni/?s=round      round 2: the ally has placed and is ready, the player not yet
//   /prova-operazioni/?s=boss       the Boss: two cards each, the player has placed both
//   /prova-operazioni/?s=risultato  the result of round 1
//   /prova-operazioni/?s=vinta      the end, won (first win: coins and XP)
//   /prova-operazioni/?s=persa      the end, lost to the Panic

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CardDetailProvider } from "@/components/card-detail";
import { CardLooksProvider } from "@/components/card-looks";
import { CoopRoomScreen } from "@/components/coop-room";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import type { CoopCard, CoopMember, CoopRound, CoopView } from "@/lib/coop";

const ABILITIES = ["FOR", "VEL", "RES", "INT", "VOL", "PER", "ENE", "MAG", "PSI", "COM", "TEC", "FUR"];
const RARITY = ["", "delta", "gamma", "beta", "alfa", "omega"];
const ME = "00000000-0000-4000-8000-00000000a11c";
const ALLY = "00000000-0000-4000-8000-00000000b0b0";

/** A card with every value at `base` and some peaks. */
function card(code: string, name: string, base: number, peaks: Record<string, number>, rank = 2, faction = "heroes"): CoopCard {
  return {
    instance_id: `${code}-copy`,
    definition_id: `${code}-def`,
    code,
    name,
    faction,
    flavor: "",
    art_url: `/cards/${code}.webp`,
    stats: Object.fromEntries(ABILITIES.map((a) => [a, peaks[a] ?? base])),
    rarity: { code: RARITY[rank], name: RARITY[rank][0].toUpperCase() + RARITY[rank].slice(1), rank, color: "#999" },
    power: null,
  };
}

const MINE: CoopCard[] = [
  card("P001", "Gantry", 3, { FOR: 9, RES: 8 }, 1),
  card("P028", "Juncture", 4, { VEL: 8, FUR: 7 }),
  card("P043", "Fathom", 5, { INT: 8, PER: 7, TEC: 6 }, 3),
  card("P055", "Keelstone", 5, { COM: 9, FOR: 7, VOL: 6 }, 4),
  card("P012", "Vigil", 3, { PER: 9 }, 1),
  card("P085", "Heirloom", 5, { MAG: 6, PSI: 6 }),
];
const ALLIES: CoopCard[] = [
  card("P017", "Publican", 4, { VOL: 7, PER: 6 }, 1, "neutrals"),
  card("P020", "Longwave", 3, { TEC: 9, PER: 8 }, 1),
  card("P053", "Moth", 5, { FUR: 9, VEL: 8 }, 4),
  card("P100", "Retrograde", 5, { INT: 8, VOL: 7 }, 2),
  card("P101", "Carillon", 5, { RES: 8, ENE: 7 }, 3),
  card("P088", "Gazetteer", 4, { PER: 9, INT: 7 }, 2, "villains"),
];

const threat = (slot: number, name: string, abilities: string[], target: number, panic: number) => ({
  slot,
  name,
  level: abilities.length,
  abilities,
  flavor: "",
  district: null,
  target,
  panic,
});

const ROUND_THREATS = [
  [threat(0, "Scippatore", ["VEL"], 7, 1), threat(1, "Rapina al treno blindato", ["FOR", "VEL", "COM"], 18, 2), threat(2, "Guerra tra bande", ["COM", "FOR", "VEL", "FUR", "PER"], 28, 2)],
  [threat(0, "Rivolta in carcere", ["COM", "VOL", "FOR", "PER"], 23, 3), threat(1, "Inseguimento sui tetti", ["VEL", "FUR"], 13, 1), threat(2, "Invasione dimensionale", ["MAG", "ENE", "PSI", "FOR", "VOL", "PER"], 32, 2)],
  [threat(0, "Caccia nel buio", ["PER", "FUR", "VEL", "PSI", "COM"], 28, 2), threat(1, "Terminale bloccato", ["TEC"], 7, 1), threat(2, "Golem di cemento", ["FOR", "RES", "ENE"], 18, 2)],
  [threat(0, "Robot impazzito", ["FOR", "TEC"], 13, 1), threat(1, "Armata del caos", ["COM", "FOR", "VEL", "RES", "ENE", "FUR"], 32, 3), threat(2, "Colpo al caveau", ["FUR", "TEC", "INT", "VEL"], 23, 2)],
  [threat(0, "Muro pericolante", ["FOR"], 9, 0), threat(1, "Portale instabile", ["MAG", "ENE", "PSI", "VOL"], 25, 0), threat(2, "Signore delle ombre", ["FUR", "PSI", "MAG", "PER", "VOL", "COM"], 34, 0)],
];
const REINFORCED = [1, 0, 2, 1, 2];

function member(userId: string, name: string, squad: CoopCard[], extra: Partial<CoopMember> = {}): CoopMember {
  return {
    user_id: userId,
    seat: userId === ME ? 1 : 2,
    username: name,
    avatar_url: null,
    level: 7,
    ready: false,
    left: false,
    last_seen_at: new Date().toISOString(),
    signal: null,
    signal_at: null,
    squad,
    used: [],
    placement: null,
    xp: null,
    coins: null,
    reward_card: null,
    ...extra,
  };
}

/** Round 1 resolved: the player stopped the Scippatore, the ally lost to the Eco; the level 5 left. */
function roundOne(deadline: string): CoopRound {
  return {
    round: 1,
    boss: false,
    levels: [1, 3, 5],
    deadline_at: deadline,
    reinforced_slot: 1,
    threats: ROUND_THREATS[0],
    resolved: true,
    results: [
      { slot: 0, stopped: true, total: 8, required: 7, panic: 0 },
      { slot: 1, stopped: false, total: 15, required: null, panic: 0 + 2 },
      { slot: 2, stopped: false, total: 0, required: 28, panic: 2 },
    ],
    panic: 4,
    eco: {
      ...card("P041", "Gavel", 5, { FOR: 8, VEL: 6, COM: 7 }, 3, "villains"),
      score: { characterId: "P041-def", base: 21, bonus: 0, total: 21, highest: 8, outcome: "won" },
    },
    plays: [
      { user_id: ME, instance_id: "P028-copy", definition_id: "P028-def", slot: 0, role: "lead", base: 8, bonus: 0, score: 8, highest: 8, auto_played: false, parts: null },
      { user_id: ALLY, instance_id: "P101-copy", definition_id: "P101-def", slot: 1, role: "lead", base: 15, bonus: 0, score: 15, highest: 8, auto_played: false, parts: null },
    ],
  };
}

function scene(name: string): { view: CoopView; revealing: number | null } {
  const now = Date.now();
  const at = (seconds: number) => new Date(now + seconds * 1000).toISOString();
  const base: Omit<CoopView, "status" | "members" | "rounds" | "current_round" | "panic"> = {
    id: "prova",
    code: "K7PX2Q",
    players: 2,
    panic_limit: 12,
    server_now: new Date(now).toISOString(),
    me: ME,
    host: ME,
    all_ready: false,
    operation: {
      code: "O1M1",
      title: "Scosse alle Fosse",
      intro:
        "Le Fosse tremano e mezzo quartiere scende in strada. Un Reggente della Compagnia approfitta del caos per prendersi le emergenze che pagano di più: lasciategli le briciole.",
      outro: null,
      rival_name: "Il Reggente della Compagnia",
      boss_name: "La faglia sotto le Fosse",
      reward_coins: 40,
      reward_card: null,
      completed: false,
    },
  };
  const unplayed = (round: number): CoopRound => ({
    round,
    boss: round === 5,
    levels: ROUND_THREATS[round - 1].map((t) => t.level),
    deadline_at: null,
    reinforced_slot: null,
    threats: null,
    resolved: false,
    results: null,
    panic: null,
    eco: null,
    plays: null,
  });
  const live = (round: number, deadline: string): CoopRound => ({
    ...unplayed(round),
    deadline_at: deadline,
    reinforced_slot: REINFORCED[round - 1],
    threats: ROUND_THREATS[round - 1],
  });

  switch (name) {
    case "attesa":
      return {
        view: {
          ...base,
          status: "lobby",
          current_round: 0,
          panic: 0,
          members: [member(ME, "Alice_Reggente", MINE, { ready: true }), member(ALLY, "bruno_b", ALLIES, { squad: null })],
          rounds: [1, 2, 3, 4, 5].map(unplayed),
        },
        revealing: null,
      };
    case "boss": {
      // Round 1 played Juncture (MINE[1]) and Carillon (ALLIES[4]); rounds 2-4 the others below.
      const PICK: Record<number, number> = { 2: 0, 3: 2, 4: 3 };
      // Rounds 2-4: the player on the first threat, the ally on the third, the second left.
      const played = (round: number): CoopRound => ({
        ...live(round, at(-100)),
        resolved: true,
        results: [
          { slot: 0, stopped: true, total: 20, required: ROUND_THREATS[round - 1][0].target, panic: 0 },
          { slot: 1, stopped: false, total: 0, required: ROUND_THREATS[round - 1][1].target, panic: 1 },
          { slot: 2, stopped: true, total: 30, required: ROUND_THREATS[round - 1][2].target, panic: 0 },
        ],
        panic: 1,
        eco: {
          ...card(`P07${round}`, "Cineris", 5, { FUR: 8 }, 2, "villains"),
          score: { characterId: `P07${round}-def`, base: 18, bonus: 0, total: 18, highest: 8, outcome: "lost" },
        },
        plays: [
          { user_id: ME, instance_id: MINE[PICK[round]].instance_id, definition_id: MINE[PICK[round]].definition_id, slot: 0, role: "lead", base: 20, bonus: 0, score: 20, highest: 9, auto_played: false, parts: null },
          { user_id: ALLY, instance_id: ALLIES[round - 2].instance_id, definition_id: ALLIES[round - 2].definition_id, slot: 2, role: "lead", base: 30, bonus: 0, score: 30, highest: 9, auto_played: false, parts: null },
        ],
      });
      return {
        view: {
          ...base,
          status: "active",
          current_round: 5,
          panic: 7,
          members: [
            member(ME, "Alice_Reggente", MINE, {
              used: MINE.slice(0, 4).map((c) => c.instance_id),
              placement: [
                { card: MINE[4].instance_id, slot: 0 },
                { card: MINE[5].instance_id, slot: 1 },
              ],
            }),
            member(ALLY, "bruno_b", ALLIES, { used: [4, 0, 1, 2].map((i) => ALLIES[i].instance_id), placement: [{ card: ALLIES[3].instance_id, slot: 1 }], signal: "help", signal_at: new Date(now).toISOString() }),
          ],
          rounds: [roundOne(at(-200)), played(2), played(3), played(4), live(5, at(52))],
        },
        revealing: null,
      };
    }
    case "risultato":
    case "round": {
      const view: CoopView = {
        ...base,
        status: "active",
        current_round: 2,
        panic: 4,
        members: [
          member(ME, "Alice_Reggente", MINE, { used: ["P028-copy"] }),
          member(ALLY, "bruno_b", ALLIES, {
            used: ["P101-copy"],
            ready: true,
            placement: [{ card: ALLIES[2].instance_id, slot: 1 }],
            signal: "mine",
            signal_at: new Date(now).toISOString(),
          }),
        ],
        rounds: [roundOne(at(-30)), live(2, at(name === "risultato" ? 60 : 38)), unplayed(3), unplayed(4), unplayed(5)],
      };
      return { view, revealing: name === "risultato" ? 1 : null };
    }
    case "persa":
    case "vinta":
    default: {
      const won = name !== "persa";
      return {
        view: {
          ...base,
          status: won ? "won" : "lost",
          current_round: won ? 5 : 3,
          panic: won ? 7 : 13,
          operation: { ...base.operation, outro: won ? "Le Fosse reggono. Il Reggente della Compagnia se ne va a mani vuote, ma prende nota delle vostre facce." : null },
          members: [
            member(ME, "Alice_Reggente", MINE, { xp: won ? 30 : 10, coins: won ? 40 : 0 }),
            member(ALLY, "bruno_b", ALLIES, { xp: won ? 30 : 10, coins: won ? 40 : 0 }),
          ],
          rounds: [
            roundOne(at(-500)),
            { ...unplayed(2), resolved: true },
            { ...unplayed(3), resolved: true },
            { ...unplayed(4), resolved: won },
            won
              ? { ...live(5, at(-10)), resolved: true, results: [{ slot: 0, stopped: true, total: 11, required: 9, panic: 0 }, { slot: 1, stopped: true, total: 27, required: 25, panic: 0 }, { slot: 2, stopped: false, total: 30, required: null, panic: 0 }] }
              : unplayed(5),
          ],
        },
        revealing: null,
      };
    }
  }
}

export default function CoopProofPage() {
  return (
    <Suspense>
      <CoopProof />
    </Suspense>
  );
}

function CoopProof() {
  const name = useSearchParams().get("s") ?? "round";
  const [{ view, revealing }, setScene] = useState(() => scene(name));
  const [abilities, setAbilities] = useState<AbilityInfo[]>([]);
  useEffect(() => {
    fetchAbilities()
      .then(setAbilities)
      .catch(() => {});
  }, []);
  return (
    <CardLooksProvider>
      <CardDetailProvider>
        <CoopRoomScreen
          view={view}
          abilities={abilities}
          offset={0}
          error={null}
          revealing={revealing}
          onRevealDone={() => setScene((shown) => ({ ...shown, revealing: null }))}
          onView={() => {}}
          onRefresh={async () => {}}
          onError={() => {}}
        />
      </CardDetailProvider>
    </CardLooksProvider>
  );
}
