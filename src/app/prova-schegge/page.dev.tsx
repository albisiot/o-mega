"use client";

// Schegge, frames and effects (SPEC §4.8) in fixed scenes, to look at them without an account. A
// development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it is never
// part of the published site. The catalog and the drawings are the real ones (both public); the
// player's copies, Schegge, frames and effects are made up.
//   /prova-schegge/?s=cornici        every frame on one card (&c=P057 another character)
//   /prova-schegge/?s=effetti        every effect on one card
//   /prova-schegge/?s=album          the album, with frames and effects on the characters below
//   /prova-schegge/?s=carta&c=P002   a character's page: open «Cornice ed effetto» or the copies
//   /prova-schegge/?s=negozio        the shop's Schegge tab

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Album } from "@/components/album";
import { CardScreen } from "@/components/card-screen";
import { CardView } from "@/components/card-view";
import { ShardShop } from "@/components/shard-shop";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { fetchCatalog, type CatalogCard, type OwnedSummary, type OwnedVariant } from "@/lib/collection";
import {
  COSMETIC_INFO,
  EFFECT_CODES,
  FRAME_CODES,
  type AppliedCosmetics,
  type CosmeticsState,
  type EffectCode,
  type FrameCode,
} from "@/lib/cosmetics";
import { getSupabase } from "@/lib/supabase/client";
import { keepCosmetics } from "@/lib/use-cosmetics";

type VariantRow = { id: string; definition_id: string; style: string; style_name: string; art_url: string };
type Loaded = { catalog: CatalogCard[]; abilities: AbilityInfo[]; owned: Map<string, OwnedSummary>; state: CosmeticsState };

/** The characters owned in the scenes, by album position: frame, effect, and copies of the first variant. */
const LOOKS: [FrameCode | null, EffectCode | null, number][] = [
  ["slab", "signature", 3],
  ["neon", "snow", 1],
  ["gold", "holo", 2],
  ["baroque", null, 0],
  ["comic", "halftone", 1],
  ["void", "glitter", 0],
  ["prism", "numbered", 1],
  ["circuit", "rays", 0],
  ["magma", "cracked", 0],
  ["ice", "sparkles", 0],
  ["marble", "flash", 0],
  ["carbon", null, 0],
  ["pixel", null, 0],
  ["slab_black", null, 0],
  ["silver", null, 0],
];

async function load(): Promise<Loaded> {
  const [catalog, abilities, variants] = await Promise.all([
    fetchCatalog(),
    fetchAbilities(),
    getSupabase().from("card_variants").select("id, definition_id, style, style_name, art_url").order("style"),
  ]);
  if (variants.error) throw variants.error;
  const rows = variants.data as VariantRow[];
  const owned = new Map<string, OwnedSummary>();
  const applied: AppliedCosmetics[] = [];
  const breakable: CosmeticsState["breakable"] = [];
  const picks = catalog.filter((card) => !card.unlockLevel).slice(0, 40);
  picks.forEach((card, index) => {
    const [frame, effect, variantCopies] = LOOKS[index] ?? [null, null, 0];
    const variant = rows.find((row) => row.definition_id === card.id);
    const ownedVariants: OwnedVariant[] =
      variant && variantCopies > 0
        ? Array.from({ length: variantCopies }, (_, copy) => ({
            instance_id: `${card.code}-${copy}`,
            variant_id: variant.id,
            style: variant.style,
            name: variant.style_name,
            art_url: variant.art_url,
          }))
        : [];
    owned.set(card.id, {
      definition_id: card.id,
      copies: 1 + ownedVariants.length,
      starter_copies: 0,
      locked_copies: 0,
      convertible_copies: 0,
      variants: ownedVariants,
    });
    if (variant && variantCopies > 1) {
      breakable.push({ variant_id: variant.id, definition_id: card.id, copies: variantCopies, breakable: variantCopies - 1 });
    }
    if (frame || effect) {
      applied.push({
        definition_id: card.id,
        frame,
        frame_visible: true,
        effect,
        effect_visible: true,
        effect_serial: effect === "numbered" ? 37 : null,
      });
    }
  });
  const state: CosmeticsState = {
    shard_balance: 7,
    costs: { pack: 1, cosmetic: 1, kind: 2, variant: 3 },
    values: { delta: 1, gamma: 2, beta: 3, alfa: 5, omega: 7 },
    catalog: [
      ...FRAME_CODES.map((code) => ({ code, kind: "frame" as const, name: COSMETIC_INFO[code].name, active: true })),
      ...EFFECT_CODES.map((code) => ({ code, kind: "effect" as const, name: COSMETIC_INFO[code].name, active: true })),
    ],
    inventory: [
      { code: "neon", count: 2, serial: 12 },
      { code: "slab_black", count: 1, serial: 3 },
      { code: "magma", count: 1, serial: 8 },
      { code: "snow", count: 1, serial: 21 },
      { code: "numbered", count: 1, serial: 42 },
      { code: "signature", count: 1, serial: 5 },
    ],
    applied,
    breakable,
    missing_variants: 180,
  };
  return { catalog, abilities, owned, state };
}

export default function ShardsPreviewPage() {
  return (
    <Suspense>
      <Scene />
    </Suspense>
  );
}

function Scene() {
  const params = useSearchParams();
  const scene = params.get("s") ?? "cornici";
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState(params.get("c"));

  useEffect(() => {
    load().then(
      (next) => {
        keepCosmetics(next.state);
        setLoaded(next);
      },
      (cause: unknown) => setError(String(cause)),
    );
  }, []);

  if (error) return <p className="p-4 text-comic-magenta">{error}</p>;
  if (!loaded) return <p className="p-4">Caricamento…</p>;
  const card = loaded.catalog.find((entry) => entry.code === code) ?? loaded.catalog[0];

  if (scene === "album") {
    return <Album catalog={loaded.catalog} owned={loaded.owned} abilities={loaded.abilities} onChanged={() => undefined} />;
  }
  if (scene === "carta") {
    const browseIds = [...loaded.owned.keys()];
    return (
      <CardScreen
        card={card}
        owned={loaded.owned.get(card.id) ?? null}
        abilities={loaded.abilities}
        browseIds={browseIds}
        onBrowse={(id) => setCode(loaded.catalog.find((entry) => entry.id === id)?.code ?? code)}
        onClose={() => undefined}
        onConverted={() => undefined}
      />
    );
  }
  if (scene === "negozio") {
    return (
      <main className="flex flex-1 flex-col gap-2 px-3 py-3">
        <h1 className="font-display text-3xl uppercase text-comic-yellow">Negozio · Schegge</h1>
        <ShardShop preview={loaded.state} />
      </main>
    );
  }

  const items =
    scene === "effetti"
      ? EFFECT_CODES.map((effect) => ({ key: effect, name: COSMETIC_INFO[effect].name, look: { frame: null, effect, serial: 37 } }))
      : FRAME_CODES.map((frame) => ({ key: frame, name: COSMETIC_INFO[frame].name, look: { frame, effect: null, serial: null } }));
  return (
    <main className="grid grid-cols-2 gap-x-2 gap-y-4 p-3 pb-10">
      {items.map((item) => (
        <figure key={item.key} className="flex flex-col items-center gap-1">
          <div style={{ zoom: 0.5 }}>
            <CardView card={card} abilities={loaded.abilities} cosmetics={item.look} />
          </div>
          <figcaption className="font-display text-lg uppercase text-comic-yellow">{item.name}</figcaption>
        </figure>
      ))}
    </main>
  );
}
