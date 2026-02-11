# Phase 13: Grid-Based Lead Discovery

Replace the single-query Google Places discovery with a systematic grid-based approach. Tile a user-defined area into 20km cells, prospect each cell via Google Places with configurable search queries, and subdivide saturated cells (60 results = API max hit) for deeper coverage. The grid is a separate map view from the existing cluster/polygon tool.

> **Prerequisites:** Phase 12 completed (polygon clusters, Leaflet map with drawing, point-in-polygon utils)

## Boundaries

- DO NOT modify existing cluster functionality — discovery grid is a separate view mode
- DO NOT use the Places API (New) — stick with Text Search API adding `location` + `radius` params
- DO NOT auto-run discovery on all cells — user clicks individual cells to prospect
- DO NOT remove the existing `scripts/discover-leads.ts` CLI script — it still works independently

## Tasks

### Schema & Shared Helpers

- [ ] Add `discoveryGrids` table to `convex/schema.ts` — fields: `name: v.string()`, `region: v.string()`, `province: v.string()` (explicit geographic fields mapped to all leads created from this grid), `queries: v.array(v.string())`, `swLat: v.number()`, `swLng: v.number()`, `neLat: v.number()`, `neLng: v.number()`, `cellSizeKm: v.number()`, `totalLeadsFound: v.number()` (running count, incremented as cells are searched), `createdAt: v.number()`. No separate `gridId` string — use the Convex-generated `_id` as the foreign key everywhere.
- [ ] Add `discoveryCells` table to `convex/schema.ts` — fields: `swLat: v.number()`, `swLng: v.number()`, `neLat: v.number()`, `neLng: v.number()`, `depth: v.number()` (0 = 20km, 1 = 10km, etc.), `parentCellId: v.optional(v.id("discoveryCells"))`, `isLeaf: v.boolean()` (true by default, set to false when subdivided — avoids expensive leaf detection at query time), `status: v.union(v.literal("unsearched"), v.literal("searched"), v.literal("saturated"), v.literal("searching"))`, `resultCount: v.optional(v.number())`, `querySaturation: v.optional(v.array(v.object({ query: v.string(), count: v.number() })))` (per-query result counts so user can see which queries are saturated), `lastSearchedAt: v.optional(v.number())`, `gridId: v.id("discoveryGrids")`. Add indexes: `by_gridId` on `["gridId"]`, `by_gridId_isLeaf` on `["gridId", "isLeaf"]`, `by_parentCellId` on `["parentCellId"]`.
- [ ] Add `by_placeId` index to the existing `leads` table in `convex/schema.ts` — index on `["placeId"]`. This replaces the full-table-scan dedup in `insertDiscoveredLeads` with index lookups.
- [ ] Export `haversineKm` from `convex/lib/pointInPolygon.ts` — add the `export` keyword to the existing function on line 73.
- [ ] Create `convex/discovery/placeHelpers.ts` — extract from `convex/discovery/discoverLeads.ts`: `PlaceTextResult` type, `DiscoveredLead` type, `normalizeDedupValue`, `normalizeDedupName`, `dedupKeyForLead`, `extractCity`, `inferLeadType`, `searchPlaces` function, and `discoveredLeadValidator`. Export all of them.
- [ ] Update `convex/discovery/discoverLeads.ts` — import the extracted types and helpers from `./placeHelpers` instead of defining them locally. Rewrite `insertDiscoveredLeads` to use index-based dedup instead of full table scan: for each incoming lead, query `leads` by `by_placeId` index (if `placeId` present) and by `by_name` index + filter by city (for name+city dedup). Only insert if no match found. This eliminates the `ctx.db.query("leads").collect()` full scan that would become expensive with per-cell discovery. Verify `discoverLeads` action still works after refactor.

### Validation
- [ ] `pnpm typecheck` passes
- [ ] Existing `discoverLeads` action behavior unchanged (no regression from dedup refactor)

### Grid CRUD Operations

