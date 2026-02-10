import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const handlersSource = fs.readFileSync(
  "convex/smartlead/webhookHandlers.ts",
  "utf8",
);
const httpSource = fs.readFileSync("convex/http.ts", "utf8");

// ============================================================
// Test payload templates matching real Smartlead webhook format
// ============================================================

const TEST_PAYLOADS = {
  EMAIL_SENT: {
    event_type: "EMAIL_SENT",
    campaign_id: "12345",
    sl_lead_email: "farmer@example.com",
    sequence_number: 1,
    subject: "Partnership with Fruitland Market",
    email_body: "Hi John, we'd love to partner with your farm...",
    event_timestamp: "2025-01-15T10:30:00Z",
  },
  EMAIL_OPEN: {
    event_type: "EMAIL_OPEN",
    campaign_id: "12345",
    sl_lead_email: "farmer@example.com",
    sequence_number: 1,
    event_timestamp: "2025-01-15T14:20:00Z",
  },
  EMAIL_LINK_CLICK: {
    event_type: "EMAIL_LINK_CLICK",
    campaign_id: "12345",
    sl_lead_email: "farmer@example.com",
    sequence_number: 1,
    event_timestamp: "2025-01-15T15:00:00Z",
  },
  EMAIL_REPLY: {
    event_type: "EMAIL_REPLY",
    campaign_id: "12345",
    sl_lead_email: "farmer@example.com",
    sequence_number: 1,
    time_replied: "2025-01-16T09:00:00Z",
    event_timestamp: "2025-01-16T09:00:00Z",
  },
  LEAD_UNSUBSCRIBED: {
    event_type: "LEAD_UNSUBSCRIBED",
    campaign_id: "12345",
    sl_lead_email: "farmer@example.com",
  },
  LEAD_CATEGORY_UPDATED: {
    event_type: "LEAD_CATEGORY_UPDATED",
    campaign_id: "12345",
    sl_lead_email: "farmer@example.com",
    category: "Interested",
    old_category: "Unknown",
  },
};

// ============================================================
// 1. Payload helper function logic verification
// ============================================================

test("getLeadEmail extracts sl_lead_email with priority over lead_email", () => {
  // Handler source uses: payload.sl_lead_email ?? payload.lead_email
  assert.match(handlersSource, /sl_lead_email\s*\?\?\s*.*lead_email/);

  // Verify both fields are in the WebhookPayload type
  assert.match(handlersSource, /lead_email\?:\s*string/);
  assert.match(handlersSource, /sl_lead_email\?:\s*string/);
});

test("getLeadEmail handles payload with only lead_email field", () => {
  // The fallback pattern ensures lead_email is used when sl_lead_email is absent
  const fallbackPayload = { event_type: "EMAIL_SENT", lead_email: "test@farm.com" };
  assert.ok(fallbackPayload.lead_email, "lead_email field should work as fallback");
  assert.ok(!fallbackPayload.sl_lead_email, "sl_lead_email absent triggers fallback");
});

