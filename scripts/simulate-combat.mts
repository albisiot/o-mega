// Simulates the Scontro a squadre (SPEC §5.19, docs/COMBAT.md) on a catalog dump, with the
// generic kits of combat-ai.ts until every character has its own: the computer plays both
// sides, the two with the most Life in front. It measures:
//   duration  actions per battle, battles at the limit, draws, errors;
//   points    what one ability point is worth: the same 5 characters on both sides, one point
//             more in an ability on side a, sides swapped (50% = worth nothing);
//   rarity    5 characters of a rarity against 5 of the rarity below;
//   cards     the wins of each character in random teams, and how they follow each ability;
//   field     how often the team with more points in the field threat's abilities wins, with
//             the field and without it (the same battles);
//   repeat    the same battles twice from the same seed give the same log.
//
// The dump: npx supabase db query --linked -f scripts/emergency-catalog.sql > emergency-raw.json
// Usage: node scripts/simulate-combat.mts <emergency-raw.json> [--battles 10000] [--pairs 2000]
//   [--seed 1] [--report duration,points,rarity,cards,field,repeat] [--pool all|pack]
//   [--field-levels 2,3,4|none] [--set speed.perPoint.vel=1.5,vita.base=250]
//
// --set changes the numbers of balance.ts `combat` for this run only (dotted paths).

import { readFileSync } from "node:fs";
import { balance } from "../src/config/balance.ts";
import {
  autoCombatFormation,
  combatStats,
  genericCombatKit,
  mulberry32,
  runCombat,
  type AbilityFamilies,
  type CombatContext,
  type CombatEvent,
  type CombatField,
  type CombatFighterInput,
  type CombatRules,
  type CombatSetup,
  type Rng,
} from "../packages/game-engine/src/index.ts";

type Card = { id: string; code: string; rarity: string; rank: number; unlock: number | null; stats: Record<string, number>; active: boolean; in_packs?: boolean };
type Dump = {
  cards: Card[];
  rarities: { code: string; rank: number; budget?: number }[];
  threats: { code: string; level: number; abilities: string[]; active: boolean; region: string; rarity: string | null }[];
  abilities: { code: string; family: string }[];
};

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!args[0] || args[0].startsWith("--")) {
  console.error("Usage: node scripts/simulate-combat.mts <emergency-raw.json> [--battles 10000] [--pairs 2000] [--seed 1] [--report …]");
  process.exit(1);
}
const raw = JSON.parse(readFileSync(args[0], "utf8")) as { rows?: { data: Dump }[] } & Partial<Dump>;
const data: Dump = raw.rows ? raw.rows[0].data : (raw as Dump);

const battles = Number(option("battles") ?? 10000);
const pairs = Number(option("pairs") ?? 2000);
const seed = Number(option("seed") ?? 1);
const reports = (option("report") ?? "duration,points,rarity,cards,field,repeat").split(",");

// The numbers: balance.ts, with the --set changes.
const rules = structuredClone(balance.combat) as unknown as CombatRules;
for (const change of (option("set") ?? "").split(",").filter(Boolean)) {
  const [path, value] = change.split("=");
  const keys = path.split(".");
  let node = rules as unknown as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) node = node[key] as Record<string, unknown>;
  node[keys.at(-1)!] = Number(value);
}

// Abilities in their usual order: ties between abilities follow it.
const ORDER = ["FOR", "VEL", "RES", "INT", "VOL", "PER", "ENE", "MAG", "PSI", "COM", "TEC", "FUR"];
const families: AbilityFamilies = Object.fromEntries(
  [...data.abilities].sort((x, y) => ORDER.indexOf(x.code) - ORDER.indexOf(y.code)).map((a) => [a.code, a.family]),
);
const CODES = Object.keys(families);
const ctx: CombatContext = { rules, families };

const budgets = new Map(data.rarities.map((r) => [r.code, r.budget]));
const budgetOf = (card: Card) => budgets.get(card.rarity) ?? Object.values(card.stats).reduce((sum, v) => sum + v, 0);
const pool = data.cards.filter((c) => c.active && (option("pool") !== "pack" || (c.unlock === null && c.in_packs !== false)));
const fieldLevels = option("field-levels") === "none" ? [] : (option("field-levels") ?? "2,3,4").split(",").map(Number);
const fields: CombatField[] = data.threats
  .filter((t) => t.active && t.region === "megara" && !t.rarity && fieldLevels.includes(t.level))
  .map((t) => ({ name: t.code, abilities: t.abilities }));

