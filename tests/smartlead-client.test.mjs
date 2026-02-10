import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/smartlead/client.ts", "utf8");

// --- Base URL and auth ---

test("uses correct Smartlead base URL", () => {
  assert.match(source, /https:\/\/server\.smartlead\.ai\/api\/v1/);
});

test("reads SMARTLEAD_API_KEY from environment", () => {
  assert.match(source, /process\.env\.SMARTLEAD_API_KEY/);
});

test("throws when SMARTLEAD_API_KEY is not configured", () => {
  assert.match(source, /SMARTLEAD_API_KEY is not configured/);
});

test("appends api_key as query parameter", () => {
  assert.match(source, /api_key=\$\{apiKey\}/);
});

// --- smartleadFetch helper ---

test("smartleadFetch sets Content-Type to application/json", () => {
  assert.match(source, /"Content-Type":\s*"application\/json"/);
});

test("delegates rate limiting to rateLimiter via rateLimitedFetch", () => {
  assert.match(source, /import\s*\{\s*rateLimitedFetch\s*\}\s*from\s*["']\.\/rateLimiter["']/);
  assert.match(source, /rateLimitedFetch\(url,/);
});

test("handles non-OK API responses by throwing with status code", () => {
  assert.match(source, /!response\.ok/);
  assert.match(source, /Smartlead\s+API\s+error/);
  assert.match(source, /response\.status/);
});

test("attempts to parse error detail from response body", () => {
  assert.match(source, /body\.error\s*\?\?\s*body\.message/);
});

// --- createCampaign ---

test("createCampaign sends POST to /campaigns/create", () => {
  assert.match(source, /\/campaigns\/create/);
  assert.match(source, /method:\s*"POST"/);
});

test("createCampaign sends name in request body", () => {
  assert.match(source, /JSON\.stringify\(\{\s*name\s*\}\)/);
});

test("exports createCampaign function", () => {
  assert.match(source, /export\s+async\s+function\s+createCampaign\(/);
});

// --- updateCampaignSequence ---

test("updateCampaignSequence sends POST to /campaigns/{id}/sequences", () => {
  assert.match(source, /\/campaigns\/\$\{campaignId\}\/sequences/);
});

test("updateCampaignSequence sends sequences in request body", () => {
  assert.match(source, /JSON\.stringify\(\{\s*sequences\s*\}\)/);
});

test("exports updateCampaignSequence function", () => {
  assert.match(
    source,
    /export\s+async\s+function\s+updateCampaignSequence\(/,
  );
});

// --- addLeadsToCampaign ---

test("addLeadsToCampaign sends POST to /campaigns/{id}/leads", () => {
  assert.match(source, /\/campaigns\/\$\{campaignId\}\/leads/);
});

test("addLeadsToCampaign enforces max 100 leads per request", () => {
  assert.match(source, /MAX_LEADS_PER_REQUEST\s*=\s*100/);
  assert.match(source, /leads\.length\s*>\s*MAX_LEADS_PER_REQUEST/);
});

test("addLeadsToCampaign throws when exceeding lead limit", () => {
  assert.match(
    source,
    /Cannot add more than \$\{MAX_LEADS_PER_REQUEST\} leads per request/,
  );
});

test("addLeadsToCampaign sends leads as lead_list in body", () => {
  assert.match(source, /lead_list:\s*leads/);
});

test("exports addLeadsToCampaign function", () => {
  assert.match(source, /export\s+async\s+function\s+addLeadsToCampaign\(/);
});

// --- updateCampaignStatus ---

test("updateCampaignStatus sends POST to /campaigns/{id}/status", () => {
  assert.match(source, /\/campaigns\/\$\{campaignId\}\/status/);
});

test("updateCampaignStatus sends status in request body", () => {
  assert.match(source, /JSON\.stringify\(\{\s*status\s*\}\)/);
});

test("exports updateCampaignStatus function", () => {
  assert.match(source, /export\s+async\s+function\s+updateCampaignStatus\(/);
});

test("SmartleadCampaignStatus type includes START, PAUSE, STOP", () => {
  assert.match(source, /"START"\s*\|\s*"PAUSE"\s*\|\s*"STOP"/);
});

// --- getCampaignAnalytics ---

test("getCampaignAnalytics calls GET on /campaigns/{id}/analytics", () => {
  assert.match(source, /\/campaigns\/\$\{campaignId\}\/analytics/);
});

test("exports getCampaignAnalytics function", () => {
  assert.match(source, /export\s+async\s+function\s+getCampaignAnalytics\(/);
});

// --- getLeadStatus ---

test("getLeadStatus calls /campaigns/{id}/leads with email param", () => {
  assert.match(
    source,
    /\/campaigns\/\$\{campaignId\}\/leads\?email=\$\{encodedEmail\}/,
  );
});

test("getLeadStatus encodes email for URL safety", () => {
  assert.match(source, /encodeURIComponent\(leadEmail\)/);
});

test("exports getLeadStatus function", () => {
  assert.match(source, /export\s+async\s+function\s+getLeadStatus\(/);
});

// --- Types ---

test("exports SmartleadCampaign type with id and name", () => {
  assert.match(source, /export\s+type\s+SmartleadCampaign\s*=/);
  assert.match(source, /id:\s*number/);
  assert.match(source, /name:\s*string/);
});

test("exports SmartleadSequence type", () => {
  assert.match(source, /export\s+type\s+SmartleadSequence\s*=/);
  assert.match(source, /seq_number:\s*number/);
  assert.match(source, /subject:\s*string/);
  assert.match(source, /email_body:\s*string/);
});

test("exports SmartleadLead type with email field", () => {
  assert.match(source, /export\s+type\s+SmartleadLead\s*=/);
  assert.match(source, /email:\s*string/);
});

test("exports SmartleadAnalytics type with campaign metrics", () => {
  assert.match(source, /export\s+type\s+SmartleadAnalytics\s*=/);
  assert.match(source, /sent_count/);
  assert.match(source, /open_count/);
  assert.match(source, /click_count/);
  assert.match(source, /reply_count/);
  assert.match(source, /bounce_count/);
});

test("exports SmartleadLeadStatus type", () => {
  assert.match(source, /export\s+type\s+SmartleadLeadStatus\s*=/);
  assert.match(source, /email:\s*string/);
  assert.match(source, /status\?:\s*string/);
});

test("exports SmartleadLeadUploadResponse type", () => {
  assert.match(source, /export\s+type\s+SmartleadLeadUploadResponse\s*=/);
  assert.match(source, /upload_count/);
});
