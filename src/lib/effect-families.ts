import type { ThreatModifier } from "@o-mega/game-engine";

// The visual language of the special abilities on a result page: every power and every
// threat rule belongs to a family, and each family has its own balloon, sound effect word,
// movement and sound. The cards speak in balloons; the threats in captions. Yellow helps,
// magenta on black hits, white dashed only tells something.

/** What a card's power does, as the page shows it. */
export type PowerFamily =
  /** Points for its own card. */
  | "charge"
  /** Takes something from the opposing card (Sabotatore). */
  | "strike"
  /** Stops a strike (Schermato, Riflesso). */
  | "shield"
  /** Switches the opposing power off (Annullatore). */
  | "stop"
  /** Settles a tie (Implacabile). */
  | "tiebreak"
  /** Passes something to a later card (Riscossa, Slancio…). */
  | "forward"
  /** Copies the power of the card before (Riverbero). */
  | "copy"
  /** Shows something, gives no points (Veggente, Spia, Nebbia). */
  | "reveal";

/** What sets a charge off, where its points fly from. */
export type ChargeSource = "threat" | "round" | "rival" | "team";

const FAMILY: Record<string, PowerFamily> = {
  ability_bonus: "charge",
  family_bonus: "charge",
  level_bonus: "charge",
  all_rounder: "charge",
  crescendo: "charge",
  main_event: "charge",
  eclectic: "charge",
  adaptable: "charge",
  scrappy: "charge",
  opener: "charge",
  last_stand: "charge",
  underdog: "charge",
  vendetta: "charge",
  nemesis: "charge",
  giant_slayer: "charge",
  opportunist: "charge",
  counterpunch: "charge",
  bond: "charge",
  lone_wolf: "charge",
  sabotage: "strike",
  shielded: "shield",
  reflect: "shield",
  nullifier: "stop",
  relentless: "tiebreak",
  comeback: "forward",
  momentum: "forward",
  sacrifice: "forward",
  catalyst: "forward",
  pack_leader: "forward",
  echo: "copy",
  foresight: "reveal",
  spy: "reveal",
  fog: "reveal",
};

const SOURCE: Record<string, ChargeSource> = {
  opener: "round",
  last_stand: "round",
  underdog: "round",
  vendetta: "round",
  crescendo: "round",
  nemesis: "rival",
  giant_slayer: "rival",
  opportunist: "rival",
  counterpunch: "rival",
  bond: "team",
  lone_wolf: "team",
};

/** The family of a power; a power this version does not know shows as a charge. */
export function powerFamily(code: string | null | undefined): PowerFamily {
  return (code && FAMILY[code]) || "charge";
}

/** Where the points of a charge come from: the threat unless the power reads the round, the rival or the team. */
export function chargeSource(code: string | null | undefined): ChargeSource {
  return (code && SOURCE[code]) || "threat";
}

const FAMILY_SFX: Record<PowerFamily, string> = {
  charge: "POW!",
  strike: "ZAP!",
  shield: "CLANG!",
  stop: "STOP!",
  tiebreak: "TONK!",
  forward: "AVANTI!",
  copy: "DI NUOVO!",
  reveal: "ZOOM!",
};

/** The sound effect word of a power. */
export function powerSfx(code: string | null | undefined): string {
  return code === "reflect" ? "BOING!" : FAMILY_SFX[powerFamily(code)];
}

/** The distinctive powers (Alfa and Omega, SPEC §4.4): they get a cut-in across the page. */
const DISTINCTIVE = new Set(["comeback", "underdog", "sabotage", "foresight", "momentum", "sacrifice", "pack_leader", "echo", "catalyst", "fog"]);

export function isDistinctive(code: string | null | undefined): boolean {
  return Boolean(code && DISTINCTIVE.has(code));
}

/**
 * The order in which the powers of a round speak: what switches powers off first, so
 * a bonus never shows and then vanishes; then what hits and what stops a hit, because
 * charges such as Tuttofare read the values already hit; then the charges.
 */
const FAMILY_ORDER: Record<PowerFamily, number> = { stop: 0, strike: 1, shield: 2, charge: 3, copy: 3, tiebreak: 4, forward: 5, reveal: 6 };

export function familyOrder(family: PowerFamily): number {
  return FAMILY_ORDER[family];
}

/** What a threat rule does, as the page shows it. */
export type RuleFamily =
  /** Changes how the abilities count. */
  | "count"
  /** Points for factions or rarities. */
  | "flag"
  /** Points for the side behind (Il conto lungo). */
  | "standing"
  /** No power works (Silenzio della tomba). */
  | "silence"
  /** Turns the round upside down (Rovescio, Specchio). */
  | "flip"
  /** The abilities are hidden or added (Al buio, Livello ignoto, Eco). */
  | "hidden";

export function ruleFamily(modifier: ThreatModifier): RuleFamily {
  switch (modifier.code) {
    case "hostile_ground":
    case "underdogs":
    case "last_first":
      return "flag";
    case "long_count":
      return "standing";
    case "tomb_silence":
      return "silence";
    case "reverse":
    case "mirror":
      return "flip";
    case "blind":
    case "unknown_level":
    case "echo":
      return "hidden";
    default:
      return "count";
  }
}

/** The effect a rule has on the whole page, in the spectacular version. */
export type PageEffect = "flip" | "frost" | "silence" | "mirror";

export function rulePageEffect(modifier: ThreatModifier | null | undefined): PageEffect | null {
  switch (modifier?.code) {
    case "reverse":
    case "negative":
      return "flip";
    case "frost":
      return "frost";
    case "tomb_silence":
      return "silence";
    case "mirror":
      return "mirror";
    default:
      return null;
  }
}

/** The word a rule shouts when it lands; none for the rules whose ribbons or marks say it all. */
export function ruleSfx(modifier: ThreatModifier | null | undefined): string | null {
  switch (modifier?.code) {
    case "focus":
    case "weak_link":
    case "abyss":
      return "×2!";
    case "one_force":
      return "UNA SOLA!";
    case "frost":
      return "BRRR!";
    case "duel":
      return "DUELLO!";
    case "all_or_nothing":
      return "TUTTO O NIENTE!";
    case "price":
      return "SI PAGA!";
    case "count":
      return "UNO, DUE, TRE!";
    case "negative":
    case "reverse":
      return "CAPOVOLTO!";
    case "mirror":
      return "SPECCHIO!";
    case "tomb_silence":
      return "SSST…";
    case "echo":
      return "ECO!";
    default:
      return null;
  }
}

/**
 * Whether some points help the side that gets them. Under Rovescio the lower score wins,
 * so a bonus hurts: the colour follows what the points do to the result, not their sign.
 */
export function pointsHelp(points: number, modifier: ThreatModifier | null | undefined): boolean {
  return modifier?.code === "reverse" ? points < 0 : points > 0;
}