const fighter = (card: Card, stats = card.stats): CombatFighterInput => ({
  id: card.id,
  definitionId: card.id,
  name: card.code,
  stats,
  budget: budgetOf(card),
  kit: genericCombatKit(card.code, stats, families),
});
function draw(rng: Rng, from: Card[], n = 5): Card[] {
  const left = [...from];
  return Array.from({ length: n }, () => left.splice(Math.floor(rng() * left.length), 1)[0]);
}
const fieldOf = (rng: Rng): CombatField | null => (fields.length ? fields[Math.floor(rng() * fields.length)] : null);
const setup = (a: CombatFighterInput[], b: CombatFighterInput[], field: CombatField | null): CombatSetup => ({
  a: autoCombatFormation(a, ctx),
  b: autoCombatFormation(b, ctx),
  field,
});
const percent = (x: number) => `${(100 * x).toFixed(1)}%`;
const winsOf = (winner: string, side: "a" | "b") => (winner === side ? 1 : winner === "draw" ? 0.5 : 0);

console.log(`Scontro a squadre · ${pool.length} personaggi · seme ${seed} · campi ${fields.length} (livelli ${fieldLevels.join(",") || "nessuno"})`);
if (option("set")) console.log(`numeri cambiati: ${option("set")}`);

// One run of random battles feeds duration, cards and field.
if (reports.some((r) => ["duration", "cards", "field"].includes(r))) {
  const rng = mulberry32(seed);
  const actions: number[] = [];
  let limits = 0;
  let draws = 0;
  let errors = 0;
  const played = new Map<string, number>();
  const won = new Map<string, number>();
  let fieldLead = 0;
  let fieldLeadWins = 0;
  let fieldLeadWinsWithout = 0;
  for (let i = 0; i < battles; i += 1) {
    const [teamA, teamB] = [draw(rng, pool), draw(rng, pool)];
    const field = fieldOf(rng);
    const battleSeed = Math.floor(rng() * 2 ** 31);
    try {
      const { state } = runCombat(setup(teamA.map((c) => fighter(c)), teamB.map((c) => fighter(c)), field), ctx, mulberry32(battleSeed));
      const result = state.result!;
      actions.push(state.actions);
      if (result.reason === "limit") limits += 1;
      if (result.winner === "draw") draws += 1;
      for (const [side, team] of [["a", teamA], ["b", teamB]] as const) {
        for (const card of team) {
          played.set(card.code, (played.get(card.code) ?? 0) + 1);
          won.set(card.code, (won.get(card.code) ?? 0) + winsOf(result.winner, side));
        }
      }
      if (reports.includes("field") && field) {
        const onField = (team: Card[]) =>
          team.reduce((sum, c) => sum + field.abilities.reduce((s, code) => s + combatStats(c.stats, budgetOf(c), rules)[code], 0), 0);
        const lead = onField(teamA) - onField(teamB);
        if (Math.abs(lead) >= 5) {
          const side = lead > 0 ? "a" : "b";
          fieldLead += 1;
          fieldLeadWins += winsOf(result.winner, side);
          const plain = runCombat(setup(teamA.map((c) => fighter(c)), teamB.map((c) => fighter(c)), null), ctx, mulberry32(battleSeed)).state.result!;
          fieldLeadWinsWithout += winsOf(plain.winner, side);
        }
      }
    } catch (error) {
      errors += 1;
      if (errors <= 3) console.error(error);
    }
  }
  if (reports.includes("duration")) {
    const sorted = [...actions].sort((x, y) => x - y);
    const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    const mean = actions.reduce((s, v) => s + v, 0) / actions.length;
    console.log(`\nDurata (${battles} scontri): ${mean.toFixed(1)} azioni in media (10% ${at(0.1)}, metà ${at(0.5)}, 90% ${at(0.9)}); al limite ${percent(limits / battles)}, pareggi ${percent(draws / battles)}, errori ${errors}`);
  }
  if (reports.includes("cards")) {
    const rate = pool.filter((c) => played.has(c.code)).map((c) => ({ c, rate: won.get(c.code)! / played.get(c.code)! }));
    const corr = (x: number[], y: number[]) => {
      const mx = x.reduce((s, v) => s + v, 0) / x.length;
      const my = y.reduce((s, v) => s + v, 0) / y.length;
      let sxy = 0;
      let sx = 0;
      let sy = 0;
      x.forEach((v, i) => {
        sxy += (v - mx) * (y[i] - my);
        sx += (v - mx) ** 2;
        sy += (y[i] - my) ** 2;
      });
      return sxy / Math.sqrt(sx * sy);
    };
    const rates = rate.map((r) => r.rate);
    const sorted = [...rates].sort((x, y) => x - y);
    const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    console.log(`\nCarte: vittorie dal 5% al 95% dei personaggi ${percent(at(0.05))} – ${percent(at(0.95))}, metà ${percent(at(0.5))}`);
    console.log(`  legame con le abilità: ${CODES.map((code) => `${code} ${corr(rate.map((r) => r.c.stats[code]), rates).toFixed(2)}`).join(" · ")} · rarità ${corr(rate.map((r) => r.c.rank), rates).toFixed(2)}`);
    rate.sort((x, y) => y.rate - x.rate);
    const show = (r: (typeof rate)[number]) => `${r.c.code} ${r.c.rarity} ${percent(r.rate)}`;
    console.log(`  i più forti: ${rate.slice(0, 8).map(show).join(" · ")}`);
    console.log(`  i più deboli: ${rate.slice(-8).map(show).join(" · ")}`);
  }
  if (reports.includes("field") && fields.length) {
    console.log(`\nCampo: con almeno 5 punti in più nelle abilità della Minaccia (${fieldLead} scontri) si vince ${percent(fieldLeadWins / fieldLead)} con il campo, ${percent(fieldLeadWinsWithout / fieldLead)} senza`);
  }
}

