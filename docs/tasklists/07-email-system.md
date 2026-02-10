# Phase 7: Smartlead Integration & Email Templates

Connect the sending engine and build AI email generation. After this phase: Smartlead API is wired up, webhooks sync email events back, email templates exist, and you can generate personalized AI emails for individual leads.

> **Prerequisites:** Complete "Before Phase 7" in [MANUAL-SETUP.md](../MANUAL-SETUP.md) (Smartlead account, outreach domain, Google Workspace, DNS, warmup started). Phase 5 + Phase 6 completed.

## Boundaries

- DO NOT build campaign creation/management UI — that's Phase 8
- DO NOT send emails without user confirmation — this phase builds the infrastructure and single-lead email preview
- DO NOT store Smartlead API key in client-side code — it's a Convex env var accessed only in actions

## Tasks

### Smartlead API Client

- [ ] Create Smartlead API client in `convex/smartlead/client.ts` — wrapper functions for all needed endpoints. Base URL: `https://server.smartlead.ai/api/v1`. Auth via `?api_key={KEY}` query param. Functions: `createCampaign(name)`, `updateCampaignSequence(campaignId, sequences)`, `addLeadsToCampaign(campaignId, leads)` (max 100/request), `updateCampaignStatus(campaignId, status)`, `getCampaignAnalytics(campaignId)`, `getLeadStatus(campaignId, leadEmail)`. Each function reads the API key from Convex env vars.
- [ ] Create rate limiter in `convex/smartlead/rateLimiter.ts` — enforces Smartlead limits: max 10 requests per 2-second window, max 60 requests per 60-second window. Use a simple in-memory token bucket (reset per action invocation). On 429 response, wait and retry with exponential backoff (max 3 retries). Log rate limit hits.

### Webhook Integration

- [ ] Create Convex HTTP endpoint in `convex/http.ts` — route `POST /smartlead-webhook` that receives Smartlead webhook payloads. Parse the JSON body, validate the event type, dispatch to appropriate handler. Return 200 OK immediately.
- [ ] Create webhook handlers in `convex/smartlead/webhookHandlers.ts` — idempotent handlers for each event type. `EMAIL_SENT`: find or create email record by smartleadCampaignId + lead email + sequence step, set `sentAt`, log `email_sent` activity, update lead status to `outreach_started` if currently `enriched`. `EMAIL_OPEN`: set `openedAt` on email record (only if not already set — first open), log `email_opened` activity. `EMAIL_LINK_CLICK`: set `clickedAt`, log `email_clicked` activity. `EMAIL_REPLY`: set `repliedAt`, update lead status to `replied`, log `email_replied` activity. `LEAD_UNSUBSCRIBED`: update lead status to `declined`, log activity, add to local block list. `LEAD_CATEGORY_UPDATED`: map Smartlead categories to pipeline statuses and update.
- [ ] Create analytics sync cron in `convex/smartlead/analyticsCron.ts` — Convex cron job that runs every 6 hours. For each active campaign, fetch analytics from Smartlead API, update the campaign's `stats` field (sent, opened, clicked, replied, bounced counts).
- [ ] Create unsubscribe handling in `convex/smartlead/unsubscribe.ts` — mutation that marks a lead as globally unsubscribed. Query function `isUnsubscribed(email)` that checks if an email is on the block list. Enrichment and campaign flows should check this before including a lead.

### Email Templates

- [ ] Create Convex query `convex/emailTemplates.ts:list` — return all templates sorted by sequenceType order (initial, follow_up_1, follow_up_2, follow_up_3).
- [ ] Create Convex mutations `convex/emailTemplates.ts:create`, `update`, `delete` — CRUD for email templates.
- [ ] Create seed for default templates in `convex/seeds/seedTemplates.ts` — insert 4 default templates matching the spec: (1) Initial cold intro — warm, references specific farm details, 50-125 words, (2) Follow-up 1 — different angle with social proof, day 3-4, (3) Follow-up 2 — quick check-in, offer to help, day 7-8, (4) Follow-up 3 — breakup email, leave door open, day 14. Each template has a Claude prompt with placeholders: `{{farmName}}`, `{{products}}`, `{{salesChannels}}`, `{{city}}`, `{{contactName}}`, `{{farmDescription}}`, `{{sellsOnline}}`, `{{socialLinks}}`.
- [ ] Create email templates management UI at `src/components/settings/email-templates.tsx` — accessible from settings page or a new `/settings/templates` route. List all templates with name and sequence type. Click to edit: name, sequence type, subject line template, prompt template (large textarea). Add new template button. Delete with confirmation.

### AI Email Generation

- [ ] Create two-prompt email generation action in `convex/email/generateEmail.ts` — takes a lead ID and template ID. Prompt 1 (analysis): sends lead enrichment data to Claude, gets back structured analysis (specialization, sales channels, online status, value prop, connection point). Prompt 2 (generation): sends analysis + template prompt + constraints to Claude, gets back `{ subject, body }`. Constraints enforced in prompt: 50-125 words, warm/rural tone, reference specific farm details, include CASL footer (sender name, address, unsubscribe link from settings). Use `claude-haiku-4-5-20251001` for Prompt 1 and `claude-sonnet-4-5-20250929` for Prompt 2 (higher quality for the actual email).
- [ ] Create email composer UI on lead detail page at `src/components/leads/email-composer.tsx` — "Compose Email" button opens a Sheet/Dialog. Dropdown to select template. "Generate" button calls the generation action. Shows loading state during generation. Displays editable preview: subject line input, rich text body area. For now, "Save Draft" button stores the email locally (not sent). Show word count indicator.
- [ ] Add CASL compliance to generated emails — every generated email automatically includes a footer with: sender name, business name, mailing address, phone/email, and "[Unsubscribe]" placeholder text. These values come from the settings table.

## Validation

- [ ] Smartlead API client can create a test campaign (verify in Smartlead dashboard)
- [ ] Webhook endpoint receives test payload and creates/updates records correctly
- [ ] Default templates are seeded and visible in the templates UI
- [ ] Editing a template saves changes
- [ ] "Compose Email" on a lead detail generates a personalized email with specific farm details
- [ ] Generated email is 50-125 words
- [ ] Generated email includes CASL footer with sender info
- [ ] Email preview is editable before saving
- [ ] Analytics sync cron is registered (verify in Convex dashboard cron jobs)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
