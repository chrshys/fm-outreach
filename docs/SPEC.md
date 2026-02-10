# FM Outreach — Seller Acquisition CRM

## Overview

Internal web app for Fruitland Market's seller acquisition effort. Combines a lightweight CRM with AI-powered lead discovery, enrichment, and multi-channel outreach to find, contact, and onboard 100 sellers in rural Ontario within 3 months — starting with the Niagara region.

Email sequences are AI-personalized per lead, sent via Smartlead (dedicated cold email infrastructure), and tracked via webhooks. Social outreach (Facebook/Instagram DMs) is tracked alongside email in a unified activity timeline. Claude agents handle lead discovery (Google Places API + Ontario farm directories), data enrichment, and email personalization — triggered both from the UI and via CLI skills.

The CRM app is built with Next.js + Convex. Smartlead handles all email sending, deliverability, warmup, and sequence management via its API. The app controls Smartlead programmatically — campaigns, prospects, sequences, and tracking all flow through our system.

## Success Metric

100 sellers onboarded onto Fruitland Market within 3 months of launching outreach.

## User

Solo operator (Chris). No auth required. No multi-user features in v1.

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js 15 (App Router) + Tailwind + shadcn/ui | Same as FM, muscle memory |
| Backend/DB | Convex | Same as FM, real-time updates, zero infra |
| Cold Email Sending | Smartlead | Dedicated cold email infrastructure with full API, built-in warmup, deliverability monitoring, sequence automation, inbox rotation |
| Cold Email Sending Account | Google Workspace on separate domain | Separate domain protects fruitlandmarket.com reputation; Google has excellent deliverability |
| Outreach Domain | e.g., `fruitlandmkt.com` or similar | Lookalike domain, NOT fruitlandmarket.com — cold outreach must never risk the primary domain |
| Maps | Leaflet | Free, already used in FM |
| Lead Discovery | Google Places API + Ontario farm directories | Google Places for structured data; Ontario open data, Fresh As Farmed, Agritourism Ontario, Farmers' Markets Ontario for farm-specific leads |
| Lead Enrichment | Hunter.io + website scraping + Claude | Hunter.io for email finding (free tier: 25/mo), website/Facebook scraping for farm details, Claude for structured extraction |
| AI | Claude (via Anthropic API or Vercel AI SDK) | Personalized email generation, data enrichment, lead analysis |
| Geocoding | Google Geocoding API (for spreadsheet import) | Convert addresses to lat/lng for clustering |
| Project Location | `~/Projects/fm-outreach` | Sibling to fruitland-market |

## Smartlead Integration Architecture

Smartlead is used as a headless sending engine. Our Convex backend controls it entirely via API.

### API Details

- **Base URL:** `https://server.smartlead.ai/api/v1`
- **Auth:** API key as query parameter (`?api_key={KEY}`)
- **Rate limits:** 60 requests per 60 seconds, 10 requests per 2-second window
- **Bulk lead uploads:** Up to 350 leads per request

### How It Works

1. **Campaign creation** — Convex action calls `POST /campaigns/create` to create a campaign in Smartlead
2. **Sequence building** — Convex action calls `POST /campaigns/{id}/sequences` to define the email steps, delays, and A/B variants
3. **Lead assignment** — Convex action calls `POST /campaigns/{id}/leads` to add prospects (up to 100/request)
4. **Campaign launch** — Convex action calls `PATCH /campaigns/{id}/status` to start sending
5. **Event tracking** — Smartlead webhooks (`EMAIL_SENT`, `EMAIL_OPEN`, `EMAIL_LINK_CLICK`, `EMAIL_REPLY`, `LEAD_UNSUBSCRIBED`, `LEAD_CATEGORY_UPDATED`) hit a Convex HTTP endpoint that updates our `emails` and `activities` tables
6. **Reply management** — Master Inbox API lets us fetch replies, respond, and manage conversations programmatically
7. **Analytics sync** — Periodic Convex cron fetches campaign analytics from Smartlead and syncs to our dashboard

