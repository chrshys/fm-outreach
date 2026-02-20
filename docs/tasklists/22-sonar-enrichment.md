# Phase 22: LLM-Driven Enrichment via Vercel AI Gateway + Perplexity Sonar

Replace the brittle regex-based enrichment pipeline (website scraper, Hunter.io, Claude analysis, social discovery) with a single Perplexity Sonar call via Vercel AI Gateway. Sonar's built-in web search can find emails, social links, products, and business details across all pages and external sources — not just homepage HTML. This also adds location descriptions and image generation prompts as new enrichment outputs.

> **Prerequisites:** Create an AI Gateway API key in the Vercel dashboard (AI Gateway → API Keys) and add it as `AI_GATEWAY_API_KEY` in the Convex environment variables.

Reuse existing infrastructure:
- `enrichLead` orchestrator (`convex/enrichment/orchestrator.ts`) — restructure to call Sonar instead of scraper/Hunter/Claude/social
- `batchEnrichLeads` (`convex/enrichment/batchEnrich.ts`) — thread new `useSonarPro` arg, otherwise unchanged
- `leads.update` mutation (`convex/leads.ts`) — add new fields to validator
- Google Places integration (`convex/enrichment/googlePlaces.ts`) — unchanged, stays as step 1

## Boundaries
- DO NOT modify `convex/enrichment/googlePlaces.ts` — it stays as-is
- DO NOT delete old enrichment source files (`websiteScraper.ts`, `hunter.ts`, `claudeAnalysis.ts`, `socialDiscovery.ts`) — they stay in repo for reference but are no longer imported by the orchestrator
- DO NOT modify email generation (`convex/email/generateEmail.ts`) or DM generation (`convex/social/generateDM.ts`) — they still use Anthropic directly
- DO NOT add new npm dependencies — use raw `fetch()` for the AI Gateway call (same pattern as existing `claudeAnalysis.ts`)

---

## 1. Add Schema Fields for Location Description and Image Prompt

### Tasks
- [ ] In `convex/schema.ts`, add two new optional fields to the `leads` table definition, after `farmDescription`: `locationDescription: v.optional(v.string())` and `imagePrompt: v.optional(v.string())`
- [ ] In `convex/leads.ts`, add `locationDescription: v.optional(v.string())` and `imagePrompt: v.optional(v.string())` to the `update` mutation's args validator (after `farmDescription`)

### Validation
- [ ] `pnpm typecheck` passes
- [ ] `node --test tests/` passes

---

## 2. Create Sonar Enrichment Module

New action that calls Perplexity Sonar via Vercel AI Gateway to enrich a lead with web-searched data.

### Tasks
- [ ] Create `convex/enrichment/sonarEnrich.ts` with a `SonarEnrichResult` type containing: `contactEmail: string | null`, `contactName: string | null`, `contactPhone: string | null`, `website: string | null`, `socialLinks: { facebook: string | null, instagram: string | null }`, `products: string[]`, `structuredProducts: Array<{ name: string, category: string }>`, `salesChannels: string[]`, `sellsOnline: boolean`, `businessDescription: string`, `structuredDescription: { summary: string, specialties: string[], certifications: string[] }`, `locationDescription: string`, `imagePrompt: string`, `citations: string[]`
- [ ] Export a Convex `action` called `enrichWithSonar` with args: `{ name: v.string(), address: v.string(), city: v.string(), province: v.string(), type: v.string(), website: v.optional(v.string()), useSonarPro: v.optional(v.boolean()) }`. The handler should: (a) read `process.env.AI_GATEWAY_API_KEY`, return `null` if missing, (b) select model — use `perplexity/sonar-pro` if `useSonarPro` is true, otherwise `perplexity/sonar`, (c) call `fetch("https://ai-gateway.vercel.sh/v1/chat/completions")` with `Authorization: Bearer ${apiKey}`, `Content-Type: application/json`, (d) send the enrichment prompt as a user message with `response_format: { type: "json_object" }`, (e) handle 429 (throw rate limit error), non-ok responses (throw with status), (f) parse the OpenAI-compatible response (`data.choices[0].message.content`), (g) JSON-parse the content into `SonarEnrichResult`, validating types (same defensive parsing pattern as `claudeAnalysis.ts` `parseAnalysisResponse`), (h) extract `citations` from the response metadata if available (`data.citations` — Perplexity models return this alongside the standard OpenAI format), (i) return the parsed result or `null` on parse failure
- [ ] The enrichment prompt should be a `const SONAR_ENRICHMENT_PROMPT` that instructs the model to: search the web for the given business, find verified contact information (email, phone, contact name), find social media profiles (Facebook, Instagram), identify products sold with categories (produce, dairy, meat, eggs, honey, baked goods, preserves, beverages, flowers, nursery, value-added, other), identify sales channels, determine if they sell online, write a business description, list specialties and certifications, write a `locationDescription` (2-3 sentences describing the place as if for a marketplace listing — what makes it special, what visitors can expect), write an `imagePrompt` (a detailed visual description suitable for AI image generation — describe the setting, products, atmosphere, style), and return ONLY valid JSON matching the `SonarEnrichResult` shape. The prompt must explicitly state: "Only include information you can verify from web sources. Return null for any field you cannot confirm. Never fabricate email addresses, phone numbers, or URLs."
- [ ] The user message should interpolate the lead's details: "Search the web for information about this business:\n\nName: {name}\nType: {type}\nAddress: {address}\nCity: {city}\nProvince: {province}" and append "Website: {website}" if a website URL is known

