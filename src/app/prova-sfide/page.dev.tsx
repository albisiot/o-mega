"use client";

// Fixed scenes of the Sfide a tema (SPEC §8.8), to look at them without a server account. A
// development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it is never
// part of the published site. The catalog, the traits and the variants are the real ones (public);
// the challenges, the collection and the counts are made up, and nothing can be saved or played.
//   /prova-sfide/?s=gioca     Gioca with a challenge on Classica and one on Allarme Triplo (tap a mode)
//   /prova-sfide/?s=poche     the same, with too few characters for the Classica one
//   /prova-sfide/?s=squadra   the team screen of the Classica challenge
//   /prova-sfide/?s=editor    the admin page, new challenge (tap the steps); the list in its second tab
//   /prova-sfide/?s=attesa    the online queue of a challenge, after a while (the server finds the opponent)
//   /prova-sfide/?s=menu      the EDITOR menu, with every admin tool (the real page needs an admin)
//   /prova-sfide/?s=fornita   the team screen of a challenge that gives its squad (third stage)
//   Gioca also shows an Emergenza a tema beside the week's, and the Classica challenge has a
//   composition, match rules and its leaderboard (the trophy).

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CardDetailProvider } from "@/components/card-detail";
import { ChallengeAdmin } from "@/components/challenge-admin";
import { SuppliedTeam } from "@/components/challenge-parts";
import { EditorMenu } from "@/components/editor-menu";
import { PlayMenuView } from "@/components/play-menu";
import { TeamPicker } from "@/components/team-picker";
import { QueueWaitView, WaitingShell } from "@/components/waiting-views";
import type { AdminChallenge, AdminChallenges, ChallengePreview } from "@/lib/challenge-admin";
import type { Challenge, ChallengeRulesJson } from "@/lib/challenges";
import { fetchCatalog, type CatalogCard } from "@/lib/collection";
import { fetchTraitIndex } from "@/lib/catalog";
import type { MatchCard, VariantCopy } from "@/lib/match";
import { getSupabase } from "@/lib/supabase/client";

const NOW = Date.parse("2026-11-20T18:00:00Z");
const hours = (n: number) => new Date(NOW + n * 3_600_000).toISOString();

const FIGLI: ChallengeRulesJson = {
  rarities: ["delta", "gamma", "beta"],
  factions: [],
  traits: ["group.figli"],
  min_variants: 1,
  all_variants: false,
  rarity_budget: 10,
  rarity_max: { beta: 1 },
  min_factions: 2,
};

const EVENT = { id: "e1", title: "Settimana dei Figli", starts_at: hours(-30), ends_at: hours(100) };

function challenge(patch: Partial<Challenge>): Challenge {
  return {
    id: "c1",
    title: "La notte dei Figli",
    description: "I Figli dell'Ultima tornano in città. Gioca solo con loro, e porta almeno una variante.",
    color: "#ff7ad9",
    format: "classic",
    bot_difficulties: ["easy", "medium", "hard"],
    bot_follows_rules: true,
    rules: FIGLI,
    admitted: [
      { category: "Rarità", traits: ["Delta", "Gamma", "Beta"] },
      { category: "Gruppo", traits: ["Figli dell'Ultima"] },
    ],
    admitted_characters: 21,
    team_size: 5,
    starts_at: hours(-20),
    ends_at: hours(52),
    daily_limit: 5,
    plays_today: 2,
    my_characters: 11,
    my_characters_with_variant: 3,
    event: EVENT,
    event_points: { win: 20, draw: 10, loss: 5 },
    online: true,
    min_level: null,
    my_level: 7,
    my_wins: 2,
    banned_names: [],
    only_names: [],
    variant_style_names: [],
    tiers: [
      tier(1, 1, { coins: 50 }, true),
      tier(2, 5, { packs: 1 }, false),
      tier(3, 10, { random: 2 }, false),
    ],
    rarity_max_info: [{ code: "beta", name: "Beta", max: 1 }],
    match_rules: { modifier: "focus", place: "giza", levels: [], rare_multiplier: 5 },
    leaderboard: true,
    ...patch,
  };
}