### Smartlead-Managed Concerns (we don't build these)

- Email warmup and sender reputation
- Inbox rotation across multiple sending accounts
- Send throttling and daily limits
- Bounce detection and auto-pause
- Unsubscribe handling (one-click unsubscribe headers)
- SPF/DKIM/DMARC validation
- Deliverability monitoring

### Our App Manages

- Lead discovery, enrichment, and scoring
- AI-powered email personalization (Claude generates content, we push to Smartlead)
- Campaign strategy (which leads, which sequence, when)
- Unified activity timeline (email + social + phone + notes)
- Pipeline management and reporting
- CASL compliance tracking

## CASL Compliance

Canada's Anti-Spam Legislation (CASL) is stricter than US CAN-SPAM. There is no blanket B2B exemption. Non-compliance penalties are up to $10M per violation for companies.

### Legal Basis for Cold Outreach

We rely on the **conspicuous publication exemption**: you CAN email someone without prior consent IF their email address is conspicuously published (on their website, Google listing, directory), there is no statement saying they don't want unsolicited emails, and your message is relevant to their business.

A marketplace invitation is relevant to a farm's business — this exemption applies.

### Requirements for Every Outreach Email

1. **Sender identification** — name, business name, mailing address
2. **Contact information** — phone, email, web address
3. **Unsubscribe mechanism** — must be included, honored within 10 business days
4. **Business addresses only** — never email personal addresses
5. **Relevance** — message must be relevant to their business role

### Data Model Implications

- Every lead must have a `consentSource` field documenting where the email was found
- Format: `"website - freshasfarmed.ca - 2026-02-15"` or `"google_places - place_id_xyz - 2026-02-15"`
- The `emailTemplates` must include sender identification, physical address, and unsubscribe link in every template
- Store unsubscribe requests and honor them globally (Smartlead handles this via `LEAD_UNSUBSCRIBED` webhook + global block list API)

## Data Model

### `leads` table

The core record. One row per potential seller (farm, market, retail store).

| Field | Type | Description |
|-------|------|-------------|
| `id` | auto | Convex document ID |
| `name` | string | Business/farm name |
| `type` | string | `farm` \| `farmers_market` \| `retail_store` \| `roadside_stand` \| `other` |
| `address` | string | Full address |
| `city` | string | City/town |
| `region` | string | e.g., "Niagara", "Hamilton-Wentworth" |
| `province` | string | Always "ON" for v1 |
| `latitude` | number | For map + clustering |
| `longitude` | number | For map + clustering |
| `placeId` | string? | Google Places ID (if discovered/enriched via Google) |
| `contactName` | string? | Primary contact person |
| `contactEmail` | string? | Email address |
| `contactPhone` | string? | Phone number |
| `website` | string? | Business website |
| `socialLinks` | object? | `{ instagram?, facebook? }` — URLs to business profiles |
| `products` | string[]? | What they sell (e.g., ["apples", "honey", "preserves"]) |
| `salesChannels` | string[]? | Current sales channels (e.g., ["farmers_market", "farm_stand", "csa", "wholesale", "online"]) |
| `sellsOnline` | boolean? | Whether they currently sell online (Shopify, Square, etc.) |
| `farmDescription` | string? | AI-generated summary of the business from enrichment |
| `notes` | string? | Free-text notes |
| `source` | string | `spreadsheet_import` \| `google_places` \| `farm_directory` \| `manual` \| `web_scrape` |
| `sourceDetail` | string? | Specific source (e.g., "freshasfarmed.ca", "agritourismontario.com") |
| `consentSource` | string? | CASL: where the email was found + date (e.g., "website - freshasfarmed.ca - 2026-02-15") |
| `status` | string | Pipeline stage (see below) |
| `clusterId` | string? | FK to cluster |
| `smartleadLeadId` | string? | Lead ID in Smartlead (set when added to a campaign) |
| `smartleadCampaignId` | string? | Which Smartlead campaign this lead is in |
| `enrichedAt` | number? | Timestamp of last enrichment |
| `lastVerifiedAt` | number? | Timestamp when contact info was last verified |
| `enrichmentVersion` | string? | Version tag for enrichment logic |
| `enrichmentSources` | object[]? | Array of `{ source, detail, fetchedAt }` entries |
| `enrichmentData` | object? | Raw enrichment payload (Google Places response, etc.) |
| `nextFollowUpAt` | number? | When the next follow-up is due (for manual social/phone follow-ups) |
| `followUpCount` | number | Number of follow-up touches so far (default 0) |
| `createdAt` | number | Import/creation timestamp |
| `updatedAt` | number | Last modified |

