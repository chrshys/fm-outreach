# Phase 23: Apify Website + Social Page Scraping for Enrichment

Sonar (Phase 22) is good at semantic enrichment (products, descriptions, certifications) but misses deterministic data in website HTML — social links in footers, contact emails on /contact pages, etc. This adds Apify-powered scraping to fill that gap with two new pipeline steps: a website contact scraper and a Facebook/Instagram page scraper.

> **Prerequisites:** Create an Apify account, get an API token (Console → Settings → Integrations), and add it as `APIFY_API_TOKEN` in the Convex environment variables.

**Pipeline after this phase:**
```
Step 3:   Google Places (unchanged)
Step 3b:  Apify Social Scraper (EARLY) — if NO website but HAVE social links → discovers website URL
Step 3c:  Apify Website Scraper — if website URL exists from any source → social links, emails, phones
Step 4:   Sonar (unchanged, but now has website context from social scraper if applicable)
Step 4b:  Apify Social Scraper (LATE) — if still missing email AND have NEW social URLs from 3c/4
```

Reuse existing infrastructure:
- `enrichLead` orchestrator (`convex/enrichment/orchestrator.ts`) — add Apify steps between Places and Sonar
- `batchEnrichLeads` (`convex/enrichment/batchEnrich.ts`) — thread new `useApify` arg
- `isBoilerplateEmail` logic from `convex/enrichment/websiteScraper.ts:39-55` — reuse for email filtering
- Existing error handling pattern: try/catch per step, continue pipeline on failure

## Boundaries
- DO NOT modify `convex/enrichment/googlePlaces.ts` — it stays as-is
- DO NOT modify `convex/enrichment/sonarEnrich.ts` — it stays as-is
- DO NOT add new npm dependencies — use raw `fetch()` for Apify API calls (same pattern as `sonarEnrich.ts`)
- DO NOT modify email generation (`convex/email/generateEmail.ts`) or DM generation (`convex/social/generateDM.ts`)

---

## 1. Create Apify Website Contact Scraper Module

New action that calls Apify's contact details extractor to scrape a website for social links, emails, and phone numbers.

### Tasks
- [x] Create `convex/enrichment/apifyWebsite.ts` with an `ApifyWebsiteResult` type containing: `emails: string[]`, `phones: string[]`, `socialLinks: { facebook: string | null, instagram: string | null }`
- [x] Export a Convex `action` called `scrapeContacts` (NOT `scrapeWebsiteContacts` — avoids triggering existing `doesNotMatch(source, /scrapeWebsite/)` test assertion in `tests/enrichment-orchestrator.test.mjs:340`) with args: `{ url: v.string() }`. The handler should: (a) read `process.env.APIFY_API_TOKEN`, return `null` if missing, (b) POST to `https://api.apify.com/v2/acts/betterdevsscrape~contact-details-extractor/run-sync-get-dataset-items` with `Authorization: Bearer ${apiToken}` header and `Content-Type: application/json`, (c) send body `{ startUrls: [{ url: args.url }], maxDepth: 0 }` (homepage only, $0.001/page), (d) handle 429 (throw rate limit error), non-ok responses (throw with status and response body), (e) parse response as JSON array, take the first item, (f) extract emails array — filter with `isBoilerplateEmail` function (copy logic from `convex/enrichment/websiteScraper.ts:39-55`: reject emails ending in `.png`/`.jpg`/`.gif`/`.svg`/`.webp`, containing `example.com`/`sentry`/`wixpress.com`/`wordpress.com`/`squarespace.com`, or starting with `noreply@`/`no-reply@`), (g) extract phones array from response, (h) extract social links by finding URLs matching `facebook.com` and `instagram.com` patterns in the response data, (i) return `ApifyWebsiteResult | null` (null on parse failure)
- [x] Use a 30-second timeout via `AbortController` on the fetch call — Apify sync endpoint can take up to 300s, but we should not wait that long

### Validation
- [x] `pnpm typecheck` passes
- [x] File follows the same structure as `convex/enrichment/sonarEnrich.ts` (raw fetch, error handling, defensive parsing)

---

## 2. Create Apify Social Page Scraper Module

New action that scrapes Facebook and Instagram pages for contact information (email, phone, website URL).