if (reports.includes("points")) {
  const line: string[] = [];
  for (const code of CODES) {
    const rng = mulberry32(seed + 101);
    let wins = 0;
    for (let i = 0; i < pairs; i += 1) {
      const team = draw(rng, pool);
      const field = fieldOf(rng);
      const plus = team.map((c) => fighter(c, { ...c.stats, [code]: Math.min(10, c.stats[code] + 1) }));
      const plain = team.map((c) => fighter(c));
      const battleSeed = Math.floor(rng() * 2 ** 31);
      wins += winsOf(runCombat(setup(plus, plain, field), ctx, mulberry32(battleSeed)).state.result!.winner, "a");
      wins += winsOf(runCombat(setup(plain, plus, field), ctx, mulberry32(battleSeed)).state.result!.winner, "b");
    }
    line.push(`${code} ${percent(wins / (2 * pairs))}`);
  }
  console.log(`\nValore di un punto (${pairs} coppie per abilità, un punto in più a tutti e 5): ${line.join(" · ")}`);
}

if (reports.includes("rarity")) {
  const byRarity = (code: string) => pool.filter((c) => c.rarity === code);
  const line: string[] = [];
  const order = [...data.rarities].sort((x, y) => x.rank - y.rank).map((r) => r.code);
  const matchups = order.slice(1).map((code, i) => [code, order[i]]);
  matchups.push([order.at(-1)!, order[0]]);
  for (const [high, low] of matchups) {
    if (byRarity(high).length < 5 || byRarity(low).length < 5) continue;
    const rng = mulberry32(seed + 202);
    let wins = 0;
    for (let i = 0; i < pairs; i += 1) {
      const a = draw(rng, byRarity(high)).map((c) => fighter(c));
      const b = draw(rng, byRarity(low)).map((c) => fighter(c));
      const field = fieldOf(rng);
      const battleSeed = Math.floor(rng() * 2 ** 31);
      wins += winsOf(runCombat(setup(a, b, field), ctx, mulberry32(battleSeed)).state.result!.winner, "a");
      wins += winsOf(runCombat(setup(b, a, field), ctx, mulberry32(battleSeed)).state.result!.winner, "b");
    }
    line.push(`${high} su ${low} ${percent(wins / (2 * pairs))}`);
  }
  console.log(`\nRarità (${pairs} coppie, lati scambiati): ${line.join(" · ")}`);
}

if (reports.includes("repeat")) {
  const rng = mulberry32(seed + 303);
  let same = 0;
  const runs = 100;
  for (let i = 0; i < runs; i += 1) {
    const [teamA, teamB] = [draw(rng, pool), draw(rng, pool)];
    const field = fieldOf(rng);
    const battleSeed = Math.floor(rng() * 2 ** 31);
    const log = (): CombatEvent[] => runCombat(setup(teamA.map((c) => fighter(c)), teamB.map((c) => fighter(c)), field), ctx, mulberry32(battleSeed)).events;
    if (JSON.stringify(log()) === JSON.stringify(log())) same += 1;
  }
  console.log(`\nRipetibilità: ${same} scontri su ${runs} identici rigiocati dallo stesso seme`);
}