### `clusters` table

Geographic groupings of leads for batch outreach.

| Field | Type | Description |
|-------|------|-------------|
| `id` | auto | Convex document ID |
| `name` | string | Human-readable name (e.g., "Niagara-on-the-Lake") |
| `centerLat` | number | Cluster center latitude |
| `centerLng` | number | Cluster center longitude |
| `radiusKm` | number | Cluster radius |
| `leadCount` | number | Denormalized count |
| `isAutoGenerated` | boolean | System-generated vs manually defined |

### `emails` table

Every email sent, with tracking. Synced from Smartlead via webhooks.

| Field | Type | Description |
|-------|------|-------------|
| `id` | auto | Convex document ID |
| `leadId` | string | FK to lead |
| `smartleadCampaignId` | string | Smartlead campaign ID |
| `sequenceStep` | number | Which step in the sequence (1 = initial, 2+ = follow-ups) |
| `subject` | string | Email subject line |
| `body` | string | HTML email body |
| `sentAt` | number | Send timestamp |
| `openedAt` | number? | First open timestamp (from Smartlead webhook) |
| `clickedAt` | number? | First click timestamp (from Smartlead webhook) |
| `repliedAt` | number? | Reply timestamp (from Smartlead webhook) |
| `bouncedAt` | number? | Bounce timestamp (from Smartlead webhook) |
| `templateId` | string? | Which template/prompt was used |

### `activities` table

Activity log for each lead — all interactions across all channels.

| Field | Type | Description |
|-------|------|-------------|
| `id` | auto | Convex document ID |
| `leadId` | string | FK to lead |
| `type` | string | `email_sent` \| `email_opened` \| `email_clicked` \| `email_replied` \| `email_bounced` \| `phone_call` \| `meeting_booked` \| `note_added` \| `status_changed` \| `enriched` \| `enrichment_started` \| `enrichment_finished` \| `enrichment_skipped` \| `enrichment_source_added` \| `social_dm_sent` \| `social_dm_replied` \| `social_followed` \| `social_commented` |
| `channel` | string? | `email` \| `phone` \| `facebook` \| `instagram` \| `in_person` |
| `description` | string | Human-readable summary |
| `metadata` | object? | Extra data (e.g., `{ emailId, oldStatus, newStatus, platform, messagePreview }`) |
| `createdAt` | number | Timestamp |

### `emailTemplates` table

Prompt templates for AI-generated emails.

| Field | Type | Description |
|-------|------|-------------|
| `id` | auto | Convex document ID |
| `name` | string | Template name (e.g., "Cold Intro - Farm") |
| `sequenceType` | string | `initial` \| `follow_up_1` \| `follow_up_2` \| `follow_up_3` |
| `prompt` | string | Claude prompt with placeholders (see Email Personalization section) |
| `subject` | string | Subject line template |
| `isDefault` | boolean | Default template for this sequence position |

### `campaigns` table

Outreach campaigns that map to Smartlead campaigns.

