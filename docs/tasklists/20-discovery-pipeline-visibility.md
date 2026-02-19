# Discovery Pipeline Visibility

Surface enrichment progress, discovery freshness, and directory-readiness directly on the map. Today the grid cells turn green after discovery and stay green forever — no indication of data staleness, enrichment state, or export readiness. This tasklist adds `discoveryCellId` to link leads back to their discovery cell, replaces the misleading "Leads Found" metric with live stats, adds freshness-aware cell colors, and shows directory-readiness breakdown at both cell and grid level.

**"Directory ready" definition:** A lead is exportable when it has:
1. Complete location — address, city, province, postalCode, countryCode, latitude, longitude (all present)
2. Web presence — at least one of: website, instagram, or facebook

## Boundaries
- DO NOT change the discovery flow itself (search, split, merge, subdivide)
- DO NOT modify the Google Places API integration or enrichment pipeline
- DO NOT remove existing `leadsFound` field from `discoveryCells` schema (keep for backward compat, just stop relying on it in the UI)
- DO NOT add new npm dependencies

---

## 1. Add `discoveryCellId` to Leads Schema

Link leads back to the discovery cell that created them. This is the foundation for all downstream stats queries.

### Tasks
- [x] In `convex/schema.ts`, add `discoveryCellId: v.optional(v.id("discoveryCells"))` to the `leads` table (after `clusterId` ~line 88)
- [x] In `convex/schema.ts`, add a new index `.index("by_discoveryCellId", ["discoveryCellId"])` to the `leads` table
- [x] In `convex/discovery/placeHelpers.ts`, add `discoveryCellId?: string` to the `DiscoveredLead` type (~line 23-41)
- [x] In `convex/discovery/placeHelpers.ts`, add `discoveryCellId: v.optional(v.id("discoveryCells"))` to `discoveredLeadValidator` (~line 246-270)

### Validation
- [x] `pnpm typecheck` passes
- [x] `node --test tests/` passes (update pattern-matching tests if validator shape assertions break)

---

## 2. Stamp `discoveryCellId` During Discovery

When `discoverCell` builds lead objects, include the cell ID so inserted leads are linked.

