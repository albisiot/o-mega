"use client";

// Fixed scenes of the variant rules admins set (SPEC §4.6, §7.1), to look at them without an
// admin account. A development-only page: next.config.ts serves *.dev.tsx pages in `next dev`
// only, so it is never part of the published site. The catalog and the variants are the real
// ones (both public); packs, events and balances are made up, and nothing can be saved.
//   /prova-editor-varianti/?s=pacchetto     the special pack editor, with a pack of only Neon variants
//   /prova-editor-varianti/?s=negozio       the shop: that pack, and the standard pack during a variant hunt
//   /prova-editor-varianti/?s=evento        an event page with a variant hunt at 15%
//   /prova-editor-varianti/?s=evento-admin  the event editor
//   /prova-editor-varianti/?s=codice        the bonus code editor, with a code of random variants
//   /prova-editor-varianti/?s=obiettivo     the daily objectives editor
//   /prova-editor-varianti/?s=impresa       the imprese editor

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AchievementAdmin } from "@/components/achievement-admin";
import { BonusCodeAdmin } from "@/components/bonus-code-admin";
import { EventAdmin } from "@/components/event-admin";
import { ObjectiveAdmin } from "@/components/objective-admin";
import { EventDetails } from "@/components/event-details";
import { ShopView } from "@/components/shop-view";
import { SpecialPackAdmin } from "@/components/special-pack-admin";
import type { AdminAchievements } from "@/lib/achievement-admin";
import type { AdminBonusCodes } from "@/lib/bonus-code-admin";
import { fetchCatalog, type CatalogCard } from "@/lib/collection";
import { DEFAULT_EVENT_POINTS, type AdminEvents } from "@/lib/event-admin";
import type { GameEvent } from "@/lib/events";
import type { PackOdds, PackStatus, SpecialPack } from "@/lib/packs";
import type { AdminObjectives } from "@/lib/objective-admin";
import type { AdminSpecialPacks } from "@/lib/special-pack-admin";
import { getSupabase } from "@/lib/supabase/client";

const RARITIES = [
  { code: "delta", name: "Delta", rank: 1, color: "#9aa5b1" },
  { code: "gamma", name: "Gamma", rank: 2, color: "#4fc3a1" },
  { code: "beta", name: "Beta", rank: 3, color: "#4f8fe0" },
  { code: "alfa", name: "Alfa", rank: 4, color: "#b06ad9" },
  { code: "omega", name: "Omega", rank: 5, color: "#e8a23a" },
];

type VariantRow = { definition_id: string; style: string; style_name: string };
type Loaded = { catalog: CatalogCard[]; variants: VariantRow[] };

async function load(): Promise<Loaded> {
  const [catalog, variants] = await Promise.all([
    fetchCatalog(),
    getSupabase().from("card_variants").select("definition_id, style, style_name").eq("is_active", true),
  ]);
  if (variants.error) throw variants.error;
  return { catalog: catalog.filter((card) => card.unlockLevel === null), variants: variants.data as VariantRow[] };
}

const stylesOf = (data: Loaded, card: CatalogCard) =>
  data.variants.filter((v) => v.definition_id === card.id).map((v) => v.style).sort();

/** The pack every scene shows: 5 cards, only Neon variants, new ones first. */
function neonCards(data: Loaded): CatalogCard[] {
  return data.catalog.filter((card) => stylesOf(data, card).includes("neon")).slice(0, 8);
}

function packAdmin(data: Loaded): AdminSpecialPacks {
  const styles = new Map<string, { name: string; characters: Set<string> }>();
  for (const v of data.variants) {
    const entry = styles.get(v.style) ?? { name: v.style_name, characters: new Set<string>() };
    entry.characters.add(v.definition_id);
    styles.set(v.style, entry);
  }
  const neon = neonCards(data);
  return {
    now: new Date().toISOString(),
    max_cards_per_pack: 10,
    rarities: RARITIES,
    variant_styles: [...styles]
      .map(([style, entry]) => ({ style, name: entry.name, characters: entry.characters.size }))
      .sort((a, b) => a.name.localeCompare(b.name, "it")),
    cards: [...data.catalog]
      .sort((a, b) => a.rarity.rank - b.rarity.rank || a.name.localeCompare(b.name))
      .map((card) => ({
        code: card.code,
        name: card.name,
        rarity_code: card.rarity.code,
        art_url: card.art_url ?? null,
        has_variants: stylesOf(data, card).length > 0,
        variant_styles: stylesOf(data, card),
      })),
    packs: [
      {
        id: "pack-neon",
        version: 1,
        name: "Notte al neon",
        description: "Solo varianti Neon, prima quelle che non hai.",
        color: "violet",
        price: 400,
        cards_per_pack: 5,
        guaranteed_min_rarity_rank: null,
        variant_chance_percent: 100,
        variants_only: true,
        variant_styles: ["neon"],
        prefer_new_variants: true,
        odds_mode: "card",
        starts_at: null,
        ends_at: null,
        is_active: true,
        is_open: true,
        openings: 12,
        cards: neon.map((card, index) => ({ code: card.code, percent: index === 0 ? 100 - 12.5 * (neon.length - 1) : 12.5 })),
        rarities: [],
      },
    ],
  };
}

