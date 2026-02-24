# Phase 24: Enrich Directory Export with Description, Image Prompt & Categories

The enrichment pipeline (Sonar) collects `locationDescription`, `imagePrompt`, and `structuredProducts` (with categories) on every lead, but the CSV export only includes basic fields. The Fruitland Market directory import (`/Users/christopherhayes/Projects/fruitland-market`) doesn't accept these fields either. This phase threads the new data through both codebases so directory listings are richer.

**Column changes:**
- **Remove** `farmDescription` — replaced by `locationDescription` which is written specifically for marketplace listings (no fallback to farmDescription)
- **Remove** `contactPhone` — private contact data, shouldn't appear in public directory
- **Add** `description` — maps to `locationDescription` on the lead record
- **Add** `imagePrompt` — AI image generation prompt from Sonar
- **Add** `categories` — unique product categories extracted from `enrichmentData.structuredProducts` (e.g. "produce, dairy, honey")

New column count: **17** (was 16, removed 2, added 3)

## Boundaries
- DO NOT modify enrichment pipeline files (`convex/enrichment/*.ts`) — data is already collected and persisted
- DO NOT remove `farmDescription` from the lead schema — it's still useful internally, just excluded from the directory export
- DO NOT add new npm dependencies in either codebase
- DO NOT change the `leads.list` query or `LeadListItem` type
- The fruitland-market codebase lives at `/Users/christopherhayes/Projects/fruitland-market`

---

## 1. Update `listForExport` Query Projection

Update the Convex query that feeds the CSV export to include the new fields and derive categories from enrichmentData.

### Tasks
- [x] In `convex/leads.ts`, update the `listForExport` query's `.map()` projection (lines 114–132): remove `farmDescription` and `contactPhone`, add `locationDescription: lead.locationDescription`, `imagePrompt: lead.imagePrompt`, and `categories` derived from `enrichmentData.structuredProducts` — extract unique category strings: `[...new Set((Array.isArray((lead.enrichmentData as any)?.structuredProducts) ? (lead.enrichmentData as any).structuredProducts : []).map((p: any) => p.category).filter(Boolean))]`

### Validation
- [x] `pnpm typecheck` passes

---

## 2. Update CSV Export Utility

Update the client-side CSV generation to produce the new 17-column format.

### Tasks
- [x] In `src/lib/csv-export.ts`, update the `ExportLead` type: remove `farmDescription?: string` and `contactPhone?: string`, add `locationDescription?: string`, `imagePrompt?: string`, `categories?: string[]`
- [x] In `src/lib/csv-export.ts`, update `CSV_COLUMNS`: replace `"farmDescription"` with `"description"`, remove `"contactPhone"`, add `"imagePrompt"` and `"categories"` after `"products"`. Final order: `name, type, description, address, city, state, postalCode, countryCode, latitude, longitude, placeId, website, instagram, facebook, products, imagePrompt, categories`
- [x] In `src/lib/csv-export.ts`, update the `values` array in `leadsToCSV`: map `description` from `lead.locationDescription ?? ""`, remove the contactPhone line, add `lead.imagePrompt ?? ""` and `lead.categories ? lead.categories.join(", ") : ""` at the end (matching column order)

### Validation
- [x] `pnpm typecheck` passes

---

## 3. Update CSV Export Tests

All tests in `tests/csv-export.test.mjs` use source-pattern matching and exact column assertions. Every reference to old columns, column counts, or column indices must be updated for the new 17-column format.

### Tasks
- [x] In `tests/csv-export.test.mjs`, update the "produces correct header row" test (line 38): change expected header to `name,type,description,address,city,state,postalCode,countryCode,latitude,longitude,placeId,website,instagram,facebook,products,imagePrompt,categories`
- [x] In `tests/csv-export.test.mjs`, update the "outputs correct values for a complete lead" test (line 44): change input object — replace `farmDescription: "Organic produce"` with `locationDescription: "Organic produce"`, remove `contactPhone: "555-0100"`, add `imagePrompt: "A farm stand with fresh produce"` and `categories: ["produce"]`. Update expected CSV row to match new column order and 17 columns
- [x] In `tests/csv-export.test.mjs`, update the "uses empty strings for undefined" test (line 76): change expected trailing commas from 14 trailing empties to 15 (17 columns minus name and type)
- [x] In `tests/csv-export.test.mjs`, update the "uses empty strings for explicit null fields" test (line 88): replace `farmDescription: null` with `locationDescription: null`, remove `contactPhone: null`, add `imagePrompt: null` and `categories: null`. Update expected trailing commas
- [x] In `tests/csv-export.test.mjs`, update the "never outputs literal 'undefined' or 'null'" test (line 114): replace `farmDescription: null` with `locationDescription: null`, add `imagePrompt: null` and `categories: null`
- [x] In `tests/csv-export.test.mjs`, update the "escapes fields containing newlines" test (line 164): change `farmDescription: "Line one\nLine two"` to `locationDescription: "Line one\nLine two"`
- [x] In `tests/csv-export.test.mjs`, update all column count tests (lines 375, 383, 409): change `16` to `17`
- [x] In `tests/csv-export.test.mjs`, update column index assertions — instagram is now index 12 (was 13), facebook is index 13 (was 14). Update the "socialLinks with only instagram" test (line 227): `cols[12]` for instagram, `cols[13]` for facebook, and total columns `17`. Update the "socialLinks with only facebook" test (line 245): `cols[12]` for instagram, `cols[13]` for facebook
- [x] In `tests/csv-export.test.mjs`, update the "maps province to state column" test (line 425): state is now index 5 (was 6)
- [x] In `tests/csv-export.test.mjs`, update the "falls back to region" test (line 439): state column index from 6 to 5
- [x] In `tests/csv-export.test.mjs`, update the "prefers province over region" test (line 453): state column index from 6 to 5
- [x] In `tests/csv-export.test.mjs`, update the "postalCode and countryCode" test (line 468): postalCode is now index 6 (was 7), countryCode is now index 7 (was 8)
- [x] In `tests/csv-export.test.mjs`, update the "complete lead 16 columns" test (line 383): change input to use `locationDescription` instead of `farmDescription`, remove `contactPhone`, add `imagePrompt` and `categories`. Change assertion to 17 columns
- [x] In `tests/csv-export.test.mjs`, update the "minimal lead 16 columns" test (line 409): change assertion to 17 columns

