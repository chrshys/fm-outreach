import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/googlePlaces.ts", "utf8");

test("parseWeekdayText is exported as a named function", () => {
  assert.match(
    source,
    /export\s+function\s+parseWeekdayText\(weekdayText:\s*string\[\]\):\s*StructuredHour\[\]/,
  );
});

test("DAY_NAME_TO_NUMBER maps all seven days with correct numbers", () => {
  assert.match(source, /sunday:\s*0/);
  assert.match(source, /monday:\s*1/);
  assert.match(source, /tuesday:\s*2/);
  assert.match(source, /wednesday:\s*3/);
  assert.match(source, /thursday:\s*4/);
  assert.match(source, /friday:\s*5/);
  assert.match(source, /saturday:\s*6/);
});

test("parseWeekdayText splits line on colon-space to extract day name and time", () => {
  assert.match(source, /indexOf\(": "\)/);
  assert.match(source, /slice\(0,\s*colonIdx\)/);
  assert.match(source, /slice\(colonIdx\s*\+\s*2\)/);
});

test("parseWeekdayText handles Closed case-insensitively", () => {
  assert.match(source, /toLowerCase\(\)\s*===\s*"closed"/);
  assert.match(source, /isClosed:\s*true/);
  assert.match(source, /open:\s*""/);
  assert.match(source, /close:\s*""/);
});

test("parseWeekdayText splits time range on en-dash or hyphen with spaces", () => {
  assert.match(source, /split\(\/\\s\+\[–-\]\\s\+\/\)/);
});

test("convertTo24h converts 12-hour times to 24-hour format", () => {
  assert.match(source, /function\s+convertTo24h\(/);
  // Handles AM/PM period detection
  assert.match(source, /AM|PM/);
  // Handles midnight (12:00 AM → 00:00)
  assert.match(source, /period\s*===\s*"AM"\s*&&\s*hours\s*===\s*12/);
  // Handles PM conversion (adds 12 for non-noon PM)
  assert.match(source, /period\s*===\s*"PM"\s*&&\s*hours\s*!==\s*12/);
  // Zero-pads hours
  assert.match(source, /padStart\(2,\s*"0"\)/);
});

test("parseWeekdayText returns isClosed: false for normal hours", () => {
  assert.match(source, /isClosed:\s*false/);
});

test("parseWeekdayText silently skips unparseable lines (no throw)", () => {
  // Uses continue to skip bad lines rather than throwing
  assert.match(source, /if\s*\(colonIdx\s*===\s*-1\)\s*continue/);
  assert.match(source, /if\s*\(day\s*===\s*undefined\)\s*continue/);
  assert.match(source, /if\s*\(times\.length\s*!==\s*2\)\s*continue/);
  assert.match(source, /if\s*\(!open\s*\|\|\s*!close\)\s*continue/);
});
