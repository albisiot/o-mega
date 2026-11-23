// The editor of the Bosses (SPEC §5.18), admins only, shared by the Grande Minaccia (its five
// fronts) and the Caccia grossa (district, Magnitude, moves, Life, the star's rarities). Every
// function checks the admin on the server and every save is checked again there.
import type { RaidMove } from "@o-mega/game-engine";
import { getSupabase } from "@/lib/supabase/client";

export type BossAdminBoss = {
  code: string;
  name: string;
  flavor: string;
  /** The diorama: "environment:actor" of src/lib/threat-scene.ts. */
  scene: string;
  /** On in the Grande Minaccia. */
  gm_active: boolean;
  /** Five threat codes, by slot. */
  fronts: string[];
  /** On in the Caccia grossa. */
  raid_active: boolean;
  raid_district: string | null;
  raid_magnitude: number | null;
  raid_moves: RaidMove[];
  raid_vita_percent: number;
  raid_star_rarities: string[];
  /** What the server knows: Grande Minaccia matches, hunts finished by players, whether one is open. */
  gm_matches: number;
  gm_in_play: boolean;
  raid_results: Record<string, { rooms: number; wins: number }>;
  raid_in_play: boolean;
  in_use: boolean;
};

export type BossAdminThreat = { code: string; name: string; level: number; abilities: string[]; district: string | null };

/** A week of the Caccia grossa (its Monday) and its Boss: from the rotation, or chosen by an admin. */
export type BossAdminWeek = { week: string; boss: string | null; chosen: boolean };

/** An event to come or running, with its community Boss if it has one. */
export type BossAdminEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  /** Started: its community Boss no longer changes. */
  started: boolean;
  community: { vita: number; coins: number; packs: number; shards: number; damage: number; fallen: boolean; rewarded: number } | null;
};

export type BossAdmin = {
  bosses: BossAdminBoss[];
  /** The threats a Boss may use as fronts: the usual ones of Nuova Megara. */
  threats: BossAdminThreat[];
  rarities: { code: string; name: string }[];
  magnitudes: { magnitude: number; forza_percent: number; reward_percent: number }[];
  /** The level rules of the fronts (SPEC §5.4). */
  levels: { one_at_most: number; one_at_least: number; min_sum: number; max_sum: number };
  /** This week and the next three. */
  weeks: BossAdminWeek[];
  events: BossAdminEvent[];
};

/** What the form edits: a Boss without what only the server knows. */
export type BossDraft = Omit<BossAdminBoss, "code" | "gm_matches" | "gm_in_play" | "raid_results" | "raid_in_play" | "in_use"> & {
  code: string | null;
};

/** The wins each Magnitude aims at with a good squad (SPEC §5.18, the simulator), in hundredths. */
export const MAGNITUDE_TARGETS: Record<number, number> = { 1: 80, 2: 65, 3: 50, 4: 35, 5: 20 };

type AdminFunction = "admin_get_bosses" | "admin_save_boss" | "admin_delete_boss" | "admin_set_raid_week" | "admin_set_raid_community";

async function rpc(name: AdminFunction, params?: Record<string, unknown>): Promise<BossAdmin> {
  const { data, error } = await getSupabase().rpc(name as never, params as never);
  if (error) throw new Error((error as { message: string }).message);
  return data as unknown as BossAdmin;
}

export function fetchBossAdmin(): Promise<BossAdmin> {
  return rpc("admin_get_bosses");
}

export function saveBoss(draft: BossDraft): Promise<BossAdmin> {
  return rpc("admin_save_boss", { p_boss: draft });
}

export function deleteBoss(code: string): Promise<BossAdmin> {
  return rpc("admin_delete_boss", { p_code: code });
}

/** The Boss of a week (its Monday, "YYYY-MM-DD"), in place of the rotation. */
export function setRaidWeek(week: string, boss: string): Promise<BossAdmin> {
  return rpc("admin_set_raid_week", { p_week: week, p_boss: boss });
}

/** An event's community Boss: its Life and the reward to whoever took part; null Life takes it away. */
export function setRaidCommunity(
  event: string,
  community: { vita: number; coins: number; packs: number; shards: number } | null,
): Promise<BossAdmin> {
  return rpc("admin_set_raid_community", {
    p_event: event,
    p_vita: community?.vita ?? null,
    p_coins: community?.coins ?? 0,
    p_packs: community?.packs ?? 0,
    p_shards: community?.shards ?? 0,
  });
}

export function bossDraft(boss: BossAdminBoss): BossDraft {
  return {
    code: boss.code,
    name: boss.name,
    flavor: boss.flavor,
    scene: boss.scene,
    gm_active: boss.gm_active,
    fronts: [...boss.fronts],
    raid_active: boss.raid_active,
    raid_district: boss.raid_district,
    raid_magnitude: boss.raid_magnitude,
    raid_moves: [...boss.raid_moves],
    raid_vita_percent: boss.raid_vita_percent,
    raid_star_rarities: [...boss.raid_star_rarities],
  };
}

/** A new Boss: off in both modes, with the fronts of the first one as a start. */
export function newBossDraft(data: BossAdmin): BossDraft {
  const model = data.bosses[0];
  return {
    code: null,
    name: "",
    flavor: "",
    scene: model?.scene ?? "city",
    gm_active: false,
    fronts: model ? [...model.fronts] : data.threats.slice(0, 5).map((t) => t.code),
    raid_active: false,
    raid_district: model?.raid_district ?? "porto",
    raid_magnitude: 3,
    raid_moves: ["armor", "exposed"],
    raid_vita_percent: 100,
    raid_star_rarities: ["delta", "gamma"],
  };
}

/** What is wrong with a draft before it goes to the server (which checks it all again); null if nothing. */
export function bossProblem(draft: BossDraft, data: BossAdmin): string | null {
  const between = (text: string, min: number, max: number) => text.trim().length >= min && text.trim().length <= max;
  if (!between(draft.name, 2, 60)) return "Il nome va da 2 a 60 caratteri.";
  if (!between(draft.flavor, 10, 400)) return "Il testo va da 10 a 400 caratteri.";
  if (!/^[a-z]+(:[a-z]+)?$/.test(draft.scene)) return "Scegli l'ambiente (e la figura) della scena.";
  const fronts = draft.fronts.map((code) => data.threats.find((t) => t.code === code));
  if (fronts.length !== 5 || fronts.some((t) => !t) || new Set(draft.fronts).size !== 5) return "I fronti sono 5 Minacce diverse.";
  const levels = fronts.map((t) => t!.level);
  const sum = levels.reduce((a, b) => a + b, 0);
  if (Math.min(...levels) > data.levels.one_at_most || Math.max(...levels) < data.levels.one_at_least || sum < data.levels.min_sum || sum > data.levels.max_sum) {
    return `I livelli dei fronti: almeno uno fino a ${data.levels.one_at_most}, almeno uno da ${data.levels.one_at_least}, somma da ${data.levels.min_sum} a ${data.levels.max_sum} (ora ${sum}).`;
  }
  if (draft.raid_active && (!draft.raid_district || !draft.raid_magnitude)) return "Per la Caccia grossa servono il quartiere e la Magnitudo.";
  if (draft.raid_vita_percent < 10 || draft.raid_vita_percent > 1000) return "La Vita propria va dal 10% al 1000%.";
  if (draft.raid_star_rarities.length === 0) return "La stella Squadra chiede almeno una rarità.";
  return null;
}
