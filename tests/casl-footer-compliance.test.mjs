import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/email/generateEmail.ts", "utf8");
const settingsPageSource = fs.readFileSync("src/app/settings/page.tsx", "utf8");

// --- CASL footer template structure ---

test("CASL footer template starts with horizontal rule separator", () => {
  assert.match(source, /CASL_FOOTER_TEMPLATE[\s\S]*---/);
});

test("CASL footer includes {{senderName}} placeholder", () => {
  assert.match(source, /CASL_FOOTER_TEMPLATE[\s\S]*\{\{senderName\}\}/);
});

test("CASL footer includes {{businessName}} placeholder", () => {
  assert.match(source, /CASL_FOOTER_TEMPLATE[\s\S]*\{\{businessName\}\}/);
});

test("CASL footer includes {{senderAddress}} placeholder", () => {
  assert.match(source, /CASL_FOOTER_TEMPLATE[\s\S]*\{\{senderAddress\}\}/);
});

test("CASL footer includes {{senderContact}} placeholder for phone/email", () => {
  assert.match(source, /CASL_FOOTER_TEMPLATE[\s\S]*\{\{senderContact\}\}/);
});

test("CASL footer includes [Unsubscribe] placeholder text", () => {
  assert.match(source, /CASL_FOOTER_TEMPLATE[\s\S]*\[Unsubscribe\]/);
});

// --- buildCaslFooter function ---

test("buildCaslFooter accepts opts object with all CASL fields", () => {
  assert.match(source, /function\s+buildCaslFooter\(opts:\s*\{/);
  assert.match(source, /senderName:\s*string/);
  assert.match(source, /businessName:\s*string/);
  assert.match(source, /senderAddress:\s*string/);
  assert.match(source, /senderEmail:\s*string/);
  assert.match(source, /senderPhone:\s*string/);
});

test("buildCaslFooter builds contact line from email and phone", () => {
  assert.match(source, /contactParts/);
  assert.match(source, /opts\.senderEmail/);
  assert.match(source, /opts\.senderPhone/);
});

test("buildCaslFooter joins contact parts with pipe separator", () => {
  assert.match(source, /contactParts\.join\("\s*\|\s*"\)/);
});

// --- Settings key usage (snake_case) ---

test("reads settings using snake_case keys (not camelCase)", () => {
  assert.match(source, /settings\.sender_name/);
  assert.match(source, /settings\.business_name/);
  assert.match(source, /settings\.sender_address/);
  assert.match(source, /settings\.sender_email/);
  assert.match(source, /settings\.sender_phone/);
});

test("does NOT use camelCase settings keys", () => {
  // Make sure the old camelCase pattern is not used for settings access
  assert.doesNotMatch(source, /settings\.senderName/);
  assert.doesNotMatch(source, /settings\.senderAddress/);
  assert.doesNotMatch(source, /settings\.unsubscribeUrl/);
});

// --- Settings page includes new fields ---

test("settings page has business_name input field", () => {
  assert.match(settingsPageSource, /id="business_name"/);
  assert.match(settingsPageSource, /businessName/);
});

test("settings page has sender_phone input field", () => {
  assert.match(settingsPageSource, /id="sender_phone"/);
  assert.match(settingsPageSource, /senderPhone/);
});

test("settings page saves business_name in setBatch", () => {
  assert.match(settingsPageSource, /key:\s*"business_name"/);
});

test("settings page saves sender_phone in setBatch", () => {
  assert.match(settingsPageSource, /key:\s*"sender_phone"/);
});

test("settings page loads business_name from settings", () => {
  assert.match(settingsPageSource, /settings\.business_name/);
});

test("settings page loads sender_phone from settings", () => {
  assert.match(settingsPageSource, /settings\.sender_phone/);
});

// --- Generation prompt references CASL ---

test("generation prompt instructs AI to append CASL footer", () => {
  assert.match(source, /CASL compliance footer/);
  assert.match(source, /MUST be appended/);
});

test("generation prompt tells AI not to count footer words", () => {
  assert.match(source, /NOT counting the CASL footer/);
});

test("generation prompt tells AI not to modify footer", () => {
  assert.match(source, /do NOT modify it/);
});

// --- Footer is passed into generation prompt ---

test("caslFooter variable is interpolated into generation system prompt", () => {
  assert.match(source, /CASL footer to append:\n\$\{caslFooter\}/);
});

test("buildCaslFooter is called with all five settings fields", () => {
  assert.match(source, /buildCaslFooter\(\{/);
  assert.match(source, /senderName,/);
  assert.match(source, /businessName,/);
  assert.match(source, /senderAddress,/);
  assert.match(source, /senderEmail,/);
  assert.match(source, /senderPhone,/);
});
