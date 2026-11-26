// Prints the kits of a batch of the Scontro a squadre in Italian (docs/COMBAT-KITS.md), one block per
// character; with the output of `simulate-combat.mts --report kits --batch N` it adds their wins.
// Usage: node scripts/describe-combat-kits.mts <batch> [simulation-output.txt]
import { readFileSync } from "node:fs";
import { COMBAT_KIT_BATCHES } from "../src/lib/combat-kits.ts";
import { describeCombatMove, describeCombatPassive } from "../src/lib/combat-text.ts";

const wins = new Map<string, string>();
if (process.argv[3]) for (const m of readFileSync(process.argv[3], "utf8").matchAll(/^  (.+?) \(\w+\): con il suo kit ([\d.]+)%, con quello generico ([\d.]+)%/gm)) wins.set(m[1], `vince il ${m[2].replace(".", ",")}% (con il kit generico ${m[3].replace(".", ",")}%)`);
const faction: Record<string, string> = { heroes: "Eroe", villains: "Cattivo", neutrals: "Neutrale" };
for (const { code, name, faction: f, kit } of COMBAT_KIT_BATCHES[process.argv[2]] ?? []) {
  console.log(`### ${name} (${code}, ${faction[f] ?? f})${wins.has(name) ? ` · ${wins.get(name)}` : ""}`);
  for (const move of [kit.base, kit.special, kit.supreme]) console.log(`- **${move.name}** — ${describeCombatMove(move)}`);
  if (kit.passive) console.log(`- *${kit.passive.name}* (passiva) — ${describeCombatPassive(kit.passive)}.`);
  console.log("");
}
