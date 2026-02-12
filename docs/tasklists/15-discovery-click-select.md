# Phase 15: Replace Hover Tooltips with Click-to-Select + Sidebar Actions

The hover-tooltip interaction model on discovery grid cells is unreliable — Leaflet interactive tooltips over map overlays require fragile CSS bridge hacks, delayed close timers, and pointer-event toggling that break across browsers and zoom levels. Replace with a click-to-select model: clicking a cell highlights it on the map and the discovery panel sidebar shows that cell's details and action buttons (Search, Split, Merge).

> **Prerequisites:** Phase 14 completed (hover card actions, undivide mutation, relaxed status guards)

## Boundaries

- DO NOT modify any backend/Convex files — this is purely a frontend interaction model change
- DO NOT add multi-select — single cell selection only
- DO NOT add click-on-empty-map-to-deselect — users click the same cell again to deselect
- DO NOT change the `CellAction` type or `getAvailableActions` helper — they stay as-is
- DO NOT modify `cell-colors.ts` — it's still used for rectangle styling

## Tasks

### Strip Tooltip from Discovery Grid

- [x] In `src/components/map/discovery-grid.tsx`: remove the `CellTooltipContent` component (lines 73-151), the `TOOLTIP_CLOSE_DELAY` constant (line 154), and the entire current `DiscoveryGridCell` component (lines 156-251). Remove unused imports: `useCallback`, `useEffect`, `useRef`, `useState` from react, `Tooltip` and `useMap` from react-leaflet, `L` from leaflet, `Play`, `Grid2x2Plus`, `Minimize2` from lucide-react. Keep imports: `Rectangle` from react-leaflet, `getCellColor` from `./cell-colors`, `CellStatus` type from `./cell-colors`.
- [x] In `src/components/map/discovery-grid.tsx`: export the three previously-private helpers so the discovery panel can import them. Change `const MAX_DEPTH = 4` to `export const MAX_DEPTH = 4`. Change `function formatShortDate` to `export function formatShortDate`. Change `function getStatusBadgeColor` to `export function getStatusBadgeColor`.
- [x] In `src/components/map/discovery-grid.tsx`: change the `DiscoveryGridProps` type from `{ cells: CellData[], onCellAction: (cellId: string, action: CellAction) => void }` to `{ cells: CellData[], selectedCellId: string | null, onCellSelect: (cellId: string | null) => void }`.
- [x] In `src/components/map/discovery-grid.tsx`: create a new simplified `DiscoveryGridCell` component. Props: `{ cell: CellData, isSelected: boolean, onCellSelect: (cellId: string | null) => void }`. It renders a single `<Rectangle>` with: bounds from cell coords, `pathOptions` from `getCellColor(cell.status)` but when `isSelected` override with `{ ...basePathOptions, weight: 3, dashArray: "6 4", color: "#2563eb", fillOpacity: (basePathOptions.fillOpacity ?? 0.15) + 0.1 }`, and a click event handler that calls `onCellSelect(isSelected ? null : cell._id)` (toggle selection). No Tooltip, no hover handlers, no refs, no timers.
- [x] In `src/components/map/discovery-grid.tsx`: update the default export `DiscoveryGrid` component to accept the new props `{ cells, selectedCellId, onCellSelect }` and render `DiscoveryGridCell` for each cell passing `isSelected={cell._id === selectedCellId}` and `onCellSelect`.

### Validation
- [x] `pnpm typecheck` passes
- [x] `discovery-grid.tsx` has no `Tooltip` import, no `CellTooltipContent`, no `TOOLTIP_CLOSE_DELAY`, no `useMap`, no leaflet `L` import
- [x] `discovery-grid.tsx` exports: `CellAction`, `CellData`, `DISCOVERY_MECHANISMS`, `MAX_DEPTH`, `getAvailableActions`, `formatShortDate`, `getStatusBadgeColor`, default `DiscoveryGrid`

### Update Map Content Props

