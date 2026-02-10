# Phase 6: Lead Enrichment Pipeline

Fill in contact info and farm details for outreach readiness. After this phase: you can select leads and run enrichment that fills in phone, website, email, products, social links, and farm descriptions from Google Places, website scraping, Hunter.io, and Claude analysis.

> **Prerequisites:** Complete "Before Phase 6" in [MANUAL-SETUP.md](../MANUAL-SETUP.md) (API keys set as Convex env vars). Phase 5 completed.

## Boundaries

- DO NOT build email sending or campaign features — just enrichment
- DO NOT scrape social media platforms (TOS restrictions) — only discover links
- DO NOT call APIs without the key being configured — check for key existence first and return a clear error if missing
- DO NOT run enrichment on leads enriched within the last 30 days unless `force: true` is passed

## Tasks

### Enrichment Sources

- [ ] Create Google Places enrichment action in `convex/enrichment/googlePlaces.ts` — takes a lead `{ name, city, address }`, calls Google Places Text Search API to find the business, then Place Details for phone, website, hours, placeId, rating. Return structured result: `{ placeId, phone, website, hours, rating, formattedAddress }`. Handle: not found, multiple results (pick best match by name similarity), API errors.
- [ ] Create website scraping action in `convex/enrichment/websiteScraper.ts` — takes a URL, fetches the page HTML via `fetch()`, extracts: email addresses (regex for mailto: and common patterns), social links (facebook.com, instagram.com URLs), products mentioned, detect Shopify/Square (check for `myshopify.com`, `squareup.com`, or specific meta tags). Return structured result. Handle: unreachable sites, timeouts (5s), non-HTML responses.
- [ ] Create Hunter.io integration action in `convex/enrichment/hunter.ts` — takes a domain, calls Hunter.io Domain Search API (`https://api.hunter.io/v2/domain-search?domain={domain}&api_key={key}`). Return: array of found emails with confidence scores. Handle: no results, rate limits (free tier: 25/mo), API errors. Skip if no Hunter API key configured.
- [ ] Create Claude analysis action in `convex/enrichment/claudeAnalysis.ts` — takes website content (text extracted from scrape), calls Anthropic API with a structured extraction prompt. Extract: products sold (array), sales channels (array), whether they sell online (boolean), business description (1-2 sentences), contact name if found. Use `claude-haiku-4-5-20251001` for cost efficiency. Return structured JSON. Handle: API errors, empty/irrelevant content.
- [ ] Create social link discovery function in `convex/enrichment/socialDiscovery.ts` — takes a lead's website content and Google Places data. Extract Facebook and Instagram page URLs from: website HTML (social link patterns), Google Places website field. Validate URLs are actual business pages (not just social media home pages). Return `{ facebook?: string, instagram?: string }`.

### Orchestrator

- [ ] Create enrichment orchestrator in `convex/enrichment/orchestrator.ts` — Convex action that takes a lead ID and `{ force?: boolean }`. Pipeline: (1) check cooldown — skip if enriched within 30 days and not forced, log `enrichment_skipped` activity, (2) log `enrichment_started` activity, (3) run Google Places if no placeId, (4) run website scraper if website exists, (5) run Hunter.io if website domain found and no email yet, (6) run Claude analysis if website content was scraped, (7) run social discovery, (8) merge all results into lead record — only overwrite fields that are currently empty unless forced, (9) set `enrichedAt`, `enrichmentVersion`, update `enrichmentSources` array, (10) set status to `enriched` if email found or `no_email` if not, (11) set `consentSource` documenting where email was found, (12) log `enrichment_finished` activity with summary. Return result summary.
- [ ] Create batch enrichment action in `convex/enrichment/batchEnrich.ts` — takes array of lead IDs, runs orchestrator on each sequentially with 1s delay between leads. Return per-lead results. Cap at 25 leads per batch to avoid Convex action timeout.

### UI

- [ ] Add "Enrich Selected" button to leads table bulk actions bar — appears when leads are selected. Clicking it calls the batch enrichment action. Show a toast/notification when enrichment starts. Disable the button while enrichment is running for those leads.
- [ ] Create enrichment progress indicator at `src/components/leads/enrichment-progress.tsx` — while enrichment is running, show a progress bar or spinner near the bulk actions bar. Use Convex real-time subscription on the activities table to detect when `enrichment_finished` activities appear for the selected leads.
- [ ] Add data freshness indicators to lead detail page — new section showing: "Last enriched: [date]" (or "Never enriched"), "Enrichment sources: [list]" (Google Places, website, Hunter.io, Claude), staleness indicator (Fresh < 30 days, Aging 30-90 days, Stale > 90 days) as colored Badge. Add "Re-enrich" button that calls the orchestrator with `force: true`.
- [ ] Add enrichment source badges to lead detail — under the data freshness section, list each enrichment source with the date it was fetched, matching the mockup's source list format.

## Validation

- [ ] Selecting a lead with a known website and clicking "Enrich" fills in additional fields (phone, products, etc.)
- [ ] Google Places enrichment finds the business and fills placeId, phone if available
- [ ] Website scraper extracts email addresses and social links from lead websites
- [ ] Claude analysis produces a structured farm description and product list
- [ ] Enrichment sets `consentSource` when an email is found
- [ ] Lead status changes to `enriched` (if email found) or `no_email` (if not)
- [ ] Running enrichment on an already-enriched lead (within 30 days) is skipped
- [ ] Running enrichment with "Re-enrich" button bypasses the 30-day cooldown
- [ ] Data freshness indicators show correct staleness level
- [ ] Activity timeline shows enrichment_started and enrichment_finished entries
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
