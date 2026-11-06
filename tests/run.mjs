// Runs every tests/*.test.ts with tsx; exits non-zero if any fails.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
let failed = 0;
for (const f of readdirSync(dir).filter((n) => n.endsWith(".test.ts")).sort()) {
  console.log(`\n# ${f}`);
  const r = spawnSync("npx", ["tsx", join(dir, f)], { stdio: "inherit", shell: true });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} test file(s) failed` : "\nAll test files passed");
process.exit(failed ? 1 : 0);
