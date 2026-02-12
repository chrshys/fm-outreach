# Phase 14: Discovery Grid Hover Actions & Multi-Mechanism Support

Replace the auto-action-on-click behavior of discovery grid cells with an interactive hover card showing explicit action buttons and per-mechanism discovery status. Currently clicking a cell auto-runs discovery or auto-subdivides based on status — this gives no way to subdivide a non-saturated cell, re-search a saturated cell, or undo a subdivision.

> **Prerequisites:** Phase 13 completed (grid-based discovery, cell subdivision, Google Places integration)

## Boundaries

- DO NOT modify the `discoveryGrids` or `discoveryCells` table schemas beyond what's specified (adding `parentCellId` to query response only)
- DO NOT implement the web scraping discovery mechanism — only add the disabled UI placeholder
- DO NOT change how `discoverCell` action works internally — only relax the status guards
- DO NOT remove the existing `cell-colors.ts` utility — it's still used for rectangle styling

## Tasks

### Backend: Relax Status Guards

- [x] In `convex/discovery/gridCells.ts` `subdivideCell` mutation (line 94-96): change the status guard from requiring `cell.status !== "saturated"` to only blocking `cell.status === "searching"`. New error message: `"Cannot subdivide while cell is being searched"`. This allows subdividing unsearched, searched, or saturated cells — giving the user manual control over grid granularity.
- [x] In `convex/discovery/discoverCell.ts` `requestDiscoverCell` mutation (line 222): add `"saturated"` to the allowed statuses check. Change from `cell.status !== "unsearched" && cell.status !== "searched"` to also allow `"saturated"`. Update the error message to list all three allowed statuses.
- [x] In `convex/discovery/discoverCell.ts` `discoverCell` internal action (line 41): add `"saturated"` to the `expectedStatuses` array passed to `claimCellForSearch`. Change from `["unsearched", "searched"]` to `["unsearched", "searched", "saturated"]`.

### Validation
- [x] `pnpm typecheck` passes
- [x] Can re-search a saturated cell from Convex dashboard (call `requestDiscoverCell` on a saturated cell ID)
- [x] Can subdivide a searched (non-saturated) cell from Convex dashboard

### Backend: Undivide Mutation & Updated Query

- [x] In `convex/discovery/gridCells.ts` `listCells` query (line 212-223): add `parentCellId: cell.parentCellId` to the returned object mapping. The field already exists in the schema, it's just not projected into the response.
- [x] Add `undivideCell` public mutation to `convex/discovery/gridCells.ts` (after the `subdivideCell` mutation, after line 139). Takes `{ cellId: v.id("discoveryCells") }`. Implementation: (1) fetch the cell, throw if not found, (2) read `cell.parentCellId`, throw `"Cell has no parent to undivide"` if missing, (3) fetch the parent cell, throw if not found, (4) BFS-walk all descendants of the parent using the `by_parentCellId` index — start a queue with `parentCellId`, for each item query children, push child IDs to queue and to a `toDelete` array, (5) guard: if any descendant has `status === "searching"`, throw `"Cannot undivide while a child cell is being searched"`, (6) delete all collected descendants, (7) patch the parent cell to set `isLeaf: true` (leave its existing `status`, `resultCount`, `querySaturation` intact), (8) return `{ deletedCount }`.

### Validation
- [x] `pnpm typecheck` passes
- [x] `listCells` response now includes `parentCellId` field (undefined for root cells, set for subdivided children)
- [x] Can undivide a subdivided cell from Convex dashboard — children disappear, parent becomes a leaf again with its original status
- [x] Undividing when a child is currently searching throws an error
- [x] Undividing a root cell (no parent) throws an error

### Frontend: Interactive Hover Card