### Validation
- [ ] `pnpm typecheck` passes
- [ ] File follows the same structure as `convex/enrichment/claudeAnalysis.ts` (raw fetch, error handling, defensive parsing)

---

## 3. Rewire Orchestrator to Use Sonar

Replace the 4 sequential enrichment sources (websiteScraper, Hunter, claudeAnalysis, socialDiscovery) with the single Sonar call.

### Tasks
- [ ] In `convex/enrichment/orchestrator.ts`, add `useSonarPro: v.optional(v.boolean())` to the `enrichLead` action's args
- [ ] Remove imports for: `discoverSocialLinks` from `./socialDiscovery`, `WebsiteScraperResult` from `./websiteScraper`, `HunterResult` from `./hunter`, `ClaudeAnalysisResult` from `./claudeAnalysis`. Add import for `SonarEnrichResult` type from `./sonarEnrich`
- [ ] Change `ENRICHMENT_VERSION` from `"1.0"` to `"2.0"`
- [ ] Replace Steps 4-7 (website scraper, Hunter.io, Claude analysis, social discovery — approximately lines 143-253 in the current file) with a single Sonar step: call `ctx.runAction(api.enrichment.sonarEnrich.enrichWithSonar, { name: lead.name, address: lead.address, city: lead.city, province: lead.province, type: lead.type, website: websiteUrl ?? undefined, useSonarPro: args.useSonarPro })`. Store the result as `sonarResult`. If `sonarResult` is not null, push `{ source: "sonar_enrichment", fetchedAt: Date.now() }` to the sources array. If sonarResult has citations, also store them in the source detail.
- [ ] Update the merge logic (Step 8) to use `sonarResult` instead of the old individual results. For email: use `sonarResult.contactEmail` (replaces `scraperResult.emails[0]` and `hunterResult`). For contact name: use `sonarResult.contactName`. For phone: use `sonarResult.contactPhone` as secondary if Places didn't find one. For website: use `sonarResult.website` as secondary. For social links: use `sonarResult.socialLinks.facebook` and `sonarResult.socialLinks.instagram`. For products/salesChannels/sellsOnline/farmDescription/contactName: use the corresponding `sonarResult` fields (same overwrite logic as before — only fill empty fields unless `overwrite`). For structuredProducts/structuredDescription: store in `enrichmentData` (same pattern as before). NEW: merge `sonarResult.locationDescription` into `patch.locationDescription` and `sonarResult.imagePrompt` into `patch.imagePrompt` (only if non-empty and field is empty or overwrite).
- [ ] Remove the `extractDomain` helper function (no longer needed — Hunter.io is removed)
- [ ] Remove the `websiteHtml` variable and all references to it (no longer scraping HTML)
- [ ] Keep the email source tracking: if email came from Sonar, set `emailSource` to `sonar - ${lead.name} - ${new Date().toISOString().slice(0, 10)}`

### Validation
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] The orchestrator still handles: cooldown check, unsubscribe block list, Google Places, merge logic, status transitions, consent source, activity logging

---

## 4. Thread `useSonarPro` Through Batch Enrichment