- [ ] Create `convex/discovery/gridCells.ts` with `generateGrid` mutation — takes `{ name, region, province, queries?, swLat, swLng, neLat, neLng, cellSizeKm? }`. Creates a `discoveryGrids` record (with `totalLeadsFound: 0`) and generates cells with `isLeaf: true`. Use degree approximation for grid tiling: `latStep = cellSizeKm / 111`, `lngStep = cellSizeKm / (111 * cos(midLat))`. Default `cellSizeKm` to 20. Default `queries` to `["farms", "farmers market", "orchard", "farm stand", "pick your own"]`. Uses the new grid's `_id` as the `gridId` foreign key on all cells.
- [ ] Add `subdivideCell` mutation to `convex/discovery/gridCells.ts` — takes `{ cellId }`. Guards: (1) cell status must be `"saturated"`, (2) `depth < 4` (max depth, ~1.25km), (3) query `by_parentCellId` index to check no children exist already — if children found, throw error to prevent duplicate subdivision. Splits cell into 4 quadrants at the midpoint. Creates 4 child cells with `depth + 1`, `parentCellId` set to original, `isLeaf: true`, status `"unsearched"`. Patches the parent cell to set `isLeaf: false`.
- [ ] Add `listCells` query to `convex/discovery/gridCells.ts` — takes `{ gridId: v.id("discoveryGrids") }`. Query `by_gridId_isLeaf` index with `gridId` and `isLeaf: true`. Return fields: `_id`, `swLat`, `swLng`, `neLat`, `neLng`, `depth`, `status`, `resultCount`, `querySaturation`, `lastSearchedAt`.
- [ ] Add `listGrids` query to `convex/discovery/gridCells.ts` — returns all `discoveryGrids` records. For each grid, query cells `by_gridId_isLeaf` (isLeaf: true) and compute summary stats: total leaf cells, searched count, saturated count. Include `totalLeadsFound` from the grid record.
- [ ] Add `updateGridQueries` mutation to `convex/discovery/gridCells.ts` — takes `{ gridId: v.id("discoveryGrids"), queries: string[] }`. Patches the `queries` array on the grid record.
- [ ] Add `claimCellForSearch` internalMutation to `convex/discovery/gridCells.ts` — takes `{ cellId, expectedStatuses: string[] }`. Atomically reads the cell, verifies `cell.status` is in `expectedStatuses` (e.g. `["unsearched", "searched"]`), and patches to `"searching"`. Returns `{ previousStatus: string }` on success. Throws if status doesn't match (another action already claimed it). This is a single mutation so Convex's transaction guarantees prevent races.
- [ ] Add remaining internal helpers to `convex/discovery/gridCells.ts` — `getCell` internalQuery (returns cell + its parent grid record including queries, region, province), `updateCellStatus` internalMutation (sets status field — used for failure rollback), `updateCellSearchResult` internalMutation (sets status, resultCount, querySaturation, lastSearchedAt, and increments the parent grid's `totalLeadsFound` by the new leads count).
- [ ] Add `deleteGrid` as an internalAction in `convex/discovery/gridCells.ts` — batched deletion to avoid Convex transaction limits on large grids. Loop: query up to 500 cells with matching `gridId`, delete them in a batch via an internalMutation, repeat until no cells remain, then delete the `discoveryGrids` record. Expose a public mutation `requestDeleteGrid` that calls `ctx.scheduler.runAfter(0, internal.discovery.gridCells.deleteGrid, { gridId })` so the UI gets an immediate response.

### Validation
- [ ] `pnpm typecheck` passes
- [ ] Can call `generateGrid` via Convex dashboard with Niagara bbox `(42.85, -79.90)` to `(43.35, -78.80)`, region `"Niagara"`, province `"ON"`, and see ~12 cells created, all with `isLeaf: true`
- [ ] Can call `subdivideCell` on a saturated cell and see 4 children created with `isLeaf: true`, parent patched to `isLeaf: false`
- [ ] Calling `subdivideCell` again on the same cell throws an error (duplicate guard)
- [ ] `listCells` returns only leaf cells via index (no post-filtering)
- [ ] `claimCellForSearch` succeeds on first call, throws on concurrent second call for the same cell

### Cell-Scoped Discovery Action

- [ ] Create `convex/discovery/discoverCell.ts` with `discoverCell` action — takes `{ cellId }`. Full steps: (1) call `claimCellForSearch` internalMutation with `expectedStatuses: ["unsearched", "searched"]` — this atomically checks the cell isn't already being searched and transitions to `"searching"`, returning `{ previousStatus }`. If it throws, the cell was already claimed; surface error to caller, (2) fetch cell + grid record via `getCell` internal query to get bounds, queries, region, province, (3) **wrap steps 4-11 in try/catch — on ANY failure, reset cell status to `previousStatus` via `updateCellStatus` before re-throwing**, (4) compute cell center lat/lng and **circumscribed** circle radius using `haversineKm` — measure from cell center to a corner (not inscribed; circumscribed covers the entire cell including corners so no places are missed at cell edges), (5) for each query string in the grid's queries list call `searchPlacesWithLocation` with the cell's center + radius, tracking per-query result count, (6) deduplicate all results across queries by `place_id`, (7) post-filter to cell bounds (discard results where lat/lng falls outside the cell's sw/ne box — necessary because radius is a bias not a hard filter, and circumscribed radius extends beyond cell bounds), (8) convert to lead objects using `inferLeadType` and `extractCity` from `placeHelpers.ts`, set `region` and `province` from the grid record's explicit fields, set `sourceDetail` to `"Discovery grid cell [depth={depth}]"`, (9) insert via the refactored `insertDiscoveredLeads` mutation (now index-based dedup), (10) determine saturation: mark `"saturated"` only if **every** query returned 60 results (if only some queries hit 60, there may still be room — avoid over-subdivision from one niche query hitting 60 while others return few), (11) update cell via `updateCellSearchResult` with status, resultCount (in-bounds deduplicated total), `querySaturation` array (per-query counts), timestamp, and newLeads count for grid total increment, (12) return `{ totalApiResults, inBoundsResults, newLeads, duplicatesSkipped, saturated, querySaturation }`.
- [ ] Add `searchPlacesWithLocation` helper in `discoverCell.ts` — wraps the existing `searchPlaces` pattern from `placeHelpers.ts` but appends `&location={lat},{lng}&radius={radius}` to the URL. Fetches up to 3 pages (60 results max). For page token pagination: initial delay of 2s, then on `INVALID_REQUEST` status (token not yet ready), retry up to 3 times with exponential backoff (2s, 4s, 8s) before giving up on that page. Returns `{ results: PlaceTextResult[], totalCount: number }` so the caller can check saturation per query.

