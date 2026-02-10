import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/email/generateEmail.ts", "utf8");

// --- Action structure ---

test("generateEmail is exported as an action", () => {
  assert.match(source, /export\s+const\s+generateEmail\s*=\s*action\(/);
});

test("action accepts leadId and templateId args", () => {
  assert.match(source, /leadId:\s*v\.id\("leads"\)/);
  assert.match(source, /templateId:\s*v\.id\("emailTemplates"\)/);
});

test("action returns Promise<GeneratedEmail>", () => {
  assert.match(source, /Promise<GeneratedEmail>/);
});

// --- Type exports ---

test("exports LeadAnalysis type with all required fields", () => {
  assert.match(source, /export\s+type\s+LeadAnalysis\s*=/);
  assert.match(source, /specialization:\s*string/);
  assert.match(source, /salesChannels:\s*string\[\]/);
  assert.match(source, /sellsOnline:\s*boolean/);
  assert.match(source, /valueProp:\s*string/);
  assert.match(source, /connectionPoint:\s*string/);
});

test("exports GeneratedEmail type with subject and body", () => {
  assert.match(source, /export\s+type\s+GeneratedEmail\s*=/);
  assert.match(source, /subject:\s*string/);
  assert.match(source, /body:\s*string/);
});

// --- Two-model approach ---

test("uses claude-haiku-4-5-20251001 for analysis (Prompt 1)", () => {
  assert.match(source, /claude-haiku-4-5-20251001/);
  assert.match(source, /ANALYSIS_MODEL/);
});

test("uses claude-sonnet-4-5-20250929 for generation (Prompt 2)", () => {
  assert.match(source, /claude-sonnet-4-5-20250929/);
  assert.match(source, /GENERATION_MODEL/);
});

test("calls Claude twice — once for analysis, once for generation", () => {
  const awaitCalls = source.match(/await\s+callClaude\(/g);
  assert.ok(awaitCalls, "callClaude should be awaited");
  assert.equal(awaitCalls.length, 2, "callClaude should be called exactly twice");
});

test("first call uses ANALYSIS_MODEL, second uses GENERATION_MODEL", () => {
  const firstCall = source.indexOf("ANALYSIS_MODEL");
  const secondCall = source.indexOf("GENERATION_MODEL");
  assert.ok(firstCall > 0, "ANALYSIS_MODEL should be used");
  assert.ok(secondCall > 0, "GENERATION_MODEL should be used");
  // In the await callClaude calls (not the function definition)
  const callClaudeIndices = [];
  let idx = 0;
  while ((idx = source.indexOf("await callClaude(", idx)) !== -1) {
    callClaudeIndices.push(idx);
    idx += 1;
  }
  assert.equal(callClaudeIndices.length, 2, "two callClaude invocations");
});

// --- API integration ---

test("calls Anthropic Messages API", () => {
  assert.match(source, /https:\/\/api\.anthropic\.com\/v1\/messages/);
});

test("reads ANTHROPIC_API_KEY from environment", () => {
  assert.match(source, /process\.env\.ANTHROPIC_API_KEY/);
});

test("throws when ANTHROPIC_API_KEY is not configured", () => {
  assert.match(source, /ANTHROPIC_API_KEY is not configured/);
});

test("sends correct headers to Anthropic API", () => {
  assert.match(source, /x-api-key/);
  assert.match(source, /anthropic-version/);
  assert.match(source, /2023-06-01/);
  assert.match(source, /content-type.*application\/json/);
});

test("handles rate limits (HTTP 429)", () => {
  assert.match(source, /response\.status\s*===\s*429/);
  assert.match(source, /rate\s+limit\s+exceeded/i);
});

test("handles non-OK API responses", () => {
  assert.match(source, /!response\.ok/);
  assert.match(source, /Anthropic\s+API\s+error/);
});

test("handles API-level errors from response body", () => {
  assert.match(source, /data\.error/);
  assert.match(source, /data\.error\.message/);
});

// --- Lead & template fetching ---

test("fetches lead by ID", () => {
  assert.match(source, /api\.leads\.get/);
  assert.match(source, /leadId:\s*args\.leadId/);
});

test("throws when lead not found", () => {
  assert.match(source, /Lead not found/);
});

test("fetches template by ID", () => {
  assert.match(source, /api\.emailTemplates\.get/);
  assert.match(source, /id:\s*args\.templateId/);
});

test("throws when template not found", () => {
  assert.match(source, /Template not found/);
});

// --- CASL settings ---

test("fetches all settings for CASL footer", () => {
  assert.match(source, /api\.settings\.getAll/);
});

test("reads sender_name from settings", () => {
  assert.match(source, /settings\.sender_name/);
});

test("reads business_name from settings", () => {
  assert.match(source, /settings\.business_name/);
});

test("reads sender_address from settings", () => {
  assert.match(source, /settings\.sender_address/);
});

test("reads sender_email from settings", () => {
  assert.match(source, /settings\.sender_email/);
});

test("reads sender_phone from settings", () => {
  assert.match(source, /settings\.sender_phone/);
});

// --- Prompt 1: Analysis ---

test("analysis prompt requests specialization, salesChannels, sellsOnline, valueProp, connectionPoint", () => {
  assert.match(source, /specialization/);
  assert.match(source, /salesChannels/);
  assert.match(source, /sellsOnline/);
  assert.match(source, /valueProp/);
  assert.match(source, /connectionPoint/);
  assert.match(source, /Respond ONLY with valid JSON/);
});

test("builds lead context with farm details", () => {
  assert.match(source, /function\s+buildLeadContext\(/);
  assert.match(source, /Farm name/);
  assert.match(source, /Contact name/);
  assert.match(source, /City/);
  assert.match(source, /Products/);
  assert.match(source, /Sales channels/);
  assert.match(source, /Sells online/);
  assert.match(source, /Farm description/);
  assert.match(source, /Social links/);
});

test("parses analysis response with safe type coercion", () => {
  assert.match(source, /function\s+parseAnalysis\(/);
  assert.match(source, /JSON\.parse\(text\)/);
  assert.match(source, /typeof\s+parsed\.specialization\s*===\s*"string"/);
  assert.match(source, /typeof\s+parsed\.sellsOnline\s*===\s*"boolean"/);
  assert.match(source, /typeof\s+parsed\.valueProp\s*===\s*"string"/);
  assert.match(source, /typeof\s+parsed\.connectionPoint\s*===\s*"string"/);
});

test("throws when analysis parsing fails", () => {
  assert.match(source, /Failed to parse lead analysis/);
});

// --- Prompt 2: Generation ---

test("generation prompt includes word count constraint (50-125 words)", () => {
  assert.match(source, /50-125\s*words/);
});

test("generation prompt specifies warm rural tone", () => {
  assert.match(source, /warm.*rural/i);
  assert.match(source, /neighbor-to-neighbor/);
});

test("generation prompt requires referencing specific farm details", () => {
  assert.match(source, /Reference specific farm details/);
});

test("generation prompt includes CASL footer requirement", () => {
  assert.match(source, /CASL/);
  assert.match(source, /footer/i);
});

test("CASL footer template includes sender name, business name, address, contact, and unsubscribe", () => {
  assert.match(source, /\{\{senderName\}\}/);
  assert.match(source, /\{\{businessName\}\}/);
  assert.match(source, /\{\{senderAddress\}\}/);
  assert.match(source, /\{\{senderContact\}\}/);
  assert.match(source, /\[Unsubscribe\]/);
});

test("builds CASL footer from settings values", () => {
  assert.match(source, /function\s+buildCaslFooter\(/);
  assert.match(source, /senderName/);
  assert.match(source, /businessName/);
  assert.match(source, /senderAddress/);
  assert.match(source, /senderEmail/);
  assert.match(source, /senderPhone/);
});

// --- Template placeholder substitution ---

test("substitutes template placeholders with lead data", () => {
  assert.match(source, /replace\(\/\\{\\{farmName\\}\\}\/g/);
  assert.match(source, /replace\(\/\\{\\{contactName\\}\\}\/g/);
  assert.match(source, /replace\(\/\\{\\{city\\}\\}\/g/);
  assert.match(source, /replace\(\/\\{\\{products\\}\\}\/g/);
  assert.match(source, /replace\(\/\\{\\{salesChannels\\}\\}\/g/);
  assert.match(source, /replace\(\/\\{\\{sellsOnline\\}\\}\/g/);
  assert.match(source, /replace\(\/\\{\\{farmDescription\\}\\}\/g/);
  assert.match(source, /replace\(\/\\{\\{socialLinks\\}\\}\/g/);
});

// --- Result parsing ---

test("parses generated email response with subject and body", () => {
  assert.match(source, /function\s+parseGeneratedEmail\(/);
  assert.match(source, /typeof\s+parsed\.subject\s*===\s*"string"/);
  assert.match(source, /typeof\s+parsed\.body\s*===\s*"string"/);
});

test("throws when email parsing fails", () => {
  assert.match(source, /Failed to parse generated email/);
});

test("throws when generated email is missing subject or body", () => {
  assert.match(source, /missing subject or body/);
});

// --- Imports ---

test("imports action from generated server", () => {
  assert.match(source, /import.*action.*from.*_generated\/server/);
});

test("imports api from generated api", () => {
  assert.match(source, /import.*api.*from.*_generated\/api/);
});

test("imports v from convex/values", () => {
  assert.match(source, /import.*v.*from.*convex\/values/);
});

// --- callClaude helper ---

test("callClaude sends system prompt and user message", () => {
  assert.match(source, /function\s+callClaude\(/);
  assert.match(source, /system:\s*systemPrompt/);
  assert.match(source, /role:\s*"user"/);
  assert.match(source, /content:\s*userMessage/);
});

test("callClaude sends POST request with max_tokens", () => {
  assert.match(source, /method:\s*"POST"/);
  assert.match(source, /max_tokens:\s*maxTokens/);
});

test("callClaude extracts text from response content blocks", () => {
  assert.match(source, /data\.content/);
  assert.match(source, /b\.type\s*===\s*"text"/);
  assert.match(source, /textBlock\?\.text/);
});

test("callClaude throws when no text content in response", () => {
  assert.match(source, /No text content in Anthropic response/);
});
