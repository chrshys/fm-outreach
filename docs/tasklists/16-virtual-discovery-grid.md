# Phase 16: Virtual Discovery Grid — Full Map Coverage

Replace the manual grid-creation workflow with a virtual grid overlay that covers the entire visible map when discovery mode is active. Instead of pre-populating the database with cells for a specific viewport, grid cells are computed client-side from the current map bounds and rendered as a faint overlay. Clicking a virtual cell "activates" it — persisting it to the database as an unsearched cell ready for discovery. Collapse the multi-grid model into a single global grid that auto-creates on first use.

> **Prerequisites:** Phase 15 completed (click-to-select + sidebar actions)

## Boundaries

- DO NOT modify `convex/discovery/discoverCell.ts` or `convex/discovery/discoverLeads.ts` — the search pipeline is unchanged
- DO NOT change the `CellAction` type, `getAvailableActions`, or the cell action handler in `page.tsx` — activated cells behave identically to previously-created cells
- DO NOT add multi-select — single cell selection only (same as Phase 15)
- Existing grid data will be deleted — no backward compatibility needed

---

## 1. Create Virtual Grid Utility

### Tasks

- [x] Create `src/lib/virtual-grid.ts`. Export a `VirtualCell` type: `{ key: string, swLat: number, swLng: number, neLat: number, neLng: number }`. The `key` is a deterministic string from the snapped SW coordinates: `"${swLat.toFixed(6)}_${swLng.toFixed(6)}"`.
- [x] In `src/lib/virtual-grid.ts`: export a `computeVirtualGrid` function. Args: `bounds: { swLat: number, swLng: number, neLat: number, neLng: number }`, `cellSizeKm: number`, `maxCells?: number` (default 500). Returns `VirtualCell[]`. Algorithm: (1) compute `midLat = (bounds.swLat + bounds.neLat) / 2`, (2) `latStep = cellSizeKm / 111`, (3) `lngStep = cellSizeKm / (111 * Math.cos(midLat * Math.PI / 180))`, (4) snap start coordinates: `startLat = Math.floor(bounds.swLat / latStep) * latStep`, `startLng = Math.floor(bounds.swLng / lngStep) * lngStep`, (5) compute expected count before iterating: `rows = Math.ceil((bounds.neLat - startLat) / latStep)`, `cols = Math.ceil((bounds.neLng - startLng) / lngStep)` — if `rows * cols > maxCells`, return empty array, (6) iterate lat from `startLat` while `< bounds.neLat`, lng from `startLng` while `< bounds.neLng`, push a `VirtualCell` for each position with `neLat = lat + latStep`, `neLng = lng + lngStep`.
- [x] In `src/lib/virtual-grid.ts`: export a `computeBoundsKey` helper function. Args: `swLat: number, swLng: number, latStep: number, lngStep: number`. Returns `string`. Snaps the coordinates to the nearest grid-aligned position and returns the deterministic key: `const snappedLat = Math.floor(swLat / latStep) * latStep; const snappedLng = Math.floor(swLng / lngStep) * lngStep; return "${snappedLat.toFixed(6)}_${snappedLng.toFixed(6)}"`. This helper is used by the backend `activateCell` mutation and the frontend grid component to produce matching keys.

### Validation

- [x] `pnpm typecheck` passes
- [x] `computeVirtualGrid({ swLat: 43, swLng: -79.5, neLat: 43.5, neLng: -79 }, 20)` returns a non-empty array of cells that tile the bounds without gaps
- [x] `computeVirtualGrid` with same bounds called twice returns identical keys
- [x] `computeVirtualGrid` returns empty array when cell count exceeds `maxCells`

---

## 2. Schema Changes

### Tasks

