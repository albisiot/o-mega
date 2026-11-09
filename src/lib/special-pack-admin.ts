import { balance } from "@/config/balance";
import { toRomeInput } from "@/lib/events";
import type { PackColor } from "@/lib/pack-colors";
import { getSupabase } from "@/lib/supabase/client";

export type OddsMode = "rarity" | "card";

export type AdminRarity = { code: string; name: string; rank: number; color: string };

export type AdminPackCard = {
  code: string;
  name: string;
  rarity_code: string;
  art_url: string | null;
  has_variants: boolean;
};

export type AdminSpecialPack = {
  id: string;
  version: number;
  name: string;
  description: string;
  color: PackColor;
  price: number;
  cards_per_pack: number;
  guaranteed_min_rarity_rank: number | null;
  variant_chance_percent: number;
  odds_mode: OddsMode;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  /** On sale right now: active, inside its dates, with cards to draw. */
  is_open: boolean;
  openings: number;
  /** percent only in "card" mode. */
  cards: { code: string; percent: number | null }[];
  rarities: { code: string; percent: number }[];
};

export type AdminSpecialPacks = {
  now: string;
  max_cards_per_pack: number;
  rarities: AdminRarity[];
  /** Every card a special pack can hold (never level cards), least rare first. */
  cards: AdminPackCard[];
  packs: AdminSpecialPack[];
};

/** The form as typed: numbers stay text until saved, so "12," can be typed on the way to "12,5". */
export type SpecialPackDraft = {
  /** Set when changing an existing pack. */
  id?: string;
  name: string;
  description: string;
  color: PackColor;
  price: string;
  cardsPerPack: string;
  variantChance: string;
  /** Null: no guaranteed card. */
  guarantee: number | null;
  mode: OddsMode;
  cardCodes: string[];
  /** By card code, "card" mode. */
  cardPercents: Record<string, string>;
  /** By rarity code, "rarity" mode. */
  rarityPercents: Record<string, string>;
  /** datetime-local values in Rome time, or "" for none. */
  startsAt: string;
  endsAt: string;
};

export async function fetchAdminSpecialPacks(): Promise<AdminSpecialPacks> {
  const { data, error } = await getSupabase().rpc("admin_list_special_packs");
  if (error) throw error;
  return data as unknown as AdminSpecialPacks;
}

export async function saveSpecialPack(draft: SpecialPackDraft, data: AdminSpecialPacks): Promise<AdminSpecialPacks> {
  const chosen = chosenCards(draft, data.cards);
  const { data: next, error } = await getSupabase().rpc("admin_save_special_pack", {
    p_id: draft.id,
    p_name: draft.name,
    p_description: draft.description,
    p_color: draft.color,
    p_price: toInteger(draft.price) ?? 0,
    p_cards_per_pack: toInteger(draft.cardsPerPack) ?? 0,
    p_variant_chance_percent: toInteger(draft.variantChance) ?? -1,
    p_odds_mode: draft.mode,
    p_cards: chosen.map((card) => ({
      code: card.code,
      ...(draft.mode === "card" ? { percent: hundredthsToNumber(parsePercent(draft.cardPercents[card.code] ?? "")) } : {}),
    })),
    p_rarities:
      draft.mode === "rarity"
        ? draftRarities(draft, data).map((rarity) => ({
            code: rarity.code,
            percent: hundredthsToNumber(parsePercent(draft.rarityPercents[rarity.code] ?? "")),
          }))
        : [],
    p_guaranteed_min_rarity_rank: draft.guarantee ?? undefined,
    p_starts_at: draft.startsAt || undefined,
    p_ends_at: draft.endsAt || undefined,
  });
  if (error) throw error;
  return next as unknown as AdminSpecialPacks;
}

export async function setSpecialPackActive(id: string, active: boolean): Promise<AdminSpecialPacks> {
  const { data, error } = await getSupabase().rpc("admin_set_special_pack_active", { p_id: id, p_active: active });
  if (error) throw error;
  return data as unknown as AdminSpecialPacks;
}

export async function deleteSpecialPack(id: string): Promise<AdminSpecialPacks> {
  const { data, error } = await getSupabase().rpc("admin_delete_special_pack", { p_id: id });
  if (error) throw error;
  return data as unknown as AdminSpecialPacks;
}

