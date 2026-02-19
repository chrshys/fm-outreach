# Enrich Leads by Cell from Discovery Panel

Add an "Enrich" button to the discovery panel so leads can be enriched directly from the map without leaving the discovery view. Today this requires navigating to leads, creating a cluster, filtering, selecting, and enriching — all of which breaks flow.

Reuse existing infrastructure:
- `batchEnrichLeads` internal action (`convex/enrichment/batchEnrich.ts`) — processes up to 25 leads with 1s throttle, unchanged
- `batchEnrich` public action (`convex/enrichment/batchEnrichPublic.ts`) — thin wrapper, unchanged
- `EnrichmentProgress` component (`src/components/leads/enrichment-progress.tsx`) — tracks progress via activities, needs `leadIds` + `since`, unchanged
- Toast pattern from `src/components/leads/bulk-actions.tsx` — same UX for success/failure/skipped counts

## Boundaries
- DO NOT modify the enrichment pipeline itself (`convex/enrichment/orchestrator.ts`)
- DO NOT modify `batchEnrichLeads` or its internal throttle/batch logic
- DO NOT modify the `EnrichmentProgress` component — reuse as-is
- DO NOT add new npm dependencies

---

## 1. Add `getCellLeadIdsForEnrichment` Internal Query

New internal query that returns lead IDs for a cell, filtered to only those needing enrichment (no `enrichedAt`, or `enrichedAt` older than 30 days). This runs server-side so the action can fetch IDs without a round-trip to the client.

### Tasks
- [x] In `convex/discovery/gridCells.ts`, add a new `internalQuery` called `getCellLeadIdsForEnrichment` with args `{ cellId: v.id("discoveryCells") }`. The handler should: (a) query leads using `withIndex("by_discoveryCellId", q => q.eq("discoveryCellId", args.cellId))` and `.collect()`, (b) filter to leads where `enrichedAt` is undefined OR `enrichedAt` is older than 30 days (`Date.now() - lead.enrichedAt > 30 * 24 * 60 * 60 * 1000`), (c) return an array of just the `_id` values. Import `internalQuery` from `../_generated/server` if not already imported.

### Validation
- [x] `pnpm typecheck` passes

---

## 2. Add `enrichCellLeads` Public Action

New public action that takes a cell ID, resolves the unenriched lead IDs server-side, chunks them into batches of 25, and calls the existing `batchEnrichLeads` for each chunk sequentially. Returns combined results plus the lead IDs that were processed (so the UI can track progress).

### Tasks
- [x] In `convex/enrichment/batchEnrichPublic.ts`, add a new exported `action` called `enrichCellLeads` with args `{ cellId: v.id("discoveryCells") }`. The handler should: (a) call `ctx.runQuery(internal.discovery.gridCells.getCellLeadIdsForEnrichment, { cellId: args.cellId })` to get unenriched lead IDs, (b) if the array is empty, return `{ leadIds: [], total: 0, succeeded: 0, failed: 0, skipped: 0 }`, (c) chunk the IDs into batches of 25, (d) for each chunk call `ctx.runAction(internal.enrichment.batchEnrich.batchEnrichLeads, { leadIds: chunk })`, (e) aggregate the results across all chunks (sum `succeeded`, `failed`, `skipped`), (f) return `{ leadIds: allLeadIds, total, succeeded, failed, skipped }`. Make sure to import `internal` from `../_generated/api` and the `v` validator for `cellId`.

### Validation
- [x] `pnpm typecheck` passes

---

## 3. Add "Enrich" Button to Discovery Panel

Add an "Enrich All" button in the Selected Cell section of the discovery panel, below the Split/Merge buttons. Follow the same pattern as `src/components/leads/bulk-actions.tsx` for state management and toast messages.

### Tasks
- [x] In `src/components/map/discovery-panel.tsx`, add imports: `useAction` from `convex/react`, `Sparkles` from `lucide-react`, `EnrichmentProgress` from `@/components/leads/enrichment-progress`
- [x] In the `DiscoveryPanel` component, add local state: `const [isEnriching, setIsEnriching] = useState(false)`, `const [enrichingLeadIds, setEnrichingLeadIds] = useState<Id<"leads">[]>([])`, `const enrichmentSinceRef = useRef(0)`. Also add: `const enrichCellLeads = useAction(api.enrichment.batchEnrichPublic.enrichCellLeads)`
- [x] Add a `handleEnrichCell` async function that: (a) sets `isEnriching(true)` and `enrichmentSinceRef.current = Date.now()`, (b) shows `toast.info(\`Enriching leads in cell...\`)`, (c) calls `enrichCellLeads({ cellId: persistedCell._id as Id<"discoveryCells"> })`, (d) on the result, sets `enrichingLeadIds` from the returned `leadIds`, (e) shows a success or warning toast with succeeded/failed/skipped counts (same format as `bulk-actions.tsx` lines 97-101), (f) in the `finally` block sets `isEnriching(false)` and clears `enrichingLeadIds` after a short delay (e.g. 2 seconds, so the progress bar can show 100% briefly before disappearing)
- [x] In the "Selected Cell" section (~line 467, after the Split/Merge buttons div), add a new row with an "Enrich" button. Use the same inline button styling as the Split/Merge buttons: `inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-colors hover:bg-accent`. Add the `Sparkles` icon (`size-3`). Disable the button when: `isEnriching`, or `!persistedCell` (virtual cells can't be enriched), or `(cellLeadStats?.total ?? 0) === 0` (no leads to enrich). Show "Enriching..." text when `isEnriching`, otherwise "Enrich".
- [x] Below the enrich button, conditionally render `<EnrichmentProgress leadIds={enrichingLeadIds} since={enrichmentSinceRef.current} />` when `isEnriching && enrichingLeadIds.length > 0`. The component will auto-hide when all leads are done (it returns null when `completed >= total`).

### Validation
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `node --test tests/` passes (update pattern-matching tests if they reference the Selected Cell section structure)
- [x] Select a discovered cell with leads → "Enrich" button is visible and enabled
- [x] Select an unsearched/virtual cell → "Enrich" button is not shown (no persistedCell)
- [x] Select a cell with 0 leads → "Enrich" button is disabled
- [x] Click "Enrich" → toast shows "Enriching leads in cell...", button shows "Enriching...", progress bar appears
- [x] On completion → toast shows succeeded/failed/skipped counts, cell stats update reactively
- [x] While enrichment is running → button is disabled, cannot double-trigger