function shopPack(data: Loaded): SpecialPack {
  const neon = neonCards(data);
  return {
    id: "pack-neon",
    version: 1,
    name: "Notte al neon",
    description: "Solo varianti Neon, prima quelle che non hai.",
    color: "violet",
    price: 400,
    cards_per_pack: 5,
    ends_at: null,
    odds_mode: "card",
    guaranteed_min_rarity_rank: null,
    guaranteed_rarity_name: null,
    variant_chance_percent: 100,
    variants_only: true,
    prefer_new_variants: true,
    variant_style_names: ["Neon"],
    characters_with_variants: neon.length,
    odds: [...new Map(neon.map((card) => [card.rarity.code, card.rarity])).values()].map((rarity) => ({
      ...rarity,
      probability: neon.filter((card) => card.rarity.code === rarity.code).length / neon.length,
    })),
    cards: neon.map((card) => ({
      code: card.code,
      name: card.name,
      rarity_code: card.rarity.code,
      art_url: card.art_url ?? null,
      probability: 1 / neon.length,
    })),
  };
}

const STATUS: PackStatus = {
  daily_available: false,
  resets_at: new Date(Date.now() + 5 * 3_600_000).toISOString(),
  coin_balance: 1250,
  standard_pack_price: 150,
} as PackStatus;

const ODDS: PackOdds = {
  cards_per_pack: 5,
  standard_pack_price: 150,
  guaranteed_min_rarity_rank: 3,
  guaranteed_rarity_name: "Beta",
  variant_chance_percent: 15,
  base_variant_chance_percent: 5,
  variant_event: "Settimana delle varianti",
  characters_with_variants: 227,
  odds: RARITIES.map((rarity, index) => ({ ...rarity, probability: [0.55, 0.27, 0.12, 0.05, 0.01][index] })),
};

function eventScene(): GameEvent {
  const now = Date.now();
  return {
    id: "event-1",
    title: "Settimana delle varianti",
    description: "Sette giorni di caccia ai disegni più rari.",
    starts_at: new Date(now - 2 * 86_400_000).toISOString(),
    ends_at: new Date(now + 5 * 86_400_000).toISOString(),
    points: DEFAULT_EVENT_POINTS,
    daily_cap: null,
    quadrant_seal_target: null,
    variant_chance_percent: 15,
    base_variant_chance_percent: 5,
    variant_bonus_percent: 20,
    tiers: [
      { tier: 1, points: 100, coins: 100, packs: 0, cards: [], reached: true, opening_ids: [], seen: true },
      {
        tier: 2,
        points: 300,
        coins: 0,
        packs: 1,
        cards: [],
        random_variants: { count: 2, styles: ["Neon"], rarities: [] },
        reached: false,
        opening_ids: [],
        seen: false,
      },
    ],
    my_points: 140,
    my_points_today: 30,
  } as GameEvent;
}

function eventAdmin(data: Loaded): AdminEvents {
  return {
    now: new Date().toISOString(),
    rarities: RARITIES,
    base_variant_chance_percent: 5,
    quadrant_seal_target: { min: 6, max: 30, suggested: 12 },
    min_admitted_characters: 10,
    events: [],
    cards: data.catalog.map((card) => ({
      code: card.code,
      name: card.name,
      rarity: card.rarity.name,
      rarity_code: card.rarity.code,
      faction: card.faction,
      variants: data.variants
        .filter((v) => v.definition_id === card.id)
        .map((v) => ({ style: v.style, name: v.style_name })),
    })),
  };
}

/** The cards an editor's picker offers, with their variants. */
function rewardCards(data: Loaded) {
  return data.catalog.map((card) => ({
    code: card.code,
    name: card.name,
    rarity: card.rarity.name,
    rarity_code: card.rarity.code,
    faction: card.faction,
    variants: data.variants.filter((v) => v.definition_id === card.id).map((v) => ({ style: v.style, name: v.style_name })),
  }));
}

