# Phase 9: Social Outreach & Multi-Channel

For leads without email or as a supplementary channel. After this phase: you can filter to social-outreach candidates, generate AI-drafted DMs, open their social profiles, log social activities, and track social follow-ups.

> **Prerequisites:** Phase 3 (leads CRM) + Phase 6 (enrichment with social links) completed

## Boundaries

- DO NOT automate sending DMs — manual send only, CRM-tracked (platform TOS)
- DO NOT scrape social media content — only use links already stored from enrichment
- DO NOT add new social platforms beyond Facebook and Instagram

## Tasks

### Social Outreach Views

- [ ] Create social outreach filtered view at `src/app/leads/social/page.tsx` — filtered leads view showing only leads that meet criteria: (1) status is `no_email`, OR (2) has social links but no email reply after outreach. Add tab navigation on the leads page: "All Leads" | "Social Outreach". Table columns: Name, City, Status, Facebook (link icon or "—"), Instagram (link icon or "—"), Last Social Touch, Follow-up Due. Sort by follow-up due date (overdue first).
- [ ] Add social link quick-action buttons to lead detail — in the contact section, show Facebook and Instagram as clickable icon buttons that open the profile URL in a new tab. Only show if the link exists. Use Lucide icons (Facebook, Instagram).
- [ ] Add social availability columns to the main leads table — two narrow columns "FB" and "IG" showing a checkmark badge if `socialLinks.facebook` or `socialLinks.instagram` exists. Filterable: add "Has Facebook" and "Has Instagram" to the filter bar.

### AI-Generated Social DMs

- [ ] Create social DM generation action in `convex/social/generateDM.ts` — takes a lead ID and channel (`facebook` or `instagram`). Uses Claude to generate a 30-60 word casual DM based on enrichment data. Prompt includes: lead name, products, city, farm description, channel-specific tone guidance (Facebook = slightly more formal, Instagram = casual/emoji-friendly). Returns plain text ready for copy-paste. Use `claude-haiku-4-5-20251001` for cost efficiency.
- [ ] Create "Draft Social DM" UI on lead detail at `src/components/leads/social-dm-composer.tsx` — button on lead detail page (next to "Compose Email"). Opens a Sheet with: channel selector (Facebook/Instagram), "Generate DM" button, generated text area (editable, copy-paste ready), "Copy to Clipboard" button, word count. After copying, prompt to log the activity.

### Social Activity Tracking

- [ ] Create social activity logging buttons at `src/components/leads/log-social-activity.tsx` — on lead detail, add buttons: "Log Facebook DM", "Log Instagram DM", "Log Facebook Comment", "Log Instagram Comment", "Log Follow". Each opens a quick dialog with optional notes textarea and submits a `social_dm_sent`, `social_commented`, or `social_followed` activity with the appropriate channel.
- [ ] Create social response logging — "Log Response" button that creates a `social_dm_replied` activity. Includes a textarea for the response summary. Automatically advances lead status to `replied` if currently in `outreach_started` or `no_email`.
- [ ] Add follow-up reminder for social — after logging a social DM, auto-prompt "Set follow-up reminder?" with a date picker defaulting to 3 days from now. Sets `nextFollowUpAt` on the lead.

## Validation

- [ ] Social outreach page shows leads with `no_email` status that have social links
- [ ] Quick-link buttons open correct Facebook/Instagram profiles in new tabs
- [ ] Social availability columns show in leads table with correct indicators
- [ ] "Draft Social DM" generates a 30-60 word casual message
- [ ] Generated DM references specific lead details (products, location)
- [ ] "Copy to Clipboard" works correctly
- [ ] Logging a Facebook DM creates an activity with correct channel
- [ ] Logging a social response advances lead status to `replied`
- [ ] Follow-up reminder auto-prompts after logging a DM
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
