# Phase 17: Lazy Virtual Cell Activation

Clicking a virtual grid cell in discovery mode immediately persists it to the database, permanently changing its appearance. Accidental clicks mark cells as if action was taken, with no undo. Decouple selection from activation: clicking a virtual cell only selects it visually (blue dashed border, no DB write). Activation happens lazily — only when the user takes a real action (Search, Split) from the panel.

> **Prerequisites:** Phase 16 completed (virtual discovery grid)

## Boundaries

- DO NOT modify `convex/discovery/gridCells.ts` — backend mutations unchanged
- DO NOT change the `activateCell` mutation API — lazy activation reuses it internally
- DO NOT remove `handleActivateCell` from `page.tsx` — it's still used by `handleCellAction` for lazy activation

---

## 1. Add Virtual Cell Selected Style

### Tasks

- [x] In `src/components/map/cell-colors.ts`: export a `VIRTUAL_CELL_SELECTED_STYLE` constant: `{ color: "#2563eb", fillColor: "#9ca3af", fillOpacity: 0.12, weight: 3, dashArray: "6 4" }`. This mirrors the persisted-cell selection pattern (blue border, dashed line) while keeping the gray virtual-cell fill at a slightly elevated opacity to signal selection without looking like a persisted unsearched cell.

### Validation

- [x] `pnpm typecheck` passes

---

## 2. Rewrite VirtualGridCell for Selection-Only Clicks

### Tasks

- [x] In `src/components/map/discovery-grid.tsx`: add `VIRTUAL_CELL_SELECTED_STYLE` to the import from `./cell-colors`.
- [x] In `src/components/map/discovery-grid.tsx`: replace the `VirtualGridCellProps` type. Remove `onActivateCell` and `onCellSelect`. Add `isSelected: boolean` and `onSelectVirtual: (cell: VirtualCell | null) => void`.
- [x] In `src/components/map/discovery-grid.tsx`: rewrite the `VirtualGridCell` function. Remove the `activating` state and the async click handler. The new click handler is a simple toggle: `() => onSelectVirtual(isSelected ? null : cell)`. Use `pathOptions={isSelected ? VIRTUAL_CELL_SELECTED_STYLE : VIRTUAL_CELL_STYLE}` to switch between selected and unselected appearance.
- [x] In `src/components/map/discovery-grid.tsx`: update `DiscoveryGridProps` — replace `onActivateCell: (cell: VirtualCell) => Promise<string>` with `onSelectVirtualCell: (cell: VirtualCell | null) => void`.
- [x] In `src/components/map/discovery-grid.tsx`: update the `DiscoveryGrid` default export — destructure `onSelectVirtualCell` instead of `onActivateCell`. In the render, pass `isSelected={vc.key === selectedCellId}` and `onSelectVirtual={onSelectVirtualCell}` to each `VirtualGridCell`.

### Validation

- [x] `pnpm typecheck` passes
- [x] Clicking a virtual cell shows blue dashed border without any network/DB activity
- [x] Clicking the same virtual cell again deselects it (border disappears)

---

## 3. Update MapContent Props

### Tasks

- [x] In `src/components/map/map-content.tsx`: in `MapContentProps`, replace `onActivateCell?: (cell: VirtualCell) => Promise<string>` with `onSelectVirtualCell?: (cell: VirtualCell | null) => void`. Update the function parameter destructuring accordingly.
- [x] In `src/components/map/map-content.tsx`: in the primary `DiscoveryGrid` invocation (discovery mode pane, z-index 450), replace `onActivateCell={onActivateCell ?? (async () => "")}` with `onSelectVirtualCell={onSelectVirtualCell ?? (() => {})}`.
- [x] In `src/components/map/map-content.tsx`: in the fallback `DiscoveryGrid` invocation (virtual-grid-overlay pane, z-index 350), replace `onActivateCell={async () => ""}` with `onSelectVirtualCell={() => {}}`.

### Validation

- [x] `pnpm typecheck` passes

---

## 4. Add Virtual Cell State and Lazy Activation to Page

### Tasks

