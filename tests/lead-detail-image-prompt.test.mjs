import { test, describe } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const page = readFileSync("src/app/leads/[id]/page.tsx", "utf-8");

describe("lead detail page – imagePrompt display", () => {
  test("conditionally renders imagePrompt block", () => {
    assert.match(
      page,
      /lead\.imagePrompt\s*\?/,
      "imagePrompt should be conditionally rendered",
    );
  });

  test("displays 'Image Generation Prompt' label", () => {
    assert.match(
      page,
      /Image Generation Prompt/,
      "should display 'Image Generation Prompt' label",
    );
  });

  test("uses a collapsible details element", () => {
    assert.match(
      page,
      /<details/,
      "should use a <details> element for collapsible treatment",
    );
    assert.match(
      page,
      /<summary/,
      "should use a <summary> element inside details",
    );
  });

  test("renders prompt text in a monospace pre block", () => {
    assert.match(
      page,
      /<pre[^>]*font-mono/,
      "should render prompt in a pre element with font-mono class",
    );
  });

  test("has a copy button with aria-label", () => {
    assert.match(
      page,
      /Copy image prompt/,
      "should have an accessible copy button with aria-label",
    );
  });

  test("uses navigator.clipboard.writeText for copy", () => {
    assert.match(
      page,
      /navigator\.clipboard\.writeText/,
      "should use clipboard API to copy text",
    );
  });

  test("imagePrompt is inside Business Details card", () => {
    const businessDetailsIdx = page.indexOf("Business Details");
    const imgPromptUsageIdx = page.indexOf("<ImagePromptBlock");
    assert.ok(businessDetailsIdx > -1, "Business Details card must exist");
    assert.ok(imgPromptUsageIdx > -1, "<ImagePromptBlock must be used");
    assert.ok(
      imgPromptUsageIdx > businessDetailsIdx,
      "<ImagePromptBlock usage should be inside the Business Details card",
    );
  });

  test("imagePrompt appears after source detail", () => {
    const sourceDetailIdx = page.indexOf("Source detail");
    const imgPromptIdx = page.indexOf("imagePrompt");
    assert.ok(sourceDetailIdx > -1, "Source detail must exist in page");
    assert.ok(imgPromptIdx > -1, "imagePrompt must exist in page");
    assert.ok(
      imgPromptIdx > sourceDetailIdx,
      "imagePrompt should appear after source detail",
    );
  });
});