| Field | Type | Description |
|-------|------|-------------|
| `id` | auto | Convex document ID |
| `name` | string | Campaign name (e.g., "Niagara Farms - Spring 2026") |
| `smartleadCampaignId` | string? | ID in Smartlead (set after creation) |
| `status` | string | `draft` \| `active` \| `paused` \| `completed` |
| `templateIds` | string[] | Ordered list of template IDs for the sequence (initial + follow-ups) |
| `targetClusterId` | string? | Target cluster, if cluster-based |
| `targetFilter` | object? | Filter criteria for leads (status, type, region, etc.) |
| `leadCount` | number | Number of leads in this campaign |
| `stats` | object? | `{ sent, opened, clicked, replied, bounced }` — synced from Smartlead |
| `createdAt` | number | Creation timestamp |
| `updatedAt` | number | Last modified |

## Pipeline Stages

```
new_lead → enriched → outreach_started → replied → meeting_booked → onboarded
                                        ↘ declined
                                        ↘ not_interested
                                        ↘ bounced (bad email)
                                        ↘ no_response (after follow-up window)
                                        ↘ no_email (enrichment couldn't find email — route to social/phone)
```

Leads enter as `new_lead` (from import or discovery). After enrichment fills in contact info, they become `enriched`. If no email is found, they become `no_email` and are flagged for social/phone outreach. Once added to a Smartlead campaign, they become `outreach_started`. Status advances based on activity.

## Data Freshness Rules

- **Default enrichment cooldown:** do not re-enrich within 30 days unless manually forced.
- **Stale threshold:** mark leads as stale at 90 days since `enrichedAt` (or `lastVerifiedAt` if available).
- **Audit trail:** every enrichment run logs sources used and fields updated.

## Lead Discovery Sources

### Primary: Ontario Farm Directories (highest quality for this use case)

| Source | URL | Data Available | How to Ingest |
|--------|-----|---------------|---------------|
| **Fresh As Farmed** | freshasf.ca | Interactive map, farm categories, contact info | Scrape listings by region |
| **Agritourism Ontario** | agritourismontario.com/ontario-farm-map/ | Farms offering direct sales / agritourism | Scrape farm map data |
| **Farmers' Markets Ontario** | farmersmarketsontario.com/find-a-farmers-market/ | Market listings; market managers may share vendor lists | Scrape market listings, contact managers for vendor lists |
| **Ontario Open Data — Farmers Markets** | data.ontario.ca/dataset/farmers-markets | Names, locations, websites (GIS/KMZ format) | Download and parse dataset |
| **Ontario GeoHub** | geohub.lio.gov.on.ca | Geographic data for all farmers markets | Download GIS data |
| **CSA Farm Directory** | csafarms.ca | Community Supported Agriculture farms | Scrape listings |
| **Simcoe Harvest** | simcoeharvest.ca/farmdirectory/ | Regional farm directory (Southern Ontario) | Scrape listings |
| **Farms.com** | farms.com | Searchable directory with contact details | Scrape Ontario farm listings |

### Secondary: APIs

| Source | Data Available | Cost |
|--------|---------------|------|
| **Google Places API** | Business name, address, phone, website, reviews, hours, photos | Pay per request |
| **Hunter.io** | Email addresses from domains | Free: 25 searches/mo; $34/mo: 500 searches |
| **Yellow Pages Canada** | Business listings, phone numbers | Free (scrape) |

### Tertiary: Social Media

| Source | Data Available | Method |
|--------|---------------|--------|
| **Facebook Business Pages** | Email, phone, address, posts, products, about section | Manual research + scraping where TOS allows |
| **Instagram Business Profiles** | Bio, contact info, product posts | Manual research |

## Email Personalization

### Two-Prompt Pattern

Borrowed from DataRabbit and Instantly.ai best practices. Email generation uses two Claude calls:

**Prompt 1 — Lead Analysis:**
Given enrichment data (website content, products, sales channels, location, social presence), generate a structured analysis:
- What does this farm specialize in?
- What are their current sales channels?
- Do they sell online already?
- What would Fruitland Market specifically offer them?
- What's a natural, authentic connection point?

**Prompt 2 — Email Generation:**
Given the lead analysis + template + constraints, generate the email:
- Use ONLY verified data from enrichment (never invent facts)
- 50-125 words (sweet spot for cold email response rates)
- Tone: warm, rural/local-focused, neighbor-to-neighbor — NOT salesy
- Must reference at least one specific detail about the farm (products, location, markets they attend)
- End with a soft call to action (not a hard meeting ask)
- Include local social proof where available ("12 other Niagara farms are already on Fruitland Market")