const EMERGENCY = challenge({
  id: "c5",
  title: "Notte rossa",
  description: "Dieci Minacce, solo Eroi: una corsa sola.",
  color: "#ff9b8a",
  format: "emergency",
  bot_difficulties: [],
  online: false,
  rules: { rarities: [], factions: ["heroes"], traits: [], min_variants: 0, all_variants: false },
  admitted: [{ category: "Fazione", traits: ["Eroi"] }],
  rarity_max_info: [],
  match_rules: {},
  team_size: 10,
  emergency_threats: 10,
  my_run: { status: "active", passed: 3, failed: 1, total_score: 61, current_round: 5 },
  daily_limit: null,
  event: null,
  event_points: null,
  tiers: [tier(1, 5, { coins: 100 }, false)],
});

function tier(index: number, wins: number, reward: { coins?: number; packs?: number; random?: number }, reached: boolean) {
  return {
    tier: index,
    wins,
    coins: reward.coins ?? 0,
    packs: reward.packs ?? 0,
    cards: [],
    card_codes: [],
    random_variants: reward.random ? { count: reward.random, styles: [], rarities: [] } : null,
    random_variants_info: reward.random ? { count: reward.random, styles: [], rarities: [] } : null,
    reached,
    reached_by: reached ? 61 : 0,
    opening_ids: reached ? ["o1"] : [],
    seen: false,
  };
}

const TRIPLE = challenge({
  id: "c2",
  title: "Solo Cattivi",
  description: "",
  color: "#16c8ff",
  format: "triple",
  online: false,
  tiers: [],
  my_wins: 0,
  bot_difficulties: ["easy", "medium", "hard", "super_pro"],
  rules: { rarities: [], factions: ["villains"], traits: [], min_variants: 0, all_variants: false },
  admitted: [{ category: "Fazione", traits: ["Cattivi"] }],
  admitted_characters: 84,
  team_size: 9,
  daily_limit: null,
  plays_today: 0,
  my_characters: 31,
  my_characters_with_variant: 6,
  event: null,
  event_points: null,
});

const BOSS = challenge({
  id: "c4",
  title: "Minaccia senza starter",
  description: "",
  color: "#ff8a00",
  format: "boss",
  bot_difficulties: ["medium", "hard"],
  online: true,
  rules: { rarities: [], factions: [], traits: [], min_variants: 0, all_variants: false, no_starters: true, banned: ["P001"] },
  admitted: [],
  banned_names: ["Atlas"],
  min_level: 5,
  daily_limit: null,
  event: null,
  event_points: null,
  tiers: [],
});

function GiocaScene({ few }: { few: boolean }) {
  const classic = few ? challenge({ my_characters: 3, my_characters_with_variant: 1 }) : challenge({});
  return (
    <PlayMenuView
      active={null}
      error={null}
      conquest={{ unlocked: true, completed_matches: 40, level: 6, cards_lost_today: 2 }}
      ranked={null}
      emergency={null}
      emergencyWeek={{ endsAt: hours(76), threats: 10, run: null, rank: null }}
      story={null}
      lastPlay={{ mode: "bot", format: "classic", difficulty: "medium", challenge: { id: "c1", title: "La notte dei Figli" } }}
      event={
        <span className="flex min-h-12 min-w-0 flex-[1.6_1_0] flex-col justify-center gap-0.5 bg-comic-yellow px-3 py-1 text-black short:min-h-11">
          <span className="block truncate font-display text-[15px] uppercase leading-5">Settimana dei Figli</span>
          <span className="block truncate text-[12px] font-extrabold leading-4">160/250 punti · 4g 4h</span>
        </span>
      }
      challenges={[classic, TRIPLE, BOSS, EMERGENCY]}
      now={NOW}
      onForfeit={() => {}}
    />
  );
}

