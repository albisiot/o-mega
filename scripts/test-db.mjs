// Runs every supabase/tests/*.test.sql file against the linked Supabase
// project (each one rolls its transaction back), then checks that the
// game_config table matches src/config/balance.ts.
// Usage: npm run test:db (requires `supabase login` and `supabase link`)

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

function supabase(args) {
  // shell: true lets Windows resolve npx.cmd.
  return spawnSync("npx", ["supabase", ...args], { encoding: "utf8", shell: true });
}

const TESTS_DIR = join("supabase", "tests");
const files = readdirSync(TESTS_DIR).filter((name) => name.endsWith(".test.sql")).sort();

let failed = 0;
for (const name of files) {
  const result = supabase(["db", "query", "--linked", "-f", join(TESTS_DIR, name)]);
  if (result.status === 0) {
    console.log(`ok    ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}\n${result.stdout}${result.stderr}`);
  }
}

// game_config keys are balance.ts paths in snake_case, e.g. match.threat_levels.min_sum.
const { balance } = await import("../src/config/balance.ts");
const flat = new Map();
(function flatten(object, prefix) {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix + key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    if (value && typeof value === "object") flatten(value, `${path}.`);
    else flat.set(path, value);
  }
})(balance, "");

const config = supabase(["db", "query", "--linked", '"select key, value from public.game_config"']);
const rows = config.status === 0 ? JSON.parse(config.stdout).rows : null;
const mismatches = rows
  ? rows.filter((row) => !flat.has(row.key) || flat.get(row.key) !== row.value).map((row) =>
      `${row.key}: database ${JSON.stringify(row.value)}, balance.ts ${flat.has(row.key) ? JSON.stringify(flat.get(row.key)) : "missing"}`,
    )
  : [`could not read game_config: ${config.stderr}`];
if (mismatches.length === 0) {
  console.log(`ok    game_config matches balance.ts (${rows.length} keys)`);
} else {
  failed += 1;
  console.log(`FAIL  game_config differs from balance.ts:\n  ${mismatches.join("\n  ")}`);
}

console.log(`\n${files.length + 1 - failed}/${files.length + 1} database checks passed`);
process.exit(failed === 0 ? 0 : 1);
