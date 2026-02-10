# FM Outreach — Project Roadmap

## Phase 1: Scaffold & Data Layer

The foundation. Get Next.js + Convex running with the full schema.

1. **Init Next.js 15 project** — App Router, Tailwind, shadcn/ui, TypeScript
2. **Init Convex** — `npx convex dev`, connect to project
3. **Define Convex schema** — All 6 tables (`leads`, `clusters`, `emails`, `activities`, `emailTemplates`, `campaigns`) with all fields from spec
4. **Seed data utilities** — Helper functions for creating test leads, activities
5. **Basic layout shell** — Sidebar nav (Dashboard, Leads, Map, Clusters, Campaigns, Settings), top bar, page routing — match the mockup

## Phase 2: Seed Data from CSVs

Both CSVs (`farms.csv`, `farmers-markets.csv`) share the same column structure and the mapping to lead fields is known. ~446 rows total, one-time seed — no generic import UI needed.

1. **Seed mutation** — Convex mutation with hardcoded column mapping: `Name` → `name`, `Email address` → `contactEmail`, `URL` → `website`, `Instagram` → `socialLinks.instagram`, `Phone` → `contactPhone`, `Address` → `address`, `Town / City` → `city`, `Hours` → `notes`. Derive `type` from `Categories` column (`"Farmer's Market"` → `farmers_market`, else `farm`). Set `source: "spreadsheet_import"`, `status: "new_lead"`, `consentSource: "spreadsheet_import - [filename] - [date]"`.
2. **Deduplication** — Match by name+city (case-insensitive, trimmed) across both files, skip duplicates
3. **Run the seed** — Import both CSVs, log results (inserted/skipped/duplicate counts)
4. **Batch geocoding** — Post-import Convex action that geocodes all leads missing lat/lng via Google Geocoding API

## Phase 3: Leads Table & Lead Detail

The primary workhorse views.

1. **Leads table page** (`/leads`) — Sortable columns: Name, Type, City, Status, Contact Email, Social, Last Activity
2. **Filters** — Status, type, cluster, has-email, has-social, source, needs-follow-up
3. **Search** — Name/city text search
4. **Bulk actions** — Multi-select with assign-to-cluster, change-status
5. **Lead detail page** (`/leads/[id]`) — Full profile with all fields, inline editing
6. **Activity timeline** — Unified activity feed on lead detail (all channels)
7. **Manual activity logging** — "Add Note", "Log Call", "Log Social DM" buttons that create activity records
8. **Status selector** — Pipeline stage advancement with activity logging on change
9. **Follow-up reminder** — Set `nextFollowUpAt`, show indicator when due/overdue

## Phase 4: Map View & Clustering

Geographic visualization and grouping.

1. **Map page** (`/map`) — Leaflet map rendering all leads with lat/lng
2. **Color-coded markers** — By pipeline status
3. **Marker popups** — Lead summary on click, link to detail page
4. **Map filters** — Status, type, cluster
5. **Clusters page** (`/clusters`) — List clusters with lead counts
6. **Auto-clustering** — DBSCAN implementation (15km core distance, min 3 points), name by most common city
7. **Cluster boundaries** — Show as circles on map
8. **Manual cluster management** — Edit name/radius, draw region tool for manual clusters
9. **Cluster detail view** — Map + table for a single cluster's leads

## Phase 5: Settings & API Configuration

Store API keys and sender info so everything downstream works.

1. **Settings page** (`/settings`) — Form for all API keys (Smartlead, Google Places, Hunter.io, Anthropic)
2. **Sender info** — Default sender name, email, physical address (CASL), email signature
3. **Convex environment variables** — Store keys securely, expose to actions
4. **Outreach domain config** — Document the domain setup (SPF/DKIM/DMARC)

## Phase 6: Lead Enrichment Pipeline

Fill in contact info and farm details for outreach readiness.

1. **Google Places enrichment** — Lookup by name+city, fill phone/website/hours/placeId
2. **Website scraping** — Extract email, products, social links, detect Shopify/Square
3. **Hunter.io integration** — Email lookup by domain (respect free tier limits)
4. **Claude analysis** — Structured extraction from website content: products, sales channels, business description, online selling status
5. **Social link discovery** — Facebook/Instagram page lookup
6. **Enrichment orchestrator** — Chain sources per lead, update fields, set `consentSource`, set status to `enriched` or `no_email`
7. **Enrichment cooldown** — 30-day cooldown, `enrichment_skipped` logging
8. **Enrichment UI** — "Enrich Selected" button on leads table, progress indicator, activity logging
9. **Data freshness indicators** — Last enriched, stale threshold (90 days), enrichment sources display on lead detail

