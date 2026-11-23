"use client";

// Fixed scenes of the Caccia grossa (SPEC §5.18), to look at them without a room on the server. A
// development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it is never
// part of the published site. Players, squads and rounds are made up; nothing can be played.
//   /prova-caccia/?s=attesa     the room before the start: the code, the Boss, a server ally, one squad missing
//   /prova-caccia/?s=round      round 2: the friend has placed and is ready, the player not yet; Bersaglio
//   /prova-caccia/?s=quattro    round 3 with four players (two allies), a Spia has shown two moves more
//   /prova-caccia/?s=risultato  the result of round 1: held, damage to the Boss
//   /prova-caccia/?s=colpo      the result of round 2: not held under a Colpo pesante, two Defences
//   /prova-caccia/?s=vinta      the end, won (first win: coins and XP)
//   /prova-caccia/?s=persa      the end, lost: the Defences gone
//   /prova-caccia/?s=editor     the editor of the Bosses (admins), on made-up data: tap Modifica
// The quattro scene plays round 3 under Territorio ostile; risultato and colpo open on the map.

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CardDetailProvider } from "@/components/card-detail";
import { CardLooksProvider } from "@/components/card-looks";
import { BossAdminView } from "@/components/boss-admin";
import { RaidRoomScreen } from "@/components/raid-room";
import type { BossAdmin } from "@/lib/boss-admin";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import type { RaidCard, RaidMember, RaidMove, RaidRound, RaidView } from "@/lib/raid";

const ABILITIES = ["FOR", "VEL", "RES", "INT", "VOL", "PER", "ENE", "MAG", "PSI", "COM", "TEC", "FUR"];
const RARITY = ["", "delta", "gamma", "beta", "alfa", "omega"];
const ME = "00000000-0000-4000-8000-00000000a11c";
const FRIEND = "00000000-0000-4000-8000-00000000b0b0";

