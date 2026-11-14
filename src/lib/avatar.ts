import type { CatalogCard, OwnedSummary } from "@/lib/collection";
import { searchCards } from "@/lib/card-sort";

/** A drawing the player can wear as avatar: a character they own, base or a variant they have. */
export type AvatarChoice = {
  key: string;
  definitionId: string;
  /** Null for the base drawing. */
  variantId: string | null;
  code: string;
  name: string;
  /** The variant's style name ("Neon"); null for the base drawing. */
  styleName: string | null;
  art_url: string;
  rarity: { rank: number; name: string; color: string };
};

/**
 * A picture the avatar shows: the chosen card drawing (a /cards/... path of the site), the
 * account photo (an http URL), or nothing, for the initial.
 */
export function isCardArtAvatar(url: string | null): url is string {
  return url !== null && url.startsWith("/");
}

/**
 * Every drawing the player can choose, in catalog order: per owned character the base drawing
 * (any copy is enough), then each variant they have, once per variant.
 */
export function avatarChoices(catalog: readonly CatalogCard[], collection: ReadonlyMap<string, OwnedSummary>): AvatarChoice[] {
  return catalog.flatMap((card) => {
    const owned = collection.get(card.id);
    if (!owned || owned.copies === 0 || !card.art_url) return [];
    const base: AvatarChoice = {
      key: card.id,
      definitionId: card.id,
      variantId: null,
      code: card.code,
      name: card.name,
      styleName: null,
      art_url: card.art_url,
      rarity: card.rarity,
    };
    const variants = [...new Map(owned.variants.map((v) => [v.variant_id, v])).values()].map(
      (v): AvatarChoice => ({ ...base, key: `${card.id}:${v.variant_id}`, variantId: v.variant_id, styleName: v.name, art_url: v.art_url }),
    );
    return [base, ...variants];
  });
}

/** The choices that pass the search (name or number) and the rarity filter. */
export function filterAvatarChoices(choices: readonly AvatarChoice[], query: string, rarity: number | null): AvatarChoice[] {
  return searchCards(
    choices.filter((choice) => rarity === null || choice.rarity.rank === rarity),
    query,
  );
}
