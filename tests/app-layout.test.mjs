import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/components/layout/app-layout.tsx", "utf8");

test("defines required sidebar nav items and routes", () => {
  for (const [label, href] of [
    ["Dashboard", "/"],
    ["Leads", "/leads"],
    ["Map", "/map"],
    ["Clusters", "/clusters"],
    ["Campaigns", "/campaigns"],
    ["Settings", "/settings"],
  ]) {
    assert.match(
      source,
      new RegExp(`\\{\\s*label:\\s*"${label}"\\s*,\\s*href:\\s*"${href}"\\s*\\}`),
    );
  }
});

test("renders required brand and footer copy", () => {
  assert.match(source, /FM Outreach/);
  assert.match(source, /Seller CRM/);
  assert.match(source, /Internal tool/);
});

test("uses shadcn Button and next/navigation pathname for active nav states", () => {
  assert.match(source, /import\s+\{\s*Button\s*\}\s+from\s+"@\/components\/ui\/button"/);
  assert.match(source, /usePathname\(\)/);
  assert.match(source, /data-active=\{isActive\s*\?\s*"true"\s*:\s*"false"\}/);
  assert.match(source, /aria-current=\{isActive\s*\?\s*"page"\s*:\s*undefined\}/);
});

test("matches active route behavior for nested paths and root", () => {
  assert.match(source, /if \(href === "\/"\) \{[\s\S]*?pathname === "\/"/);
  assert.match(source, /pathname === href \|\| pathname\.startsWith\(`\$\{href\}\/`\)/);
});

test("includes top bar title and main content slots", () => {
  assert.match(source, /<h1 className="text-2xl font-semibold tracking-tight">\{pageTitle\}<\/h1>/);
  assert.match(source, /<main className="flex-1 px-6 py-6">\{children\}<\/main>/);
});