### Tasks
- [x] In `convex/discovery/discoverCell.ts`, in the `discoverCell` action (~line 135), add `discoveryCellId: args.cellId` to each lead object in the `inBounds.map(...)` call that builds the `leads` array
- [x] In `convex/discovery/discoverLeads.ts`, in `insertDiscoveredLeads` handler (~line 72), the `ctx.db.insert("leads", lead)` call already inserts the full lead object — verify `discoveryCellId` passes through (it should, since it's in the validator now). No code change expected here, just verify.

### Validation
- [x] `pnpm typecheck` passes
- [x] Run discovery on a test cell, then verify the newly created lead has `discoveryCellId` set (check via Convex dashboard or a quick query)

---

## 3. Backfill Existing Leads

Parse `sourceDetail` strings on existing `google_places` leads to extract and set their `discoveryCellId`. The format is: `Discovery grid "..." cell <cellId> [depth=N]`.

### Tasks
- [x] In `convex/discovery/gridCells.ts`, add a new exported mutation `backfillDiscoveryCellIds` that: (a) queries all leads with `source === "google_places"`, (b) skips any that already have `discoveryCellId`, (c) uses regex `/cell\s+([a-z0-9]+)\s+\[depth=/` to extract the cell ID from `sourceDetail`, (d) patches each matching lead with `{ discoveryCellId: extractedId }`, (e) returns `{ updated: number, skipped: number }`. Use `internalMutation` so it can be called from the dashboard or a one-off script. Handle leads with no `sourceDetail` or non-matching format gracefully (skip them).

### Validation
- [x] `pnpm typecheck` passes
- [x] After running the backfill via Convex dashboard, spot-check that leads with `source: "google_places"` and a cell reference in `sourceDetail` now have `discoveryCellId` set

---

## 4. Add `getCellLeadStats` Query

New Convex query that returns live lead stats for a given cell, using the `by_discoveryCellId` index.

### Tasks
- [x] In `convex/discovery/gridCells.ts`, add a new exported `query` called `getCellLeadStats` with args `{ cellId: v.id("discoveryCells") }`. The handler should: (a) query all leads with `withIndex("by_discoveryCellId", q => q.eq("discoveryCellId", args.cellId))` and `.collect()`, (b) compute and return an object: `{ total: number, locationComplete: number, hasWebPresence: number, directoryReady: number }`. A lead has **locationComplete** when all of these are truthy: `address`, `city`, `province` (OR `region`), `postalCode`, `countryCode`, `latitude`, `longitude`. A lead has **hasWebPresence** when at least one of: `website`, `socialLinks?.instagram`, `socialLinks?.facebook` is truthy. A lead is **directoryReady** when both `locationComplete` AND `hasWebPresence` are true.

### Validation
- [x] `pnpm typecheck` passes
- [x] Query returns correct counts when called with a cell ID that has linked leads

---

## 5. Replace "Leads Found" with Live Cell Stats in Panel

Replace the misleading per-cell "Leads Found" (which only shows new leads from the last run) with a live query showing total leads and directory-readiness breakdown.

### Tasks
- [x] In `src/components/map/discovery-panel.tsx`, add a `useQuery` call for `api.discovery.gridCells.getCellLeadStats`, passing `{ cellId: persistedCell._id as Id<"discoveryCells"> }` when `persistedCell` exists, otherwise `"skip"`
- [x] In the "Cell Progress" section (~lines 276-298), replace the "Leads Found" row (lines 292-296) with: (a) "Total Leads" showing `cellLeadStats?.total ?? "—"`, (b) "Directory Ready" showing `cellLeadStats?.directoryReady ?? "—"` out of total, (c) "Location Complete" showing `cellLeadStats?.locationComplete` out of total, (d) "Has Web/Social" showing `cellLeadStats?.hasWebPresence` out of total. Only show enrichment detail rows when `cellLeadStats?.total > 0`.
- [x] Add a small progress bar below the stats (same style as the grid progress bar but using `bg-indigo-500`) showing `directoryReady / total` percentage. Only render when `total > 0`.

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `node --test tests/` passes (update pattern-matching tests if they reference "Leads Found" or the cell progress section)
- [x] Selecting a previously-discovered cell shows "Total Leads: N" with the actual count (not 0)
- [x] Directory-readiness breakdown appears with correct counts
- [x] Progress bar reflects the directory-ready percentage

---

## 6. Freshness-Aware Cell Colors

Modulate searched/saturated cell colors based on `lastSearchedAt` age, reusing the existing `getStaleness()` thresholds from `src/lib/enrichment.ts` (fresh < 30d, aging 30-90d, stale > 90d).

### Tasks
- [x] In `src/components/map/cell-colors.ts`, import `getStaleness` from `@/lib/enrichment`. Add two new color maps: `SEARCHED_FRESHNESS` and `SATURATED_FRESHNESS`, each keyed by `StalenessLevel` ("fresh" | "aging" | "stale"). Colors: searched fresh = `#22c55e` (current green), searched aging = `#a3e635` (lime/yellow-green), searched stale = `#ca8a04` (amber). Saturated fresh = `#f97316` (current orange), saturated aging = `#d97706` (dark amber), saturated stale = `#92400e` (brown). Keep fillOpacity similar to current values (0.15-0.3).
- [x] In `src/components/map/cell-colors.ts`, change the `getCellColor` signature from `getCellColor(status: string)` to `getCellColor(status: string, lastSearchedAt?: number)`. When `status` is "searched" or "saturated" and `lastSearchedAt` is provided, call `getStaleness(lastSearchedAt)` to pick the right color from the freshness map. Fall through to current behavior otherwise.
- [x] In `src/components/map/discovery-grid.tsx`, find where `getCellColor(cell.status)` is called for persisted cells and change to `getCellColor(cell.status, cell.lastSearchedAt)`. The `CellData` type already includes `lastSearchedAt?: number`.
- [x] In `src/components/map/discovery-grid-shared.ts`, replace `formatShortDate` (~line 47-52) with a `formatRelativeTime` function that returns relative strings: "today", "yesterday", "N days ago", "N weeks ago", "N months ago". Use this in the discovery panel where `lastSearchedAt` is displayed.
- [x] In `src/components/map/discovery-panel.tsx`, update the `lastRun` display (~line 367-369) to use the new `formatRelativeTime` instead of `formatShortDate`.
- [x] In `src/components/map/discovery-panel.tsx`, update `CELL_STATUS_LEGEND` (~lines 42-47) to show freshness variants: replace the single "Searched" entry with "Searched (fresh)" (green `#22c55e`) and "Searched (stale)" (amber `#ca8a04`). Keep "Unsearched", "Searching", and "Saturated" as-is. The legend grid may need to be `grid-cols-2` with 5 items (last row wraps).

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `node --test tests/` passes (update tests if they regex-match `getCellColor` signature or `formatShortDate`)
- [x] On the map, cells discovered within the last 30 days appear bright green
- [x] Cells discovered 30-90 days ago appear yellow-green/lime
- [x] Cells discovered >90 days ago appear amber
- [x] Hovering/clicking a cell shows relative time ("3 days ago", "2 months ago") instead of absolute date
- [x] Legend reflects fresh vs stale distinction

---

## 7. Grid-Level Directory-Readiness Stats

Add aggregate enrichment metrics to the grid progress section so you can see the big picture without clicking individual cells.

### Tasks
- [x] In `convex/discovery/gridCells.ts`, add a new exported `query` called `getGridEnrichmentStats` with args `{ gridId: v.id("discoveryGrids") }`. Handler: (a) fetch all leaf cells for the grid using `by_gridId_isLeaf` index, (b) for each cell, query leads using `by_discoveryCellId` index, (c) aggregate across all cells: `totalLeads`, `locationComplete`, `hasWebPresence`, `directoryReady` (using same logic as `getCellLeadStats`), (d) return the aggregated object.
- [x] In `src/components/map/discovery-panel.tsx`, add a `useQuery` call for `api.discovery.gridCells.getGridEnrichmentStats`, passing `{ gridId: globalGridId }` when `globalGridId` exists, otherwise `"skip"`
- [x] In the "Grid Progress" section (~lines 302-342), after the existing "Leads Found" row and progress bar, add a new section: (a) replace "Leads Found" label with "Total Leads" showing `gridEnrichmentStats?.totalLeads ?? selectedGrid.totalLeadsFound`, (b) add "Directory Ready" row showing `gridEnrichmentStats?.directoryReady` / `gridEnrichmentStats?.totalLeads` with percentage, (c) add "Needs Attention" row showing `totalLeads - directoryReady` count. Only show these rows when `gridEnrichmentStats` is loaded and `totalLeads > 0`.

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `node --test tests/` passes
- [x] With no cell selected, grid progress shows total leads and directory-readiness percentage
- [x] Numbers are consistent — grid-level totals match sum of individual cell stats

---

## 8. Add Export Tracking

Add `exportedAt` timestamp to leads, stamped when CSV export runs. Surface in cell and grid stats.

### Tasks
- [x] In `convex/schema.ts`, add `exportedAt: v.optional(v.number())` to the `leads` table
- [x] In `convex/leads.ts`, add a new exported `mutation` called `bulkStampExported` with args `{ leadIds: v.array(v.id("leads")) }`. Handler: patch each lead with `{ exportedAt: Date.now() }`.
- [x] In `src/app/leads/page.tsx`, after a successful CSV download (where `toast.success` is called), call the `bulkStampExported` mutation with the IDs of all exported leads. Extract IDs from the export query result before generating CSV.
- [x] In `convex/discovery/gridCells.ts`, update `getCellLeadStats` to also return `exported: number` (count of leads where `exportedAt` is truthy)
- [x] In `convex/discovery/gridCells.ts`, update `getGridEnrichmentStats` to also return `exported: number`
- [x] In `src/components/map/discovery-panel.tsx`, add an "Exported" row to both the cell progress and grid progress sections, showing `exported / total`

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `node --test tests/` passes
- [x] Export CSV from leads page, then check that exported leads have `exportedAt` set
- [x] Cell and grid stats show export counts after an export has been performed