### Tasks
- [x] Create `convex/enrichment/apifySocial.ts` with an `ApifySocialResult` type containing: `email: string | null`, `phone: string | null`, `website: string | null`
- [x] Export a Convex `action` called `scrapeSocialPages` with args: `{ facebookUrl: v.optional(v.string()), instagramUsername: v.optional(v.string()) }`. The handler should: (a) read `process.env.APIFY_API_TOKEN`, return `null` if missing, (b) return `null` if neither `facebookUrl` nor `instagramUsername` is provided, (c) initialize result as `{ email: null, phone: null, website: null }`, (d) if `facebookUrl` is provided: POST to `https://api.apify.com/v2/acts/apify~facebook-page-contact-information/run-sync-get-dataset-items` with `{ pageUrls: [facebookUrl] }` — extract email, phone, website from first result item, (e) if `instagramUsername` is provided and still missing email: POST to `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items` with `{ usernames: [instagramUsername] }` — extract website URL from bio/external links, (f) each platform call should be wrapped in its own try/catch so one failure doesn't prevent the other, (g) use 30-second `AbortController` timeout per call, (h) return `ApifySocialResult | null`
- [x] Use defensive parsing for both platform responses — the response shapes may vary, so check types before accessing fields (same pattern as `parseSonarResponse` in `sonarEnrich.ts`)

### Validation
- [x] `pnpm typecheck` passes
- [x] File follows the same structure as `convex/enrichment/sonarEnrich.ts`

---

## 3. Rewire Orchestrator to Include Apify Steps

Add Apify scraping steps to the enrichment pipeline with conditional ordering: social scraper runs EARLY when there's no website (to discover one for Sonar), website scraper runs when a URL exists from any source, and social scraper runs LATE as a fallback for missing email.

### Tasks
- [x] In `convex/enrichment/orchestrator.ts`, add imports: `import type { ApifyWebsiteResult } from "./apifyWebsite"` and `import type { ApifySocialResult } from "./apifySocial"`
- [x] Add `useApify: v.optional(v.boolean())` to the `enrichLead` action's args
- [x] Change `ENRICHMENT_VERSION` from `"2.0"` to `"3.0"`
- [x] After the Google Places block (after line 129 `}`), add **Step 3b — Apify Social Scraper (EARLY)**. This step only runs when: `useApify !== false` AND `!websiteUrl` AND lead already has social links (`lead.socialLinks?.facebook || lead.socialLinks?.instagram`). Extract Instagram username from URL with regex `/instagram\.com\/([^/?#]+)/`. Call `ctx.runAction(api.enrichment.apifySocial.scrapeSocialPages, { facebookUrl, instagramUsername })`. Track scraped URLs in a `Set<string>` called `scrapedSocialUrls` to avoid re-scraping in Step 4b. If result has a `website` field, update `websiteUrl` so the website scraper and Sonar can use it. Push `{ source: "apify_social", fetchedAt: Date.now() }` to sources if successful.
- [x] After Step 3b, add **Step 3c — Apify Website Scraper**. This step runs when: `useApify !== false` AND `websiteUrl` exists (from lead record, Google Places, OR social scraper in 3b). Call `ctx.runAction(api.enrichment.apifyWebsite.scrapeContacts, { url: websiteUrl })`. Push `{ source: "apify_website", detail: websiteUrl, fetchedAt: Date.now() }` to sources if successful.
- [x] After the Sonar block, add **Step 4b — Apify Social Scraper (LATE)**. This step only runs when: `useApify !== false` AND still missing email (check `!lead.contactEmail && !(apifyWebsiteResult?.emails?.length) && !sonarResult?.contactEmail && !apifySocialResult?.email`) AND have social URLs not already scraped in Step 3b (check against `scrapedSocialUrls` set). Collect known FB/IG URLs from `apifyWebsiteResult?.socialLinks`, `sonarResult?.socialLinks`, and `lead.socialLinks`. Call `scrapeSocialPages` with only the unscraped URLs. Merge late results into `apifySocialResult` (fill gaps only — don't overwrite early results). Add `apify_social` to sources if not already present.
- [x] Update the **merge logic** to incorporate Apify results with correct priority order. For email: check `apifyWebsiteResult.emails[0]` first, then `apifySocialResult.email`, then `sonarResult.contactEmail`. For social links: merge `apifyWebsiteResult.socialLinks` first (highest priority — literal HTML extraction), then `sonarResult.socialLinks`. For phone: `apifySocialResult.phone` as fallback after Google Places and Sonar. For website: `apifySocialResult.website` already feeds into `websiteUrl` in Step 3b. Update `emailSource` strings to include `"apify_website - {url}"` and `"apify_social - {date}"` patterns.
- [x] Wrap each new Apify step in try/catch (same pattern as existing Google Places and Sonar steps — `catch { /* continue */ }`)

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] The orchestrator still handles: cooldown check, unsubscribe block list, Google Places, Sonar, merge logic, status transitions, consent source, activity logging

