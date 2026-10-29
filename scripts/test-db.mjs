// Runs every supabase/tests/*.test.sql file against the linked Supabase
// project. Each file wraps its checks in a transaction that is rolled back.
// Usage: npm run test:db (requires `supabase login` and `supabase link`)

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const TESTS_DIR = join("supabase", "tests");
const files = readdirSync(TESTS_DIR).filter((name) => name.endsWith(".test.sql")).sort();

let failed = 0;
for (const name of files) {
  const file = join(TESTS_DIR, name);
  // shell: true lets Windows resolve npx.cmd.
  const result = spawnSync("npx", ["supabase", "db", "query", "--linked", "-f", file], {
    encoding: "utf8",
    shell: true,
  });
  if (result.status === 0) {
    console.log(`ok    ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}\n${result.stdout}${result.stderr}`);
  }
}

console.log(`\n${files.length - failed}/${files.length} SQL test files passed`);
process.exit(failed === 0 ? 0 : 1);