### Personalization Variables

These fields drive email personalization. The enrichment agent should prioritize filling these:

| Variable | Source | Impact on Email |
|----------|--------|----------------|
| `products` | Website, Google, Facebook, directories | "Your honey and preserves would be perfect for..." |
| `salesChannels` | Website, observation | "Beyond the St. Catharines market, you could reach..." |
| `sellsOnline` | Website (Shopify/Square detection) | Different pitch for online-savvy vs offline-only |
| `city` / `region` | Address | Local relevance ("other Niagara farms...") |
| `socialLinks.facebook` | Enrichment | Reference recent posts or farm updates |
| `farmDescription` | Claude analysis of website | Deep personalization |
| `contactName` | Website, directories | Personal vs generic greeting |

### Email Sequence Structure

Each campaign has a 3-4 step sequence with delays managed by Smartlead:

| Step | Timing | Purpose | Template Type |
|------|--------|---------|---------------|
| 1 — Initial | Day 0 | Warm intro, personalized value prop | `initial` |
| 2 — Follow-up | Day 3-4 | Different angle, social proof | `follow_up_1` |
| 3 — Follow-up | Day 7-8 | Quick check-in, offer to help | `follow_up_2` |
| 4 — Breakup | Day 14 | Last touch, leave the door open | `follow_up_3` |

Smartlead auto-stops the sequence when a lead replies, bounces, or unsubscribes.

## Social Media Outreach

For leads where email is unavailable (`no_email` status) or as a supplementary channel alongside email.

### Supported Channels

- **Facebook** — DMs to business pages, comments on posts, page follows
- **Instagram** — DMs to business profiles, comments on posts, follows

### How It Works

Social outreach is **manually executed** but **CRM-tracked**. The app doesn't automate sending DMs (platform TOS restrictions), but it:

1. **Surfaces leads needing social outreach** — filtered view of leads with `no_email` status or leads with social links who haven't responded to email
2. **Provides quick-link buttons** — "Open Facebook Page" / "Open Instagram Profile" that open the social profile in a new tab
3. **AI-generates DM drafts** — Claude generates a personalized DM based on enrichment data, similar to email but shorter and more casual. Copy-paste ready.
4. **Logs social activities** — After sending a DM manually, click "Log Facebook DM" / "Log Instagram DM" to record it in the activity timeline
5. **Tracks social responses** — When a response comes in, log it to advance the pipeline
6. **Sets follow-up reminders** — `nextFollowUpAt` field triggers a "needs follow-up" indicator in the UI

### Social DM Templates

Separate from email templates. Shorter (30-60 words), more casual, reference their social content:

- "Hey [name]! Love the photos of your [product] — we're building a local marketplace for Niagara farms and think you'd be a great fit. Would you be open to a quick chat?"
- Reference a recent post, seasonal product, or farm event visible on their profile

### UI Integration

- Lead detail page shows social links as clickable icons
- "Social Outreach" tab in the lead detail shows DM drafts and social activity
- Leads table has a "Social" column showing Facebook/Instagram availability
- Filter: "Has social, no email" to find social-only outreach candidates

## UI Pages

Mockup: `mockup/index.html` (open in browser for current HTML/CSS prototype)

### 1. Dashboard (`/`)

Overview metrics:
- Total leads by status (pipeline funnel chart)
- Emails sent / opened / clicked / replied (last 7 / 30 days) — synced from Smartlead
- Social touches logged (last 7 / 30 days)
- Leads by cluster (bar chart)
- Goal progress: X / 100 sellers onboarded
- Leads needing follow-up (due today / overdue)
- Active campaigns with stats

### 2. Leads Table (`/leads`)

Primary workhorse view.