---

## 4. Thread `useApify` Through Batch Enrichment

### Tasks
- [x] In `convex/enrichment/batchEnrich.ts`, add `useApify: v.optional(v.boolean())` to `batchEnrichLeads` args. Pass it through to each `ctx.runAction(internal.enrichment.orchestrator.enrichLead, { leadId, force, overwrite, useSonarPro: args.useSonarPro, useApify: args.useApify })`
- [x] In `convex/enrichment/batchEnrichPublic.ts`, add `useApify: v.optional(v.boolean())` to both `batchEnrich` and `enrichCellLeads` actions, and thread it through to `batchEnrichLeads`

### Validation
- [x] `pnpm typecheck` passes

---

## 5. Update Data Freshness Source Labels

### Tasks
- [x] In `src/components/leads/data-freshness.tsx`, add two new entries to the `SOURCE_LABELS` object: `"apify_website"` with label `"Website Scraper"` and `"apify_social"` with label `"Social Pages"`. Keep all existing labels for backward compatibility.

### Validation
- [x] `pnpm typecheck` passes

---

## 6. Update Tests

Tests in this project are source-code regex pattern assertions. The orchestrator tests need updating for new steps, imports, and merge logic.

### Tasks
- [x] Create `tests/apify-website.test.mjs` with pattern assertions against `convex/enrichment/apifyWebsite.ts`: (a) exports `scrapeContacts` action, (b) exports `ApifyWebsiteResult` type, (c) reads `APIFY_API_TOKEN` from `process.env`, (d) uses `betterdevsscrape` actor (contact-details-extractor), (e) uses Apify sync endpoint (`api.apify.com/v2/acts`), (f) uses `maxDepth: 0`, (g) sends `Authorization: Bearer` header, (h) handles 429 rate limit, (i) filters boilerplate emails (match on `isBoilerplateEmail` or boilerplate-related patterns like `noreply`, `example.com`), (j) result type includes `emails`, `phones`, `socialLinks`
- [x] Create `tests/apify-social.test.mjs` with pattern assertions against `convex/enrichment/apifySocial.ts`: (a) exports `scrapeSocialPages` action, (b) exports `ApifySocialResult` type, (c) reads `APIFY_API_TOKEN` from `process.env`, (d) uses Facebook page contact info actor (`facebook-page-contact-information`), (e) uses Instagram profile scraper actor (`instagram-profile-scraper`), (f) accepts `facebookUrl` and `instagramUsername` optional args, (g) returns null when no token or no args
- [x] Update `tests/enrichment-orchestrator.test.mjs`: (a) add `useApify` to the args assertion alongside `useSonarPro`, (b) add import assertion for `ApifyWebsiteResult` from `./apifyWebsite` and `ApifySocialResult` from `./apifySocial`, (c) add assertion that `api.enrichment.apifyWebsite.scrapeContacts` is called, (d) add assertion that `api.enrichment.apifySocial.scrapeSocialPages` is called, (e) add assertion for `source: "apify_website"` in sources, (f) add assertion for `source: "apify_social"` in sources, (g) update `ENRICHMENT_VERSION` assertion from `"2.0"` to `"3.0"`, (h) update the `doesNotMatch(source, /scrapeWebsite/)` test on line 340 — change the regex to `/from\s+["']\.\/websiteScraper["']/` so it blocks old module imports without matching the new `scrapeContacts` function, (i) update step-position-dependent slicing tests (lines 297-303, 148-154) to account for new step comments `// Step 3b:` and `// Step 4b:`
- [x] Update `tests/enrichment-fills-fields.test.mjs`: (a) add assertions for `apifyWebsiteResult` email merge before `sonarResult`, (b) add assertions for `apifyWebsiteResult` social links merge, (c) add assertions for `apifySocialResult` fallback for email, phone, and website

### Validation
- [x] `node --test tests/` passes — all tests green
- [x] Old test files for scraper/hunter/claude/social still pass (those source files weren't deleted)

---

## Validation

- [x] `APIFY_API_TOKEN` is set in Convex environment variables
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `node --test tests/` passes
- [x] Re-enrich a lead with a known website (e.g., Big Red Markets) with `--force` — social links found via Apify website scraper
- [x] Re-enrich a lead with no website but with existing social links — Apify social scraper fires, discovers website URL, website scraper runs on discovered URL
- [x] Previously-enriched leads still display their old enrichment sources correctly (backward compat)
- [x] Batch enrichment from discovery panel still works with `useApify` defaulting to true
