/**
 * A reward of random variants (SPEC §8.1–8.5): "N varianti a caso", optionally only of some styles
 * and rarities. The server draws them when it pays the reward, the player's missing ones first.
 */

/** The rule as an editor saves it: style and rarity codes; empty lists: any. */
export type RandomVariantsRule = { count: number; styles: string[]; rarities: string[] };

/** The rule as players read it: the styles' and rarities' names. */
export type RandomVariantsInfo = { count: number; styles: string[]; rarities: string[] };

/** The most variants one reward can draw (the server checks the same). */
export const MAX_RANDOM_VARIANTS = 5;

/** "Neon", "Neon o Tarocco", "Neon, Tarocco o Oro". */
function either(names: readonly string[]): string {
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} o ${names[names.length - 1]}` : (names[0] ?? "");
}

/** "1 variante a caso", "2 varianti a caso (stile Neon o Tarocco, Omega)"; "" for no rule. */
export function describeRandomVariants(info: RandomVariantsInfo | null | undefined): string {
  if (!info || info.count <= 0) return "";
  const head = info.count === 1 ? "1 variante a caso" : `${info.count} varianti a caso`;
  const limits = [info.styles.length > 0 ? `stile ${either(info.styles)}` : "", either(info.rarities)].filter(Boolean);
  return limits.length > 0 ? `${head} (${limits.join(", ")})` : head;
}

/** A saved rule with names in place of codes, for the editors' lists; codes the lists do not know stay as they are. */
export function ruleInfo(
  rule: RandomVariantsRule | null | undefined,
  styles: readonly { style: string; name: string }[],
  rarities: readonly { code: string; name: string }[],
): RandomVariantsInfo | null {
  if (!rule || rule.count <= 0) return null;
  const styleName = new Map(styles.map((entry) => [entry.style, entry.name]));
  const rarityName = new Map(rarities.map((entry) => [entry.code, entry.name]));
  return {
    count: rule.count,
    styles: rule.styles.map((style) => styleName.get(style) ?? style),
    rarities: rule.rarities.map((code) => rarityName.get(code) ?? code),
  };
}

/** What the editors send: the rule, or null for none (a count of 0). */
export function ruleToSend(rule: RandomVariantsRule | null | undefined): RandomVariantsRule | null {
  return rule && rule.count > 0 ? rule : null;
}