type SquadData = {
  catalog: CatalogCard[];
  owned: Map<string, string>;
  variantCopies: Map<string, VariantCopy[]>;
};

/** A made-up collection: the Figli dell'Ultima of the catalog and some other characters, a few with a variant. */
async function loadSquad(): Promise<SquadData> {
  const [catalog, traits, variants] = await Promise.all([
    fetchCatalog(),
    fetchTraitIndex(),
    getSupabase().from("card_variants").select("id, definition_id, style_name, art_url").eq("is_active", true),
  ]);
  if (variants.error) throw variants.error;
  const playable = catalog.filter((card) => card.unlockLevel === null);
  const figli = playable.filter((card) => traits.byCard.get(card.id)?.includes("group.figli"));
  const others = playable.filter((card) => !figli.includes(card)).slice(0, 30);
  const owned = new Map([...figli, ...others].map((card) => [card.id, `copy-${card.id}`]));
  const variantCopies = new Map<string, VariantCopy[]>();
  for (const card of figli.slice(0, 4)) {
    const variant = variants.data.find((row) => row.definition_id === card.id);
    if (variant) variantCopies.set(card.id, [{ id: `variant-${variant.id}`, name: variant.style_name, art_url: variant.art_url }]);
  }
  return { catalog: playable, owned, variantCopies };
}

function SquadScene() {
  const [data, setData] = useState<SquadData | null>(null);
  useEffect(() => {
    loadSquad().then(setData).catch((cause: unknown) => console.error(cause));
  }, []);
  if (!data) return <p className="p-4 text-sm">Caricamento del catalogo…</p>;
  return (
    <div className="game-shell">
      <header className="flex items-center gap-2.5 px-3 py-1">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] uppercase leading-6 text-comic-yellow">La tua squadra</h1>
          <p className="truncate text-[11px] font-bold text-muted">
            <span style={{ color: "#ff7ad9" }}>★ La notte dei Figli · </span>Contro il bot Medio
          </p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col px-3 pt-1.5">
        <CardDetailProvider>
          <TeamPicker
            catalog={data.catalog}
            owned={data.owned}
            variantCopies={data.variantCopies}
            instanceDefinitions={new Map()}
            formations={[]}
            onFormationsChanged={() => {}}
            startLabel="Sfida il bot Medio"
            starting={false}
            onStart={() => {}}
            challenge={challenge({})}
          />
        </CardDetailProvider>
      </main>
    </div>
  );
}

/** The challenge's own squad: five characters of the catalog, drawn as matches draw them. */
function SuppliedScene() {
  const [team, setTeam] = useState<MatchCard[] | null>(null);
  useEffect(() => {
    fetchCatalog()
      .then((catalog) =>
        setTeam(
          catalog
            .filter((card) => card.unlockLevel === null)
            .slice(10, 15)
            .map((card) => ({
              definition_id: card.id,
              code: card.code,
              name: card.name,
              faction: card.faction,
              flavor: card.flavor,
              art_url: card.art_url ?? null,
              stats: card.stats,
              rarity: card.rarity,
              power: null,
            })),
        ),
      )
      .catch((cause: unknown) => console.error(cause));
  }, []);
  if (!team) return <p className="p-4 text-sm">Caricamento del catalogo…</p>;
  return (
    <div className="game-shell">
      <header className="flex items-center gap-2.5 px-3 py-1">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] uppercase leading-6 text-comic-yellow">La tua squadra</h1>
          <p className="truncate text-[11px] font-bold text-muted">
            <span style={{ color: "#16c8ff" }}>★ Tutti uguali · </span>Classica · Contro il bot Difficile
          </p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col px-3 pt-1.5">
        <CardDetailProvider>
          <SuppliedTeam
            challenge={challenge({ id: "c6", title: "Tutti uguali", color: "#16c8ff", supplied_team: team, rules: { rarities: [], factions: [], traits: [], min_variants: 0, all_variants: false } })}
            startLabel="Sfida il bot Difficile"
            starting={false}
            onStart={() => {}}
          />
        </CardDetailProvider>
      </main>
    </div>
  );
}