### Validation
- [ ] `pnpm typecheck` passes
- [ ] Can call `discoverCell` from Convex dashboard on an unsearched cell and see leads created in the leads table
- [ ] Cell status updates to `"searched"` or `"saturated"` correctly
- [ ] `querySaturation` field shows per-query result counts on the cell
- [ ] Leads have correct `sourceDetail` referencing the cell and correct `region`/`province` from the grid
- [ ] Multiple queries all execute and results are deduped by placeId across queries
- [ ] If the action errors mid-flight, cell status resets to previous state (not stuck on `"searching"`)
- [ ] Re-searching a `"searched"` cell works (updates counts, finds new leads if queries changed)
- [ ] Two concurrent `discoverCell` calls on the same cell: first succeeds, second fails with claim error

### Map Grid Overlay Component

- [ ] Create `src/components/map/cell-colors.ts` — export a `getCellColor(status)` function. Colors: `unsearched` → `#9ca3af` (gray), `searching` → `#3b82f6` (blue), `searched` → `#22c55e` (green), `saturated` → `#f97316` (orange). Return `{ color, fillColor, fillOpacity }` object for each status.
- [ ] Create `src/components/map/discovery-grid.tsx` — import `Rectangle` and `Tooltip` from `react-leaflet`. Takes props `{ cells: CellData[], onCellClick: (cellId: string) => void }`. Renders a `<Rectangle>` for each cell with bounds `[[swLat, swLng], [neLat, neLng]]`, pathOptions from `getCellColor(cell.status)`, and click eventHandler calling `onCellClick`. Add a `<Tooltip>` showing status and result count (e.g. "Searched — 34 results" or "Unsearched"). For saturated cells, also show which queries hit 60 from `querySaturation`.
- [ ] Create `src/components/map/map-bounds-emitter.tsx` — a component rendered inside `MapContainer` that uses `useMap()` + `useMapEvents` to listen for `moveend`/`zoomend` events and calls an `onBoundsChange(bounds: { swLat, swLng, neLat, neLng })` callback prop with the current viewport bounds. This bridges the gap between the Leaflet map instance (only accessible inside MapContainer) and the parent page state.
- [ ] Add grid + bounds props to `src/components/map/map-content.tsx` — extend `MapContentProps` with optional `gridCells`, `onCellClick`, and `onBoundsChange`. Import and render `DiscoveryGrid` when `gridCells` provided. Import and render `MapBoundsEmitter` when `onBoundsChange` provided.

