"use client";

// The team screen of several modes, to try choosing drawings and taking cards out without a server
// account. A development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only. The
// catalog and the variants are the real ones (public); the collection is made up, nothing is saved.
//   /prova-squadra/?s=classica    Classica (5), squad already full, some characters with variants
//   /prova-squadra/?s=conquista   Conquista: stakes and variants at stake
//   /prova-squadra/?s=triplo      Allarme Triplo (deck of 9)
//   /prova-squadra/?s=quadrante   Quadrante (deck of 10)
//   /prova-squadra/?s=storia      a Storia mission with its star rules
// Add &nuovo=1 to forget that the hold-to-remove hint was learned (the hint shows again).

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CardDetailProvider } from "@/components/card-detail";
import { CardLooksProvider } from "@/components/card-looks";
import { TeamPicker } from "@/components/team-picker";
import { balance } from "@/config/balance";
import { fetchCatalog, type CatalogCard } from "@/lib/collection";
import type { VariantCopy } from "@/lib/match";
import { getSupabase } from "@/lib/supabase/client";

type Scene = "classica" | "conquista" | "triplo" | "quadrante" | "storia";

type Data = {
  catalog: CatalogCard[];
  owned: Map<string, string>;
  variantCopies: Map<string, VariantCopy[]>;
};

async function load(): Promise<Data> {
  const [catalog, variants] = await Promise.all([
    fetchCatalog(),
    getSupabase().from("card_variants").select("id, definition_id, style_name, art_url").eq("is_active", true),
  ]);
  if (variants.error) throw variants.error;
  const playable = catalog.filter((card) => card.unlockLevel === null);
  // Characters with a variant first, so the squad can show them; then others.
  const withVariant = playable.filter((card) => variants.data.some((row) => row.definition_id === card.id)).slice(0, 12);
  const others = playable.filter((card) => !withVariant.includes(card)).slice(0, 24);
  const mine = [...withVariant, ...others];
  const owned = new Map(mine.map((card) => [card.id, `copy-${card.id}`]));
  const variantCopies = new Map<string, VariantCopy[]>();
  for (const card of withVariant) {
    const rows = variants.data.filter((row) => row.definition_id === card.id).slice(0, 2);
    variantCopies.set(
      card.id,
      rows.map((row) => ({ id: `variant-${row.id}`, name: row.style_name, art_url: row.art_url })),
    );
  }
  return { catalog: playable.filter((card) => owned.has(card.id)), owned, variantCopies };
}

const SIZES: Record<Scene, number | undefined> = {
  classica: undefined,
  conquista: undefined,
  triplo: balance.triple.rounds * balance.triple.threats,
  quadrante: balance.quadrant.deckSize,
  storia: undefined,
};

function Screen() {
  const params = useSearchParams();
  const scene = (params.get("s") ?? "classica") as Scene;
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    if (params.get("nuovo")) {
      try {
        localStorage.removeItem("o-mega.hint.hold-to-remove");
      } catch {
        // Only a convenience.
      }
    }
    load()
      .then((loaded) => {
        // A full squad to begin with: the first characters, those with variants among them.
        const size = SIZES[scene] ?? balance.match.teamSize;
        const ids = [...loaded.owned.keys()].slice(0, size);
        const key = `o-mega.last-team${SIZES[scene] ? `.${SIZES[scene]}` : ""}`;
        try {
          localStorage.setItem(key, JSON.stringify(ids));
          localStorage.removeItem(`${key}.variants`);
        } catch {
          // Only a convenience.
        }
        setData(loaded);
      })
      .catch((cause: unknown) => console.error(cause));
  }, [params, scene]);
  if (!data) return <p className="p-4 text-sm">Caricamento del catalogo…</p>;
  const conquest = scene === "conquista";
  const ids = [...data.owned.keys()];
  return (
    <div className="game-shell">
      <header className="px-3 py-1">
        <h1 className="font-display text-[22px] uppercase leading-6 text-comic-yellow">La tua squadra</h1>
        <p className="truncate text-[11px] font-bold text-muted">Prova · {scene}</p>
      </header>
      <main className="flex min-h-0 flex-1 flex-col px-3 pt-1.5">
        <CardLooksProvider>
          <CardDetailProvider>
            <TeamPicker
              key={scene}
              catalog={data.catalog}
              owned={data.owned}
              conquerable={conquest ? new Set(ids.slice(2)) : null}
              atRiskCopies={conquest ? new Map(ids.slice(0, 2).map((id) => [id, `pack-${id}`])) : null}
              variantCopies={data.variantCopies}
              instanceDefinitions={new Map()}
              formations={[]}
              onFormationsChanged={() => {}}
              startLabel="Inizia (prova)"
              starting={false}
              onStart={() => {}}
              squadSize={SIZES[scene]}
              storyStars={
                scene === "storia"
                  ? {
                      rules: {
                        star_rarities: ["delta", "gamma"],
                        star_rarity_names: ["Delta", "Gamma"],
                        star_traits: [],
                        star_traits_text: [],
                      },
                      earned: [],
                    }
                  : null
              }
            />
          </CardDetailProvider>
        </CardLooksProvider>
      </main>
    </div>
  );
}

export default function TeamScenesPage() {
  return (
    <Suspense>
      <Screen />
    </Suspense>
  );
}