- [x] In `src/app/map/page.tsx`: add `import type { VirtualCell } from "@/lib/virtual-grid"`.
- [x] In `src/app/map/page.tsx`: add state: `const [selectedVirtualCell, setSelectedVirtualCell] = useState<VirtualCell | null>(null)`.
- [x] In `src/app/map/page.tsx`: add a `handleSelectVirtualCell` callback: `const handleSelectVirtualCell = useCallback((cell: VirtualCell | null) => { setSelectedVirtualCell(cell); setSelectedCellId(cell ? cell.key : null) }, [])`.
- [x] In `src/app/map/page.tsx`: modify `handleCellSelect` to also clear virtual cell state: add `setSelectedVirtualCell(null)` alongside the existing `setSelectedCellId(cellId)`.
- [x] In `src/app/map/page.tsx`: in the `useEffect` that resets on `globalGridId` change, also call `setSelectedVirtualCell(null)`.
- [x] In `src/app/map/page.tsx`: in the view-mode toggle `onClick`, also call `setSelectedVirtualCell(null)`.
- [x] In `src/app/map/page.tsx`: add lazy activation logic to `handleCellAction`. At the top, after `let cell = cells?.find((c) => c._id === cellId)`: if `!cell && selectedVirtualCell && selectedVirtualCell.key === cellId`, call `const newCellId = await handleActivateCell(selectedVirtualCell)`, then set `setSelectedVirtualCell(null)`, `setSelectedCellId(newCellId)`, reassign `cellId = newCellId`, and construct a synthetic `cell` object with `{ _id: newCellId, swLat/swLng/neLat/neLng from virtual cell, depth: 0, status: "unsearched", boundsKey: selectedVirtualCell.key }`. Wrap in try/catch with `toast.error` on failure. Add `selectedVirtualCell` and `handleActivateCell` to the dependency array.
- [x] In `src/app/map/page.tsx`: update `<MapContent>` props — replace `onActivateCell={viewMode === "discovery" ? handleActivateCell : undefined}` with `onSelectVirtualCell={viewMode === "discovery" ? handleSelectVirtualCell : undefined}`.
- [x] In `src/app/map/page.tsx`: update `<DiscoveryPanel>` props — add `selectedVirtualCell={selectedVirtualCell}`.

### Validation

- [x] `pnpm typecheck` passes
- [x] Clicking a virtual cell selects it visually without writing to the database
- [x] Clicking "Run" (Search) on a selected virtual cell activates it in the DB, then starts discovery
- [x] Clicking "Split" on a selected virtual cell activates it in the DB, then subdivides into 4

---

## 5. Update Discovery Panel for Virtual Cell Display

### Tasks

- [x] In `src/components/map/discovery-panel.tsx`: add `import type { VirtualCell } from "@/lib/virtual-grid"`.
- [x] In `src/components/map/discovery-panel.tsx`: add `selectedVirtualCell?: VirtualCell | null` to `DiscoveryPanelProps`. Update the function destructuring.
- [x] In `src/components/map/discovery-panel.tsx`: modify the `selectedCell` derivation. Rename the current `cells.find(...)` result to `persistedCell`. Then derive: `const selectedCell: CellData | null = persistedCell ?? (selectedVirtualCell ? { _id: selectedVirtualCell.key, swLat: selectedVirtualCell.swLat, swLng: selectedVirtualCell.swLng, neLat: selectedVirtualCell.neLat, neLng: selectedVirtualCell.neLng, depth: 0, status: "unsearched" as const } : null)`. The rest of the JSX uses `selectedCell` unchanged — it shows unsearched status badge, d0 depth, Search/Split buttons enabled, Merge hidden (depth 0).

### Validation

- [x] `pnpm typecheck` passes
- [x] Selecting a virtual cell shows "Selected Cell" section in panel with unsearched status, d0 depth
- [x] Search "Run" buttons and "Split" button are enabled for virtual cells
- [x] "Merge" button is hidden for virtual cells (depth 0)

---

## 6. Update Tests

### Tasks

- [x] Update `tests/virtual-grid-cell.test.mjs`: rewrite for new `VirtualGridCellProps` — test `isSelected` prop, `onSelectVirtual` callback (toggle behavior), no async activation, no `activating` state.
- [x] Update `tests/discovery-grid-component.test.mjs`: change `onActivateCell` references to `onSelectVirtualCell`.
- [x] Update `tests/map-content-discovery-grid-defaults.test.mjs`: change `onActivateCell` references to `onSelectVirtualCell`.
- [x] Update `tests/virtual-grid-props-wiring.test.mjs`: change `onActivateCell` references to `onSelectVirtualCell`.
- [x] Update `tests/map-page-mapcontent-props.test.mjs`: change `onActivateCell` references to `onSelectVirtualCell`.
- [x] Update `tests/map-page-activate-cell.test.mjs`: remove the "does not import VirtualCell" assertion — `page.tsx` now imports `VirtualCell`.
- [x] Update `tests/discovery-wiring.test.mjs`: update the `handleCellAction` dependency array assertion to include `selectedVirtualCell` and `handleActivateCell`.
- [x] Update any other tests that reference `onActivateCell` in component source scanning to use `onSelectVirtualCell`.

### Validation

- [x] `pnpm test` passes with all tests green
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes

---

## 7. End-to-End Validation

- [ ] Click a virtual cell → blue dashed border appears, no DB write (check network tab / Convex dashboard)
- [ ] Click the same virtual cell again → deselects (border disappears)
- [ ] Panel shows "Selected Cell" with unsearched status, d0 depth, Search/Split buttons
- [ ] Click "Run" on Google Places for virtual cell → cell activates in DB then discovery starts
- [ ] Click "Split" on virtual cell → cell activates in DB then subdivides into 4 quadrants
- [ ] Select a virtual cell, then click a persisted cell → virtual selection clears, persisted cell selected
- [ ] Toggle to Clusters mode and back → virtual selection cleared
- [ ] `pnpm typecheck && pnpm test && pnpm lint` all pass
