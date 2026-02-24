# Phase 26: Add Seasonality Data to Enrichment → Export → FM Import Pipeline

Farms, farm stands, and farmers markets are often seasonal, but we're not capturing that. The outreach pipeline collects weekly hours but has no concept of "open May–October" vs "year-round." Fruitland Market's profile schema already has `isSeasonal` (boolean) and `seasonalNote` (string) fields at lines 65-66 of its schema, but they're never populated.

**Strategy:** Add `isSeasonal` + `seasonalNote` to the Sonar enrichment prompt so it's extracted automatically during web research. Thread the data through the lead schema → CSV export → FM import, matching the pattern established in Phase 25 (business hours).

## Boundaries
- DO NOT modify the Google Places API call or enrichment — seasonality comes from Sonar only
- DO NOT add new npm dependencies in either codebase
- DO NOT change the `leads.list` query or `LeadListItem` type
- The fruitland-market codebase lives at `/Users/christopherhayes/Projects/fruitland-market`

---

## 1. Add Seasonality Fields to Leads Schema

### Tasks
- [x] In `convex/schema.ts`, add two optional fields to the `leads` table after `hours` (line 62): `isSeasonal: v.optional(v.boolean())` and `seasonalNote: v.optional(v.string())`
- [x] In `convex/schema.ts`, update the CSV Export Column Mapping comment (lines 5–31): add two new rows between `hours` and the type mapping note: `isSeasonal │ isSeasonal │ isSeasonal` and `seasonalNote │ seasonalNote │ seasonalNote`

### Validation
- [x] `pnpm typecheck` passes
- [x] `node --test tests/` — no regressions beyond pre-existing failures

---

## 2. Add Seasonality to Sonar Enrichment Prompt and Parser

### Tasks
- [x] In `convex/enrichment/sonarEnrich.ts`, add two fields to the `SonarEnrichResult` type (after `imagePrompt`, line 28): `isSeasonal: boolean | null;` and `seasonalNote: string | null;`
- [x] In `convex/enrichment/sonarEnrich.ts`, add a new section 9 to `SONAR_ENRICHMENT_PROMPT` (after section 8, before the "Only include information" line at ~line 77): `9. **Seasonality:**\n   - "isSeasonal": boolean — true if the business operates only part of the year (e.g., seasonal farm stand, summer-only farmers market), false if open year-round\n   - "seasonalNote": a short note describing their operating season if seasonal (e.g., "Open May through October", "Saturdays, June to September"). Return null if year-round or unknown.`
- [x] In `convex/enrichment/sonarEnrich.ts`, in the `parseSonarResponse` function (after `imagePrompt` parsing, ~line 182), add: `isSeasonal: typeof parsed.isSeasonal === "boolean" ? parsed.isSeasonal : null,` and `seasonalNote: typeof parsed.seasonalNote === "string" ? parsed.seasonalNote : null,`

### Validation
- [x] `pnpm typecheck` passes
- [x] `node --test tests/sonar-enrich-action.test.mjs` — no regressions

---

## 3. Merge Seasonality in Orchestrator

### Tasks
- [x] In `convex/enrichment/orchestrator.ts`, after the image prompt merge block (~line 472, after `fieldsUpdated.push("imagePrompt")`), add seasonality merging: `if (sonarResult?.isSeasonal != null && (lead.isSeasonal === undefined || overwrite)) { patch.isSeasonal = sonarResult.isSeasonal; fieldsUpdated.push("isSeasonal"); }` and `if (sonarResult?.seasonalNote && (!lead.seasonalNote || overwrite)) { patch.seasonalNote = sonarResult.seasonalNote; fieldsUpdated.push("seasonalNote"); }`

### Validation
- [x] `pnpm typecheck` passes
- [x] `node --test tests/` — no regressions

---

## 4. Include Seasonality in Export Query

### Tasks
- [x] In `convex/leads.ts`, in the `listForExport` query's `.map()` projection (after `hours: lead.hours` at ~line 141), add: `isSeasonal: lead.isSeasonal,` and `seasonalNote: lead.seasonalNote,`

### Validation
- [x] `pnpm typecheck` passes

---

## 5. Add Seasonality Columns to CSV Export

