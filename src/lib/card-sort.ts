/** How the admin pages order a list of cards: by name or by the number in the code (P007 before P051). */
export type CardOrder = "name" | "number";

type NamedCard = { code: string; name: string };

const collator = new Intl.Collator("it", { sensitivity: "base", numeric: true });

/** The number in a card code: 51 for "P051"; codes without one go last. */
function codeNumber(code: string): number {
  const match = code.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

/** A sorted copy; ties fall back to the other key so the order never depends on the input. */
export function sortCards<T extends NamedCard>(cards: T[], order: CardOrder): T[] {
  return [...cards].sort((a, b) =>
    order === "name"
      ? collator.compare(a.name, b.name) || collator.compare(a.code, b.code)
      : codeNumber(a.code) - codeNumber(b.code) || collator.compare(a.code, b.code),
  );
}

/** Lower case without accents, so "eco" finds "Écho". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Cards whose name or code contains the search, in the list's order. "51" finds P051. */
export function searchCards<T extends NamedCard>(cards: T[], query: string): T[] {
  const needle = fold(query);
  if (!needle) return cards;
  return cards.filter((card) => fold(card.name).includes(needle) || fold(card.code).includes(needle));
}
