"use client";

// Fixed scenes of the album and of a character's page for a player owning several artwork
// variants (SPEC §4.6, §9), to look at them without an account. A development-only page:
// next.config.ts serves *.dev.tsx pages in `next dev` only, so it is never part of the published
// site. The catalog and the variants are the real ones (both public); the copies are made up.
//   /prova-varianti/?s=album             the album, with the characters below owned
//   /prova-varianti/?s=carta&c=P082      a character's page (default P082); &v=ink opens it on a variant
// Owned here: P082 base + both variants, P014 both variants and no base, P047 base ×9 + one of
// two (×10 on the tile), P015 base + its longest-named variant, P007 the same variant twice,
// P003 base only.

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Album } from "@/components/album";
import { CardScreen } from "@/components/card-screen";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { fetchCatalog, type CatalogCard, type OwnedSummary, type OwnedVariant } from "@/lib/collection";
import { getSupabase } from "@/lib/supabase/client";

/** Per character: how many base copies, and the styles of its variant copies (one per copy). */
const OWNED: Record<string, { base: number; styles: string[] }> = {
  P082: { base: 1, styles: ["circuit", "ink"] },
  P014: { base: 0, styles: ["ink", "wraith"] },
  P047: { base: 9, styles: ["tarot"] },
  P015: { base: 1, styles: ["watercolor"] },
  P007: { base: 0, styles: ["classic", "classic"] },
  P003: { base: 1, styles: [] },
};

type VariantRow = { id: string; definition_id: string; style: string; style_name: string; art_url: string };
type Loaded = { catalog: CatalogCard[]; owned: Map<string, OwnedSummary>; abilities: AbilityInfo[] };

async function load(): Promise<Loaded> {
  const [catalog, abilities, variants] = await Promise.all([
    fetchCatalog(),
    fetchAbilities(),
    getSupabase().from("card_variants").select("id, definition_id, style, style_name, art_url"),
  ]);
  if (variants.error) throw variants.error;
  const owned = new Map<string, OwnedSummary>();
  for (const [code, { base, styles }] of Object.entries(OWNED)) {
    const card = catalog.find((entry) => entry.code === code);
    if (!card) continue;
    const ownedVariants: OwnedVariant[] = styles.flatMap((style, index) => {
      const row = (variants.data as VariantRow[]).find((v) => v.definition_id === card.id && v.style === style);
      return row
        ? [{ instance_id: `${code}-${index}`, variant_id: row.id, style, name: row.style_name, art_url: row.art_url }]
        : [];
    });
    const copies = base + ownedVariants.length;
    owned.set(card.id, {
      definition_id: card.id,
      copies,
      starter_copies: 0,
      locked_copies: 0,
      convertible_copies: Math.max(0, base - 1),
      variants: ownedVariants,
    });
  }
  return { catalog, owned, abilities };
}

export default function VariantsPreviewPage() {
  return (
    <Suspense>
      <Scene />
    </Suspense>
  );
}

function Scene() {
  const params = useSearchParams();
  const scene = params.get("s") ?? "album";
  const [code, setCode] = useState(params.get("c") ?? "P082");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load().then(setLoaded, (cause: unknown) => setError(String(cause)));
  }, []);

  if (error) return <p className="p-4 text-comic-magenta">{error}</p>;
  if (!loaded) return <p className="p-4">Caricamento…</p>;
  if (scene === "album") {
    return <Album catalog={loaded.catalog} owned={loaded.owned} abilities={loaded.abilities} onChanged={() => undefined} />;
  }
  const card = loaded.catalog.find((entry) => entry.code === code);
  if (!card) return <p className="p-4">Nessuna carta {code}.</p>;
  // A long album list around the owned ones, as when the page is opened from a full album.
  const browseIds = loaded.catalog.slice(0, 120).map((entry) => entry.id);
  if (!browseIds.includes(card.id)) browseIds.push(card.id);
  return (
    <CardScreen
      card={card}
      owned={loaded.owned.get(card.id) ?? null}
      initialLook={code === params.get("c") ? params.get("v") : null}
      abilities={loaded.abilities}
      browseIds={browseIds}
      onBrowse={(id) => setCode(loaded.catalog.find((entry) => entry.id === id)?.code ?? code)}
      onClose={() => undefined}
      onConverted={() => undefined}
    />
  );
}
