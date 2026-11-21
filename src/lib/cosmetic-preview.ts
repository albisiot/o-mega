import type { CatalogCard, OwnedSummary } from "@/lib/collection";
import type { AppliedCosmetics, CardCosmetics, CosmeticKind, EffectCode, FrameCode } from "@/lib/cosmetics";

/**
 * The character a frame or an effect just bought with Schegge is shown on (SPEC §4.8): the
 * player's rarest, preferring one with no look of that kind yet; among equals, the first in the
 * album. Null when the player owns no character.
 */
export function previewCharacter(
  catalog: readonly CatalogCard[],
  owned: ReadonlyMap<string, Pick<OwnedSummary, "copies">>,
  applied: readonly AppliedCosmetics[],
  kind: CosmeticKind,
): CatalogCard | null {
  const dressed = new Set(applied.filter((entry) => (kind === "frame" ? entry.frame : entry.effect)).map((entry) => entry.definition_id));
  const mine = catalog.filter((card) => (owned.get(card.id)?.copies ?? 0) > 0);
  const rarest = (cards: CatalogCard[]) =>
    cards.reduce<CatalogCard | null>((best, card) => (!best || card.rarity.rank > best.rarity.rank ? card : best), null);
  return rarest(mine.filter((card) => !dressed.has(card.id))) ?? rarest(mine);
}

/**
 * The look of the preview character once the new frame or effect is on: the new one in place of
 * that kind, the other kind as the player left it.
 */
export function lookWith(
  current: CardCosmetics | null,
  item: { code: FrameCode | EffectCode; kind: CosmeticKind; serial: number | null },
): CardCosmetics {
  if (item.kind === "frame") return { frame: item.code as FrameCode, effect: current?.effect ?? null, serial: current?.serial ?? null };
  const effect = item.code as EffectCode;
  return { frame: current?.frame ?? null, effect, serial: effect === "numbered" ? item.serial : null };
}