- [x] In `convex/schema.ts` `discoveryCells` table (line 179): add `boundsKey: v.string()` after the `gridId` field (before the closing of `defineTable`). This is required on all cells going forward — no optional needed since we're starting fresh.
- [x] In `convex/schema.ts` `discoveryCells` indexes (after line 202): add `.index("by_gridId_boundsKey", ["gridId", "boundsKey"])`.
- [x] In `convex/schema.ts` `discoveryGrids` table (lines 165-177): remove the four bounds fields entirely (`swLat`, `swLng`, `neLat`, `neLng`). Grids no longer have bounds — they're just query configurations.

### Validation

- [x] `npx convex dev` runs without schema errors (or `pnpm convex:push` depending on the project's deploy command)
- [x] `pnpm typecheck` passes

---

## 3. Backend: activateCell + getOrCreateGlobalGrid + listCells Changes

### Tasks

- [x] In `convex/discovery/gridCells.ts`: delete the `generateGrid` mutation entirely — it's replaced by `activateCell` + virtual grid. Also delete the `requestDeleteGrid` and `deleteGrid`/`deleteGridRecord`/`deleteCellBatch` functions — grid deletion is no longer needed with a single persistent global grid.
- [x] In `convex/discovery/gridCells.ts`: add an `activateCell` public mutation. Args: `{ gridId: v.id("discoveryGrids"), swLat: v.number(), swLng: v.number(), neLat: v.number(), neLng: v.number(), boundsKey: v.string() }`. Handler: (1) query `discoveryCells` using index `by_gridId_boundsKey` with `q.eq("gridId", args.gridId).eq("boundsKey", args.boundsKey)`, take `.first()`, (2) if found, return `{ cellId: existing._id, alreadyExisted: true }`, (3) if not found, insert a new `discoveryCells` document with `{ swLat: args.swLat, swLng: args.swLng, neLat: args.neLat, neLng: args.neLng, depth: 0, isLeaf: true, status: "unsearched", gridId: args.gridId, boundsKey: args.boundsKey }`, (4) return `{ cellId: newId, alreadyExisted: false }`.
- [x] In `convex/discovery/gridCells.ts`: add a `getOrCreateGlobalGrid` public mutation. Args: none. Handler: (1) query all `discoveryGrids` documents, take the first one, (2) if it exists, return `{ gridId: grid._id, created: false }`, (3) if no grids exist, insert a new `discoveryGrids` document with `{ name: "Discovery", region: "Ontario", province: "Ontario", queries: DEFAULT_QUERIES, cellSizeKm: DEFAULT_CELL_SIZE_KM, totalLeadsFound: 0, createdAt: Date.now() }` (no bounds fields — they're removed from the schema), (4) return `{ gridId: newId, created: true }`.
- [x] In `convex/discovery/gridCells.ts` `listCells` query (line 268-294): after the existing `cells` query that fetches leaf cells, add a second query to get all depth-0 boundsKeys for this grid: query `discoveryCells` with index `by_gridId` filtering for `depth === 0`, collect, then map to extract `boundsKey` values. Change the return value from the current `cells.map(...)` array to an object: `{ cells: cells.map(...existing mapping...), activatedBoundsKeys: depth0BoundsKeys }`. Include `boundsKey` in the per-cell mapping alongside the existing fields.

### Validation

- [x] `pnpm typecheck` passes
- [x] Calling `activateCell` twice with the same `boundsKey` returns the same `cellId` with `alreadyExisted: true` on the second call
- [x] `getOrCreateGlobalGrid` returns the existing grid if one exists, creates a new one otherwise
- [x] `listCells` returns an object with `cells` array and `activatedBoundsKeys` array

---

## 4. Add Virtual Cell Style

### Tasks

- [x] In `src/components/map/cell-colors.ts`: export a `VIRTUAL_CELL_STYLE` constant: `{ color: "#d1d5db", fillColor: "#d1d5db", fillOpacity: 0.05, weight: 0.5 }`. This is the path options object for unactivated virtual grid cells — faint gray gridlines.

### Validation

- [x] `pnpm typecheck` passes

---

## 5. Update Discovery Grid Component for Virtual + Persisted Rendering

### Tasks

- [x] In `src/components/map/discovery-grid.tsx`: add imports — `{ useState, useMemo, useCallback }` from `react`, `{ useMap, useMapEvents }` from `react-leaflet`, `{ computeVirtualGrid }` from `@/lib/virtual-grid`, `type { VirtualCell }` from `@/lib/virtual-grid`, `{ VIRTUAL_CELL_STYLE }` from `./cell-colors`.
- [x] In `src/components/map/discovery-grid.tsx`: extend the `DiscoveryGridProps` type with four new fields: `cellSizeKm: number`, `gridId: string`, `activatedBoundsKeys: string[]`, `onActivateCell: (cell: VirtualCell) => Promise<string>` (returns the new cell ID).
- [x] In `src/components/map/discovery-grid.tsx`: add a new `VirtualGridCell` component. Props: `{ cell: VirtualCell, onActivateCell: (cell: VirtualCell) => Promise<string>, onCellSelect: (cellId: string | null) => void }`. Renders a `<Rectangle>` with bounds from the virtual cell, `pathOptions={VIRTUAL_CELL_STYLE}`, and a click handler that: (1) calls `onActivateCell(cell)` to persist the cell, (2) on success calls `onCellSelect(cellId)` with the returned ID. Use an async click handler — set a local `activating` state to prevent double-clicks.
- [x] In `src/components/map/discovery-grid.tsx`: update the `DiscoveryGrid` default export component. Destructure the new props. Add `useMap()` to get the map instance. Add state: `const [mapBounds, setMapBounds] = useState<{swLat:number,swLng:number,neLat:number,neLng:number} | null>(null)`. Add `useMapEvents({ moveend: () => updateBounds(), zoomend: () => updateBounds() })` where `updateBounds` reads `map.getBounds()` and converts to `{ swLat, swLng, neLat, neLng }`. Also call `updateBounds` on initial mount via a `useEffect` that runs once. Compute virtual cells: `const virtualCells = useMemo(() => { if (!mapBounds || map.getZoom() < 8) return []; return computeVirtualGrid(mapBounds, cellSizeKm) }, [mapBounds, cellSizeKm])`. Build activated set: `const activatedSet = useMemo(() => new Set(activatedBoundsKeys), [activatedBoundsKeys])`. Also build a set from persisted cells' boundsKeys. Filter virtual cells to only those whose key is NOT in either set. Render: first render persisted `DiscoveryGridCell` components (existing), then render `VirtualGridCell` for each unactivated virtual cell.

### Validation

- [x] `pnpm typecheck` passes
- [x] In discovery mode at zoom >= 8, faint gray grid cells cover the entire visible map area
- [x] Persisted cells render with their status colors on top of / instead of virtual cells at the same position
- [x] Panning the map updates the virtual grid to cover newly visible area
- [x] Zooming below 8 hides the virtual grid but persisted cells remain visible
- [x] Clicking a virtual cell activates it — it becomes a gray "unsearched" persisted cell with a dashed blue selection border

---

## 6. Update MapContent Props

### Tasks

- [x] In `src/components/map/map-content.tsx`: add new optional props to `MapContentProps`: `cellSizeKm?: number`, `gridId?: string`, `activatedBoundsKeys?: string[]`, `onActivateCell?: (cell: { key: string, swLat: number, swLng: number, neLat: number, neLng: number }) => Promise<string>`.
- [x] In `src/components/map/map-content.tsx`: update the `DiscoveryGrid` render block (line 104-108) to pass the new props through: `cellSizeKm={cellSizeKm ?? 20}`, `gridId={gridId ?? ""}`, `activatedBoundsKeys={activatedBoundsKeys ?? []}`, `onActivateCell={onActivateCell ?? (async () => "")}`. Only pass these when `gridCells && onCellSelect` (inside the existing conditional).

### Validation

- [x] `pnpm typecheck` passes

---

## 7. Wire Up Page Component

### Tasks

- [x] In `src/app/map/page.tsx`: add import for `activateCell` and `getOrCreateGlobalGrid` mutations: `const activateCellMutation = useMutation(api.discovery.gridCells.activateCell)` and `const getOrCreateGlobalGrid = useMutation(api.discovery.gridCells.getOrCreateGlobalGrid)`.
- [x] In `src/app/map/page.tsx`: replace the `selectedGridId` state with a `globalGridId` state: `const [globalGridId, setGlobalGridId] = useState<Id<"discoveryGrids"> | null>(null)`. Add a `useEffect` that calls `getOrCreateGlobalGrid` when `viewMode === "discovery"` and `globalGridId` is null — on success, set `globalGridId` to the returned grid ID. This auto-creates the grid on first discovery mode entry.
- [x] In `src/app/map/page.tsx`: update the `gridCells` query to use `globalGridId` instead of `selectedGridId`: `const gridCells = useQuery(api.discovery.gridCells.listCells, globalGridId && viewMode === "discovery" ? { gridId: globalGridId } : "skip")`. Since `listCells` now returns `{ cells, activatedBoundsKeys }`, destructure accordingly: `const gridCellsData = useQuery(...)`, then derive `const cells = gridCellsData?.cells` and `const activatedBoundsKeys = gridCellsData?.activatedBoundsKeys ?? []`.
- [x] In `src/app/map/page.tsx`: look up the selected grid to get `cellSizeKm`. Use the `listGrids` query (already used by DiscoveryPanel) or add a simple query. The simplest approach: `const grids = useQuery(api.discovery.gridCells.listGrids)`, then `const selectedGrid = grids?.find(g => g._id === globalGridId)`, then `const cellSizeKm = selectedGrid?.cellSizeKm ?? 20`.
- [x] In `src/app/map/page.tsx`: add a `handleActivateCell` callback: `const handleActivateCell = useCallback(async (cell: { key: string, swLat: number, swLng: number, neLat: number, neLng: number }) => { if (!globalGridId) return ""; const result = await activateCellMutation({ gridId: globalGridId, swLat: cell.swLat, swLng: cell.swLng, neLat: cell.neLat, neLng: cell.neLng, boundsKey: cell.key }); return result.cellId; }, [globalGridId, activateCellMutation])`.
- [x] In `src/app/map/page.tsx`: update the `<MapContent>` props — add `cellSizeKm={cellSizeKm}`, `gridId={globalGridId ?? undefined}`, `activatedBoundsKeys={activatedBoundsKeys}`, `onActivateCell={viewMode === "discovery" ? handleActivateCell : undefined}`. Update `gridCells` prop to pass `cells` instead of the raw query result: `gridCells={viewMode === "discovery" ? cells ?? undefined : undefined}`.
- [x] In `src/app/map/page.tsx`: update `handleCellAction` — it currently does `const cell = gridCells?.find(...)`. Change this to use `cells` (the destructured array): `const cell = cells?.find(...)`.
- [x] In `src/app/map/page.tsx`: remove `handleGridSelect` callback and `selectedGridId`-related code. Remove the `useEffect` that clears `selectedCellId` on `selectedGridId` change — replace with one that clears on `globalGridId` change (or remove if globalGridId is stable).
- [x] In `src/app/map/page.tsx`: update the `<DiscoveryPanel>` props — remove `selectedGridId` and `onGridSelect` props, pass `globalGridId` instead. Update `cells` prop to use `cells` variable. Remove `mapBounds` prop if no longer needed by the panel.

### Validation

- [x] `pnpm typecheck` passes
- [x] Entering discovery mode for the first time auto-creates a grid and shows the virtual overlay
- [x] Clicking a virtual cell activates it (persists to DB) and selects it in the panel
- [x] Running search on an activated cell works end-to-end (cell transitions through statuses)
- [x] Subdivide and merge work on activated cells

---

## 8. Simplify Discovery Panel

### Tasks

- [x] In `src/components/map/discovery-panel.tsx`: update `DiscoveryPanelProps` — remove `mapBounds` and `onGridSelect` props. Replace `selectedGridId: Id<"discoveryGrids"> | null` with `globalGridId: Id<"discoveryGrids"> | null`. Keep `cells`, `selectedCellId`, `onCellAction`.
- [x] In `src/components/map/discovery-panel.tsx`: remove the entire "Grid Selector" section (the dropdown with grid switching, lines ~195-238). Remove `showGridSelector` state.
- [x] In `src/components/map/discovery-panel.tsx`: remove the entire "New Grid Form" section (lines ~242-317). Remove `showNewGridForm`, `gridName`, `region`, `province` state variables. Remove the `handleCreateGrid` callback. Remove the `generateGrid` mutation import.
- [x] In `src/components/map/discovery-panel.tsx`: update `selectedGrid` derivation — change from `grids?.find((g) => g._id === selectedGridId) ?? grids?.[0] ?? null` to `grids?.find((g) => g._id === globalGridId) ?? null`.
- [x] In `src/components/map/discovery-panel.tsx`: remove the auto-select-first-grid `useEffect` (lines 71-75) — the page component now handles this via `getOrCreateGlobalGrid`.
- [x] In `src/components/map/discovery-panel.tsx`: add editable Region and Province fields. Below the panel header and above Progress, add a "Settings" section (only shown when `selectedGrid` exists). Show the grid's `region` and `province` as small inline-editable text fields (similar to how queries are edited — click to edit, Enter to save, Escape to cancel). Add a `updateGridMetadata` mutation (or reuse `updateGridQueries` extended to handle region/province). These fields are used for lead metadata when searching cells.
- [x] In `src/components/map/discovery-panel.tsx`: clean up unused imports — remove `MapBounds` type import, remove `Grid2x2Plus` if only used in the removed New Grid button, remove any other imports that are no longer referenced.

### Validation

- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] Discovery panel no longer shows grid selector dropdown or "New Grid" form
- [x] Panel shows: Settings (region/province) → Progress → Selected Cell → Search Queries → Color Legend
- [x] Region and province are editable from the panel
- [x] All existing cell actions (search, split, merge) still work from the panel

---

## 9. Backend: Update Grid Metadata Mutation

### Tasks

- [x] In `convex/discovery/gridCells.ts`: add an `updateGridMetadata` public mutation. Args: `{ gridId: v.id("discoveryGrids"), region: v.optional(v.string()), province: v.optional(v.string()) }`. Handler: fetch the grid, throw if not found, patch with provided fields (only patch fields that are present in args).

### Validation

- [x] `pnpm typecheck` passes
- [x] Calling `updateGridMetadata` updates the grid's region/province in the database

---

## 10. Clean Up Old Data

### Tasks

- [x] Delete all existing `discoveryCells` documents from the Convex dashboard (or via a one-off script). These don't have the required `boundsKey` field and won't work with the new schema.
- [x] Delete all existing `discoveryGrids` documents from the Convex dashboard. The `getOrCreateGlobalGrid` mutation will create a fresh one on first use.

### Validation

- [x] No old grid or cell documents remain in the database
- [x] Entering discovery mode auto-creates a fresh global grid

---

## 11. End-to-End Validation

- [x] Toggle to Discovery mode at default zoom (8) → faint gray virtual grid covers the entire visible map
- [x] Pan the map → virtual grid updates to cover newly visible area, cells stay aligned
- [x] Zoom in to 10 → fewer, larger-appearing cells, still aligned
- [x] Zoom out to 7 → virtual grid disappears, only persisted cells visible
- [x] Click a virtual cell → it activates (gray → unsearched with blue dashed selection border), panel shows cell details
- [x] Click "Run" on Google Places → cell searches normally (blue → green/orange)
- [x] Click "Split" on a searched cell → subdivides into 4, works as before
- [x] Click "Merge" on a child cell → merges back to parent
- [x] Edit region/province in panel → values persist
- [x] Edit search queries in panel → values persist
- [x] Switch to Clusters mode and back → discovery mode still works, virtual grid reappears
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