- Sortable, filterable table with columns: Name, Type, City, Cluster, Status, Contact Email, Social, Data Freshness, Last Activity, Follow-Up Due
- Filters: status, type, cluster, has-email, has-social, source, campaign, needs-follow-up
- Bulk actions: assign to cluster, add to campaign, change status
- Search by name/city
- Click row to open lead detail panel/drawer
- "Import CSV" button for spreadsheet upload
- "Discover Leads" button to trigger agent

### 3. Lead Detail (`/leads/[id]`)

Full lead profile:
- All fields from data model, editable inline
- CASL consent source displayed prominently
- Data freshness block: last enriched, last verified, enrichment sources
- Activity timeline (emails, social DMs, calls, status changes, notes) — unified across all channels
- Map showing lead location
- Social links as clickable icons (Facebook, Instagram)
- "Compose Email" button — opens email composer with AI-generated draft
- "Draft Social DM" button — generates copy-paste-ready DM
- "Add Note" / "Log Call" / "Log Social DM" buttons
- Status selector to advance pipeline
- Follow-up reminder setter

### 4. Map View (`/map`)

Leaflet map of all leads:
- Color-coded markers by pipeline status
- Cluster boundaries shown as circles
- Click marker to see lead summary popup
- Filter by status, type, cluster
- "Draw region" tool to manually define a new cluster
- Toggle: show/hide clusters

### 5. Clusters (`/clusters`)

Manage geographic clusters:
- List of clusters with lead counts, outreach stats
- "Auto-generate clusters" button (runs DBSCAN on lead coordinates)
- Edit cluster name, radius
- Click into cluster to see its leads on map + in table

### 6. Campaigns (`/campaigns`)

Campaign management (replaces the old `/email` page):
- **List view** — all campaigns with status, lead count, sent/opened/replied stats (synced from Smartlead)
- **Create campaign** — name, select target leads (by cluster, filter, or manual selection), choose email sequence templates, preview AI-generated emails, push to Smartlead
- **Campaign detail** — per-lead status, sequence step progress, reply management
- **Templates** — manage prompt templates for AI email generation (initial + follow-up variants)

### 7. Settings (`/settings`)

- Smartlead API key
- Google Places API key
- Hunter.io API key (optional)
- Anthropic API key (for Claude agents)
- Default sender info (name, email, physical address for CASL)
- Email signature
- Outreach domain configuration

## AI Agent Capabilities

### 1. Lead Discovery Agent

**Trigger:** UI button ("Discover leads in [region]") or CLI skill (`/discover-leads`)

**Behavior:**
1. Takes a geographic center point + radius (or a named region like "Niagara")
2. Searches multiple sources:
   - **Google Places API**: `type=farm` / keyword searches: "farm stand", "farmers market", "organic farm", "roadside market", "pick your own" — iterates through region grid to avoid the 60-result API limit
   - **Ontario farm directories**: Scrapes Fresh As Farmed, Agritourism Ontario, Farmers' Markets Ontario for the target region
   - **Ontario Open Data**: Parses government datasets for farmers markets in the area
3. For each result, normalizes data into the lead schema
4. Deduplicates against existing leads (by placeId, name+city, or website)
5. Creates new `new_lead` records with `source` and `sourceDetail` set appropriately
6. Logs activity on each lead

### 2. Lead Enrichment Agent

**Trigger:** UI button ("Enrich selected") or CLI skill (`/enrich-leads`)

**Behavior:**
1. Takes a set of leads (or a cluster)
2. For each lead missing contact info:
   - Google Places lookup (if no placeId yet) for phone, website, hours, reviews
   - Website scrape to find email addresses, product info, social links
   - Hunter.io lookup for email (if farm has a website domain)
   - Facebook/Instagram page lookup for social links and additional contact info
   - Claude analysis of website content to extract: products sold, sales channels, business description, whether they sell online
3. Updates lead record with enriched data
4. Sets `consentSource` documenting where the email was found (CASL compliance)
5. Sets status to `enriched` if email was found, `no_email` if not
6. Logs enrichment activity

### 3. Email Generation Agent