/** A card with every value at `base` and some peaks. */
function card(code: string, name: string, base: number, peaks: Record<string, number>, rank = 2, faction = "heroes"): RaidCard {
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

const MINE: RaidCard[] = [
  card("P001", "Gantry", 3, { FOR: 9, RES: 8 }, 1),
  card("P028", "Juncture", 4, { VEL: 8, FUR: 7 }),
  card("P043", "Fathom", 5, { INT: 8, PER: 7, TEC: 6 }, 3),
  card("P055", "Keelstone", 5, { COM: 9, FOR: 7, VOL: 6 }, 4),
  card("P012", "Vigil", 3, { PER: 9 }, 1),
  card("P085", "Heirloom", 5, { MAG: 6, PSI: 6 }),
];
const FRIENDS: RaidCard[] = [
  card("P017", "Publican", 4, { VOL: 7, PER: 6 }, 1, "neutrals"),
  card("P020", "Longwave", 3, { TEC: 9, PER: 8 }, 1),
  card("P053", "Moth", 5, { FUR: 9, VEL: 8 }, 4),
  card("P100", "Retrograde", 5, { INT: 8, VOL: 7 }, 2),
  card("P101", "Carillon", 5, { RES: 8, ENE: 7 }, 3),
  card("P088", "Gazetteer", 4, { PER: 9, INT: 7 }, 2, "villains"),
];
const ALLY_CARDS: RaidCard[] = MINE.map((c, i) => ({ ...c, instance_id: `${c.code}-ally${i}` }));

const THREATS = [
  { name: "Rapina al treno blindato", level: 3, abilities: ["FOR", "VEL", "COM"] },
  { name: "Inseguimento sui tetti", level: 2, abilities: ["VEL", "FUR"] },
  { name: "Golem di cemento", level: 5, abilities: ["FOR", "RES", "ENE", "COM", "VOL"] },
  { name: "Scippatore", level: 1, abilities: ["VEL"] },
  { name: "Robot impazzito", level: 4, abilities: ["FOR", "TEC", "INT", "PER"] },
];
const MOVES: RaidMove[] = ["plain", "target", "heavy", "exposed", "armor"];

function member(userId: string | null, seat: number, name: string, squad: RaidCard[], extra: Partial<RaidMember> = {}): RaidMember {
  return {
    user_id: userId,
    seat,
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
    ...extra,
  };
}

function ally(seat: number, name: string): RaidMember {
  return member(null, seat, name, ALLY_CARDS.map((c) => ({ ...c, instance_id: `${c.instance_id}-${seat}` })), { bot: true, ready: true });
}

/** Attack of each round, by players: the Emergenza's targets times the room's factor. */
const ATTACKS: Record<number, number[]> = { 2: [36, 26, 56, 14, 46], 4: [73, 53, 113, 28, 93] };

function rounds(players: number, reached: number, known: (RaidMove | null)[] = []): RaidRound[] {
  return THREATS.map((t, i) => ({
    round: i + 1,
    level: t.level,
    attack: ATTACKS[players][i],
    deadline_at: null,
    move: i + 1 <= reached + 1 ? MOVES[i] : (known[i] ?? null),
    threat: i + 1 <= reached ? { ...t, flavor: "", district: "porto" } : null,
    foreseen: null,
    seen_by: null,
    resolved: false,
    result: null,
    plays: null,
  }));
}

/** Round 1 resolved: held at 41 against 36, five of damage. */
function roundOne(round: RaidRound): RaidRound {
  return {
    ...round,
    resolved: true,
    result: { total: 41, effective_attack: 36, required: 36, held: true, cancelled: false, damage: 5, defenses_lost: 0, healed: 0, vita: 19, defenses: 3 },
    plays: [
      { user_id: ME, seat: 1, instance_id: "P055-copy", definition_id: "P055-def", base: 22, bonus: 0, score: 22, counted: 22, highest: 9, auto_played: false, parts: null },
      { user_id: FRIEND, seat: 2, instance_id: "P053-copy", definition_id: "P053-def", base: 19, bonus: 0, score: 19, counted: 19, highest: 8, auto_played: false, parts: null },
    ],
  };
}

/** Round 2 resolved under Bersaglio: 20 halved to 10, 12 + 10 = 22 against 26, a Defence. */
function roundTwo(round: RaidRound): RaidRound {
  return {
    ...round,
    resolved: true,
    result: { total: 22, effective_attack: 26, required: 26, held: false, cancelled: false, damage: 0, defenses_lost: 1, healed: 0, vita: 19, defenses: 2 },
    plays: [
      { user_id: ME, seat: 1, instance_id: "P028-copy", definition_id: "P028-def", base: 20, bonus: 0, score: 20, counted: 10, highest: 8, auto_played: false, parts: null },
      { user_id: FRIEND, seat: 2, instance_id: "P020-copy", definition_id: "P020-def", base: 12, bonus: 0, score: 12, counted: 12, highest: 6, auto_played: true, parts: null },
    ],
  };
}

function scene(name: string): { view: RaidView; revealing: number | null } {
  const now = Date.now();
  const at = (seconds: number) => new Date(now + seconds * 1000).toISOString();
  const base: RaidView = {
    id: "00000000-0000-4000-8000-000000000000",
    code: "H4NT3R",
    status: "active",
    players: 2,
    max_players: 4,
    current_round: 1,
    magnitude: 3,
    forza_percent: 100,
    vita_percent: 85,
    vita: 24,
    vita_max: 24,
    defenses: 3,
    defenses_max: 3,
    server_now: new Date(now).toISOString(),
    me: ME,
    host: ME,
    all_ready: false,
    boss: {
      code: "B03",
      name: "La Mente Madre",
      flavor: "Mezza città sogna la stessa cosa da tre notti. Stanotte il sogno ha cominciato a dare ordini.",
      scene: "mind:shadow",
      district: "alti",
      moves: ["target", "armor", "exposed"],
      first_win_coins: 60,
      win_xp: 30,
      beaten: false,
      stars: ["quick"],
      star_rarities: ["delta", "gamma"],
      quick_round: 4,
      star_coins: 20,
    },
    members: [member(ME, 1, "Albi", MINE), member(FRIEND, 2, "Marta", FRIENDS)],
    rounds: rounds(2, 1),
  };
  switch (name) {
    case "attesa":
      return {
        view: {
          ...base,
          status: "lobby",
          current_round: 0,
          vita: null,
          players: 3,
          members: [member(ME, 1, "Albi", MINE, { ready: true }), member(FRIEND, 2, "Marta", FRIENDS, { squad: null }), ally(3, "Reggente Valli")],
          rounds: rounds(2, 0).map((r) => ({ ...r, move: null })),
        },
        revealing: null,
      };
    case "quattro": {
      const r = rounds(4, 3, [null, null, null, "exposed", "armor"]);
      return {
        view: {
          ...base,
          players: 4,
          current_round: 3,
          vita: 31,
          vita_max: 52,
          defenses: 2,
          members: [
            member(ME, 1, "Albi", MINE, { used: ["P055-copy", "P028-copy"] }),
            member(FRIEND, 2, "Marta", FRIENDS, { used: ["P053-copy", "P020-copy"], placement: "P101-copy", ready: true, signal: "push", signal_at: new Date(now).toISOString() }),
            ally(3, "Reggente Valli"),
            ally(4, "Reggente Bruni"),
          ],
          rounds: r.map((round, i) =>
            i < 2
              ? { ...round, resolved: true, result: { total: 90, effective_attack: 73, required: 73, held: true, cancelled: false, damage: 10, defenses_lost: 0, healed: 0, vita: 31, defenses: 2 }, plays: [] }
              : i === 2
                ? {
                    ...round,
                    move: "hostile_ground",
                    modifier: { code: "hostile_ground", favored: "heroes", hindered: "villains", bonus: 3, malus: 2 },
                    deadline_at: at(24),
                  }
                : round,
          ),
        },
        revealing: null,
      };
    }
    case "risultato": {
      const r = rounds(2, 2);
      return {
        view: {
          ...base,
          current_round: 2,
          vita: 19,
          members: [member(ME, 1, "Albi", MINE, { used: ["P055-copy"] }), member(FRIEND, 2, "Marta", FRIENDS, { used: ["P053-copy"] })],
          rounds: r.map((round, i) => (i === 0 ? roundOne(round) : i === 1 ? { ...round, deadline_at: at(40) } : round)),
        },
        revealing: 1,
      };
    }
    case "colpo": {
      const r = rounds(2, 3);
      return {
        view: {
          ...base,
          current_round: 3,
          vita: 19,
          defenses: 2,
          members: [
            member(ME, 1, "Albi", MINE, { used: ["P055-copy", "P028-copy"] }),
            member(FRIEND, 2, "Marta", FRIENDS, { used: ["P053-copy", "P020-copy"] }),
          ],
          rounds: r.map((round, i) => (i === 0 ? roundOne(round) : i === 1 ? roundTwo(round) : i === 2 ? { ...round, deadline_at: at(40) } : round)),
        },
        revealing: 2,
      };
    }
    case "vinta":
    case "persa": {
      const won = name === "vinta";
      const r = rounds(2, 3);
      return {
        view: {
          ...base,
          status: won ? "won" : "lost",
          current_round: 3,
          boss: { ...base.boss, weekly: true, weekly_coins: 60 },
          vita: won ? 0 : 19,
          defenses: won ? 2 : 0,
          members: [
            member(ME, 1, "Albi", MINE, {
              used: ["P055-copy", "P028-copy", "P043-copy"],
              xp: won ? 30 : 10,
              coins: won ? 60 : 0,
              stars: won ? ["flawless", "quick", "squad"] : null,
              star_coins: won ? 40 : null,
              weekly_coins: won ? 60 : null,
              community: won,
            }),
            member(FRIEND, 2, "Marta", FRIENDS, { used: ["P053-copy", "P020-copy", "P101-copy"], xp: won ? 30 : 10, coins: won ? 60 : 0 }),
          ],
          rounds: r.map((round, i) =>
            i === 0
              ? roundOne(round)
              : i === 1
                ? roundTwo(round)
                : i === 2
                  ? {
                      ...roundTwo(round),
                      round: 3,
                      result: won
                        ? { total: 75, effective_attack: 56, required: 56, held: true, cancelled: false, damage: 19, defenses_lost: 0, healed: 0, vita: 0, defenses: 2 }
                        : { total: 30, effective_attack: 56, required: 56, held: false, cancelled: false, damage: 0, defenses_lost: 2, healed: 0, vita: 19, defenses: 0 },
                    }
                  : round,
          ),
        },
        revealing: null,
      };
    }
    default:
      // Round 2 under Bersaglio: the friend has put a card and is ready, the player not yet.
      return {
        view: {
          ...base,
          current_round: 2,
          vita: 19,
          members: [
            member(ME, 1, "Albi", MINE, { used: ["P055-copy"] }),
            member(FRIEND, 2, "Marta", FRIENDS, { used: ["P053-copy"], placement: "P020-copy", ready: true, signal: "hold", signal_at: new Date(now).toISOString() }),
          ],
          rounds: rounds(2, 2).map((round, i) => (i === 0 ? roundOne(round) : i === 1 ? { ...round, deadline_at: at(24) } : round)),
        },
        revealing: null,
      };
  }
}

export default function RaidProofPage() {
  return (
    <Suspense>
      <RaidProof />
    </Suspense>
  );
}

/** Made-up data for the editor: two Bosses, a handful of threats. */
const ADMIN: BossAdmin = {
  bosses: [
    {
      code: "B03", name: "La Mente Madre", flavor: "Mezza città sogna la stessa cosa da tre notti.", scene: "mind:shadow", gm_active: true,
      fronts: ["T104", "T209", "T305", "T406", "T505"], raid_active: true, raid_district: "alti", raid_magnitude: 3,
      raid_moves: ["target", "armor", "exposed", "underdogs", "focus"], raid_vita_percent: 120, raid_star_rarities: ["delta", "gamma"],
      gm_matches: 41, gm_in_play: false, raid_results: { "2": { rooms: 12, wins: 7 }, "3": { rooms: 4, wins: 2 } }, raid_in_play: true, in_use: true,
    },
    {
      code: "B07", name: "Il Leviatano", flavor: "Il porto si svuota in una notte: qualcosa beve il mare.", scene: "port:golem", gm_active: false,
      fronts: ["T104", "T209", "T305", "T406", "T505"], raid_active: false, raid_district: "porto", raid_magnitude: 4,
      raid_moves: ["heavy"], raid_vita_percent: 100, raid_star_rarities: ["delta"],
      gm_matches: 0, gm_in_play: false, raid_results: {}, raid_in_play: false, in_use: false,
    },
  ],
  threats: [
    { code: "T104", name: "Scippatore", level: 1, abilities: ["VEL"], district: "popolari" },
    { code: "T209", name: "Robot impazzito", level: 2, abilities: ["FOR", "TEC"], district: "alti" },
    { code: "T305", name: "Rapina al treno blindato", level: 3, abilities: ["FOR", "VEL", "COM"], district: "alti" },
    { code: "T406", name: "Rivolta in carcere", level: 4, abilities: ["COM", "VOL", "FOR", "PER"], district: "alti" },
    { code: "T505", name: "Guerra tra bande", level: 5, abilities: ["COM", "FOR", "VEL", "FUR", "PER"], district: "alti" },
  ],
  rarities: RARITY.slice(1).map((code) => ({ code, name: code[0].toUpperCase() + code.slice(1) })),
  magnitudes: [92, 96, 100, 104, 108].map((forza, i) => ({ magnitude: i + 1, forza_percent: forza, reward_percent: [50, 75, 100, 150, 250][i] })),
  levels: { one_at_most: 2, one_at_least: 5, min_sum: 14, max_sum: 20 },
  weeks: [
    { week: "2026-11-23", boss: "B03", chosen: false },
    { week: "2026-11-30", boss: "B03", chosen: true },
    { week: "2026-12-07", boss: "B03", chosen: false },
    { week: "2026-12-14", boss: "B03", chosen: false },
  ],
  events: [
    {
      id: "e1", title: "La notte dei Boss", starts_at: "2026-11-20T08:00:00Z", ends_at: "2026-11-27T22:00:00Z", started: true,
      community: { vita: 5000, coins: 100, packs: 1, shards: 0, damage: 3120, fallen: false, rewarded: 0 },
    },
    { id: "e2", title: "Caccia d'inverno", starts_at: "2026-12-04T08:00:00Z", ends_at: "2026-12-11T22:00:00Z", started: false, community: null },
  ],
};

function RaidProof() {
  const name = useSearchParams().get("s") ?? "round";
  if (name === "editor") return <BossAdminView initial={ADMIN} />;
  return <RaidScene name={name} />;
}

function RaidScene({ name }: { name: string }) {
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
        <RaidRoomScreen
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
