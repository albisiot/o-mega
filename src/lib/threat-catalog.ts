// The threat catalog as players (Bestiario) and admins (/gestione-minacce) see it (SPEC §5.15).

import type { ThreatModifier } from "@o-mega/game-engine";
import { getSupabase } from "@/lib/supabase/client";
import type { ThreatRarity } from "@/lib/threat-rarity";

/** Where a threat happens: Nuova Megara or one of the places beyond it. */
export const REGION_LABELS: Record<string, string> = {
  megara: "Nuova Megara",
  giza: "Giza",
  yucatan: "Yucatán",
  atlantis: "Atlantide",
  arctic: "Artico",
  japan: "Giappone",
};

export type BestiaryThreat = {
  code: string;
  region: string;
  /** null: Livello ignoto, a different number of abilities every time. */
  level: number | null;
  rarity_code: string | null;
  seen: boolean;
  times: number;
  first_seen_at: string | null;
  /** Only once met: a threat never met is a silhouette. */
  name: string | null;
  flavor: string | null;
  abilities: string[] | null;
  modifier: ThreatModifier | null;
};

export type Bestiary = { rarities: ThreatRarity[]; threats: BestiaryThreat[] };

export async function fetchBestiary(): Promise<Bestiary> {
  const { data, error } = await getSupabase().rpc("get_bestiary");
  if (error) throw error;
  return data as unknown as Bestiary;
}

/** The Bestiario's sections: Nuova Megara, the places, then one per rarity tier. */
export function bestiarySections(bestiary: Bestiary): { key: string; title: string; rarity: ThreatRarity | null; threats: BestiaryThreat[] }[] {
  const usual = bestiary.threats.filter((t) => !t.rarity_code);
  const regions = [...new Set(usual.map((t) => t.region))];
  return [
    ...regions.map((region) => ({
      key: region,
      title: REGION_LABELS[region] ?? region,
      rarity: null,
      threats: usual.filter((t) => t.region === region),
    })),
    ...[...bestiary.rarities]
      .sort((a, b) => a.rank - b.rank)
      .map((rarity) => ({
        key: rarity.code,
        title: `Minacce ${rarity.name === "Unica" ? "Uniche" : pluralTier(rarity.name)}`,
        rarity,
        threats: bestiary.threats.filter((t) => t.rarity_code === rarity.code),
      }))
      .filter((section) => section.threats.length > 0),
  ];
}

/** "Rara" → "Rare", "Epica" → "Epiche", "Leggendaria" → "Leggendarie", "Mitica" → "Mitiche". */
export function pluralTier(name: string): string {
  if (name.endsWith("ca")) return `${name.slice(0, -2)}che`;
  if (name.endsWith("a")) return `${name.slice(0, -1)}e`;
  return name;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type AdminThreat = {
  code: string;
  name: string;
  flavor: string;
  level: number;
  region: string;
  abilities: string[];
  modifier_code: string | null;
  modifier_params: Record<string, unknown>;
  rarity_code: string | null;
  emergency_target: number | null;
  is_active: boolean;
  /** Players who have met it. */
  seen_by: number;
};

export type AdminThreats = { rarities: (ThreatRarity & { threats: number })[]; threats: AdminThreat[] };

/** The rules an admin can give a threat, and the parameters each one needs. */
export const RULE_OPTIONS: { code: string; name: string; params?: "abilities" | "factions" | "count" | "cap" | "min" }[] = [
  { code: "", name: "Nessuna regola" },
  { code: "focus", name: "Colpo mirato" },
  { code: "weak_link", name: "Anello debole" },
  { code: "hostile_ground", name: "Territorio ostile", params: "factions" },
  { code: "underdogs", name: "Sottovalutati" },
  { code: "tomb_silence", name: "Silenzio della tomba" },
  { code: "long_count", name: "Il conto lungo" },
  { code: "abyss", name: "Abissi", params: "abilities" },
  { code: "frost", name: "Gelo", params: "cap" },
  { code: "duel", name: "Duello", params: "count" },
  { code: "mirror", name: "Specchio" },
  { code: "reverse", name: "Rovescio" },
  { code: "all_or_nothing", name: "Tutto o niente" },
  { code: "last_first", name: "Ultimi i primi" },
  { code: "price", name: "Il prezzo" },
  { code: "one_force", name: "Una sola forza", params: "abilities" },
  { code: "blind", name: "Al buio" },
  { code: "echo", name: "Eco" },
  { code: "count", name: "Il conteggio" },
  { code: "unknown_level", name: "Livello ignoto", params: "min" },
  { code: "negative", name: "Negativo" },
];

/**
 * Al buio and Livello ignoto draw their abilities from the threat's list: a threat
 * whose list is exactly its level has nothing to draw from. Returns a problem, or null.
 */
export function ruleProblem(threat: Pick<AdminThreat, "level" | "abilities">, code: string, params: Record<string, unknown>): string | null {
  const rule = RULE_OPTIONS.find((r) => r.code === code);
  if (!rule) return "Regola sconosciuta.";
  if ((code === "blind" || code === "unknown_level") && threat.abilities.length <= threat.level) {
    return "Al buio e Livello ignoto servono a Minacce con una lista di abilità più lunga del livello.";
  }
  if (code !== "blind" && code !== "unknown_level" && threat.abilities.length !== threat.level) {
    return "Questa Minaccia estrae le abilità da una lista: tienile Al buio o Livello ignoto.";
  }
  if (rule.params === "abilities" && (!Array.isArray(params.abilities) || params.abilities.length === 0)) {
    return "Scegli almeno un'abilità per la regola.";
  }
  if (rule.params === "factions" && (!params.favored || !params.hindered || params.favored === params.hindered)) {
    return "Scegli due fazioni diverse: una favorita e una sfavorita.";
  }
  return null;
}

export async function fetchAdminThreats(): Promise<AdminThreats> {
  const { data, error } = await getSupabase().rpc("admin_list_threats");
  if (error) throw error;
  return data as unknown as AdminThreats;
}

export async function saveThreat(threat: AdminThreat): Promise<void> {
  const { error } = await getSupabase().rpc("admin_update_threat", {
    p_code: threat.code,
    p_name: threat.name,
    p_flavor: threat.flavor,
    p_modifier_code: threat.modifier_code ?? "",
    p_modifier_params: threat.modifier_params as never,
    p_rarity_code: threat.rarity_code ?? "",
    p_emergency_target: threat.emergency_target as number,
    p_is_active: threat.is_active,
  });
  if (error) throw error;
}

export async function saveThreatRarity(rarity: Pick<ThreatRarity, "code" | "name" | "color" | "one_in">): Promise<void> {
  const { error } = await getSupabase().rpc("admin_update_threat_rarity", {
    p_code: rarity.code,
    p_name: rarity.name,
    p_color: rarity.color,
    p_one_in: rarity.one_in,
  });
  if (error) throw error;
}
