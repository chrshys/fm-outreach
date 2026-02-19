import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")
const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")

// ============================================================
// Public query getLeadIdsForEnrichment exists in gridCells.ts
// ============================================================

test("gridCells exports a public getLeadIdsForEnrichment query", () => {
  assert.match(
    gridCellsSource,
    /export const getLeadIdsForEnrichment = query\(/,
    "Should export getLeadIdsForEnrichment as a public query",
  )
})

test("getLeadIdsForEnrichment accepts cellId arg", () => {
  const fnStart = gridCellsSource.indexOf("export const getLeadIdsForEnrichment = query(")
  const fnBody = gridCellsSource.slice(fnStart, fnStart + 500)
  assert.match(fnBody, /cellId:\s*v\.id\("discoveryCells"\)/)
})

test("getLeadIdsForEnrichment filters by 30-day enrichment cooldown", () => {
  const fnStart = gridCellsSource.indexOf("export const getLeadIdsForEnrichment = query(")
  const fnBody = gridCellsSource.slice(fnStart, fnStart + 600)
  assert.match(fnBody, /thirtyDaysMs/)
  assert.match(fnBody, /enrichedAt/)
})

// ============================================================
// Discovery panel subscribes to getLeadIdsForEnrichment
// ============================================================

test("discovery panel calls useQuery with api.discovery.gridCells.getLeadIdsForEnrichment", () => {
  assert.match(
    panelSource,
    /useQuery\(\s*api\.discovery\.gridCells\.getLeadIdsForEnrichment/,
    "Should subscribe to getLeadIdsForEnrichment query",
  )
})

test("cellLeadIdsForEnrichment query is skipped when no persistedCell", () => {
  assert.match(
    panelSource,
    /const cellLeadIdsForEnrichment = useQuery\(/,
    "Should define cellLeadIdsForEnrichment from useQuery",
  )
  // The query uses "skip" when persistedCell is falsy
  const queryStart = panelSource.indexOf("const cellLeadIdsForEnrichment = useQuery(")
  const queryBlock = panelSource.slice(queryStart, queryStart + 200)
  assert.ok(queryBlock.includes('"skip"'), "Should skip query when no persistedCell")
})

// ============================================================
// Lead IDs set BEFORE await enrichCellLeads (progress bar appears immediately)
// ============================================================

test("setEnrichingLeadIds is called BEFORE await enrichCellLeads", () => {
  const fnStart = panelSource.indexOf("const handleEnrichCell")
  const fnBody = panelSource.slice(fnStart, panelSource.indexOf("}, [persistedCell", fnStart))

  const setLeadIdsIdx = fnBody.indexOf("setEnrichingLeadIds(cellLeadIdsForEnrichment)")
  const awaitEnrichIdx = fnBody.indexOf("await enrichCellLeads(")

  assert.ok(setLeadIdsIdx !== -1, "Should find setEnrichingLeadIds call")
  assert.ok(awaitEnrichIdx !== -1, "Should find await enrichCellLeads call")
  assert.ok(
    setLeadIdsIdx < awaitEnrichIdx,
    "setEnrichingLeadIds must be called BEFORE await enrichCellLeads so progress bar appears immediately",
  )
})

test("toast.info is called BEFORE await enrichCellLeads", () => {
  const fnStart = panelSource.indexOf("const handleEnrichCell")
  const fnBody = panelSource.slice(fnStart, panelSource.indexOf("}, [persistedCell", fnStart))

  const toastIdx = fnBody.indexOf('toast.info("Enriching leads in cell...")')
  const awaitEnrichIdx = fnBody.indexOf("await enrichCellLeads(")

  assert.ok(toastIdx !== -1, "Should find toast.info call")
  assert.ok(awaitEnrichIdx !== -1, "Should find await enrichCellLeads call")
  assert.ok(
    toastIdx < awaitEnrichIdx,
    "toast.info must be called BEFORE await enrichCellLeads",
  )
})

test("setIsEnriching(true) is called BEFORE await enrichCellLeads", () => {
  const fnStart = panelSource.indexOf("const handleEnrichCell")
  const fnBody = panelSource.slice(fnStart, panelSource.indexOf("}, [persistedCell", fnStart))

  const setEnrichingIdx = fnBody.indexOf("setIsEnriching(true)")
  const awaitEnrichIdx = fnBody.indexOf("await enrichCellLeads(")

  assert.ok(setEnrichingIdx !== -1, "Should find setIsEnriching(true) call")
  assert.ok(awaitEnrichIdx !== -1, "Should find await enrichCellLeads call")
  assert.ok(
    setEnrichingIdx < awaitEnrichIdx,
    "setIsEnriching(true) must be called BEFORE await enrichCellLeads",
  )
})