// ---------------------------------------------------------------------------
// Pure helpers (tested): percentages are handled in hundredths of a percent,
// whole numbers, so 33,33 + 33,33 + 33,34 is exactly 100 with no rounding.
// ---------------------------------------------------------------------------

export const FULL = 10_000;

/** "12", "12,5" or "12.50" as hundredths (1250); null if not a number from 0 to 100 with at most two decimals. */
export function parsePercent(text: string): number | null {
  const match = /^\s*(\d{1,3})(?:[.,](\d{0,2}))?\s*$/.exec(text);
  if (!match) return null;
  const value = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return value <= FULL ? value : null;
}

/** 1250 as "12,5", the way the fields show it. */
export function formatHundredths(value: number): string {
  const whole = Math.floor(value / 100);
  const decimals = String(value % 100).padStart(2, "0").replace(/0+$/, "");
  return decimals ? `${whole},${decimals}` : String(whole);
}

function hundredthsToNumber(value: number | null): number | null {
  return value === null ? null : value / 100;
}

/** "150" as 150; null if not a whole number. */
function toInteger(text: string): number | null {
  return /^\s*\d+\s*$/.test(text) ? Number(text) : null;
}

/** 100% in `count` parts of two decimals that add up exactly: 3 → 33,34 + 33,33 + 33,33. */
export function splitEvenly(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(FULL / count);
  const extra = FULL - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < extra ? 1 : 0));
}

/** The chosen cards that still exist, least rare first, as the catalog orders them. */
export function chosenCards(draft: Pick<SpecialPackDraft, "cardCodes">, cards: AdminPackCard[]): AdminPackCard[] {
  const chosen = new Set(draft.cardCodes);
  return cards.filter((card) => chosen.has(card.code));
}

/** The rarities of the chosen cards, by rank: in "rarity" mode each needs its percentage. */
export function draftRarities(
  draft: Pick<SpecialPackDraft, "cardCodes">,
  data: Pick<AdminSpecialPacks, "cards" | "rarities">,
): AdminRarity[] {
  const used = new Set(chosenCards(draft, data.cards).map((card) => card.rarity_code));
  return data.rarities.filter((rarity) => used.has(rarity.code));
}

/** What the odds fields add up to, in hundredths, and whether each of them is a valid positive percentage. */
export function oddsTotal(
  draft: Pick<SpecialPackDraft, "mode" | "cardCodes" | "cardPercents" | "rarityPercents">,
  data: Pick<AdminSpecialPacks, "cards" | "rarities">,
): { total: number; allValid: boolean } {
  const values =
    draft.mode === "card"
      ? chosenCards(draft, data.cards).map((card) => parsePercent(draft.cardPercents[card.code] ?? ""))
      : draftRarities(draft, data).map((rarity) => parsePercent(draft.rarityPercents[rarity.code] ?? ""));
  return {
    total: values.reduce<number>((sum, value) => sum + (value ?? 0), 0),
    allValid: values.length > 0 && values.every((value) => value !== null && value > 0),
  };
}

/**
 * The chance of each card and of each rarity for one card of the pack, from 0 to 1, as the server will draw them
 * once the fields add up to 100%: in "rarity" mode the cards of a rarity share its percentage equally.
 */
export function realOdds(
  draft: Pick<SpecialPackDraft, "mode" | "cardCodes" | "cardPercents" | "rarityPercents">,
  data: Pick<AdminSpecialPacks, "cards" | "rarities">,
): { cards: Map<string, number>; rarities: Map<string, number> } {
  const chosen = chosenCards(draft, data.cards);
  const cards = new Map<string, number>();
  const rarities = new Map<string, number>();
  for (const card of chosen) {
    let probability: number;
    if (draft.mode === "card") {
      probability = (parsePercent(draft.cardPercents[card.code] ?? "") ?? 0) / FULL;
    } else {
      const sharing = chosen.filter((other) => other.rarity_code === card.rarity_code).length;
      probability = (parsePercent(draft.rarityPercents[card.rarity_code] ?? "") ?? 0) / FULL / sharing;
    }
    cards.set(card.code, probability);
    rarities.set(card.rarity_code, (rarities.get(card.rarity_code) ?? 0) + probability);
  }
  return { cards, rarities };
}

const percentText = (value: number) => `${formatHundredths(value)}%`;