### Validation
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] Map renders without errors when no `gridCells` provided (existing behavior preserved)
- [ ] `onBoundsChange` fires with correct viewport coordinates when panning/zooming

### Map Page Discovery Mode

- [ ] Add view mode toggle to `src/app/map/page.tsx` — add `viewMode` state: `"clusters" | "discovery"`, default `"clusters"`. Add a toggle button in the top-right `div` next to the Draw Cluster button. Use `Grid3X3` icon from lucide-react. Label: "Discovery" when in clusters mode, "Clusters" when in discovery mode. When `viewMode === "discovery"`: hide the Draw Cluster button, hide cluster polygons from MapContent (pass empty `clusters` array), show grid cells on MapContent.
- [ ] Add `mapBounds` state to `src/app/map/page.tsx` — `useState<{ swLat, swLng, neLat, neLng } | null>(null)`. Pass `onBoundsChange` callback to `MapContent` that updates this state. This gives the discovery panel access to the current viewport for pre-filling the "New Grid" form.
- [ ] Create `src/components/map/discovery-panel.tsx` — left sidebar panel (same position as `MapFilters`, rendered conditionally). Takes `mapBounds` as a prop. Contains: (1) grid selector dropdown if multiple grids exist, (2) "New Grid" form if no grid exists or user wants another — inputs for grid name, region, province, and bounding box coordinates pre-filled from `mapBounds` prop (user pans/zooms to target area, then clicks "Create Grid"), (3) progress stats showing searched/total leaf cells, saturated cells needing subdivision, and `totalLeadsFound` from the grid record, (4) editable search queries list — display current queries as removable chips/tags, text input to add new query, save calls `updateGridQueries` mutation, (5) color legend for cell statuses.
- [ ] Wire discovery queries and actions in `src/app/map/page.tsx` — add `useQuery(api.discovery.gridCells.listCells, { gridId })` (conditional on selected grid) and `useQuery(api.discovery.gridCells.listGrids)`. Add `useAction(api.discovery.discoverCell.discoverCell)` and `useMutation(api.discovery.gridCells.subdivideCell)`. Implement `handleCellClick`: if cell is `"unsearched"` or `"searched"` → call `discoverCell` action in a try/catch, show success toast with results on success (include per-query saturation info if any queries hit 60), show error toast on failure. If cell is `"saturated"` → call `subdivideCell` in a try/catch, show success toast on success, show error toast on failure (e.g. "Already subdivided" or "Max depth reached"). If cell is `"searching"` → no-op (optionally show info toast "Search already in progress"). Pass `gridCells` and `handleCellClick` to `MapContent`. Render `<DiscoveryPanel>` instead of `<MapFilters>` when `viewMode === "discovery"`.

### Validation
- [ ] Map page renders without errors in both cluster and discovery modes
- [ ] Toggle switches between cluster and discovery views correctly
- [ ] Can create a new grid from current map viewport bounds with explicit region/province
- [ ] Clicking an unsearched cell triggers discovery, cell turns green (or orange if saturated)
- [ ] Clicking a saturated cell subdivides into 4 smaller cells
- [ ] Failed operations show error toasts with meaningful messages
- [ ] Lead markers visible in both modes
- [ ] Editing search queries in the panel persists and next cell search uses the updated queries
- [ ] Grid stats panel shows accurate searched/total/leads counts
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
