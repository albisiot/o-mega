// Prints the kits of a batch of the Scontro a squadre in Italian (docs/COMBAT-KITS.md), one block per
// character; with the output of `simulate-combat.mts --report kits --batch N` it adds their wins.
// Usage: node scripts/describe-combat-kits.mts <batch> [simulation-output.txt]
import { readFileSync } from "node:fs";
import type { CombatPassive, CombatPassiveEffect } from "@o-mega/game-engine";
import { COMBAT_KIT_BATCHES } from "../src/lib/combat-kits.ts";
import { describeCombatMove } from "../src/lib/combat-text.ts";

const TRIGGERS: Record<string, string> = {
  battle_start: "a inizio scontro",
  turn_start: "a ogni suo turno",
  hit: "quando colpisce",
  hurt: "quando è colpito",
  knockout: "quando mette KO",
  ally_down: "quando cade un compagno",
  low_vita: "sotto soglia di Vita",
};
const STATUS: Record<string, string> = { empower: "potenziamento", fortify: "fortificazione", haste: "accelerazione", taunt: "provocazione", weaken: "indebolimento", vulnerable: "vulnerabilità", stun: "stordimento", burn: "bruciatura" };
const TO: Record<string, string> = { self: " a sé", allies: " ai compagni", enemies: " ai nemici", other: " all'avversario" };
const n = (x: number) => x.toLocaleString("it-IT", { maximumFractionDigits: 2 });

function passiveText(p: CombatPassive): string {
  const parts: string[] = [];
  if (p.trigger) {
    const when = p.trigger === "low_vita" ? `sotto il ${p.thresholdPercent}% di Vita` : TRIGGERS[p.trigger];
    const effects = p.effects.map((e: CombatPassiveEffect) => {
      const to = TO[e.to] ?? "";
      if (e.kind === "status") return `${STATUS[e.status]} ${e.turns === 1 ? "1 turno" : `${e.turns} turni`}${to}${e.chance ? " (probabile)" : ""}`;
      if (e.kind === "damage") return `danni ×${n(e.multiplier)}${to}`;
      if (e.kind === "charge") return `+${e.amount} Carica${to}`;
      return `${e.kind === "heal" ? "cura" : "scudo"} ×${n(e.multiplier)}${to}`;
    });
    parts.push(`${when}: ${effects.join(", ")}${p.limit && p.trigger !== "battle_start" && p.trigger !== "low_vita" ? (p.limit === 1 ? " (una volta)" : ` (max ${p.limit} volte)`) : ""}`);
  }
  if (p.modifiers) {
    const m = p.modifiers;
    const sign = (x: number) => (x > 0 ? `+${x}` : `${x}`);
    const mods: string[] = [];
    if (m.damagePercent) mods.push(`danni ${sign(m.damagePercent)}%`);
    if (m.hitPercent) mods.push(`precisione ${sign(m.hitPercent)}`);
    if (m.critPercent) mods.push(`critico ${sign(m.critPercent)}`);
    if (m.speedPercent) mods.push(`velocità ${sign(m.speedPercent)}%`);
    if (m.effectChancePercent) mods.push(`probabilità effetti ${sign(m.effectChancePercent)}`);
    if (m.healPercent) mods.push(`cure ${sign(m.healPercent)}%`);
    if (m.damageVsStatus) mods.push(`danni ${sign(m.damageVsStatus.percent)}% contro chi ha ${STATUS[m.damageVsStatus.status]}`);
    if (mods.length) parts.push(`sempre: ${mods.join(", ")}`);
  }
  return parts.join("; ");
}

const wins = new Map<string, string>();
if (process.argv[3]) for (const m of readFileSync(process.argv[3], "utf8").matchAll(/^  (.+?) \(\w+\): con il suo kit ([\d.]+)%, con quello generico ([\d.]+)%/gm)) wins.set(m[1], `vince il ${m[2].replace(".", ",")}% (con il kit generico ${m[3].replace(".", ",")}%)`);
const faction: Record<string, string> = { heroes: "Eroe", villains: "Cattivo", neutrals: "Neutrale" };
for (const { code, name, faction: f, kit } of COMBAT_KIT_BATCHES[process.argv[2]] ?? []) {
  console.log(`### ${name} (${code}, ${faction[f] ?? f})${wins.has(name) ? ` · ${wins.get(name)}` : ""}`);
  for (const move of [kit.base, kit.special, kit.supreme]) console.log(`- **${move.name}** — ${describeCombatMove(move)}`);
  if (kit.passive) console.log(`- *${kit.passive.name}* (passiva) — ${passiveText(kit.passive)}.`);
  console.log("");
}
