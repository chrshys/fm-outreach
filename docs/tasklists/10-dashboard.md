# Phase 10: Dashboard

The overview page. Built last because it aggregates data from all other features. After this phase: the dashboard shows pipeline funnel, email/social stats, cluster breakdown, goal progress, follow-up reminders, and active campaigns.

> **Prerequisites:** All prior phases completed (or at minimum Phases 1-3 + 7-8 for meaningful data)

## Boundaries

- DO NOT add new data sources — dashboard reads existing tables only
- DO NOT add real-time charts or complex visualizations — keep it simple with cards, bars, and lists
- DO NOT add click-through analytics or attribution tracking — out of scope for v1

## Tasks

### Aggregate Queries

- [ ] Create Convex query `convex/dashboard.ts:pipelineStats` — return count of leads per status (new_lead, enriched, outreach_started, replied, meeting_booked, onboarded, no_email, declined, not_interested, bounced, no_response). Used for the pipeline funnel.
- [ ] Create Convex query `convex/dashboard.ts:emailStats` — return email activity counts for last 7 days and last 30 days: sent, opened, clicked, replied. Aggregate from the `emails` table by checking `sentAt`, `openedAt`, `clickedAt`, `repliedAt` timestamps.
- [ ] Create Convex query `convex/dashboard.ts:socialStats` — return social activity counts for last 7 days and last 30 days: DMs sent, DM replies, follows. Aggregate from `activities` table where type starts with `social_`.
- [ ] Create Convex query `convex/dashboard.ts:clusterBreakdown` — return leads count per cluster (name + count), plus unclustered count.
- [ ] Create Convex query `convex/dashboard.ts:followUpsDue` — return leads where `nextFollowUpAt` <= end of today, split into "due today" and "overdue". Return lead name, city, type, nextFollowUpAt. Limit 10, sorted by most overdue first.
- [ ] Create Convex query `convex/dashboard.ts:activeCampaigns` — return campaigns with status `active` or `paused`. Include name, status, leadCount, stats (sent, open rate, reply rate).

### Dashboard UI

- [ ] Create dashboard page at `src/app/page.tsx` — replace placeholder. Layout: top row of 4 metric cards, middle row of 2 wider cards, bottom row of 3 cards. Match the mockup layout exactly.
- [ ] Create metric cards (top row) — (1) "Sellers Onboarded" with X / 100 and "Goal progress" subtext, (2) "Total Leads" with count and "All statuses" subtext, (3) "Replies (30d)" with count and reply rate % subtext, (4) "Follow-ups Due" with count and "X overdue" subtext in red if any.
- [ ] Create pipeline funnel card (middle left) — horizontal bar chart showing leads by status. Each row: status label, proportional bar (width relative to max count), count number. Use colored bars matching status colors from the map markers. Statuses ordered: New → Enriched → Outreach → Replied → Onboarded.
- [ ] Create active campaigns card (middle right) — list of active/paused campaigns. Each item: campaign name, stats summary ("Sent X - Opened Y%"), status pill (Active = green, Paused = amber, Draft = gray). Click campaign name to navigate to `/campaigns/[id]`.
- [ ] Create email activity card (bottom left) — show sent, opened, clicked counts for last 7 days. Simple stat-row layout matching mockup.
- [ ] Create social touches card (bottom center) — show DMs, replies, follows counts for last 7 days.
- [ ] Create clusters card (bottom right) — show top 3 clusters by lead count with counts, plus unclustered count.

### Needs Follow-up Section

- [ ] Add "Needs Follow-up" section below the main grid — card with list of leads due for follow-up. Each item: lead name (link to detail), city, type, how overdue ("Due today" / "2 days overdue"). Show max 10, with "View all" link to leads table filtered by needs-follow-up.

## Validation

- [ ] Dashboard loads without errors and shows all 7 cards + follow-up section
- [ ] Pipeline funnel shows correct counts matching actual lead statuses in database
- [ ] Metric cards show correct aggregated numbers
- [ ] Email stats reflect actual email records (or show 0s if no campaigns run yet)
- [ ] Active campaigns list shows campaigns with correct statuses
- [ ] Follow-up section shows leads with due/overdue reminders
- [ ] Clicking campaign name navigates to campaign detail
- [ ] Clicking follow-up lead name navigates to lead detail
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
