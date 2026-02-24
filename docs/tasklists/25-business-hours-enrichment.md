# Phase 25: Thread Business Hours from Google Places → Export → FM Import

Google Places already returns `opening_hours.weekday_text` (e.g., `"Monday: 9:00 AM – 5:00 PM"`) during enrichment, but the orchestrator silently drops it. Fruitland Market already has a structured `hours` field on `profiles`. This phase threads hours data through the full pipeline: enrichment → lead storage → CSV export → FM import.

**Strategy:** Parse Google's natural-language hour strings into the same structured format FM already uses (`{day, open, close, isClosed}`). Store structured on the lead. Serialize as JSON in the CSV. Deserialize on the FM import side.

## Boundaries
- DO NOT modify the Google Places API call or `GooglePlacesResult` type — the raw `hours: string[] | null` stays as-is
- DO NOT add new npm dependencies in either codebase
- DO NOT change the `leads.list` query or `LeadListItem` type
- The fruitland-market codebase lives at `/Users/christopherhayes/Projects/fruitland-market`

---

## 1. Add `hours` Field to Leads Schema

### Tasks
- [x] In `convex/schema.ts`, add a new optional field to the `leads` table definition, after `countryCode` (line 51): `hours: v.optional(v.array(v.object({ day: v.number(), open: v.string(), close: v.string(), isClosed: v.boolean() })))`
- [x] In `convex/schema.ts`, update the CSV Export Column Mapping comment (lines 5–33): add a new row `hours │ hours (JSON) │ hours` between `categories` and the type mapping note

### Validation
- [x] `pnpm typecheck` passes
- [x] `node --test tests/` — no regressions beyond pre-existing failures

---

## 2. Add `parseWeekdayText` Helper to Google Places Module

Create a parser that converts Google's `weekday_text` strings into the structured hours format that Fruitland Market expects.

### Tasks
- [x] In `convex/enrichment/googlePlaces.ts`, export a `StructuredHour` type: `{ day: number; open: string; close: string; isClosed: boolean }`
- [x] In `convex/enrichment/googlePlaces.ts`, export a `parseWeekdayText(weekdayText: string[]): StructuredHour[]` function that: (a) maps day names to numbers — Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6, (b) for each string like `"Monday: 9:00 AM – 5:00 PM"`, splits on `: ` to get day name and time range, (c) if the time part is `"Closed"` (case-insensitive), returns `{ day, open: "", close: "", isClosed: true }`, (d) otherwise splits the time range on ` – ` (en-dash with spaces) or ` - ` (hyphen with spaces) to get open/close times, (e) converts 12h times to 24h format (`"9:00 AM"` → `"09:00"`, `"5:00 PM"` → `"17:00"`, `"12:00 PM"` → `"12:00"`, `"12:00 AM"` → `"00:00"`), (f) returns `{ day, open, close, isClosed: false }`, (g) silently skips any line that can't be parsed (no throw)
- [x] Place the function and type BEFORE the `textSearch` function (around line 27), after the `nameSimilarity` helpers

### Validation
- [x] `pnpm typecheck` passes
- [x] `node --test tests/` — no regressions

---

## 3. Patch Hours in Orchestrator Merge Block

### Tasks
- [x] In `convex/enrichment/orchestrator.ts`, add `import { parseWeekdayText } from "./googlePlaces"` alongside the existing `import type { GooglePlacesResult } from "./googlePlaces"` (line 5)
- [x] In `convex/enrichment/orchestrator.ts`, in the Google Places merge block (after the `countryCode` patch around line 329), add hours merging:
  ```
  if ((!lead.hours || lead.hours.length === 0 || overwrite) && placesResult.hours) {
    const parsed = parseWeekdayText(placesResult.hours);
    if (parsed.length > 0) {
      patch.hours = parsed;
      fieldsUpdated.push("hours");
    }
  }
  ```

### Validation
- [x] `pnpm typecheck` passes
- [x] `node --test tests/` — no regressions

---

## 4. Include `hours` in Export Query

### Tasks
- [x] In `convex/leads.ts`, in the `listForExport` query's `.map()` projection (around line 140), add `hours: lead.hours` to the returned object

### Validation
- [x] `pnpm typecheck` passes

---

## 5. Add `hours` Column to CSV Export

### Tasks
- [x] In `src/lib/csv-export.ts`, add `hours?: { day: number; open: string; close: string; isClosed: boolean }[]` to the `ExportLead` type
- [x] In `src/lib/csv-export.ts`, add `"hours"` to the end of `CSV_COLUMNS` (after `"categories"`)
- [x] In `src/lib/csv-export.ts`, add `lead.hours ? JSON.stringify(lead.hours) : ""` as the last entry in the `values` array inside `leadsToCSV`

### Validation
- [x] `pnpm typecheck` passes

---

## 6. Update CSV Export Tests

All tests in `tests/csv-export.test.mjs` use exact column assertions. Column count changes from 17 to 18 and the `hours` column is appended at index 17.