**Trigger:** Campaign compose flow in UI or CLI skill (`/generate-email`)

**Behavior:**
1. Takes a lead + template prompt (for the appropriate sequence step)
2. **Prompt 1 — Analysis**: Claude analyzes lead enrichment data to identify personalization points
3. **Prompt 2 — Generation**: Claude generates a personalized email using the analysis + template constraints
4. Returns subject + HTML body for review before pushing to Smartlead
5. Tone: warm, rural/local-focused, not salesy — "neighbor inviting neighbor to the market"
6. Constraints: 50-125 words, use only verified data, include local social proof, reference specific farm details

### 4. Social DM Generation Agent

**Trigger:** "Draft Social DM" button on lead detail page

**Behavior:**
1. Takes a lead + channel (Facebook or Instagram)
2. Claude generates a short (30-60 word), casual DM based on enrichment data
3. References their social content if available (recent posts, profile bio)
4. Returns plain text for copy-paste into the social platform
5. Tone: even more casual than email — like a friendly local reaching out

## Email Flow (via Smartlead API)

1. **Create campaign** — in our app, select leads + templates. Convex action creates campaign in Smartlead via API.
2. **Build sequence** — Convex action pushes the email sequence (initial + follow-ups with delays) to Smartlead via `POST /campaigns/{id}/sequences`.
3. **Generate content** — For each lead, Claude generates personalized email content. This is stored locally and pushed to Smartlead as lead-specific variables.
4. **Add leads** — Convex action adds prospects to the Smartlead campaign via `POST /campaigns/{id}/leads` (up to 100 per request).
5. **Review** — Preview generated emails in our UI before launching.
6. **Launch** — Convex action starts the campaign via `PATCH /campaigns/{id}/status`.
7. **Track** — Smartlead webhooks (`EMAIL_SENT`, `EMAIL_OPEN`, `EMAIL_LINK_CLICK`, `EMAIL_REPLY`) hit our Convex HTTP endpoint. We update `emails` and `activities` tables, advance pipeline status.
8. **Reply management** — Replies surfaced in our activity timeline. Use Smartlead Master Inbox API to respond if needed.
9. **Follow up (social/phone)** — For non-responders or no-email leads, surface in "needs follow-up" view for social DM or phone call.

## Smartlead Webhook Integration

Set up a Convex HTTP endpoint to receive Smartlead webhooks:

| Event | Action |
|-------|--------|
| `EMAIL_SENT` | Create email record, log activity, update lead status to `outreach_started` |
| `EMAIL_OPEN` | Set `openedAt` on email, log activity |
| `EMAIL_LINK_CLICK` | Set `clickedAt` on email, log activity |
| `EMAIL_REPLY` | Set `repliedAt` on email, update lead status to `replied`, log activity |
| `LEAD_UNSUBSCRIBED` | Update lead status, add to global block list, log activity, stop all outreach |
| `LEAD_CATEGORY_UPDATED` | Sync category (interested/not interested/maybe later) to our pipeline |

Webhook retrigger: Smartlead supports `POST /webhooks/retrigger` for failed events — implement a periodic check.

## Spreadsheet Import

- Upload CSV/Excel file
- Column mapping UI: map spreadsheet columns to lead fields
- Geocode addresses that lack lat/lng (Google Geocoding API)
- Deduplicate by name + city
- All imported leads get `source: spreadsheet_import`, `status: new_lead`
- `consentSource` set to `"spreadsheet_import - [filename] - [date]"` (CASL: document the source)
- Preview before committing import

## Claude Code CLI Skills

For power-user operations from the terminal:

| Skill | Description |
|-------|-------------|
| `/discover-leads` | Run lead discovery agent for a region |
| `/enrich-leads` | Enrich a set of leads (by cluster or filter) |
| `/import-csv` | Import a spreadsheet into the CRM |
| `/outreach-stats` | Print pipeline and email stats to terminal |
| `/generate-email` | Generate and preview email for a specific lead |
| `/campaign-status` | Check active campaign stats from Smartlead |

