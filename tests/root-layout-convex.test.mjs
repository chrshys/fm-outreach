import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const layoutSource = fs.readFileSync("src/app/layout.tsx", "utf8");
const providersSource = fs.readFileSync("src/app/providers.tsx", "utf8");

test("root layout imports global styles and sets FM Outreach metadata title", () => {
  assert.match(layoutSource, /import "\.\/globals\.css";/);
  assert.match(layoutSource, /title:\s*"FM Outreach"/);
});

test("root layout wraps children in ConvexClientProvider", () => {
  assert.match(
    layoutSource,
    /import\s+\{\s*ConvexClientProvider\s*\}\s+from\s+"\.\/providers"/,
  );
  assert.match(layoutSource, /<ConvexClientProvider>\{children\}<\/ConvexClientProvider>/);
});

test("providers module defines a client Convex provider component", () => {
  assert.match(providersSource, /^"use client";/m);
  assert.match(
    providersSource,
    /import\s+\{\s*ConvexProvider\s*,\s*ConvexReactClient\s*\}\s+from\s+"convex\/react"/,
  );
  assert.match(providersSource, /process\.env\.NEXT_PUBLIC_CONVEX_URL/);
  assert.match(providersSource, /new\s+ConvexReactClient\(convexUrl\)/);
  assert.match(providersSource, /<ConvexProvider client=\{convex\}>\{children\}<\/ConvexProvider>/);
});
