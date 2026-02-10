import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("pnpm typecheck exits successfully", () => {
  const result = spawnSync("pnpm", ["typecheck"], {
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join("\n"),
  );
});