## Phase 7: Smartlead Integration

The sending engine hookup.

1. **Smartlead API client** — Convex action wrappers for campaign CRUD, sequence management, lead assignment, status changes
2. **Rate limiter** — Queue requests respecting 60/min and 10/2s limits, retry with backoff on 429
3. **Webhook HTTP endpoint** — Convex HTTP route receiving `EMAIL_SENT`, `EMAIL_OPEN`, `EMAIL_LINK_CLICK`, `EMAIL_REPLY`, `LEAD_UNSUBSCRIBED`, `LEAD_CATEGORY_UPDATED`
4. **Webhook handlers** — Idempotent processing: create/update email records, log activities, advance pipeline status
5. **Analytics sync cron** — Periodic Convex cron fetching campaign analytics from Smartlead
6. **Unsubscribe handling** — Global block list sync on `LEAD_UNSUBSCRIBED`, prevent re-adding to campaigns

## Phase 8: Email Templates & AI Generation

Claude-powered personalized outreach.

1. **Email templates table UI** — CRUD for prompt templates (initial + 3 follow-ups)
2. **Seed default templates** — Initial cold intro + follow-up variants matching spec tone
3. **Two-prompt email generation** — Prompt 1 (lead analysis) + Prompt 2 (email generation) via Claude API
4. **Personalization variables** — Inject products, salesChannels, sellsOnline, city/region, socialLinks, farmDescription, contactName
5. **Email composer UI** — On lead detail: "Compose Email" triggers generation, shows editable preview
6. **CASL compliance** — All generated emails include sender ID, physical address, unsubscribe link
7. **Word count enforcement** — 50-125 words constraint in generation prompt

## Phase 9: Campaign Management

Create, launch, and track outreach campaigns.

1. **Campaigns list page** (`/campaigns`) — All campaigns with status, lead count, stats
2. **Create campaign flow** — Name, select leads (by cluster/filter/manual), choose template sequence
3. **Sequence builder** — Map templates to sequence steps (initial + follow-ups with delays per spec: Day 0, 3-4, 7-8, 14)
4. **Batch email generation** — Generate personalized emails for all leads in campaign, store locally
5. **Email preview** — Review AI-generated emails before pushing to Smartlead
6. **Push to Smartlead** — Create campaign, push sequence, add leads, launch — all via Convex actions
7. **Campaign detail page** — Per-lead status, sequence step progress, open/click/reply stats
8. **Reply management** — Surface replies in activity timeline, link to Smartlead Master Inbox

## Phase 10: Social Outreach & Multi-Channel

For leads without email or as supplementary channel.

1. **Social outreach filtered view** — Leads with `no_email` status or social links + no email response
2. **Quick-link buttons** — "Open Facebook Page" / "Open Instagram Profile" in new tab
3. **Social DM generation** — Claude generates 30-60 word casual DMs based on enrichment data
4. **Social activity logging** — "Log Facebook DM" / "Log Instagram DM" buttons with timestamp
5. **Social response tracking** — Log responses, advance pipeline
6. **Social columns in leads table** — Facebook/Instagram availability indicators
7. **Follow-up reminders** — `nextFollowUpAt` management for social follow-ups

## Phase 11: Dashboard

The overview. Built last because it aggregates everything.

1. **Pipeline funnel** — Leads by status
2. **Email stats** — Sent/opened/clicked/replied (7d / 30d) from Smartlead sync
3. **Social stats** — Touches logged (7d / 30d)
4. **Leads by cluster** — Bar chart
5. **Goal progress** — X / 100 sellers onboarded
6. **Needs follow-up** — Due today / overdue list
7. **Active campaigns** — Campaign cards with live stats

## Phase 12: CLI Skills

Power-user terminal operations.

1. `/discover-leads` — Lead discovery agent for a region
2. `/enrich-leads` — Batch enrichment by cluster or filter
3. `/import-csv` — Terminal CSV import
4. `/outreach-stats` — Pipeline + email stats printed to terminal
5. `/generate-email` — Generate and preview email for a specific lead
6. `/campaign-status` — Active campaign stats from Smartlead

---

## Execution Notes

**Critical path:** Phases 1-3 get you a usable CRM with your existing data. Phase 5-6 makes leads outreach-ready. Phase 7-9 gets emails flowing. Everything else is valuable but not blocking outreach.

**Parallel opportunities:** Phase 4 (map/clusters) is independent of Phase 5-6 (settings/enrichment). Phase 10 (social) and Phase 11 (dashboard) can overlap.