### Tasks
- [x] In `src/lib/csv-export.ts`, add `isSeasonal?: boolean;` and `seasonalNote?: string;` to the `ExportLead` type (after `hours`)
- [x] In `src/lib/csv-export.ts`, add `"isSeasonal"` and `"seasonalNote"` to the end of `CSV_COLUMNS` (after `"hours"`) — total becomes 20 columns
- [x] In `src/lib/csv-export.ts`, add two entries to the `values` array in `leadsToCSV` (after the hours line): `lead.isSeasonal != null ? String(lead.isSeasonal) : "",` and `lead.seasonalNote ?? "",`

### Validation
- [x] `pnpm typecheck` passes

---

## 6. Update CSV Export Tests

All tests in `tests/csv-export.test.mjs` use exact column assertions. Column count changes from 18 to 20 and two new columns are appended at indices 18 and 19.

### Tasks
- [x] In `tests/csv-export.test.mjs`, update the "produces correct header row" test (line 40): append `,isSeasonal,seasonalNote` to the expected header string
- [x] In `tests/csv-export.test.mjs`, update the "outputs correct values for a complete lead" test: add `isSeasonal: true` and `seasonalNote: "Open May-Oct"` to the input lead, and append `,true,Open May-Oct` to the expected CSV row
- [x] In `tests/csv-export.test.mjs`, update the "uses empty strings for undefined" test (line 87): add two more trailing commas for the new empty columns (20 columns total)
- [x] In `tests/csv-export.test.mjs`, update the "uses empty strings for explicit null fields" test (line 115): add `isSeasonal: null` and `seasonalNote: null` to the input, update expected trailing commas for 20 columns
- [x] In `tests/csv-export.test.mjs`, update the "never outputs literal 'undefined' or 'null'" test: add `isSeasonal: null` and `seasonalNote: null` to the null-fields input object
- [x] In `tests/csv-export.test.mjs`, update all "exactly N columns" assertions (lines 433, 460, 468): change `18` to `20`
- [x] In `tests/csv-export.test.mjs`, update the "schema.ts CSV column mapping comment lists all CSV_COLUMNS" test: no code change needed (it dynamically reads CSV_COLUMNS), but verify it still passes after schema comment update
- [x] In `tests/csv-export.test.mjs`, update the "schema.ts CSV column mapping comment documents correct field mappings" test: add `["isSeasonal", "isSeasonal"]` and `["seasonalNote", "seasonalNote"]` to `requiredMappings`
- [x] Add test: "leadsToCSV outputs isSeasonal as string boolean" — verify `isSeasonal: true` produces `"true"` and `isSeasonal: false` produces `"false"` in the correct column (index 18)
- [x] Add test: "leadsToCSV outputs empty string when isSeasonal is undefined" — verify column 18 is empty
- [x] Add test: "leadsToCSV outputs seasonalNote in correct column" — verify column 19 has the note value

### Validation
- [x] `node --test tests/csv-export.test.mjs` — all tests pass

---

## 7. Update Sonar Enrichment Tests

### Tasks
- [x] In `tests/sonar-enrich-action.test.mjs`, add test: "prompt requests isSeasonal and seasonalNote fields" — assert source matches `/isSeasonal/` and `/seasonalNote/`
- [x] In `tests/sonar-enrich-action.test.mjs`, add test: "parseSonarResponse handles isSeasonal with defensive type checking" — assert source matches `/typeof\s+parsed\.isSeasonal\s*===\s*"boolean"/` and `/typeof\s+parsed\.seasonalNote\s*===\s*"string"/`
- [x] In `tests/sonar-enrich-action.test.mjs`, add test: "SonarEnrichResult type includes seasonality fields" — assert source matches `/isSeasonal:\s*boolean\s*\|\s*null/` and `/seasonalNote:\s*string\s*\|\s*null/`

### Validation
- [x] `node --test tests/sonar-enrich-action.test.mjs` — all tests pass

---

## 8. Update `listForExport` Tests

### Tasks
- [x] In `tests/leads-list-for-export-query.test.mjs`, add assertions for the new fields: `assert.match(block, /isSeasonal:\s*lead\.isSeasonal/)` and `assert.match(block, /seasonalNote:\s*lead\.seasonalNote/)`

### Validation
- [x] `node --test tests/leads-list-for-export-query.test.mjs` — all tests pass

---

## 9. Display Seasonality on Lead Detail Page