- [x] In `src/components/map/discovery-grid.tsx`: add `parentCellId?: string` to the `CellData` type.
- [x] In `src/components/map/discovery-grid.tsx`: replace the `onCellClick: (cellId: string) => void` prop with `onCellAction: (cellId: string, action: CellAction) => void` where `CellAction` is a discriminated union type: `{ type: "search"; mechanism: string } | { type: "subdivide" } | { type: "undivide" }`. Export the `CellAction` type.
- [x] In `src/components/map/discovery-grid.tsx`: add a `DISCOVERY_MECHANISMS` constant array: `[{ id: "google_places", label: "Google Places", enabled: true }, { id: "web_scraper", label: "Web Scraping", enabled: false }]`.
- [x] In `src/components/map/discovery-grid.tsx`: add a `getAvailableActions` helper function that takes a `CellData` and returns which actions are available. If `cell.status === "searching"`, return empty (no actions). Otherwise: Search is always available for enabled mechanisms, Subdivide is available if `cell.depth < MAX_DEPTH`, Undivide (Merge) is available if `cell.parentCellId` exists.
- [x] In `src/components/map/discovery-grid.tsx`: replace the plain text `formatTooltip` function with a `CellTooltipContent` React component. This component renders inside `<Tooltip interactive>` on each Rectangle. Layout: (1) top line shows cell status badge and result count (e.g. "Searched — 45 results"), (2) mechanism rows section — for each mechanism in `DISCOVERY_MECHANISMS`, show a row with: mechanism label, last-run date formatted as short date (for `google_places` use `cell.lastSearchedAt`, for `web_scraper` show "—"), and a small "Run" button (Play icon from lucide-react). The Run button calls `onCellAction(cellId, { type: "search", mechanism: id })`. Disable the button (reduced opacity, `pointer-events-none`) if `!mechanism.enabled` or `cell.status === "searching"`. (3) bottom row shows Split and Merge buttons — Split button (Grid2x2Plus icon + "Split" label) calls `onCellAction(cellId, { type: "subdivide" })`, hidden if `cell.depth >= MAX_DEPTH`. Merge button (Minimize2 icon + "Merge" label) calls `onCellAction(cellId, { type: "undivide" })`, hidden if no `cell.parentCellId`. Both hidden entirely if `cell.status === "searching"`. Use `e.stopPropagation()` on all button clicks to prevent event bubbling to the map.
- [x] In `src/components/map/discovery-grid.tsx`: update the Rectangle rendering. Remove the `eventHandlers={{ click: () => onCellClick(cell._id) }}` prop. Replace the existing `<Tooltip>{formatTooltip(cell)}</Tooltip>` with `<Tooltip interactive className="..." direction="top" offset={[0, -10]}>`. Override Leaflet default tooltip styles via `className` using Tailwind `!important` modifiers: `"!bg-card !border !border-border !rounded-lg !shadow-md !px-2.5 !py-2 !text-foreground"`. Render `<CellTooltipContent>` as the tooltip child.
- [x] Style the tooltip buttons as small, compact controls — use `inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs hover:bg-accent transition-colors` on each button. Keep the overall tooltip compact so it doesn't obscure too much of the map.

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] Hovering a cell shows the interactive tooltip with mechanism rows and action buttons
- [x] Tooltip stays open when moving mouse from the cell to the tooltip (interactive mode working)
- [x] Tooltip closes when mouse leaves both the cell and tooltip
- [x] Buttons inside the tooltip are clickable
- [x] Web Scraping row shows as disabled with "—" for date
- [x] Split button hidden on cells at max depth (depth 4)
- [x] Merge button hidden on root cells (no parentCellId)
- [x] No buttons shown on cells with status "searching"

### Frontend: Wire Up Page Handler & Props

- [x] In `src/components/map/map-content.tsx`: replace the `onCellClick?: (cellId: string) => void` prop with `onCellAction?: (cellId: string, action: CellAction) => void`. Import the `CellAction` type from `./discovery-grid`. Update the conditional render of `<DiscoveryGrid>` to pass `onCellAction` instead of `onCellClick`.
- [x] In `src/app/map/page.tsx`: add `const undivideCell = useMutation(api.discovery.gridCells.undivideCell)` alongside the existing discovery mutation hooks.
- [x] In `src/app/map/page.tsx`: replace the `handleCellClick` callback with a `handleCellAction` callback. It takes `(cellId: string, action: CellAction)` and switches on `action.type`: (1) `"search"` — if `action.mechanism === "google_places"`, call `requestDiscoverCell({ cellId })` with try/catch and toast. For any other mechanism value, show `toast.info("Coming soon")`. (2) `"subdivide"` — call `subdivideCell({ cellId })` with try/catch and toast. (3) `"undivide"` — call `undivideCell({ cellId })` with try/catch, toast success "Cell merged back to parent", toast error on failure. Update the dependency array to include `undivideCell`.
- [x] In `src/app/map/page.tsx`: update the `MapContent` usage — change prop from `onCellClick={viewMode === "discovery" ? handleCellClick : undefined}` to `onCellAction={viewMode === "discovery" ? handleCellAction : undefined}`.

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] Hovering a cell and clicking Google Places "Run" triggers discovery — cell turns blue (searching), then green/orange on completion
- [x] Last-run date appears on the Google Places row after search completes
- [x] Clicking "Split" on a non-searching cell subdivides into 4 quadrants
- [x] Clicking "Split" on an unsearched cell works (relaxed constraint)
- [x] Clicking "Merge" on a child cell collapses all siblings back to parent — parent reappears with its original status
- [x] Clicking "Merge" when a sibling is searching shows error toast
- [x] Clicking Web Scraping "Run" shows "Coming soon" toast
- [x] No auto-action on cell click — clicking the cell rectangle itself does nothing
- [x] Existing discovery panel, grid stats, and query editing still work correctly
