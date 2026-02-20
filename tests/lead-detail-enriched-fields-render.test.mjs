import { test, describe } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const page = readFileSync("src/app/leads/[id]/page.tsx", "utf-8");

describe("lead detail page – renders without errors when locationDescription and imagePrompt are present", () => {
  test("both locationDescription and imagePrompt are conditionally rendered", () => {
    assert.match(
      page,
      /\{lead\.locationDescription\s*\?/,
      "locationDescription must be conditionally rendered",
    );
    assert.match(
      page,
      /\{lead\.imagePrompt\s*\?/,
      "imagePrompt must be conditionally rendered",
    );
  });

  test("both fields use null-safe fallback (not undefined)", () => {
    // Conditional blocks should use ternary with null, not && which can render false/0
    const locMatch = page.match(/\{lead\.locationDescription\s*\?[\s\S]*?:\s*null\s*\}/);
    assert.ok(
      locMatch,
      "locationDescription conditional block should return null when absent",
    );
    const imgMatch = page.match(/\{lead\.imagePrompt\s*\?[\s\S]*?:\s*null\s*\}/);
    assert.ok(
      imgMatch,
      "imagePrompt conditional block should return null when absent",
    );
  });

  test("ImagePromptBlock component is defined with correct props", () => {
    assert.match(
      page,
      /function ImagePromptBlock\(\{ value \}/,
      "ImagePromptBlock component should accept a value prop",
    );
  });

  test("ImagePromptBlock receives lead.imagePrompt as value", () => {
    assert.match(
      page,
      /<ImagePromptBlock\s+value=\{lead\.imagePrompt\}/,
      "ImagePromptBlock should receive lead.imagePrompt as its value prop",
    );
  });

  test("locationDescription renders inside a paragraph element", () => {
    // Verify locationDescription content is wrapped in a <p> tag for proper DOM structure
    const locBlock = page.match(
      /\{lead\.locationDescription\s*\?\s*\(\s*<p>([\s\S]*?)<\/p>/,
    );
    assert.ok(
      locBlock,
      "locationDescription should render inside a <p> element",
    );
  });

  test("Check and Copy icons are imported for ImagePromptBlock", () => {
    assert.match(
      page,
      /import\s*\{[^}]*Check[^}]*\}\s*from\s*["']lucide-react["']/,
      "Check icon must be imported from lucide-react",
    );
    assert.match(
      page,
      /import\s*\{[^}]*Copy[^}]*\}\s*from\s*["']lucide-react["']/,
      "Copy icon must be imported from lucide-react",
    );
  });

  test("locationDescription appears between farmDescription and structuredDescription", () => {
    const farmIdx = page.indexOf("farmDescription");
    const locIdx = page.indexOf("locationDescription");
    const structuredIdx = page.indexOf("structuredDescription");
    assert.ok(farmIdx > -1, "farmDescription must exist");
    assert.ok(locIdx > -1, "locationDescription must exist");
    assert.ok(structuredIdx > -1, "structuredDescription must exist");
    assert.ok(
      locIdx > farmIdx && locIdx < structuredIdx,
      "locationDescription should appear between farmDescription and structuredDescription",
    );
  });

  test("imagePrompt appears after lead source detail", () => {
    const sourceIdx = page.indexOf("Source detail");
    const imgIdx = page.indexOf("<ImagePromptBlock");
    assert.ok(sourceIdx > -1, "Source detail must exist");
    assert.ok(imgIdx > -1, "ImagePromptBlock usage must exist");
    assert.ok(
      imgIdx > sourceIdx,
      "ImagePromptBlock should appear after Source detail",
    );
  });
});