## Auto-Clustering Algorithm

When "Auto-generate clusters" is triggered:

1. Take all leads with coordinates
2. Run DBSCAN-style clustering:
   - Core distance: ~15km (roughly 15-20 min drive in rural Ontario)
   - Min points per cluster: 3
3. Name clusters by most common city in the cluster
4. Allow manual rename and radius adjustment
5. Unassigned outliers go into an "Unclustered" bucket

## Edge Cases & Error Handling

- **Duplicate leads on import:** Match by name + city (case-insensitive, trimmed). Show duplicates in preview, let user decide to skip or merge.
- **Bad/missing addresses:** Flag for manual review. Don't geocode obviously incomplete addresses (no street number, just a city name). Place on map at city center with a "low confidence" indicator.
- **Google Places rate limits:** Implement exponential backoff. Cache all responses. Show progress indicator for long discovery runs.
- **Smartlead API rate limits:** Queue requests in Convex, respect 60 req/min and 10 req/2s limits. Implement retry with backoff on 429 responses.
- **Smartlead webhook failures:** Idempotent handlers (check if already processed). Use retrigger endpoint for failed events.
- **Email bounces:** Smartlead auto-handles bounce detection. Webhook updates our lead status to `bounced`. Don't include in future campaigns.
- **No email found during enrichment:** Set status to `no_email`, flag for social/phone outreach. Surface in "needs social outreach" filtered view.
- **Recent enrichment:** Respect cooldown and log `enrichment_skipped` activity with reason.
- **Stale spreadsheet data:** Enrichment agent should cross-reference Google Places and flag leads where the business appears closed (permanently_closed in Google response).
- **Cluster edge cases:** Leads exactly on cluster boundary → assign to nearest cluster center. Lead reassignment when clusters are regenerated → warn before overwriting existing assignments.
- **CASL compliance:** Every email must have sender ID + physical address + unsubscribe. Never email leads without `consentSource` populated. Never email personal addresses.
- **Social outreach limits:** Respect platform rate limits for DMs. Don't automate sending — manual only, CRM-tracked.

## Out of Scope (v1)

- Multi-user / team features / auth
- SMS outreach
- Integration with Fruitland Market app (manual onboarding for now)
- Automated social media DM sending (manual send, CRM-tracked)
- Paid ad tracking
- Revenue attribution
- Mobile app (web-only)
- Phone call recording/transcription
- Calendar integration for meeting booking

## Conversion Expectations

Based on cold email benchmarks for small businesses:

| Metric | Expected Range |
|--------|---------------|
| Open rate | 40-60% |
| Reply rate | 5-10% |
| Positive reply rate | 2-5% |
| Follow-ups needed | 2-3 per lead |
| Total emails per 100 leads | 300-400 |
| Multi-channel boost | 2-4x vs email-only |

At 5% positive reply rate from 100 leads, expect ~5 interested sellers per batch. Plan to cycle through 500-2000 total leads to reach 100 onboarded sellers.

## Open Questions

- **Smartlead plan selection:** Need to confirm which Smartlead plan includes all required API endpoints. Start with their base plan ($39/mo) and upgrade if needed.
- **Outreach domain:** Need to purchase a lookalike domain (e.g., `fruitlandmkt.com`), set up Google Workspace ($7.20/mo), configure SPF/DKIM/DMARC, and warm up for 2-4 weeks before sending.
- **Google Places API key:** Chris may already have one from the FM project (Google Geocoding is used for seller location setup). Confirm if same key can be reused.
- **Hunter.io:** Decide whether to use free tier (25 lookups/mo) or pay for Starter ($34/mo, 500 lookups). Free tier may be sufficient if most leads come from directories with emails already listed.
- **Ontario farm directory scraping:** Need to verify TOS for Fresh As Farmed, Agritourism Ontario, etc. to confirm scraping is allowed. Fallback: manual data entry from these directories.
- **Social DM templates:** Need to draft initial DM templates for Facebook and Instagram once email templates are finalized.
