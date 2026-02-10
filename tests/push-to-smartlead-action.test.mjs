import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("convex/campaigns/pushToSmartlead.ts", "utf8");

// --- Exports and structure ---

test("pushToSmartlead is exported as a public action", () => {
  assert.match(source, /export\s+const\s+pushToSmartlead\s*=\s*action\(/);
});

test("pushToSmartlead accepts campaignId argument", () => {
  assert.match(source, /campaignId:\s*v\.id\("campaigns"\)/);
});

test("pushToSmartlead returns Promise<PushToSmartleadResult>", () => {
  assert.match(source, /Promise<PushToSmartleadResult>/);
});

test("exports PushToSmartleadResult type", () => {
  assert.match(source, /export\s+type\s+PushToSmartleadResult\s*=/);
});

test("PushToSmartleadResult includes smartleadCampaignId, sequenceSteps, leadsAdded", () => {
  assert.match(source, /smartleadCampaignId:\s*number/);
  assert.match(source, /sequenceSteps:\s*number/);
  assert.match(source, /leadsAdded:\s*number/);
});

// --- Internal mutations ---

test("setCampaignSmartleadId is exported as an internalMutation", () => {
  assert.match(
    source,
    /export\s+const\s+setCampaignSmartleadId\s*=\s*internalMutation\(/,
  );
});

test("setCampaignSmartleadId patches smartleadCampaignId on campaign", () => {
  assert.match(source, /smartleadCampaignId:\s*args\.smartleadCampaignId/);
});

test("setCampaignPushed is exported as an internalMutation", () => {
  assert.match(
    source,
    /export\s+const\s+setCampaignPushed\s*=\s*internalMutation\(/,
  );
});

test("setCampaignPushed patches campaign status to pushed", () => {
  assert.match(source, /status:\s*"pushed"/);
});

test("setLeadSmartleadCampaignId is exported as an internalMutation", () => {
  assert.match(
    source,
    /export\s+const\s+setLeadSmartleadCampaignId\s*=\s*internalMutation\(/,
  );
});

test("setLeadSmartleadCampaignId patches each lead with smartleadCampaignId", () => {
  assert.match(source, /for\s*\(const\s+leadId\s+of\s+args\.leadIds\)/);
  assert.match(source, /ctx\.db\.patch\(leadId/);
});

// --- Validation ---

test("fetches campaign using campaigns.get query", () => {
  assert.match(source, /api\.campaigns\.get/);
});

test("throws when campaign not found", () => {
  assert.match(source, /Campaign not found/);
});

test("throws when campaign is not in draft status", () => {
  assert.match(source, /only draft campaigns can be pushed/);
});

test("throws when campaign already has a smartleadCampaignId", () => {
  assert.match(source, /already pushed to Smartlead/);
});

test("throws when no approved emails exist", () => {
  assert.match(source, /No approved emails/);
});

// --- Step 1: Create Smartlead campaign ---

test("creates campaign in Smartlead via createCampaign client function", () => {
  assert.match(source, /await\s+createCampaign\(campaign\.name\)/);
});

test("saves smartleadCampaignId immediately after creation", () => {
  assert.match(source, /setCampaignSmartleadId/);
  assert.match(source, /String\(smartleadCampaignId\)/);
});

// --- Step 2: Push email sequence ---

test("builds sequences from campaign templates with proper ordering", () => {
  assert.match(source, /SmartleadSequence\[\]/);
  assert.match(source, /seq_number/);
  assert.match(source, /seq_delay_details/);
});

test("sequences include delay_in_days for each step", () => {
  assert.match(source, /delay_in_days/);
  assert.match(source, /SEQUENCE_DELAYS/);
});

test("pushes sequences via updateCampaignSequence", () => {
  assert.match(source, /await\s+updateCampaignSequence\(smartleadCampaignId/);
});

test("sorts sequences by seq_number", () => {
  assert.match(source, /sequences\.sort\(\(a,\s*b\)\s*=>\s*a\.seq_number\s*-\s*b\.seq_number\)/);
});

// --- Step 3: Add leads in batches ---

test("defines MAX_LEADS_PER_BATCH constant of 100", () => {
  assert.match(source, /MAX_LEADS_PER_BATCH\s*=\s*100/);
});

test("batches leads into groups of MAX_LEADS_PER_BATCH", () => {
  assert.match(source, /smartleadLeads\.slice\(i,\s*i\s*\+\s*MAX_LEADS_PER_BATCH\)/);
});

test("calls addLeadsToCampaign for each batch", () => {
  assert.match(source, /await\s+addLeadsToCampaign\(smartleadCampaignId/);
});

test("builds SmartleadLead objects with email, first_name, last_name, company_name", () => {
  assert.match(source, /email:\s*lead\.contactEmail/);
  assert.match(source, /first_name:\s*firstName/);
  assert.match(source, /last_name:\s*lastName/);
  assert.match(source, /company_name:\s*lead\.name/);
});

test("includes custom fields for personalization (subject, email_body, city, products)", () => {
  assert.match(source, /subject:\s*email\.subject/);
  assert.match(source, /email_body:\s*email\.body/);
  assert.match(source, /city:\s*lead\.city/);
  assert.match(source, /products:/);
});

test("tags leads with smartleadCampaignId after each batch", () => {
  assert.match(source, /setLeadSmartleadCampaignId/);
});

test("throws when no leads with email addresses are available", () => {
  assert.match(source, /No leads with email addresses to add/);
});

// --- Step 4: Update campaign status ---

test("sets campaign status to pushed via setCampaignPushed mutation", () => {
  assert.match(source, /setCampaignPushed/);
  assert.match(source, /campaignId:\s*args\.campaignId/);
});

// --- Does NOT auto-launch ---

test("does NOT call updateCampaignStatus to START the campaign", () => {
  assert.doesNotMatch(source, /updateCampaignStatus\(/);
  assert.doesNotMatch(source, /"START"/);
});

test("returns smartleadCampaignId so user can review before launching", () => {
  assert.match(source, /smartleadCampaignId,/);
  assert.match(source, /sequenceSteps:\s*sequences\.length/);
  assert.match(source, /leadsAdded:\s*totalAdded/);
});

// --- Imports ---

test("imports action and internalMutation from generated server", () => {
  assert.match(source, /import.*action.*internalMutation.*from.*_generated\/server/);
});

test("imports api and internal from generated api", () => {
  assert.match(source, /import.*api.*internal.*from.*_generated\/api/);
});

test("imports v from convex/values", () => {
  assert.match(source, /import.*v.*from.*convex\/values/);
});

test("imports createCampaign, updateCampaignSequence, addLeadsToCampaign from smartlead client", () => {
  assert.match(source, /import[\s\S]*createCampaign[\s\S]*from.*smartlead\/client/);
  assert.match(source, /import[\s\S]*updateCampaignSequence[\s\S]*from.*smartlead\/client/);
  assert.match(source, /import[\s\S]*addLeadsToCampaign[\s\S]*from.*smartlead\/client/);
});

test("imports SmartleadSequence and SmartleadLead types from smartlead client", () => {
  assert.match(source, /SmartleadSequence/);
  assert.match(source, /SmartleadLead/);
});

// --- Logging ---

test("logs progress at each major step", () => {
  const logMatches = source.match(/console\.log/g);
  assert.ok(logMatches && logMatches.length >= 4, "should have at least 4 log statements");
});

test("logs include [pushToSmartlead] prefix for traceability", () => {
  assert.match(source, /\[pushToSmartlead\]/);
});

// --- Approved emails workflow ---

test("fetches approved emails using listApprovedByCampaign query", () => {
  assert.match(source, /api\.generatedEmails\.listApprovedByCampaign/);
});

test("loads templates via emailTemplates.get for sequence building", () => {
  assert.match(source, /api\.emailTemplates\.get/);
});

test("deduplicates lead IDs from approved emails", () => {
  assert.match(source, /new\s+Set\(approvedEmails\.map/);
});
