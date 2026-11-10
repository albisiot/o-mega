/** A trait category (Origine, Natura, Gruppo) with its traits, as the admin payloads send them. */
export type TraitCategory = { code: string; name: string; traits: { code: string; name: string }[] };

/**
 * Same rule as the server's card_matches_traits: for every category with a chosen trait, the card
 * has one of the chosen traits of that category. Nothing chosen: every card.
 */
export function matchesTraits(cardTraits: readonly string[], chosen: readonly string[], catalog: TraitCategory[]): boolean {
  if (chosen.length === 0) return true;
  const held = new Set(cardTraits);
  return catalog.every((category) => {
    const wanted = category.traits.filter((trait) => chosen.includes(trait.code));
    return wanted.length === 0 || wanted.some((trait) => held.has(trait.code));
  });
}

/** The chosen traits with one more, or one less. */
export function toggleTrait(chosen: readonly string[], code: string): string[] {
  return chosen.includes(code) ? chosen.filter((entry) => entry !== code) : [...chosen, code];
}

/** "Mito o Strappo · Figli dell'Ultima": one part per category, in catalog order. */
export function describeTraits(chosen: readonly string[], catalog: TraitCategory[]): string {
  return catalog
    .map((category) =>
      category.traits
        .filter((trait) => chosen.includes(trait.code))
        .map((trait) => trait.name)
        .join(" o "),
    )
    .filter(Boolean)
    .join(" · ");
}

/** The admitted traits of an event as players read them, from the server's [{category, traits}]. */
export function describeAdmitted(admitted: { category: string; traits: string[] }[]): string {
  return admitted.map((group) => group.traits.join(" o ")).join(" · ");
}
