import { test, describe } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const page = readFileSync("src/app/leads/[id]/page.tsx", "utf-8");

describe("lead detail page – backward compat when enrichment fields are absent", () => {
  test("locationDescription is only accessed inside a truthy guard", () => {
    // Every occurrence of lead.locationDescription should be inside a conditional
    const allAccesses = [...page.matchAll(/lead\.locationDescription/g)];
    assert.ok(
      allAccesses.length > 0,
      "lead.locationDescription should appear in the page",
    );

    // The only pattern should be `lead.locationDescription ?` (conditional render)
    // There should be no bare property access like `.value={lead.locationDescription}`
    // outside of the guarded block
    const ungarded = page.match(
      /value=\{lead\.locationDescription\}/,
    );
    assert.equal(
      ungarded,
      null,
      "locationDescription should not be passed as a prop without a truthy guard",
    );
  });

  test("imagePrompt is only accessed inside a truthy guard", () => {
    const allAccesses = [...page.matchAll(/lead\.imagePrompt/g)];
    assert.ok(
      allAccesses.length > 0,
      "lead.imagePrompt should appear in the page",
    );

    // The conditional `lead.imagePrompt ?` should precede any prop usage
    const conditionalIdx = page.indexOf("{lead.imagePrompt ?");
    const propIdx = page.indexOf("value={lead.imagePrompt}");
    assert.ok(conditionalIdx > -1, "imagePrompt must have a conditional guard");
    assert.ok(propIdx > -1, "imagePrompt must be passed as value prop");
    assert.ok(
      conditionalIdx < propIdx,
      "conditional guard must precede the prop usage",
    );
  });

  test("no direct property method calls on optional enrichment fields", () => {
    // Ensure no .trim(), .length, .split() etc. on these fields without a guard
    const unsafeLoc = page.match(
      /lead\.locationDescription\.(trim|length|split|slice|toLowerCase)/,
    );
    assert.equal(
      unsafeLoc,
      null,
      "locationDescription should not have direct method calls (would throw when undefined)",
    );

    const unsafeImg = page.match(
      /lead\.imagePrompt\.(trim|length|split|slice|toLowerCase)/,
    );
    assert.equal(
      unsafeImg,
      null,
      "imagePrompt should not have direct method calls (would throw when undefined)",
    );
  });

  test("conditional blocks fall through to null (not undefined or false)", () => {
    // Verify ternary returns null — prevents React rendering "false" or "undefined" text
    assert.match(
      page,
      /lead\.locationDescription\s*\?[\s\S]*?:\s*null\s*\}/,
      "locationDescription block should fall through to null",
    );
    assert.match(
      page,
      /lead\.imagePrompt\s*\?[\s\S]*?:\s*null\s*\}/,
      "imagePrompt block should fall through to null",
    );
  });

  test("ImagePromptBlock is not rendered unconditionally", () => {
    // ImagePromptBlock should only appear inside a conditional block
    const componentUsages = [...page.matchAll(/<ImagePromptBlock/g)];
    assert.equal(
      componentUsages.length,
      1,
      "ImagePromptBlock should be used exactly once",
    );

    // The single usage must be inside the imagePrompt conditional
    const guardedBlock = page.match(
      /\{lead\.imagePrompt\s*\?\s*\(\s*\n?\s*<ImagePromptBlock/,
    );
    assert.ok(
      guardedBlock,
      "ImagePromptBlock must be rendered inside a lead.imagePrompt truthy guard",
    );
  });
});
