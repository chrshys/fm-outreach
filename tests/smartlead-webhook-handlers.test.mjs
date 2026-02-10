import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/smartlead/webhookHandlers.ts", "utf8");

// --- Module structure ---

test("imports internalMutation from generated server", () => {
  assert.match(
    source,
    /import\s*\{[^}]*internalMutation[^}]*\}\s*from\s*["']\.\.\/\_generated\/server["']/,
  );
});

test("imports MutationCtx from generated server", () => {
  assert.match(source, /MutationCtx/);
});

test("imports Id from generated dataModel", () => {
  assert.match(
    source,
    /import\s*\{[^}]*Id[^}]*\}\s*from\s*["']\.\.\/\_generated\/dataModel["']/,
  );
});

// --- Handler exports ---

test("exports handleEmailSent as internalMutation", () => {
  assert.match(
    source,
    /export\s+const\s+handleEmailSent\s*=\s*internalMutation/,
  );
});

test("exports handleEmailOpen as internalMutation", () => {
  assert.match(
    source,
    /export\s+const\s+handleEmailOpen\s*=\s*internalMutation/,
  );
});

test("exports handleEmailLinkClick as internalMutation", () => {
  assert.match(
    source,
    /export\s+const\s+handleEmailLinkClick\s*=\s*internalMutation/,
  );
});

test("exports handleEmailReply as internalMutation", () => {
  assert.match(
    source,
    /export\s+const\s+handleEmailReply\s*=\s*internalMutation/,
  );
});

test("exports handleLeadUnsubscribed as internalMutation", () => {
  assert.match(
    source,
    /export\s+const\s+handleLeadUnsubscribed\s*=\s*internalMutation/,
  );
});

test("exports handleLeadCategoryUpdated as internalMutation", () => {
  assert.match(
    source,
    /export\s+const\s+handleLeadCategoryUpdated\s*=\s*internalMutation/,
  );
});

// --- EMAIL_SENT handler ---