/** What stops the pack from being saved, in Italian, or null. The server checks the same things again. */
export function draftProblem(draft: SpecialPackDraft, data: AdminSpecialPacks, now: number): string | null {
  const name = draft.name.trim();
  if (name.length < 3 || name.length > 40) return "Il nome deve avere da 3 a 40 caratteri.";
  if (draft.description.trim().length > 200) return "La descrizione può avere al massimo 200 caratteri.";
  const price = toInteger(draft.price);
  if (price === null || price < 1 || price > 100_000) return "Il prezzo va da 1 a 100000 monete.";
  const size = toInteger(draft.cardsPerPack);
  if (size === null || size < 1 || size > data.max_cards_per_pack) {
    return `Un pacchetto ha da 1 a ${data.max_cards_per_pack} carte.`;
  }
  const variant = toInteger(draft.variantChance);
  if (variant === null || variant > 100) return "La probabilità delle varianti va da 0 a 100%.";
  if (draft.startsAt && draft.endsAt && draft.endsAt <= draft.startsAt) return "La fine deve venire dopo l'inizio.";
  if (draft.endsAt && draft.endsAt <= toRomeInput(now)) return "La fine non può essere già passata.";

  const chosen = chosenCards(draft, data.cards);
  if (chosen.length === 0) return "Scegli almeno una carta.";

  const { total, allValid } = oddsTotal(draft, data);
  if (!allValid) {
    return draft.mode === "card"
      ? "Ogni carta deve avere una percentuale maggiore di 0, con al massimo due decimali."
      : "Ogni rarità deve avere una percentuale maggiore di 0, con al massimo due decimali.";
  }
  if (total !== FULL) return `Le percentuali fanno ${percentText(total)}: devono fare 100%.`;

  if (draft.guarantee !== null) {
    if (size < 2) return "La carta garantita serve solo con almeno 2 carte per pacchetto.";
    const rarity = data.rarities.find((entry) => entry.rank === draft.guarantee);
    const ranks = new Map(data.rarities.map((entry) => [entry.code, entry.rank]));
    if (!rarity || !chosen.some((card) => (ranks.get(card.rarity_code) ?? 0) >= rarity.rank)) {
      return `Nessuna carta scelta è ${rarity?.name ?? "di quella rarità"} o più rara: cambia la carta garantita.`;
    }
  }
  return null;
}

/** A new pack with the standard pack's numbers. */
export function emptyDraft(): SpecialPackDraft {
  return {
    name: "",
    description: "",
    color: "magenta",
    price: String(balance.packs.standardPackPrice),
    cardsPerPack: String(balance.packs.cardsPerPack),
    variantChance: String(balance.packs.variantChancePercent),
    guarantee: balance.packs.guaranteedMinRarityRank,
    mode: "rarity",
    cardCodes: [],
    cardPercents: {},
    rarityPercents: {},
    startsAt: "",
    endsAt: "",
  };
}

/** The form for changing a pack, or for a copy of it ("Duplica", saved as a new pack with no dates). */
export function draftFromPack(pack: AdminSpecialPack, copy = false): SpecialPackDraft {
  const percent = (value: number | null) => (value === null ? "" : formatHundredths(Math.round(value * 100)));
  return {
    id: copy ? undefined : pack.id,
    name: copy ? `${pack.name} (copia)`.slice(0, 40) : pack.name,
    description: pack.description,
    color: pack.color,
    price: String(pack.price),
    cardsPerPack: String(pack.cards_per_pack),
    variantChance: String(pack.variant_chance_percent),
    guarantee: pack.guaranteed_min_rarity_rank,
    mode: pack.odds_mode,
    cardCodes: pack.cards.map((card) => card.code),
    cardPercents: Object.fromEntries(pack.cards.map((card) => [card.code, percent(card.percent)])),
    rarityPercents: Object.fromEntries(pack.rarities.map((rarity) => [rarity.code, percent(rarity.percent)])),
    startsAt: copy || !pack.starts_at ? "" : toRomeInput(pack.starts_at),
    endsAt: copy || !pack.ends_at ? "" : toRomeInput(pack.ends_at),
  };
}

/** "In vendita", "Programmato", "Concluso", "Disattivato" or "Senza carte", for the admin list. */
export function specialPackState(pack: AdminSpecialPack, now: number): string {
  if (!pack.is_active) return "Disattivato";
  if (pack.ends_at && Date.parse(pack.ends_at) <= now) return "Concluso";
  if (pack.starts_at && Date.parse(pack.starts_at) > now) return "Programmato";
  return pack.is_open ? "In vendita" : "Senza carte";
}
