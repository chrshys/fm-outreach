# CSV Export for Fruitland Market Directory Import

Export enriched leads as a downloadable CSV formatted for the Fruitland Market admin directory import tool. The import tool normalizes column names (`name`→`displayName`, `farmDescription`→`bio`, `contactPhone`→`phone`, `type`→`profileType`) and type values (`farmers_market`→`farmersMarket`, `retail_store`→`countryStore`, `roadside_stand`→`roadsideStand`), so we export raw values and let the import handle mapping.

## Boundaries
- DO NOT add new npm dependencies — CSV generation is simple enough without a library
- DO NOT modify the existing `leads.list` query signature or return type
- DO NOT change the existing `LeadListItem` type in `convex/lib/leadsList.ts`
- DO NOT add pagination to the export query — it returns all matches at once

---

## 1. Export `matchesFilters` from Lead List Utility

The `matchesFilters` function in `convex/lib/leadsList.ts` is currently private. Export it so the new export query can reuse the same filtering logic.

### Tasks
- [x] In `convex/lib/leadsList.ts`, add `export` keyword to the `matchesFilters` function (line 83)

### Validation
- [x] `pnpm typecheck` passes

---

## 2. Add `listForExport` Query

Add a new Convex query that returns all leads matching filters with the CSV-relevant fields projected. Accepts the same filter args as `list` (status, type, source, clusterId, hasEmail, hasSocial, hasFacebook, hasInstagram, needsFollowUp) but no pagination or sort.

### Tasks
- [x] In `convex/leads.ts`, add a `listForExport` query. Args: same filter fields as `list` (all optional). Handler: fetch all leads via `ctx.db.query("leads").collect()`, filter with `matchesFilters` (imported from `./lib/leadsList`), then `.map()` to project only CSV fields: `name`, `type`, `farmDescription`, `contactPhone`, `address`, `city`, `latitude`, `longitude`, `placeId`, `website`, `socialLinks` (object with optional `instagram`/`facebook`), `products` (string array)

### Validation
- [x] `pnpm typecheck` passes

---

## 3. Create CSV Export Utility

Create a client-side utility with two functions: one to convert lead data to a CSV string, another to trigger a browser file download.

### Tasks
- [x] Create `src/lib/csv-export.ts` with two exported functions:
  - `leadsToCSV(leads)`: Takes array of lead objects (matching `listForExport` return shape). Returns a CSV string with header row and data rows. Column order: `name`, `type`, `farmDescription`, `contactPhone`, `address`, `city`, `latitude`, `longitude`, `placeId`, `website`, `instagram`, `facebook`, `products`. Flatten `socialLinks.instagram` and `socialLinks.facebook` to top-level columns. Join `products` array with `", "` separator. Use empty string for null/undefined fields. Apply RFC 4180 escaping: wrap field in double quotes if it contains a comma, double quote, or newline; escape inner double quotes by doubling them.
  - `downloadCSV(csv, filename)`: Creates a `Blob` with `type: "text/csv;charset=utf-8;"`, creates a temporary `<a>` element with `URL.createObjectURL`, sets `download` attribute to the filename, clicks it, then cleans up.

### Validation
- [x] `pnpm typecheck` passes

---

## 4. Add Export Button to Leads Page

Add an "Export CSV" button to the leads page toolbar, between `<LeadFilters>` and `<BulkActions>`.

### Tasks
- [x] In `src/app/leads/page.tsx`, add imports: `Download` and `Loader2` from `lucide-react`, `toast` from `sonner`, `leadsToCSV` and `downloadCSV` from `@/lib/csv-export`
- [x] In `src/app/leads/page.tsx`, add state: `const [isExporting, setIsExporting] = useState(false)`
- [x] In `src/app/leads/page.tsx`, add an `handleExportCSV` async function: set `isExporting(true)`, call `convex.query(api.leads.listForExport, { ...listArgs without sortBy/sortOrder/cursor })` to fetch leads, call `leadsToCSV(results)` to generate CSV, call `downloadCSV(csv, `fm-leads-export-${new Date().toISOString().slice(0, 10)}.csv`)`, show `toast.success(`Exported ${results.length} leads`)`, catch errors with `toast.error("Export failed")`, finally set `isExporting(false)`
- [x] In `src/app/leads/page.tsx`, add a `<Button>` between `<LeadFilters>` and `<BulkActions>` in the JSX. Props: `variant="outline"`, `size="sm"`, `onClick={handleExportCSV}`, `disabled={isExporting}`. Content: when `isExporting` show `<Loader2 className="size-4 animate-spin" />` and "Exporting...", otherwise show `<Download className="size-4" />` and "Export CSV"

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `node --test tests/` passes (update pattern-matching tests if any reference the toolbar area)
- [x] On the leads page, the "Export CSV" button is visible between filters and the table
- [x] Clicking "Export CSV" downloads a `.csv` file with 13 columns and correct headers
- [x] CSV contains empty strings for missing fields, not "undefined" or "null"
- [x] Products arrays are comma-joined, socialLinks are flattened to top-level columns