test("EMAIL_SENT creates email record via ctx.db.insert emails", () => {
  // Verify the handler inserts into the emails table
  const emailSentSection = source.slice(
    source.indexOf("handleEmailSent"),
    source.indexOf("handleEmailOpen"),
  );
  assert.match(emailSentSection, /ctx\.db\.insert\(["']emails["']/);
});

test("EMAIL_SENT logs email_sent activity", () => {
  const emailSentSection = source.slice(
    source.indexOf("handleEmailSent"),
    source.indexOf("handleEmailOpen"),
  );
  assert.match(emailSentSection, /type:\s*["']email_sent["']/);
});

test("EMAIL_SENT updates status to outreach_started when lead is enriched", () => {
  const emailSentSection = source.slice(
    source.indexOf("handleEmailSent"),
    source.indexOf("handleEmailOpen"),
  );
  assert.match(emailSentSection, /lead\.status\s*===\s*["']enriched["']/);
  assert.match(emailSentSection, /status:\s*["']outreach_started["']/);
});

test("EMAIL_SENT is idempotent — checks for existing email record", () => {
  const emailSentSection = source.slice(
    source.indexOf("handleEmailSent"),
    source.indexOf("handleEmailOpen"),
  );
  assert.match(emailSentSection, /findEmailRecord/);
  assert.match(emailSentSection, /if\s*\(existing\)/);
});

test("EMAIL_SENT sets sentAt on email record", () => {
  const emailSentSection = source.slice(
    source.indexOf("handleEmailSent"),
    source.indexOf("handleEmailOpen"),
  );
  assert.match(emailSentSection, /sentAt/);
});

test("EMAIL_SENT logs status_changed activity when promoting to outreach_started", () => {
  const emailSentSection = source.slice(
    source.indexOf("handleEmailSent"),
    source.indexOf("handleEmailOpen"),
  );
  assert.match(emailSentSection, /type:\s*["']status_changed["']/);
  assert.match(emailSentSection, /enriched.*outreach_started/);
});

// --- EMAIL_OPEN handler ---

test("EMAIL_OPEN sets openedAt on email record", () => {
  const emailOpenSection = source.slice(
    source.indexOf("handleEmailOpen"),
    source.indexOf("handleEmailLinkClick"),
  );
  assert.match(emailOpenSection, /openedAt/);
  assert.match(emailOpenSection, /ctx\.db\.patch/);
});

test("EMAIL_OPEN is idempotent — only records first open", () => {
  const emailOpenSection = source.slice(
    source.indexOf("handleEmailOpen"),
    source.indexOf("handleEmailLinkClick"),
  );
  assert.match(emailOpenSection, /emailRecord\.openedAt/);
});

test("EMAIL_OPEN logs email_opened activity", () => {
  const emailOpenSection = source.slice(
    source.indexOf("handleEmailOpen"),
    source.indexOf("handleEmailLinkClick"),
  );
  assert.match(emailOpenSection, /type:\s*["']email_opened["']/);
});

// --- EMAIL_LINK_CLICK handler ---

test("EMAIL_LINK_CLICK sets clickedAt on email record", () => {
  const clickSection = source.slice(
    source.indexOf("handleEmailLinkClick"),
    source.indexOf("handleEmailReply"),
  );
  assert.match(clickSection, /clickedAt/);
  assert.match(clickSection, /ctx\.db\.patch/);
});

test("EMAIL_LINK_CLICK is idempotent — only records first click", () => {
  const clickSection = source.slice(
    source.indexOf("handleEmailLinkClick"),
    source.indexOf("handleEmailReply"),
  );
  assert.match(clickSection, /emailRecord\.clickedAt/);
});

test("EMAIL_LINK_CLICK logs email_clicked activity", () => {
  const clickSection = source.slice(
    source.indexOf("handleEmailLinkClick"),
    source.indexOf("handleEmailReply"),
  );
  assert.match(clickSection, /type:\s*["']email_clicked["']/);
});

// --- EMAIL_REPLY handler ---

test("EMAIL_REPLY sets repliedAt on email record", () => {
  const replySection = source.slice(
    source.indexOf("handleEmailReply"),
    source.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(replySection, /repliedAt/);
  assert.match(replySection, /ctx\.db\.patch/);
});

test("EMAIL_REPLY is idempotent — only records first reply", () => {
  const replySection = source.slice(
    source.indexOf("handleEmailReply"),
    source.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(replySection, /emailRecord\.repliedAt/);
});

test("EMAIL_REPLY logs email_replied activity", () => {
  const replySection = source.slice(
    source.indexOf("handleEmailReply"),
    source.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(replySection, /type:\s*["']email_replied["']/);
});

test("EMAIL_REPLY updates lead status to replied", () => {
  const replySection = source.slice(
    source.indexOf("handleEmailReply"),
    source.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(replySection, /status:\s*["']replied["']/);
});

test("EMAIL_REPLY does not downgrade from meeting_booked or onboarded", () => {
  const replySection = source.slice(
    source.indexOf("handleEmailReply"),
    source.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(replySection, /meeting_booked/);
  assert.match(replySection, /onboarded/);
});

test("EMAIL_REPLY uses time_replied timestamp when available", () => {
  const replySection = source.slice(
    source.indexOf("handleEmailReply"),
    source.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(replySection, /time_replied/);
});

// --- LEAD_UNSUBSCRIBED handler ---

test("LEAD_UNSUBSCRIBED updates lead status to declined", () => {
  const unsubSection = source.slice(
    source.indexOf("handleLeadUnsubscribed"),
    source.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(unsubSection, /status:\s*["']declined["']/);
});

test("LEAD_UNSUBSCRIBED adds email to block list", () => {
  const unsubSection = source.slice(
    source.indexOf("handleLeadUnsubscribed"),
    source.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(unsubSection, /ctx\.db\.insert\(["']emailBlockList["']/);
});

test("LEAD_UNSUBSCRIBED checks for existing block list entry (idempotent)", () => {
  const unsubSection = source.slice(
    source.indexOf("handleLeadUnsubscribed"),
    source.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(unsubSection, /emailBlockList/);
  assert.match(unsubSection, /existingBlock/);
});

test("LEAD_UNSUBSCRIBED normalizes email to lowercase", () => {
  const unsubSection = source.slice(
    source.indexOf("handleLeadUnsubscribed"),
    source.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(unsubSection, /email\.toLowerCase\(\)/);
});

test("LEAD_UNSUBSCRIBED logs activity for unsubscribe", () => {
  const unsubSection = source.slice(
    source.indexOf("handleLeadUnsubscribed"),
    source.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(unsubSection, /unsubscribed/);
  assert.match(unsubSection, /ctx\.db\.insert\(["']activities["']/);
});

test("LEAD_UNSUBSCRIBED skips status update if already declined", () => {
  const unsubSection = source.slice(
    source.indexOf("handleLeadUnsubscribed"),
    source.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(unsubSection, /lead\.status\s*!==\s*["']declined["']/);
});

// --- LEAD_CATEGORY_UPDATED handler ---

test("LEAD_CATEGORY_UPDATED defines category-to-status mapping", () => {
  assert.match(source, /CATEGORY_STATUS_MAP/);
});

test("LEAD_CATEGORY_UPDATED maps 'interested' to 'replied'", () => {
  assert.match(source, /interested.*:\s*["']replied["']/);
});

test("LEAD_CATEGORY_UPDATED maps 'not_interested' to 'not_interested'", () => {
  assert.match(source, /not_interested.*:\s*["']not_interested["']/);
});

test("LEAD_CATEGORY_UPDATED maps 'do_not_contact' to 'declined'", () => {
  assert.match(source, /do_not_contact.*:\s*["']declined["']/);
});

test("LEAD_CATEGORY_UPDATED logs note_added activity for category change", () => {
  const catSection = source.slice(
    source.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(catSection, /type:\s*["']note_added["']/);
  assert.match(catSection, /category updated/i);
});

test("LEAD_CATEGORY_UPDATED updates lead status when mapping exists", () => {
  const catSection = source.slice(
    source.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(catSection, /newStatus\s*&&\s*newStatus\s*!==\s*lead\.status/);
  assert.match(catSection, /ctx\.db\.patch\(lead\._id/);
});

test("LEAD_CATEGORY_UPDATED converts category to lowercase for matching", () => {
  const catSection = source.slice(
    source.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(catSection, /category\?\.toLowerCase\(\)/);
});

// --- Shared helper functions ---

test("findLeadByEmail queries leads table", () => {
  assert.match(source, /findLeadByEmail/);
  assert.match(source, /ctx\.db\.query\(["']leads["']\)/);
});

test("findLeadByEmail uses case-insensitive email comparison", () => {
  assert.match(source, /contactEmail\?\.toLowerCase\(\)\s*===\s*email\.toLowerCase\(\)/);
});

test("findEmailRecord queries emails by leadId index", () => {
  assert.match(source, /findEmailRecord/);
  assert.match(source, /withIndex\(["']by_leadId["']/);
});

test("findEmailRecord filters by smartleadCampaignId and sequenceStep", () => {
  assert.match(source, /smartleadCampaignId.*campaignId/);
  assert.match(source, /sequenceStep.*sequenceStep/);
});

// --- Payload helpers ---

test("getLeadEmail prefers sl_lead_email over lead_email", () => {
  assert.match(source, /sl_lead_email\s*\?\?\s*.*lead_email/);
});

test("getCampaignId converts campaign_id to string", () => {
  assert.match(source, /String\(payload\.campaign_id/);
});

test("getSequenceStep falls back from sequence_number to sequence_step to 1", () => {
  assert.match(source, /sequence_number\s*\?\?\s*.*sequence_step\s*\?\?\s*1/);
});

test("getTimestamp handles string, number, and undefined values", () => {
  assert.match(source, /typeof value\s*===\s*["']number["']/);
  assert.match(source, /new\s+Date\(value\)\.getTime\(\)/);
  assert.match(source, /Number\.isNaN/);
});

// --- All handlers accept v.any() payload for flexibility ---

test("all handlers accept v.any() payload argument", () => {
  const handlerNames = [
    "handleEmailSent",
    "handleEmailOpen",
    "handleEmailLinkClick",
    "handleEmailReply",
    "handleLeadUnsubscribed",
    "handleLeadCategoryUpdated",
  ];

  for (const name of handlerNames) {
    const handlerStart = source.indexOf(`export const ${name}`);
    assert.ok(handlerStart !== -1, `${name} should be exported`);
    const handlerSlice = source.slice(handlerStart, handlerStart + 200);
    assert.match(
      handlerSlice,
      /v\.any\(\)/,
      `${name} should use v.any() for payload`,
    );
  }
});

// --- All handlers set channel: "email" on email activities ---

test("email activity handlers set channel to email", () => {
  const emailHandlers = ["handleEmailSent", "handleEmailOpen", "handleEmailLinkClick", "handleEmailReply"];
  for (const name of emailHandlers) {
    const start = source.indexOf(`export const ${name}`);
    const nextHandler = source.indexOf("export const handle", start + 1);
    const section = nextHandler !== -1 ? source.slice(start, nextHandler) : source.slice(start);
    assert.match(
      section,
      /channel:\s*["']email["']/,
      `${name} should set channel to "email"`,
    );
  }
});

// --- HTTP dispatcher tests ---

const httpSource = fs.readFileSync("convex/http.ts", "utf8");

test("http.ts imports internal API for handler dispatch", () => {
  assert.match(
    httpSource,
    /import\s*\{\s*internal\s*\}\s*from\s*["'].\/\_generated\/api["']/,
  );
});

test("http.ts defines EVENT_HANDLER_MAP mapping event types to handlers", () => {
  assert.match(httpSource, /EVENT_HANDLER_MAP/);
});

test("http.ts dispatches to handler via ctx.runMutation", () => {
  assert.match(httpSource, /ctx\.runMutation\(handler/);
});

test("http.ts passes payload to handler", () => {
  assert.match(httpSource, /payload:\s*body/);
});

test("http.ts maps all six event types to handlers", () => {
  const eventTypes = [
    "EMAIL_SENT",
    "EMAIL_OPEN",
    "EMAIL_LINK_CLICK",
    "EMAIL_REPLY",
    "LEAD_UNSUBSCRIBED",
    "LEAD_CATEGORY_UPDATED",
  ];
  for (const eventType of eventTypes) {
    assert.match(
      httpSource,
      new RegExp(`${eventType}:\\s*internal\\.smartlead\\.webhookHandlers`),
      `EVENT_HANDLER_MAP should include ${eventType}`,
    );
  }
});

// --- Schema tests ---

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

test("schema defines emailBlockList table", () => {
  assert.match(schemaSource, /emailBlockList:\s*defineTable/);
});

test("emailBlockList has email field", () => {
  const blockListSection = schemaSource.slice(
    schemaSource.indexOf("emailBlockList"),
    schemaSource.indexOf("campaigns"),
  );
  assert.match(blockListSection, /email:\s*v\.string\(\)/);
});

test("emailBlockList has reason field", () => {
  const blockListSection = schemaSource.slice(
    schemaSource.indexOf("emailBlockList"),
    schemaSource.indexOf("campaigns"),
  );
  assert.match(blockListSection, /reason:\s*v\.string\(\)/);
});

test("emailBlockList has blockedAt field", () => {
  const blockListSection = schemaSource.slice(
    schemaSource.indexOf("emailBlockList"),
    schemaSource.indexOf("campaigns"),
  );
  assert.match(blockListSection, /blockedAt:\s*v\.number\(\)/);
});

test("emailBlockList has by_email index", () => {
  const blockListSection = schemaSource.slice(
    schemaSource.indexOf("emailBlockList"),
    schemaSource.indexOf("campaigns"),
  );
  assert.match(blockListSection, /index\(["']by_email["']/);
});