function styleList(data: Loaded) {
  return [...new Map(data.variants.map((v) => [v.style, v.style_name]))]
    .map(([style, name]) => ({ style, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
}

function codesAdmin(data: Loaded): AdminBonusCodes {
  return {
    codes: [
      {
        id: "code-1",
        code: "CACCIANEON",
        coins: 50,
        packs: 0,
        card_names: [],
        random_variants: { count: 2, styles: ["Neon"], rarities: [] },
        max_uses: 100,
        uses: 12,
        expires_at: null,
        is_active: true,
        note: null,
      },
    ],
    cards: rewardCards(data),
    rarities: RARITIES,
  };
}

function objectivesAdmin(data: Loaded): AdminObjectives {
  return {
    objectives: [
      {
        code: "obj_1",
        title: "Vinci 3 partite",
        difficulty: "medium",
        metric: "matches_won",
        params: {},
        target: 3,
        coins: 0,
        packs: 0,
        cards: 0,
        card_codes: [],
        random_variants: { count: 1, styles: ["tarot"], rarities: [] },
        is_active: true,
        assigned: 40,
      },
    ],
    per_day: { easy: 2, medium: 2, hard: 1 },
    reward_coins: { easy: 20, medium: 40, hard: 80 },
    cards: rewardCards(data),
    max_cards: 5,
    variant_styles: styleList(data),
    rarities: RARITIES,
  } as AdminObjectives;
}

function achievementsAdmin(data: Loaded): AdminAchievements {
  return {
    players: 13,
    achievements: [
      {
        id: "ach-1",
        name: "Collezionista di stili",
        description: "Hai trovato varianti di 5 stili diversi.",
        hint: "Stili",
        tier: "silver",
        metric: "variant_styles",
        params: {},
        target: 5,
        coins: 100,
        packs: 0,
        card_codes: [],
        random_variants: { count: 1, styles: [], rarities: ["omega"] },
        title: null,
        position: 1,
        is_active: true,
        counts_past: true,
        counts_from: null,
        available_until: null,
        completed: 3,
      },
    ],
    cards: rewardCards(data),
    traits: [],
    styles: styleList(data),
    rarities: RARITIES,
    chapters: [],
    seasons: [],
  } as AdminAchievements;
}

export default function VariantEditorPreviewPage() {
  return (
    <Suspense>
      <Scene />
    </Suspense>
  );
}

function Scene() {
  const scene = useSearchParams().get("s") ?? "pacchetto";
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [packs, setPacks] = useState<AdminSpecialPacks | null>(null);
  const [events, setEvents] = useState<AdminEvents | null>(null);
  const [now] = useState(() => Date.now());
  const [codes, setCodes] = useState<AdminBonusCodes | null>(null);
  const [objectives, setObjectives] = useState<AdminObjectives | null>(null);
  const [achievements, setAchievements] = useState<AdminAchievements | null>(null);

  useEffect(() => {
    load().then(
      (next) => {
        setData(next);
        setPacks(packAdmin(next));
        setEvents(eventAdmin(next));
        setCodes(codesAdmin(next));
        setObjectives(objectivesAdmin(next));
        setAchievements(achievementsAdmin(next));
      },
      (cause: unknown) => setError(String(cause)),
    );
  }, []);

  if (error) return <p className="p-4 text-comic-magenta">{error}</p>;
  if (!data || !packs || !events || !codes || !objectives || !achievements) return <p className="p-4">Caricamento…</p>;
  if (scene === "codice") return <BonusCodeAdmin data={codes} onChange={setCodes} />;
  if (scene === "obiettivo") return <ObjectiveAdmin data={objectives} onChange={setObjectives} />;
  if (scene === "impresa") return <AchievementAdmin data={achievements} onChange={setAchievements} />;
  if (scene === "negozio") {
    return (
      <ShopView
        status={STATUS}
        odds={ODDS}
        specials={[shopPack(data)]}
        history={[]}
        onFailed={() => undefined}
        onRedeemed={() => undefined}
      />
    );
  }
  if (scene === "evento") return <EventDetails event={eventScene()} now={now} abilities={null} />;
  if (scene === "evento-admin") return <EventAdmin data={events} onChange={setEvents} />;
  return <SpecialPackAdmin data={packs} onChange={setPacks} />;
}
