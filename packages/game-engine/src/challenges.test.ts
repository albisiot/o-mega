import { describe, expect, it } from "vitest";
import {
  admittedByChallenge,
  canFieldChallenge,
  challengeVariantsNeeded,
  checkChallengeTeam,
  NO_CHALLENGE_RULES,
  type ChallengeCopy,
  type ChallengeRules,
} from "./challenges.ts";

const CATEGORIES: Record<string, string> = {
  "origin.mito": "origin",
  "origin.strappo": "origin",
  "origin.segno": "origin",
  "group.figli": "group",
  "group.custodi": "group",
};
const categoryOf = (code: string) => CATEGORIES[code];

const copy = (rarity: string, faction: string, traits: string[], variant = false): ChallengeCopy => ({ rarity, faction, traits, variant });
const rules = (patch: Partial<ChallengeRules>): ChallengeRules => ({ ...NO_CHALLENGE_RULES, ...patch });

describe("Sfida a tema: who is admitted", () => {
  it("no rule admits everyone", () => {
    expect(admittedByChallenge(copy("omega", "villains", []), NO_CHALLENGE_RULES, categoryOf)).toBe(true);
  });

  it("rarities and factions: one of the listed ones", () => {
    const rule = rules({ rarities: ["delta", "gamma"], factions: ["villains"] });
    expect(admittedByChallenge(copy("delta", "villains", []), rule, categoryOf)).toBe(true);
    expect(admittedByChallenge(copy("beta", "villains", []), rule, categoryOf)).toBe(false);
    expect(admittedByChallenge(copy("gamma", "heroes", []), rule, categoryOf)).toBe(false);
  });

  it("traits: one of a category is enough, every listed category must match", () => {
    const rule = rules({ traits: ["origin.mito", "origin.strappo", "group.figli"] });
    expect(admittedByChallenge(copy("delta", "villains", ["origin.strappo", "group.figli"]), rule, categoryOf)).toBe(true);
    expect(admittedByChallenge(copy("delta", "villains", ["origin.segno", "group.figli"]), rule, categoryOf)).toBe(false);
    expect(admittedByChallenge(copy("delta", "villains", ["origin.mito"]), rule, categoryOf)).toBe(false);
  });

  it("an unknown trait is an error", () => {
    expect(() => admittedByChallenge(copy("delta", "villains", []), rules({ traits: ["group.nessuno"] }), categoryOf)).toThrow();
  });
});

describe("Sfida a tema: a squad", () => {
  const figli = rules({ traits: ["group.figli"], minVariants: 1 });
  const five = (variants: number) =>
    Array.from({ length: 5 }, (_, i) => copy("delta", "villains", ["group.figli"], i < variants));

  it("is ok only when full, admitted and with enough variants", () => {
    expect(checkChallengeTeam(five(1), figli, categoryOf, 5)).toEqual({ notAdmitted: 0, starters: 0, variants: 1, variantsNeeded: 1, ok: true });
    expect(checkChallengeTeam(five(0), figli, categoryOf, 5).ok).toBe(false);
    expect(checkChallengeTeam(five(1).slice(0, 4), figli, categoryOf, 5).ok).toBe(false);
    const outsider = [...five(1).slice(0, 4), copy("delta", "villains", ["group.custodi"])];
    expect(checkChallengeTeam(outsider, figli, categoryOf, 5)).toMatchObject({ notAdmitted: 1, ok: false });
  });

  it("all variants asks every copy, whatever the size", () => {
    const all = rules({ allVariants: true });
    expect(challengeVariantsNeeded(all, 5)).toBe(5);
    expect(challengeVariantsNeeded(all, 9)).toBe(9);
    expect(checkChallengeTeam(five(4), all, categoryOf, 5).ok).toBe(false);
    expect(checkChallengeTeam(five(5), all, categoryOf, 5).ok).toBe(true);
  });

  it("a minimum never asks more than the squad", () => {
    expect(challengeVariantsNeeded(rules({ minVariants: 7 }), 5)).toBe(5);
    expect(challengeVariantsNeeded(rules({ minVariants: -2 }), 5)).toBe(0);
  });

  it("only variants of the listed styles count", () => {
    const neon = rules({ minVariants: 1, variantStyles: ["neon"] });
    const squad = five(0).map((entry, i) => (i === 0 ? { ...entry, variant: true, variantStyle: "oro" } : entry));
    expect(checkChallengeTeam(squad, neon, categoryOf, 5)).toMatchObject({ variants: 0, ok: false });
    squad[1] = { ...squad[1], variant: true, variantStyle: "neon" };
    expect(checkChallengeTeam(squad, neon, categoryOf, 5)).toMatchObject({ variants: 1, ok: true });
  });

  it("no starters: no starter copy and no level card", () => {
    const rule = rules({ noStarters: true });
    const squad = five(0).map((entry, i) => (i === 0 ? { ...entry, starter: true } : entry));
    expect(checkChallengeTeam(squad, rule, categoryOf, 5)).toMatchObject({ starters: 1, ok: false });
    expect(admittedByChallenge({ ...copy("delta", "heroes", []), levelCard: true }, rule, categoryOf)).toBe(false);
    expect(admittedByChallenge({ ...copy("delta", "heroes", []), levelCard: true }, NO_CHALLENGE_RULES, categoryOf)).toBe(true);
  });

  it("banned characters are out; with a list only those are in", () => {
    const p1 = { ...copy("delta", "heroes", []), code: "P001" };
    const p2 = { ...copy("delta", "heroes", []), code: "P002" };
    expect(admittedByChallenge(p1, rules({ banned: ["P001"] }), categoryOf)).toBe(false);
    expect(admittedByChallenge(p2, rules({ banned: ["P001"] }), categoryOf)).toBe(true);
    expect(admittedByChallenge(p1, rules({ only: ["P001"] }), categoryOf)).toBe(true);
    expect(admittedByChallenge(p2, rules({ only: ["P001"] }), categoryOf)).toBe(false);
  });

  it("a player can field a squad with enough admitted characters and variants", () => {
    expect(canFieldChallenge({ admitted: 5, admittedWithVariant: 1 }, figli, 5)).toBe(true);
    expect(canFieldChallenge({ admitted: 4, admittedWithVariant: 4 }, figli, 5)).toBe(false);
    expect(canFieldChallenge({ admitted: 12, admittedWithVariant: 0 }, figli, 5)).toBe(false);
  });
});
