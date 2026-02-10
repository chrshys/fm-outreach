# Phase 8: Campaign Management

Create, preview, launch, and track outreach campaigns. After this phase: you can create a campaign, select leads, preview AI-generated emails for each lead, push the campaign to Smartlead, and track per-lead delivery/open/reply stats.

> **Prerequisites:** Phase 7 completed (Smartlead client, templates, email generation working)

## Boundaries

- DO NOT build social outreach features — that's Phase 9
- DO NOT auto-launch campaigns — always require explicit user confirmation before pushing to Smartlead
- DO NOT bypass the email preview step — every email must be reviewable before sending

## Tasks

### Campaign List

- [x] Create Convex query `convex/campaigns.ts:list` — return all campaigns sorted by `createdAt` descending. Include: name, status, leadCount, stats (sent/opened/replied), smartleadCampaignId.
- [x] Create campaigns list page at `src/app/campaigns/page.tsx` — replace placeholder. Card grid showing all campaigns. Each card shows: name, status badge (draft/active/paused/completed), lead count, key stats (sent, opened %, replied %). "Create Campaign" button at top.

### Create Campaign Flow

- [x] Create Convex mutation `convex/campaigns.ts:create` — create a campaign record with `status: "draft"`, name, templateIds, targetClusterId or targetFilter, leadCount. No Smartlead interaction yet.
- [x] Create campaign creation page at `src/app/campaigns/new/page.tsx` — step-by-step flow: (1) Name the campaign, (2) Select leads — three options: by cluster dropdown, by filter (status/type/region), or manual selection from a lead table with checkboxes. Show selected lead count. (3) Choose template sequence — select templates for each step (initial + up to 3 follow-ups) from existing templates. Show sequence preview with delays (Day 0, 3-4, 7-8, 14). (4) Confirm and create draft.

### Batch Email Generation & Preview

- [x] Create batch email generation action in `convex/email/batchGenerate.ts` — takes a campaign ID, generates personalized emails for all leads in the campaign using the campaign's template sequence. Processes initial email for each lead (follow-ups are generated from templates at send time by Smartlead). Store generated emails in a new `generatedEmails` table or as a field on the campaign. Process sequentially with 500ms delay between leads to manage API costs.
- [x] Create email preview page at `src/app/campaigns/[id]/preview/page.tsx` — shows all generated emails for the campaign. List of leads on the left, clicking a lead shows their personalized email on the right. Each email shows: subject, body, word count, personalization variables used. "Regenerate" button per email to re-run generation. "Edit" button to manually modify. Status indicator: generated, edited, approved.
- [x] Add approve/reject per email — checkbox or button to mark each email as approved. "Approve All" bulk action. Only approved emails are pushed to Smartlead.

### Push to Smartlead

- [x] Create push-to-Smartlead action in `convex/campaigns/pushToSmartlead.ts` — takes a campaign ID. Steps: (1) Create campaign in Smartlead via API, save `smartleadCampaignId`, (2) Push email sequence (subject + body for initial, template content for follow-ups, with delays), (3) Add leads in batches of 100 (email, name, custom fields for personalization), (4) Update campaign status to `active`. Do NOT auto-launch — return the Smartlead campaign ID so the user can review in Smartlead before launching.
- [x] Add "Push to Smartlead" button on campaign preview page — only enabled when all emails are approved. Shows confirmation dialog: "This will create the campaign in Smartlead and add X leads. You'll need to launch it from Smartlead or click Launch below." Button calls the push action and shows progress.
- [x] Add "Launch Campaign" button — appears after push is complete. Calls `updateCampaignStatus(campaignId, "START")` on Smartlead. Updates local campaign status to `active`. Shows success confirmation.

### Campaign Detail

- [x] Create campaign detail page at `src/app/campaigns/[id]/page.tsx` — header with campaign name, status, creation date. Stats cards: total leads, emails sent, open rate %, click rate %, reply rate %, bounce rate %. Per-lead table below: lead name, email, current sequence step, status (sent/opened/replied/bounced), last activity date. Click lead name to navigate to lead detail.
- [x] Create Convex query `convex/campaigns.ts:getWithLeads` — get campaign by ID with all lead statuses. Join leads table with emails table to get per-lead sequence step and event timestamps.
- [x] Add reply indicators to campaign detail — leads with replies highlighted, with "View Reply" link that opens the activity timeline showing the reply activity.

## Validation

- [x] Creating a campaign with selected leads and templates creates a draft record
- [x] Batch email generation produces personalized emails for all campaign leads
- [x] Email preview page shows all generated emails with correct personalization
- [x] Editing a generated email saves the changes
- [x] Regenerating a single email produces a different variation
- [ ] Push to Smartlead creates the campaign in Smartlead (verify in Smartlead dashboard)
- [ ] Launching the campaign starts sending (verify first email sends)
- [ ] Campaign detail page shows correct stats after Smartlead syncs
- [ ] Per-lead status updates in real-time as webhooks come in
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