- [x] In `src/components/map/map-content.tsx`: replace the `onCellAction?: (cellId: string, action: CellAction) => void` prop with two new props: `selectedCellId?: string | null` and `onCellSelect?: (cellId: string | null) => void`. Remove the `CellAction` import from `./discovery-grid` (keep `CellData` import). Update the `MapContentProps` type accordingly.
- [x] In `src/components/map/map-content.tsx`: update the DiscoveryGrid conditional render — change `{gridCells && onCellAction && (` to `{gridCells && onCellSelect && (`. Pass the new props to `<DiscoveryGrid>`: `cells={gridCells}`, `selectedCellId={selectedCellId ?? null}`, `onCellSelect={onCellSelect}`.
- [x] In `src/components/map/map-content.tsx`: update the default export function signature to destructure the new props `selectedCellId` and `onCellSelect` instead of `onCellAction`.

### Validation
- [x] `pnpm typecheck` passes

### Add Selection State to Map Page

- [x] In `src/app/map/page.tsx`: add `const [selectedCellId, setSelectedCellId] = useState<string | null>(null)` state alongside the existing `selectedGridId` state.
- [x] In `src/app/map/page.tsx`: add a `handleCellSelect` callback: `const handleCellSelect = useCallback((cellId: string | null) => { setSelectedCellId(cellId) }, [])`.
- [x] In `src/app/map/page.tsx`: clear selection when switching grids — add a `useEffect` that calls `setSelectedCellId(null)` when `selectedGridId` changes: `useEffect(() => { setSelectedCellId(null) }, [selectedGridId])`.
- [x] In `src/app/map/page.tsx`: clear selection when switching view modes — in the view mode toggle button's `onClick` handler (line 248-253), add `setSelectedCellId(null)` after the existing cleanup calls.
- [x] In `src/app/map/page.tsx`: clear selection after subdivide and undivide — in the `handleCellAction` callback, add `setSelectedCellId(null)` after each successful `subdivideCell` call (after the success toast) and after each successful `undivideCell` call (after the success toast).
- [x] In `src/app/map/page.tsx`: update the `<MapContent>` props — replace `onCellAction={viewMode === "discovery" ? handleCellAction : undefined}` with `selectedCellId={viewMode === "discovery" ? selectedCellId : null}` and `onCellSelect={viewMode === "discovery" ? handleCellSelect : undefined}`.
- [x] In `src/app/map/page.tsx`: update the `<DiscoveryPanel>` usage — add three new props: `cells={viewMode === "discovery" ? gridCells ?? [] : []}`, `selectedCellId={selectedCellId}`, `onCellAction={handleCellAction}`.

### Validation
- [x] `pnpm typecheck` passes

### Add Selected Cell Section to Discovery Panel

- [x] In `src/components/map/discovery-panel.tsx`: add new imports — `Play`, `Grid2x2Plus`, `Minimize2` from `lucide-react`; `CellData`, `CellAction`, `DISCOVERY_MECHANISMS`, `MAX_DEPTH`, `getStatusBadgeColor`, `formatShortDate` from `./discovery-grid`.
- [x] In `src/components/map/discovery-panel.tsx`: extend the `DiscoveryPanelProps` type with three new fields: `cells: CellData[]`, `selectedCellId: string | null`, `onCellAction: (cellId: string, action: CellAction) => void`. Update the function signature to destructure these new props.
- [x] In `src/components/map/discovery-panel.tsx`: derive the selected cell from props at the top of the component body: `const selectedCell = cells.find((c) => c._id === selectedCellId) ?? null`.
- [x] In `src/components/map/discovery-panel.tsx`: add a "Selected Cell" section between the Progress Stats section and the Search Queries section (after the closing `</>` of the Progress Stats conditional block, before the `{/* Search Queries */}` comment). Only render when `selectedCell && !showNewGridForm`. Wrap in `<>` with a `<Separator />`. Layout: (1) `Label` showing "Selected Cell" in `text-xs text-muted-foreground`, (2) status row with status badge (using `getStatusBadgeColor`), result count if not unsearched, and depth indicator aligned right, (3) mechanism rows — for each item in `DISCOVERY_MECHANISMS`, show label, last-run date (using `formatShortDate` for google_places with `selectedCell.lastSearchedAt`, "—" otherwise), and a small Run button with Play icon that calls `onCellAction(selectedCell._id, { type: "search", mechanism: mechanism.id })`. Disable button if `!mechanism.enabled` or `selectedCell.status === "searching"`. Apply `opacity-50` to disabled mechanisms row. (4) Split/Merge row — Split button (Grid2x2Plus icon + "Split") calls `onCellAction(selectedCell._id, { type: "subdivide" })`, disabled if `selectedCell.depth >= MAX_DEPTH` or searching. Merge button (Minimize2 icon + "Merge") only shown if `selectedCell.depth > 0`, calls `onCellAction(selectedCell._id, { type: "undivide" })`, disabled if searching. (5) If `selectedCell.querySaturation` exists and has entries, show per-query saturation list with query name and count.
- [x] Style all buttons in the selected cell section consistently: `inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs hover:bg-accent transition-colors`. Disabled buttons get `opacity-50 cursor-not-allowed`. Use `e.stopPropagation()` is NOT needed here (sidebar, not map overlay).

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes

