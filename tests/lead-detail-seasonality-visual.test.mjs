import { test, describe } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const page = readFileSync("src/app/leads/[id]/page.tsx", "utf-8");

describe("lead detail page – seasonality visual rendering", () => {
  test("seasonal note uses em-dash separator format", () => {
    assert.match(
      page,
      /Seasonal\{lead\.seasonalNote \? ` — \$\{lead\.seasonalNote\}` : ""\}/,
      "should format seasonal note with ' — ' separator",
    );
  });

  test("seasonality block is inside Business Details card", () => {
    const businessDetailsIdx = page.indexOf("Business Details</CardTitle>");
    const seasonalIdx = page.indexOf("lead.isSeasonal");
    // Find the next closing </Card> after Business Details
    const nextCardClose = page.indexOf("</Card>", businessDetailsIdx);
    assert.ok(businessDetailsIdx > -1, "Business Details card must exist");
    assert.ok(
      seasonalIdx > businessDetailsIdx && seasonalIdx < nextCardClose,
      "seasonality block should be inside the Business Details card",
    );
  });

  test("both seasonal states use <p> wrapper with consistent label pattern", () => {
    // Verify the isSeasonal === true branch uses <p><span> pattern
    const trueBlock = page.match(
      /lead\.isSeasonal\s*===\s*true\s*\?\s*\(\s*<p>\s*<span className="font-medium">Seasonality:<\/span>/,
    );
    assert.ok(
      trueBlock,
      "isSeasonal === true should render inside <p> with font-medium span label",
    );

    // Verify the isSeasonal === false branch uses same <p><span> pattern
    const falseBlock = page.match(
      /lead\.isSeasonal\s*===\s*false\s*\?\s*\(\s*<p>\s*<span className="font-medium">Seasonality:<\/span>\s*Year-round/,
    );
    assert.ok(
      falseBlock,
      "isSeasonal === false should render inside <p> with font-medium span label and 'Year-round' text",
    );
  });

  test("seasonality block lives in space-y-2 text-sm container", () => {
    // The Business Details CardContent uses space-y-2 text-sm
    const containerMatch = page.match(
      /CardContent className="space-y-2 text-sm"[\s\S]*?lead\.isSeasonal/,
    );
    assert.ok(
      containerMatch,
      "seasonality should be inside CardContent with space-y-2 text-sm styling",
    );
  });
});