### Tasks
- [x] In `src/app/leads/[id]/page.tsx`, after the `HoursDisplay` block (~line 542-546), add a seasonality display: if `lead.isSeasonal === true`, show "Seasonal" with the `seasonalNote` value; if `lead.isSeasonal === false`, show "Year-round"; if undefined, show nothing. Follow the same `<p><span className="font-medium">` pattern used for other fields in the Business Details card.

### Validation
- [x] `pnpm typecheck` passes
- [x] Visual check: lead detail page shows seasonality info when present

---

## 10. Update FM CSV Row Parser

### Tasks
- [x] In `/Users/christopherhayes/Projects/fruitland-market/apps/web/lib/csv-row-parser.ts`, add `isSeasonal?: boolean;` and `seasonalNote?: string;` to the `ParsedCsvRow` type (after `hours`)
- [x] In the `headerMap` object, add: `isseasonal: "isSeasonal",` and `seasonalnote: "seasonalNote",`
- [x] In the `parseRows` function, add a parsing branch for `isSeasonal`: `else if (field === "isSeasonal") { const lower = value.trim().toLowerCase(); if (lower === "true") row[field] = true; else if (lower === "false") row[field] = false; }` — and let `seasonalNote` fall through to the default string assignment

### Validation
- [x] TypeScript compiles without errors in fruitland-market

---

## 11. Update FM Directory Import Backend

### Tasks
- [x] In `/Users/christopherhayes/Projects/fruitland-market/packages/backend/convex/adminDirectory.ts`, add `isSeasonal: v.optional(v.boolean()),` and `seasonalNote: v.optional(v.string()),` to the `csvRowValidator` (after `hours`, ~line 69)
- [x] In the `previewCsvImport` query, enrich diff section (after hours check, ~line 141), add: `if (row.isSeasonal != null && row.isSeasonal !== existing.isSeasonal) { enrichFields.push("isSeasonal"); }` and `if (row.seasonalNote && row.seasonalNote !== existing.seasonalNote) { enrichFields.push("seasonalNote"); }`
- [x] In the `importCsvRows` mutation, new profile creation block (~line 258), add to the `ctx.db.insert("profiles", ...)` call: `isSeasonal: row.isSeasonal,` and `seasonalNote: row.seasonalNote,`
- [x] In the `importCsvRows` mutation, enrich patch block (after hours diff, ~line 331), add: `if (row.isSeasonal != null && row.isSeasonal !== existing.isSeasonal) { patch.isSeasonal = row.isSeasonal; }` and `if (row.seasonalNote && row.seasonalNote !== existing.seasonalNote) { patch.seasonalNote = row.seasonalNote; }`

### Validation
- [x] TypeScript compiles without errors in fruitland-market

---

## 12. Update FM Import Tests (in fm-outreach)

### Tasks
- [x] In `tests/fm-import-new-profile-fields.test.mjs`, add test: "importCsvRows new profile insert includes isSeasonal field" — assert source matches `/ctx\.db\.insert\("profiles",\s*\{[\s\S]*?isSeasonal:\s*row\.isSeasonal/`
- [x] In `tests/fm-import-new-profile-fields.test.mjs`, add test: "importCsvRows new profile insert includes seasonalNote field" — assert source matches `/ctx\.db\.insert\("profiles",\s*\{[\s\S]*?seasonalNote:\s*row\.seasonalNote/`
- [x] In `tests/fm-import-new-profile-fields.test.mjs`, add test: "importCsvRows enrich block includes isSeasonal diff check" — assert source matches `row.isSeasonal != null && row.isSeasonal !== existing.isSeasonal`
- [x] In `tests/fm-import-new-profile-fields.test.mjs`, add test: "importCsvRows enrich block includes seasonalNote diff check" — assert source matches `row.seasonalNote && row.seasonalNote !== existing.seasonalNote`
- [x] In `tests/fm-preview-csv-enrichFields.test.mjs`, add test: "previewCsvImport has isSeasonal diff check" — assert previewBlock matches the isSeasonal null check and enrichFields push
- [x] In `tests/fm-preview-csv-enrichFields.test.mjs`, add test: "previewCsvImport has seasonalNote diff check" — assert previewBlock matches the seasonalNote diff check and enrichFields push

### Validation
- [x] `node --test tests/fm-import-new-profile-fields.test.mjs` — all tests pass
- [x] `node --test tests/fm-preview-csv-enrichFields.test.mjs` — all tests pass
- [x] `node --test tests/` — full suite passes (no regressions beyond pre-existing)
