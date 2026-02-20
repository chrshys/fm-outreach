// Entry point for `node --test tests/` — Node v25 resolves directory
// paths via CJS module resolution (index.js), then runs all discovered
// test files under the node:test runner.
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const testFiles = readdirSync(__dirname).filter((f) =>
  f.endsWith(".test.mjs")
);

for (const file of testFiles) {
  await import(join(__dirname, file));
}