### Validation
- [x] `node --test tests/csv-export.test.mjs` — all tests pass
- [x] `node --test tests/` — no regressions beyond pre-existing failures

---

## 4. Update Schema Column Mapping Comment

The comment block at the top of the schema documents the CSV ↔ FM import mapping. Keep it accurate.

### Tasks
- [x] In `convex/schema.ts`, update the CSV Export Column Mapping comment (lines 5–32): remove `farmDescription` and `contactPhone` rows, add `description │ locationDescription │ bio`, `imagePrompt │ imagePrompt │ imagePrompt`, `categories │ enrichmentData.structuredProducts │ categories`

### Validation
- [x] Comment accurately reflects the new export format

---

## 5. Add `imagePrompt` and `categories` to FM Seller Profile Schema

The Fruitland Market directory needs schema fields to store the new data.

### Tasks
- [x] In `/Users/christopherhayes/Projects/fruitland-market/packages/backend/convex/schema.ts`, add `imagePrompt: v.optional(v.string())` to the `sellerProfiles` table definition, after the `bio` field (line 29)
- [x] In `/Users/christopherhayes/Projects/fruitland-market/packages/backend/convex/schema.ts`, add `categories: v.optional(v.array(v.string()))` to the `sellerProfiles` table definition, after `imagePrompt`

### Validation
- [x] `cd /Users/christopherhayes/Projects/fruitland-market && npx convex dev --typecheck=enable --once` passes (or `pnpm typecheck` if available)

---

## 6. Update FM CSV Row Parser

Add header mappings and type support for the new columns so the FM importer recognizes them.

### Tasks
- [x] In `/Users/christopherhayes/Projects/fruitland-market/apps/web/lib/csv-row-parser.ts`, add `imagePrompt?: string` and `categories?: string[]` to the `ParsedCsvRow` type
- [x] In `/Users/christopherhayes/Projects/fruitland-market/apps/web/lib/csv-row-parser.ts`, add entries to `headerMap`: `description: "bio"`, `imageprompt: "imagePrompt"`, `categories: "categories"`. Note: `description` maps to `bio` because the FM profile uses `bio` for the business description
- [x] In `/Users/christopherhayes/Projects/fruitland-market/apps/web/lib/csv-row-parser.ts`, add a parsing branch in `parseRows` for `categories` — split on comma, trim, filter empty (same logic as the existing `products` branch)

### Validation
- [x] TypeScript compiles without errors

---

## 7. Update FM Directory Import Backend

Update the Convex import mutation to accept and persist the new fields.

### Tasks
- [x] In `/Users/christopherhayes/Projects/fruitland-market/packages/backend/convex/adminDirectory.ts`, add `imagePrompt: v.optional(v.string())` and `categories: v.optional(v.array(v.string()))` to `csvRowValidator` (line 14)
- [x] In the `importCsvRows` mutation, new profile creation block (line 195): add `imagePrompt: row.imagePrompt` and `categories: row.categories` to the `ctx.db.insert("sellerProfiles", ...)` call. Also add `(row.categories ?? []).join(" ")` to the `searchText` builder (after products)
- [x] In the `importCsvRows` mutation, enrich block (line 239): add diff checks — if `row.imagePrompt && row.imagePrompt !== existing.imagePrompt` then `patch.imagePrompt = row.imagePrompt`. If `row.categories && JSON.stringify(row.categories) !== JSON.stringify(existing.categories)` then `patch.categories = row.categories`. Include categories in `searchText` rebuild
- [x] In the `previewCsvImport` query, enrich diff checks (line 80): add `if (row.imagePrompt && row.imagePrompt !== existing.imagePrompt) enrichFields.push("imagePrompt")` and `if (row.categories?.length) enrichFields.push("categories")`

### Validation
- [x] TypeScript compiles without errors in the fruitland-market backend package
- [x] `node --test tests/` in fm-outreach — no regressions
