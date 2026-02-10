import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const layout = fs.readFileSync("src/app/layout.tsx", "utf8");
const sonner = fs.readFileSync("src/components/ui/sonner.tsx", "utf8");

test("root layout imports Toaster component", () => {
  assert.match(layout, /import.*Toaster.*from.*sonner/);
});

test("root layout renders Toaster", () => {
  assert.match(layout, /<Toaster\s*\/>/);
});

test("sonner component exports Toaster", () => {
  assert.match(sonner, /export\s*\{\s*Toaster\s*\}/);
});

test("sonner component imports from sonner library", () => {
  assert.match(sonner, /import.*Toaster as Sonner.*from.*"sonner"/);
});
