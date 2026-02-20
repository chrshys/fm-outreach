import { test, describe } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const page = readFileSync("src/app/leads/[id]/page.tsx", "utf-8");

describe("lead detail page – locationDescription display", () => {
  test("renders locationDescription when present", () => {
    assert.match(
      page,
      /lead\.locationDescription/,
      "page should reference lead.locationDescription",
    );
  });

  test("conditionally renders locationDescription block", () => {
    assert.match(
      page,
      /\{lead\.locationDescription\s*\?/,
      "locationDescription should be conditionally rendered",
    );
  });

  test("displays 'About this Location' label", () => {
    assert.match(
      page,
      /About this Location/,
      "should display 'About this Location' label",
    );
  });

  test("label uses font-medium class", () => {
    assert.match(
      page,
      /<span className="font-medium">About this Location:<\/span>/,
      "label should use font-medium styling",
    );
  });

  test("locationDescription appears after farmDescription", () => {
    const farmIdx = page.indexOf("farmDescription");
    const locIdx = page.indexOf("locationDescription");
    assert.ok(farmIdx > -1, "farmDescription must exist in page");
    assert.ok(locIdx > -1, "locationDescription must exist in page");
    assert.ok(
      locIdx > farmIdx,
      "locationDescription should appear after farmDescription",
    );
  });

  test("locationDescription is inside Business Details card", () => {
    const businessDetailsIdx = page.indexOf("Business Details");
    const locIdx = page.indexOf("locationDescription");
    assert.ok(businessDetailsIdx > -1, "Business Details card must exist");
    assert.ok(locIdx > -1, "locationDescription must exist");
    assert.ok(
      locIdx > businessDetailsIdx,
      "locationDescription should be inside the Business Details card",
    );
  });
});