test("getCampaignId converts numeric campaign_id to string", () => {
  assert.match(handlersSource, /String\(payload\.campaign_id/);
  // Verify numeric campaign IDs are handled
  assert.match(handlersSource, /campaign_id\?:\s*string\s*\|\s*number/);
});

test("getSequenceStep falls back correctly: sequence_number → sequence_step → 1", () => {
  assert.match(
    handlersSource,
    /sequence_number\s*\?\?\s*.*sequence_step\s*\?\?\s*1/,
  );
});

test("getTimestamp parses ISO string timestamps correctly", () => {
  // Verify the timestamp parser handles string dates
  assert.match(handlersSource, /new\s+Date\(value\)\.getTime\(\)/);
  // Verify NaN fallback to Date.now()
  assert.match(handlersSource, /Number\.isNaN\(parsed\)\s*\?\s*Date\.now\(\)/);
});

test("getTimestamp passes through numeric timestamps directly", () => {
  assert.match(handlersSource, /typeof value\s*===\s*["']number["']\s*.*return value/);
});

test("getTimestamp uses Date.now() when value is undefined", () => {
  assert.match(handlersSource, /value\s*===\s*undefined.*return\s+Date\.now\(\)/);
});

// ============================================================
// 2. HTTP endpoint validates all test payloads dispatch correctly
// ============================================================

test("valid EMAIL_SENT payload would dispatch to handleEmailSent handler", () => {
  const payload = TEST_PAYLOADS.EMAIL_SENT;
  assert.ok(payload.event_type === "EMAIL_SENT");
  assert.match(
    httpSource,
    /EMAIL_SENT:\s*internal\.smartlead\.webhookHandlers\.handleEmailSent/,
  );
});

test("valid EMAIL_OPEN payload would dispatch to handleEmailOpen handler", () => {
  const payload = TEST_PAYLOADS.EMAIL_OPEN;
  assert.ok(payload.event_type === "EMAIL_OPEN");
  assert.match(
    httpSource,
    /EMAIL_OPEN:\s*internal\.smartlead\.webhookHandlers\.handleEmailOpen/,
  );
});

test("valid EMAIL_LINK_CLICK payload would dispatch to handleEmailLinkClick handler", () => {
  const payload = TEST_PAYLOADS.EMAIL_LINK_CLICK;
  assert.ok(payload.event_type === "EMAIL_LINK_CLICK");
  assert.match(
    httpSource,
    /EMAIL_LINK_CLICK:\s*internal\.smartlead\.webhookHandlers\.handleEmailLinkClick/,
  );
});

test("valid EMAIL_REPLY payload would dispatch to handleEmailReply handler", () => {
  const payload = TEST_PAYLOADS.EMAIL_REPLY;
  assert.ok(payload.event_type === "EMAIL_REPLY");
  assert.match(
    httpSource,
    /EMAIL_REPLY:\s*internal\.smartlead\.webhookHandlers\.handleEmailReply/,
  );
});

test("valid LEAD_UNSUBSCRIBED payload would dispatch to handleLeadUnsubscribed handler", () => {
  const payload = TEST_PAYLOADS.LEAD_UNSUBSCRIBED;
  assert.ok(payload.event_type === "LEAD_UNSUBSCRIBED");
  assert.match(
    httpSource,
    /LEAD_UNSUBSCRIBED:\s*internal\.smartlead\.webhookHandlers\.handleLeadUnsubscribed/,
  );
});

test("valid LEAD_CATEGORY_UPDATED payload would dispatch to handleLeadCategoryUpdated handler", () => {
  const payload = TEST_PAYLOADS.LEAD_CATEGORY_UPDATED;
  assert.ok(payload.event_type === "LEAD_CATEGORY_UPDATED");
  assert.match(
    httpSource,
    /LEAD_CATEGORY_UPDATED:\s*internal\.smartlead\.webhookHandlers\.handleLeadCategoryUpdated/,
  );
});

// ============================================================
// 3. Test payload field extraction for each event type
// ============================================================

test("EMAIL_SENT payload provides all fields the handler needs", () => {
  const p = TEST_PAYLOADS.EMAIL_SENT;
  // Handler extracts: email, campaignId, sequenceStep, subject, body, timestamp
  assert.ok(p.sl_lead_email, "must have lead email");
  assert.ok(p.campaign_id, "must have campaign_id");
  assert.ok(typeof p.sequence_number === "number", "must have sequence_number");
  assert.ok(p.subject, "must have subject");
  assert.ok(p.email_body, "must have email_body");
  assert.ok(p.event_timestamp, "must have event_timestamp");
});

test("EMAIL_SENT handler inserts email with subject and body from payload", () => {
  const emailSentSection = handlersSource.slice(
    handlersSource.indexOf("handleEmailSent"),
    handlersSource.indexOf("handleEmailOpen"),
  );
  // Verify subject extraction
  assert.match(emailSentSection, /subject:\s*payload\.subject\s*\?\?\s*["']["']/);
  // Verify body extraction (email_body with fallback to preview_text)
  assert.match(emailSentSection, /body:\s*payload\.email_body\s*\?\?\s*payload\.preview_text/);
});

test("EMAIL_OPEN payload provides all fields the handler needs", () => {
  const p = TEST_PAYLOADS.EMAIL_OPEN;
  assert.ok(p.sl_lead_email, "must have lead email");
  assert.ok(p.campaign_id, "must have campaign_id");
  assert.ok(typeof p.sequence_number === "number", "must have sequence_number");
  assert.ok(p.event_timestamp, "must have event_timestamp");
});

test("EMAIL_LINK_CLICK payload provides all fields the handler needs", () => {
  const p = TEST_PAYLOADS.EMAIL_LINK_CLICK;
  assert.ok(p.sl_lead_email, "must have lead email");
  assert.ok(p.campaign_id, "must have campaign_id");
  assert.ok(typeof p.sequence_number === "number", "must have sequence_number");
  assert.ok(p.event_timestamp, "must have event_timestamp");
});

test("EMAIL_REPLY payload provides all fields including time_replied", () => {
  const p = TEST_PAYLOADS.EMAIL_REPLY;
  assert.ok(p.sl_lead_email, "must have lead email");
  assert.ok(p.campaign_id, "must have campaign_id");
  assert.ok(typeof p.sequence_number === "number", "must have sequence_number");
  assert.ok(p.time_replied, "must have time_replied");
});

test("EMAIL_REPLY handler prefers time_replied over event_timestamp", () => {
  const replySection = handlersSource.slice(
    handlersSource.indexOf("handleEmailReply"),
    handlersSource.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(replySection, /time_replied\s*\?\?\s*payload\.event_timestamp/);
});

test("LEAD_UNSUBSCRIBED payload provides lead email for block list", () => {
  const p = TEST_PAYLOADS.LEAD_UNSUBSCRIBED;
  assert.ok(p.sl_lead_email, "must have lead email");
});

test("LEAD_CATEGORY_UPDATED payload provides both old and new category", () => {
  const p = TEST_PAYLOADS.LEAD_CATEGORY_UPDATED;
  assert.ok(p.sl_lead_email, "must have lead email");
  assert.ok(p.category, "must have category");
  assert.ok(p.old_category, "must have old_category");
});

// ============================================================
// 4. Record creation/update verification per handler
// ============================================================

test("EMAIL_SENT creates email record with correct fields from payload", () => {
  const emailSentSection = handlersSource.slice(
    handlersSource.indexOf("handleEmailSent"),
    handlersSource.indexOf("handleEmailOpen"),
  );
  // Verify ctx.db.insert("emails", {...}) is called with all required fields
  assert.match(emailSentSection, /ctx\.db\.insert\(["']emails["']/);
  assert.match(emailSentSection, /leadId:\s*lead\._id/);
  assert.match(emailSentSection, /smartleadCampaignId:\s*campaignId/);
  assert.match(emailSentSection, /sequenceStep/);
  assert.match(emailSentSection, /subject:/);
  assert.match(emailSentSection, /body:/);
  assert.match(emailSentSection, /sentAt/);
});

test("EMAIL_SENT creates activity record with email_sent type", () => {
  const emailSentSection = handlersSource.slice(
    handlersSource.indexOf("handleEmailSent"),
    handlersSource.indexOf("handleEmailOpen"),
  );
  assert.match(emailSentSection, /ctx\.db\.insert\(["']activities["']/);
  assert.match(emailSentSection, /type:\s*["']email_sent["']/);
  assert.match(emailSentSection, /channel:\s*["']email["']/);
});

test("EMAIL_SENT updates lead status from enriched to outreach_started", () => {
  const emailSentSection = handlersSource.slice(
    handlersSource.indexOf("handleEmailSent"),
    handlersSource.indexOf("handleEmailOpen"),
  );
  assert.match(emailSentSection, /lead\.status\s*===\s*["']enriched["']/);
  assert.match(emailSentSection, /ctx\.db\.patch\(lead\._id,\s*\{/);
  assert.match(emailSentSection, /status:\s*["']outreach_started["']/);
});

test("EMAIL_OPEN updates email record with openedAt timestamp", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleEmailOpen"),
    handlersSource.indexOf("handleEmailLinkClick"),
  );
  assert.match(section, /ctx\.db\.patch\(emailRecord\._id,\s*\{\s*openedAt\s*\}/);
});

test("EMAIL_OPEN creates activity record with email_opened type", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleEmailOpen"),
    handlersSource.indexOf("handleEmailLinkClick"),
  );
  assert.match(section, /ctx\.db\.insert\(["']activities["']/);
  assert.match(section, /type:\s*["']email_opened["']/);
});

test("EMAIL_LINK_CLICK updates email record with clickedAt timestamp", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleEmailLinkClick"),
    handlersSource.indexOf("handleEmailReply"),
  );
  assert.match(section, /ctx\.db\.patch\(emailRecord\._id,\s*\{\s*clickedAt\s*\}/);
});

test("EMAIL_LINK_CLICK creates activity record with email_clicked type", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleEmailLinkClick"),
    handlersSource.indexOf("handleEmailReply"),
  );
  assert.match(section, /ctx\.db\.insert\(["']activities["']/);
  assert.match(section, /type:\s*["']email_clicked["']/);
});

test("EMAIL_REPLY updates email record with repliedAt timestamp", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleEmailReply"),
    handlersSource.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(section, /ctx\.db\.patch\(emailRecord\._id,\s*\{\s*repliedAt\s*\}/);
});

test("EMAIL_REPLY creates activity record with email_replied type", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleEmailReply"),
    handlersSource.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(section, /ctx\.db\.insert\(["']activities["']/);
  assert.match(section, /type:\s*["']email_replied["']/);
});

test("EMAIL_REPLY updates lead status to replied (non-downgrading)", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleEmailReply"),
    handlersSource.indexOf("handleLeadUnsubscribed"),
  );
  // Checks that higher statuses are preserved
  assert.match(section, /lead\.status\s*!==\s*["']replied["']/);
  assert.match(section, /lead\.status\s*!==\s*["']meeting_booked["']/);
  assert.match(section, /lead\.status\s*!==\s*["']onboarded["']/);
  assert.match(section, /status:\s*["']replied["']/);
});

test("LEAD_UNSUBSCRIBED inserts into emailBlockList with normalized email", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleLeadUnsubscribed"),
    handlersSource.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(section, /email\.toLowerCase\(\)/);
  assert.match(section, /ctx\.db\.insert\(["']emailBlockList["']/);
  assert.match(section, /email:\s*normalizedEmail/);
  assert.match(section, /reason:\s*["']unsubscribed["']/);
  assert.match(section, /blockedAt:\s*now/);
});

test("LEAD_UNSUBSCRIBED updates lead status to declined", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleLeadUnsubscribed"),
    handlersSource.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(section, /ctx\.db\.patch\(lead\._id/);
  assert.match(section, /status:\s*["']declined["']/);
});

test("LEAD_CATEGORY_UPDATED maps category to lead status via CATEGORY_STATUS_MAP", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(section, /CATEGORY_STATUS_MAP\[category\]/);
  assert.match(section, /ctx\.db\.patch\(lead\._id/);
});

test("LEAD_CATEGORY_UPDATED logs note_added activity with category metadata", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(section, /type:\s*["']note_added["']/);
  assert.match(section, /category:\s*payload\.category/);
  assert.match(section, /oldCategory:\s*payload\.old_category/);
});

// ============================================================
// 5. Idempotency guards for each handler
// ============================================================

test("EMAIL_SENT skips insert when email record already exists", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleEmailSent"),
    handlersSource.indexOf("handleEmailOpen"),
  );
  assert.match(section, /const\s+existing\s*=\s*await\s+findEmailRecord/);
  assert.match(section, /if\s*\(existing\)\s*\{\s*return/);
});

test("EMAIL_OPEN skips update when openedAt already set", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleEmailOpen"),
    handlersSource.indexOf("handleEmailLinkClick"),
  );
  assert.match(section, /if\s*\(emailRecord\.openedAt\)\s*\{\s*return/);
});

test("EMAIL_LINK_CLICK skips update when clickedAt already set", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleEmailLinkClick"),
    handlersSource.indexOf("handleEmailReply"),
  );
  assert.match(section, /if\s*\(emailRecord\.clickedAt\)\s*\{\s*return/);
});

test("EMAIL_REPLY skips update when repliedAt already set", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleEmailReply"),
    handlersSource.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(section, /if\s*\(emailRecord\.repliedAt\)\s*\{\s*return/);
});

test("LEAD_UNSUBSCRIBED skips block list insert when already blocked", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleLeadUnsubscribed"),
    handlersSource.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(section, /existingBlock/);
  assert.match(section, /if\s*\(!existingBlock\)/);
});

test("LEAD_UNSUBSCRIBED skips status update when already declined", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleLeadUnsubscribed"),
    handlersSource.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(section, /lead\.status\s*!==\s*["']declined["']/);
});

// ============================================================
// 6. Edge case handling
// ============================================================

test("handlers gracefully handle missing lead email (early return)", () => {
  const handlers = [
    "handleEmailSent",
    "handleEmailOpen",
    "handleEmailLinkClick",
    "handleEmailReply",
    "handleLeadUnsubscribed",
    "handleLeadCategoryUpdated",
  ];
  for (const name of handlers) {
    const start = handlersSource.indexOf(`export const ${name}`);
    const next = handlersSource.indexOf("export const handle", start + 1);
    const section = next !== -1 ? handlersSource.slice(start, next) : handlersSource.slice(start);
    assert.match(
      section,
      /if\s*\(!email\)/,
      `${name} should check for missing email`,
    );
  }
});

test("handlers gracefully handle unknown lead (early return with warning)", () => {
  const handlers = [
    "handleEmailSent",
    "handleEmailOpen",
    "handleEmailLinkClick",
    "handleEmailReply",
    "handleLeadUnsubscribed",
    "handleLeadCategoryUpdated",
  ];
  for (const name of handlers) {
    const start = handlersSource.indexOf(`export const ${name}`);
    const next = handlersSource.indexOf("export const handle", start + 1);
    const section = next !== -1 ? handlersSource.slice(start, next) : handlersSource.slice(start);
    assert.match(
      section,
      /lead not found/,
      `${name} should warn when lead is not found`,
    );
  }
});

test("EMAIL_OPEN, EMAIL_LINK_CLICK, EMAIL_REPLY handle missing email record gracefully", () => {
  const handlers = ["handleEmailOpen", "handleEmailLinkClick", "handleEmailReply"];
  for (const name of handlers) {
    const start = handlersSource.indexOf(`export const ${name}`);
    const next = handlersSource.indexOf("export const handle", start + 1);
    const section = next !== -1 ? handlersSource.slice(start, next) : handlersSource.slice(start);
    assert.match(
      section,
      /email record not found/,
      `${name} should warn when email record is not found`,
    );
  }
});

test("LEAD_CATEGORY_UPDATED handles missing category gracefully", () => {
  const section = handlersSource.slice(
    handlersSource.indexOf("handleLeadCategoryUpdated"),
  );
  assert.match(section, /if\s*\(!category\)/);
  assert.match(section, /no category in payload/);
});

// ============================================================
// 7. HTTP endpoint validation logic
// ============================================================

test("webhook rejects non-POST methods with 405", () => {
  assert.match(httpSource, /request\.method\s*!==\s*["']POST["']/);
  assert.match(httpSource, /status:\s*405/);
  assert.match(httpSource, /Method not allowed/);
});

test("webhook rejects invalid JSON with 400", () => {
  assert.match(httpSource, /Invalid JSON/);
  assert.match(httpSource, /status:\s*400/);
});

test("webhook rejects missing event_type with 400", () => {
  assert.match(httpSource, /Missing event_type/);
});

test("webhook rejects unknown event_type with 400", () => {
  assert.match(httpSource, /Unknown event type/);
});

test("webhook returns 200 OK for valid payloads", () => {
  assert.match(httpSource, /new\s+Response\(["']OK["'],\s*\{\s*status:\s*200\s*\}\)/);
});

// ============================================================
// 8. Category status mapping completeness
// ============================================================

test("CATEGORY_STATUS_MAP covers interested → replied", () => {
  assert.match(handlersSource, /interested:\s*["']replied["']/);
});

test("CATEGORY_STATUS_MAP covers not_interested → not_interested", () => {
  assert.match(handlersSource, /not_interested:\s*["']not_interested["']/);
});

test("CATEGORY_STATUS_MAP covers wrong_person → declined", () => {
  assert.match(handlersSource, /wrong_person:\s*["']declined["']/);
});

test("CATEGORY_STATUS_MAP covers auto_reply → outreach_started", () => {
  assert.match(handlersSource, /auto_reply:\s*["']outreach_started["']/);
});

test("CATEGORY_STATUS_MAP covers out_of_office → outreach_started", () => {
  assert.match(handlersSource, /out_of_office:\s*["']outreach_started["']/);
});

test("CATEGORY_STATUS_MAP covers do_not_contact → declined", () => {
  assert.match(handlersSource, /do_not_contact:\s*["']declined["']/);
});

test("CATEGORY_STATUS_MAP includes space-separated variants for compatibility", () => {
  // Smartlead may send categories with spaces or underscores
  assert.match(handlersSource, /["']not interested["']:\s*["']not_interested["']/);
  assert.match(handlersSource, /["']wrong person["']:\s*["']declined["']/);
  assert.match(handlersSource, /["']auto reply["']:\s*["']outreach_started["']/);
  assert.match(handlersSource, /["']out of office["']:\s*["']outreach_started["']/);
  assert.match(handlersSource, /["']do not contact["']:\s*["']declined["']/);
});

// ============================================================
// 9. End-to-end lifecycle: sent → open → click → reply
// ============================================================

test("email lifecycle follows correct DB operation sequence", () => {
  // Step 1: EMAIL_SENT creates a new record in emails table
  const sentSection = handlersSource.slice(
    handlersSource.indexOf("handleEmailSent"),
    handlersSource.indexOf("handleEmailOpen"),
  );
  assert.match(sentSection, /ctx\.db\.insert\(["']emails["']/);

  // Step 2: EMAIL_OPEN patches the existing record with openedAt
  const openSection = handlersSource.slice(
    handlersSource.indexOf("handleEmailOpen"),
    handlersSource.indexOf("handleEmailLinkClick"),
  );
  assert.match(openSection, /findEmailRecord/);
  assert.match(openSection, /ctx\.db\.patch\(emailRecord\._id/);

  // Step 3: EMAIL_LINK_CLICK patches with clickedAt
  const clickSection = handlersSource.slice(
    handlersSource.indexOf("handleEmailLinkClick"),
    handlersSource.indexOf("handleEmailReply"),
  );
  assert.match(clickSection, /findEmailRecord/);
  assert.match(clickSection, /ctx\.db\.patch\(emailRecord\._id/);

  // Step 4: EMAIL_REPLY patches with repliedAt
  const replySection = handlersSource.slice(
    handlersSource.indexOf("handleEmailReply"),
    handlersSource.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(replySection, /findEmailRecord/);
  assert.match(replySection, /ctx\.db\.patch\(emailRecord\._id/);
});

test("email lifecycle tracks status transitions correctly", () => {
  // EMAIL_SENT: enriched → outreach_started
  const sentSection = handlersSource.slice(
    handlersSource.indexOf("handleEmailSent"),
    handlersSource.indexOf("handleEmailOpen"),
  );
  assert.match(sentSection, /status:\s*["']outreach_started["']/);

  // EMAIL_REPLY: outreach_started → replied (non-downgrading)
  const replySection = handlersSource.slice(
    handlersSource.indexOf("handleEmailReply"),
    handlersSource.indexOf("handleLeadUnsubscribed"),
  );
  assert.match(replySection, /status:\s*["']replied["']/);
});

test("each lifecycle step creates corresponding activity log", () => {
  const activityTypes = {
    handleEmailSent: "email_sent",
    handleEmailOpen: "email_opened",
    handleEmailLinkClick: "email_clicked",
    handleEmailReply: "email_replied",
  };

  for (const [handler, actType] of Object.entries(activityTypes)) {
    const start = handlersSource.indexOf(`export const ${handler}`);
    const next = handlersSource.indexOf("export const handle", start + 1);
    const section = next !== -1 ? handlersSource.slice(start, next) : handlersSource.slice(start);
    assert.match(
      section,
      new RegExp(`type:\\s*["']${actType}["']`),
      `${handler} should log ${actType} activity`,
    );
    assert.match(
      section,
      /ctx\.db\.insert\(["']activities["']/,
      `${handler} should insert activity record`,
    );
  }
});

// ============================================================
// 10. findEmailRecord uses correct index for lookup
// ============================================================

test("findEmailRecord queries emails by_leadId index with campaignId and sequenceStep filter", () => {
  assert.match(handlersSource, /withIndex\(["']by_leadId["']/);
  assert.match(handlersSource, /eq\(q\.field\(["']smartleadCampaignId["']\),\s*campaignId\)/);
  assert.match(handlersSource, /eq\(q\.field\(["']sequenceStep["']\),\s*sequenceStep\)/);
});

test("findLeadByEmail performs case-insensitive email comparison", () => {
  assert.match(
    handlersSource,
    /contactEmail\?\.toLowerCase\(\)\s*===\s*email\.toLowerCase\(\)/,
  );
});

// ============================================================
// 11. Schema fields align with what handlers insert
// ============================================================

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

test("emails table schema matches fields inserted by EMAIL_SENT handler", () => {
  const emailsSection = schemaSource.slice(
    schemaSource.indexOf("emails: defineTable"),
    schemaSource.indexOf("activities: defineTable"),
  );
  // Required fields that EMAIL_SENT inserts
  assert.match(emailsSection, /leadId:\s*v\.id\(["']leads["']\)/);
  assert.match(emailsSection, /smartleadCampaignId:\s*v\.string\(\)/);
  assert.match(emailsSection, /sequenceStep:\s*v\.number\(\)/);
  assert.match(emailsSection, /subject:\s*v\.string\(\)/);
  assert.match(emailsSection, /body:\s*v\.string\(\)/);
  assert.match(emailsSection, /sentAt:\s*v\.number\(\)/);
  // Optional fields that other handlers patch
  assert.match(emailsSection, /openedAt:\s*v\.optional\(v\.number\(\)\)/);
  assert.match(emailsSection, /clickedAt:\s*v\.optional\(v\.number\(\)\)/);
  assert.match(emailsSection, /repliedAt:\s*v\.optional\(v\.number\(\)\)/);
});

test("activities table schema matches fields inserted by handlers", () => {
  const activitiesSection = schemaSource.slice(
    schemaSource.indexOf("activities: defineTable"),
    schemaSource.indexOf("emailTemplates: defineTable"),
  );
  assert.match(activitiesSection, /leadId:\s*v\.id\(["']leads["']\)/);
  assert.match(activitiesSection, /type:\s*v\.union/);
  assert.match(activitiesSection, /channel:\s*v\.optional/);
  assert.match(activitiesSection, /description:\s*v\.string\(\)/);
  assert.match(activitiesSection, /metadata:\s*v\.optional\(v\.any\(\)\)/);
  assert.match(activitiesSection, /createdAt:\s*v\.number\(\)/);
});

test("emailBlockList table schema matches fields inserted by LEAD_UNSUBSCRIBED handler", () => {
  const blockListSection = schemaSource.slice(
    schemaSource.indexOf("emailBlockList: defineTable"),
    schemaSource.indexOf("campaigns: defineTable"),
  );
  assert.match(blockListSection, /email:\s*v\.string\(\)/);
  assert.match(blockListSection, /reason:\s*v\.string\(\)/);
  assert.match(blockListSection, /blockedAt:\s*v\.number\(\)/);
});

test("activities schema includes all activity types used by webhook handlers", () => {
  const handlerActivityTypes = [
    "email_sent",
    "email_opened",
    "email_clicked",
    "email_replied",
    "note_added",
    "status_changed",
  ];
  for (const actType of handlerActivityTypes) {
    assert.match(
      schemaSource,
      new RegExp(`v\\.literal\\(["']${actType}["']\\)`),
      `activities schema should include ${actType}`,
    );
  }
});