### Remove Tooltip CSS

- [x] In `src/app/globals.css`: delete the tooltip bridge CSS block (lines 128-143) — the comment starting with `/* Leaflet tooltip: enlarge the invisible bridge...` through the closing `}` of `.leaflet-tooltip-top::before`.

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] Clicking a cell on the map highlights it with a blue dashed border
- [x] Discovery panel shows selected cell details with Run/Split/Merge buttons
- [x] Clicking Run on Google Places triggers discovery (cell turns blue)
- [x] Clicking Split subdivides the cell, selection clears
- [x] Clicking Merge collapses siblings, selection clears
- [x] Clicking the same cell again deselects it
- [x] Switching grids clears selection
- [x] Switching to Clusters mode and back clears selection

### Delete Obsolete Tooltip Tests

- [x] Delete the following 6 test files that test tooltip-specific behavior no longer present: `tests/discovery-grid-tooltip.test.mjs`, `tests/discovery-grid-tooltip-delayed-close.test.mjs`, `tests/discovery-grid-tooltip-hover.test.mjs`, `tests/discovery-grid-tooltip-clickable.test.mjs`, `tests/discovery-grid-tooltip-styling.test.mjs`, `tests/discovery-grid-no-cell-click-action.test.mjs`.

### Update Remaining Tests

- [x] In `tests/discovery-grid-component.test.mjs`: remove any assertions about `Tooltip` import, `CellTooltipContent`, `mouseover`/`mouseout` handlers, `interactive` prop, or tooltip className. Add assertions that: (1) the component imports `Rectangle` from `react-leaflet`, (2) the props type includes `selectedCellId` and `onCellSelect`, (3) there is a click event handler on the Rectangle, (4) there is NO `Tooltip` import from `react-leaflet`.
- [x] In `tests/discovery-grid-cell-action.test.mjs`: update any assertions that reference `onCellAction` as a prop of `DiscoveryGrid` or `MapContent` — `DiscoveryGrid` now uses `onCellSelect`, and `MapContent` now uses `selectedCellId` + `onCellSelect`. The `CellAction` type itself is unchanged. The page handler (`handleCellAction`) is unchanged — just verify it still exists in `page.tsx`.
- [x] In `tests/discovery-grid-searching-buttons.test.mjs`: if this file asserts that Split/Merge buttons exist inside `CellTooltipContent` or `discovery-grid.tsx`, retarget those assertions to check `discovery-panel.tsx` instead. The `getAvailableActions` tests should remain unchanged.
- [x] In `tests/discovery-grid-split-button-max-depth.test.mjs`: retarget assertions from tooltip/`CellTooltipContent` in `discovery-grid.tsx` to the selected cell section in `discovery-panel.tsx`. The logic is the same (disabled when `depth >= MAX_DEPTH`), just lives in the panel now.
- [x] In `tests/discovery-grid-merge-button-root-cells.test.mjs`: retarget assertions from tooltip in `discovery-grid.tsx` to the selected cell section in `discovery-panel.tsx`. The logic is the same (hidden when no `parentCellId` / `depth === 0`), just lives in the panel now.
- [x] In `tests/discovery-grid-web-scraping-disabled.test.mjs`: retarget any assertions about disabled button styling from `discovery-grid.tsx` to `discovery-panel.tsx`. The `DISCOVERY_MECHANISMS` constant assertions should stay pointed at `discovery-grid.tsx` since it's still defined there.
- [x] In `tests/discovery-grid-web-scraping-coming-soon.test.mjs`: update any assertions that reference tooltip button dispatch to instead verify the panel dispatches `onCellAction`. The page handler "Coming soon" toast test should remain unchanged.

### Validation
- [x] `pnpm test` passes — all discovery tests green
- [x] No test file references `CellTooltipContent`, `TOOLTIP_CLOSE_DELAY`, or `tooltip-hover`
