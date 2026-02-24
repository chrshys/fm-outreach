import { test, describe } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const page = readFileSync("src/app/leads/[id]/page.tsx", "utf-8");

describe("lead detail page – seasonality display", () => {
  test("isSeasonal === true renders 'Seasonal' text", () => {
    assert.match(
      page,
      /lead\.isSeasonal\s*===\s*true/,
      "should check lead.isSeasonal === true",
    );
    assert.match(
      page,
      /Seasonal/,
      "should display 'Seasonal' text when isSeasonal is true",
    );
  });

  test("isSeasonal === false renders 'Year-round' text", () => {
    assert.match(
      page,
      /lead\.isSeasonal\s*===\s*false/,
      "should check lead.isSeasonal === false",
    );
    assert.match(
      page,
      /Year-round/,
      "should display 'Year-round' text when isSeasonal is false",
    );
  });

  test("renders null when isSeasonal is undefined", () => {
    // The ternary chain should end with null for the undefined case
    const block = page.match(
      /lead\.isSeasonal\s*===\s*true\s*\?[\s\S]*?lead\.isSeasonal\s*===\s*false\s*\?[\s\S]*?:\s*null/,
    );
    assert.ok(
      block,
      "should render null when isSeasonal is undefined (ternary chain ending in null)",
    );
  });

  test("seasonalNote is displayed when present", () => {
    assert.match(
      page,
      /lead\.seasonalNote/,
      "should reference lead.seasonalNote in the template",
    );
  });

  test("uses font-medium span for the Seasonality label", () => {
    assert.match(
      page,
      /font-medium">Seasonality:<\/span>/,
      "should use <span className=\"font-medium\">Seasonality:</span> pattern",
    );
  });

  test("seasonality display appears after HoursDisplay block", () => {
    const hoursIdx = page.indexOf("HoursDisplay");
    const seasonalIdx = page.indexOf("lead.isSeasonal");
    assert.ok(hoursIdx > -1, "HoursDisplay must exist");
    assert.ok(seasonalIdx > -1, "isSeasonal check must exist");
    assert.ok(
      seasonalIdx > hoursIdx,
      "seasonality display should appear after HoursDisplay",
    );
  });

  test("seasonality display appears before farmDescription", () => {
    const seasonalIdx = page.indexOf("lead.isSeasonal");
    const farmIdx = page.indexOf("farmDescription");
    assert.ok(seasonalIdx > -1, "isSeasonal check must exist");
    assert.ok(farmIdx > -1, "farmDescription must exist");
    assert.ok(
      seasonalIdx < farmIdx,
      "seasonality display should appear before farmDescription",
    );
  });
});
