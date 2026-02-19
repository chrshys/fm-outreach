# Per-Cell Progress in Discovery Panel

When a cell is selected on the map, the Progress section should show that cell's stats instead of the grid-level aggregate.

## Boundaries
- DO NOT modify the Selected Cell section layout (action buttons, split/merge, query saturation display)
- DO NOT change grid-level progress behavior when no cell is selected
- DO NOT add new Convex queries — reuse existing `listCells` projection

## Tasks

### 1. Schema & Backend

- [x] Add `leadsFound: v.optional(v.number())` to `discoveryCells` table in `convex/schema.ts`
- [x] In `convex/discovery/gridCells.ts` `updateCellSearchResult` mutation (~line 443), add `leadsFound: args.newLeadsCount` to the `ctx.db.patch(args.cellId, {...})` call so each cell tracks its own lead count
- [x] In `convex/discovery/gridCells.ts` `listCells` query (~line 240), add `leadsFound: cell.leadsFound` to the returned cell projection

### 2. Frontend Types

- [x] Add `leadsFound?: number` to the `CellData` type in `src/components/map/discovery-grid-shared.ts`

### 3. Discovery Panel UI

- [x] In `src/components/map/discovery-panel.tsx`, make the Progress section (lines 271-317) contextual: when `selectedCell` exists and has been searched (`status !== "unsearched"`), show cell-level stats (status, result count, leads found) instead of grid-level stats. When no cell is selected or cell is unsearched, show grid-level stats as today. Use label "Cell Progress" vs "Grid Progress" to indicate scope.

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `node --test tests/` passes (update pattern-matching tests if needed)
- [x] Selecting a searched cell shows per-cell stats in the Progress section
- [x] Deselecting the cell reverts to grid-level aggregate stats