### Tasks
- [ ] In `convex/enrichment/batchEnrich.ts`, add `useSonarPro: v.optional(v.boolean())` to `batchEnrichLeads` args. Pass it through to each `ctx.runAction(internal.enrichment.orchestrator.enrichLead, { leadId, force, overwrite, useSonarPro: args.useSonarPro })`
- [ ] In `convex/enrichment/batchEnrichPublic.ts`, add `useSonarPro: v.optional(v.boolean())` to any public actions that call `batchEnrichLeads`, and thread it through

### Validation
- [ ] `pnpm typecheck` passes

---

## 5. Update Data Freshness Source Labels

### Tasks
- [ ] In `src/components/leads/data-freshness.tsx`, find the source label mapping (or wherever enrichment source names are displayed). Add `"sonar_enrichment"` with label `"Sonar Web Search"`. Keep existing labels (`google_places`, `website_scraper`, `hunter`, `claude_analysis`, `social_discovery`) for backward compatibility with previously-enriched leads.

### Validation
- [ ] `pnpm typecheck` passes

---

## 6. Display Location Description and Image Prompt on Lead Detail

### Tasks
- [ ] In `src/app/leads/[id]/page.tsx`, in the Business Details card section, display `lead.locationDescription` if present. Use a paragraph with a "Location" or "About this Location" label, similar to how `farmDescription` is displayed.
- [ ] In the same section, display `lead.imagePrompt` if present. Show it in a monospace/code-style block with a "Copy" button so the user can easily copy it to paste into DALL-E, Midjourney, etc. Label it "Image Generation Prompt". Use a collapsible or secondary visual treatment so it doesn't dominate the page.

### Validation
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] Lead detail page renders without errors when `locationDescription` and `imagePrompt` are present
- [ ] Lead detail page renders without errors when those fields are absent (backward compat)

---

## 7. Update Tests

Tests in this project are source-code regex pattern assertions. The orchestrator and enrichment-fills tests assert on patterns from the old pipeline that no longer exist.

### Tasks
- [ ] Rewrite `tests/enrichment-orchestrator.test.mjs` to match the new orchestrator structure. Update assertions to: (a) verify import of `SonarEnrichResult` from `./sonarEnrich` (not `WebsiteScraperResult`, `HunterResult`, `ClaudeAnalysisResult`), (b) verify `enrichWithSonar` is called via `api.enrichment.sonarEnrich.enrichWithSonar`, (c) verify `ENRICHMENT_VERSION` is `"2.0"`, (d) verify `useSonarPro` appears in the args, (e) verify Google Places step is still present, (f) verify `sonar_enrichment` source string exists, (g) verify `locationDescription` and `imagePrompt` appear in the merge logic. Remove assertions about `scrapeWebsite`, `searchDomain`, `analyzeWithClaude`, `discoverSocialLinks`.
- [ ] Rewrite `tests/enrichment-fills-fields.test.mjs` to match the new merge logic. Update assertions to reference `sonarResult.contactEmail`, `sonarResult.products`, `sonarResult.socialLinks` instead of `scraperResult.emails`, `claudeResult.products`, `sorted[0].email`, etc. Add assertions for `locationDescription` and `imagePrompt` in the patch.
- [ ] Create `tests/sonar-enrich.test.mjs` with pattern assertions against `convex/enrichment/sonarEnrich.ts`: (a) exports `enrichWithSonar` action, (b) exports `SonarEnrichResult` type, (c) reads `AI_GATEWAY_API_KEY` from `process.env`, (d) uses `https://ai-gateway.vercel.sh/v1/chat/completions` endpoint, (e) uses `perplexity/sonar` as default model, (f) uses `perplexity/sonar-pro` when `useSonarPro` is true, (g) uses `response_format` for structured output, (h) handles 429 rate limit, (i) prompt contains "Never fabricate" instruction

### Validation
- [ ] `node --test tests/` passes — all tests green
- [ ] Old test files for scraper/hunter/claude/social still pass (those source files weren't deleted)

---

## Validation

- [ ] `AI_GATEWAY_API_KEY` is set in Convex environment variables
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `node --test tests/` passes
- [ ] Re-enrich a known lead (e.g., Grimsby Farmer's Market) with `--force` — email is found, `locationDescription` and `imagePrompt` are populated
- [ ] Lead detail page displays `locationDescription` and `imagePrompt` correctly
- [ ] Previously-enriched leads still display their old enrichment sources correctly (backward compat)
- [ ] Batch enrichment from discovery panel still works with the new pipeline