### Tasks
- [x] In `tests/csv-export.test.mjs`, update the "produces correct header row" test: append `,hours` to the expected header string
- [x] In `tests/csv-export.test.mjs`, update the "outputs correct values for a complete lead" test: add `hours: [{ day: 1, open: "09:00", close: "17:00", isClosed: false }]` to the input lead, append the JSON-serialized hours to the expected CSV row (it will be quoted since it contains commas)
- [x] In `tests/csv-export.test.mjs`, update the "uses empty strings for undefined" test: change expected trailing commas — add one more trailing comma for the new empty `hours` column (18 columns total)
- [x] In `tests/csv-export.test.mjs`, update the "uses empty strings for explicit null fields" test: add `hours: null` to the input, update expected trailing commas for 18 columns
- [x] In `tests/csv-export.test.mjs`, update the "never outputs literal 'undefined' or 'null'" test: add `hours: null` to the null-fields input object
- [x] In `tests/csv-export.test.mjs`, update all "exactly N columns" assertions: change `17` to `18` in the header column count test, the complete lead test, and the minimal lead test
- [x] In `tests/csv-export.test.mjs`, update the "schema.ts CSV column mapping comment" test: add `hours` to the expected columns if this test checks column names against `CSV_COLUMNS`

### Validation
- [x] `node --test tests/csv-export.test.mjs` — all tests pass

---

## 7. Update `listForExport` Tests

### Tasks
- [x] In `tests/leads-list-for-export-query.test.mjs`, in the "listForExport maps output to CSV fields only" test, add `"hours"` to the list of projected fields that are checked (the `csvFields` array, around line 65). Add the assertion: `assert.match(block, /hours:\s*lead\.hours/)` to verify hours is in the projection

### Validation
- [x] `node --test tests/leads-list-for-export-query.test.mjs` — all tests pass

---

## 8. Add `parseWeekdayText` Tests

### Tasks
- [x] Create `tests/parse-weekday-text.test.mjs` that reads `convex/enrichment/googlePlaces.ts` source and verifies: (a) `parseWeekdayText` function is exported, (b) `StructuredHour` type is exported
- [x] Add behavioral tests by transpiling and importing the module (same pattern as `tests/csv-export.test.mjs` — use `ts.transpileModule` to convert TS to CJS, write to temp file, `require()` it): test standard hours `"Monday: 9:00 AM – 5:00 PM"` produces `{ day: 1, open: "09:00", close: "17:00", isClosed: false }`, test `"Sunday: Closed"` produces `{ day: 0, open: "", close: "", isClosed: true }`, test PM conversion `"Saturday: 10:00 AM – 8:00 PM"` produces `close: "20:00"`, test noon edge case `"Monday: 12:00 PM – 5:00 PM"` produces `open: "12:00"`, test midnight edge case `"Monday: 12:00 AM – 5:00 AM"` produces `open: "00:00"`, test empty array returns empty array, test malformed string is silently skipped (returns empty array for `["garbage"]`)

### Validation
- [x] `node --test tests/parse-weekday-text.test.mjs` — all tests pass

---

## 9. Add Hours Orchestrator Tests

### Tasks
- [x] In `tests/google-places-fills-fields.test.mjs`, add a test: "orchestrator imports parseWeekdayText from googlePlaces" — assert orchestrator source matches `/import\s*\{[^}]*parseWeekdayText[^}]*\}\s*from\s*["']\.\/googlePlaces["']/`
- [x] In `tests/google-places-fills-fields.test.mjs`, add a test: "orchestrator patches hours from Google Places result" — assert orchestrator source matches `patch.hours` and `fieldsUpdated.push("hours")`
- [x] In `tests/google-places-fills-fields.test.mjs`, add a test: "orchestrator only fills hours when empty or forced" — assert orchestrator source matches `/!lead\.hours\s*\|\|.*overwrite.*placesResult\.hours/s`

### Validation
- [x] `node --test tests/google-places-fills-fields.test.mjs` — all tests pass

---

## 10. Update FM CSV Row Parser

### Tasks
- [x] In `/Users/christopherhayes/Projects/fruitland-market/apps/web/lib/csv-row-parser.ts`, add `hours?: { day: number; open: string; close: string; isClosed: boolean }[]` to the `ParsedCsvRow` type
- [x] In `/Users/christopherhayes/Projects/fruitland-market/apps/web/lib/csv-row-parser.ts`, add `hours: "hours"` to the `headerMap` object
- [x] In `/Users/christopherhayes/Projects/fruitland-market/apps/web/lib/csv-row-parser.ts`, in the `parseRows` function, add a parsing branch for the `hours` field: `else if (field === "hours") { try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) row[field] = parsed; } catch { /* skip malformed */ } }`

### Validation
- [x] TypeScript compiles without errors in fruitland-market

---

## 11. Update FM Directory Import Backend

### Tasks
- [x] In `/Users/christopherhayes/Projects/fruitland-market/packages/backend/convex/adminDirectory.ts`, add `hours: v.optional(v.array(v.object({ day: v.number(), open: v.string(), close: v.string(), isClosed: v.boolean() })))` to the `csvRowValidator` (after `categories`, around line 59)
- [x] In the `importCsvRows` mutation, new profile creation block (around line 235): add `hours: row.hours` to the `ctx.db.insert("profiles", ...)` call
- [x] In the `importCsvRows` mutation, enrich block (around line 284): add a diff check — `if (row.hours && row.hours.length > 0 && JSON.stringify(row.hours) !== JSON.stringify(existing.hours)) { patch.hours = row.hours; }`
- [x] In the `previewCsvImport` query, enrich diff section: add `if (row.hours?.length && JSON.stringify(row.hours) !== JSON.stringify(existing.hours)) enrichFields.push("hours")`

### Validation
- [x] TypeScript compiles without errors in fruitland-market
- [x] `node --test tests/` in fm-outreach — all tests pass (final check)