function adminData(): AdminChallenges {
  const stats = (patch: Partial<AdminChallenge>, base: Challenge): AdminChallenge => ({
    ...base,
    is_active: true,
    version: 1,
    matches: 0,
    players: 0,
    ...patch,
  });
  return {
    now: new Date(NOW).toISOString(),
    challenges: [
      stats({ matches: 412, players: 138 }, challenge({})),
      stats({}, { ...TRIPLE, starts_at: hours(70), ends_at: hours(118) }),
      stats({ matches: 1031, players: 402 }, challenge({
        id: "c3",
        title: "Giornata Delta",
        color: "#f5f0e6",
        rules: { rarities: ["delta"], factions: [], traits: [], min_variants: 0, all_variants: false },
        admitted: [{ category: "Rarità", traits: ["Delta"] }],
        admitted_characters: 92,
        starts_at: hours(-280),
        ends_at: hours(-256),
        event: null,
        event_points: null,
        daily_limit: null,
      })),
    ],
    events: [EVENT],
    cards: [
      { code: "P001", name: "Atlas", rarity: "Delta", variants: [] },
      { code: "P034", name: "Lullaby", rarity: "Gamma", variants: [{ style: "neon", name: "Neon" }] },
      { code: "P054", name: "Vera Kross", rarity: "Beta", variants: [{ style: "oro", name: "Oro" }] },
      { code: "P180", name: "Groma", rarity: "Alfa", variants: [{ style: "tarocco", name: "Tarocco" }] },
    ],
    variant_styles: [
      { style: "neon", name: "Neon", characters: 24 },
      { style: "oro", name: "Oro", characters: 9 },
      { style: "tarocco", name: "Tarocco", characters: 13 },
    ],
    seal_target: { min: 5, max: 60, suggested: 12 },
  };
}

/** A made-up count: about 4 characters in 10 pass each rule chosen. */
async function fakePreview(format: string, rules: ChallengeRulesJson, emergencyThreats?: number): Promise<ChallengePreview> {
  const parts = [rules.rarities, rules.factions, rules.traits].filter((list) => list.length > 0).length;
  const admitted = Math.round(227 * 0.4 ** parts);
  const size = format === "emergency" ? (emergencyThreats ?? 10) : format === "triple" ? 9 : 5;
  const needed = rules.all_variants ? size : Math.min(rules.min_variants, size);
  return {
    rules,
    team_size: size,
    variants_needed: needed,
    admitted,
    admitted_with_variant: Math.round(admitted * 0.9),
    players_ready: Math.round(1940 * Math.min(1, admitted / 60) * (needed > 0 ? 0.7 : 1)),
    players_total: 1940,
    composition_possible: rules.rarity_budget == null || rules.rarity_budget >= size,
    cheapest_budget: size,
  };
}

function Scenes() {
  const params = useSearchParams();
  const scene = params.get("s") ?? "gioca";
  const [data, setData] = useState(adminData);
  if (scene === "squadra") return <SquadScene />;
  if (scene === "menu") return <EditorMenu />;
  if (scene === "fornita") return <SuppliedScene />;
  if (scene === "attesa") {
    return (
      <WaitingShell lobby={false} ranked={false}>
        <QueueWaitView
          queueMode="friendly"
          format="classic"
          waited={52}
          error={null}
          challenge={{ title: "La notte dei Figli", color: "#ff7ad9" }}
        />
      </WaitingShell>
    );
  }
  if (scene === "editor") return <ChallengeAdmin data={data} onChange={setData} preview={fakePreview} />;
  return <GiocaScene few={scene === "poche"} />;
}

export default function ChallengeScenesPage() {
  return (
    <Suspense>
      <Scenes />
    </Suspense>
  );
}
