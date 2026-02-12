import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-filters.tsx", "utf8")
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// --- Component structure ---

test("MapFilters exports MapFilters component, defaultMapFilters, and filterLeads", () => {
  assert.match(source, /export function MapFilters/)
  assert.match(source, /export const defaultMapFilters/)
  assert.match(source, /export function filterLeads/)
})

test("MapFilters exports MapFiltersValue type", () => {
  assert.match(source, /export type MapFiltersValue/)
})

test("MapFiltersValue includes statuses, types, and clusterId fields", () => {
  assert.match(source, /statuses:\s*LeadStatus\[\]/)
  assert.match(source, /types:\s*LeadType\[\]/)
  assert.match(source, /clusterId:\s*string\s*\|\s*"all"/)
})

test("defaultMapFilters has empty statuses, empty types, and clusterId 'all'", () => {
  assert.match(source, /statuses:\s*\[\]/)
  assert.match(source, /types:\s*\[\]/)
  assert.match(source, /clusterId:\s*"all"/)
})

// --- Multi-select popover for Status ---

test("renders Status multi-select with Popover and Checkbox", () => {
  assert.match(source, /from\s+"@\/components\/ui\/popover"/)
  assert.match(source, /from\s+"@\/components\/ui\/checkbox"/)
  assert.match(source, /<MultiSelectPopover/)
})

test("Status multi-select passes LEAD_STATUSES as options", () => {
  assert.match(source, /options=\{LEAD_STATUSES\}/)
  assert.match(source, /selected=\{value\.statuses\}/)
  assert.match(source, /onToggle=\{toggleStatus\}/)
})

test("Status options render color dot from getStatusColor", () => {
  assert.match(source, /getStatusColor\(status\)/)
  assert.match(source, /backgroundColor:\s*getStatusColor\(status\)/)
})

// --- Multi-select popover for Type ---

test("Type multi-select passes LEAD_TYPES as options", () => {
  assert.match(source, /options=\{LEAD_TYPES\}/)
  assert.match(source, /selected=\{value\.types\}/)
  assert.match(source, /onToggle=\{toggleType\}/)
})

// --- Cluster dropdown ---

test("renders Cluster dropdown with shadcn Select", () => {
  assert.match(source, /from\s+"@\/components\/ui\/select"/)
  assert.match(source, /<Select/)
  assert.match(source, /All Clusters/)
})

test("Cluster select maps over clusters prop", () => {
  assert.match(source, /clusters\.map\(\(cluster\)/)
  assert.match(source, /value=\{cluster\.id\}/)
  assert.match(source, /\{cluster\.name\}/)
})

// --- Overlay panel positioning ---

test("MapFilters renders as absolute-positioned overlay panel", () => {
  assert.match(source, /absolute/)
  assert.match(source, /z-10/)
})

test("panel has solid bg-card background", () => {
  assert.match(source, /bg-card/)
})

// --- Active filter badges ---

test("renders active filter badges with dismiss buttons", () => {
  assert.match(source, /from\s+"@\/components\/ui\/badge"/)
  assert.match(source, /activeFilters\.map\(\(filter\)/)
  assert.match(source, /aria-label=\{`Clear \$\{filter\.label\}`\}/)
})

// --- Collapse/expand ---

test("panel can collapse to a filter button", () => {
  assert.match(source, /aria-label="Close filters"/)
  assert.match(source, /setOpen\(false\)/)
  assert.match(source, /setOpen\(true\)/)
})

// --- filterLeads function ---

test("filterLeads returns all leads when no filters are set", () => {
  assert.match(source, /export function filterLeads/)
  assert.match(source, /filters\.statuses\.length\s*>\s*0/)
  assert.match(source, /filters\.types\.length\s*>\s*0/)
  assert.match(source, /filters\.clusterId\s*!==\s*"all"/)
})

test("filterLeads checks status inclusion", () => {
  assert.match(source, /filters\.statuses\.includes\(lead\.status/)
})

test("filterLeads checks type inclusion", () => {
  assert.match(source, /filters\.types\.includes\(lead\.type/)
})

test("filterLeads checks clusterId match", () => {
  assert.match(source, /lead\.clusterId\s*!==\s*filters\.clusterId/)
})

// --- Imports ---

test("imports LEAD_STATUSES and LEAD_TYPES from lead-filters", () => {
  assert.match(source, /import\s+\{.*LEAD_STATUSES.*\}\s+from\s+"@\/components\/leads\/lead-filters"/)
  assert.match(source, /import\s+\{.*LEAD_TYPES.*\}\s+from\s+"@\/components\/leads\/lead-filters"/)
})

test("imports getStatusColor from status-colors", () => {
  assert.match(source, /import\s+\{.*getStatusColor.*\}\s+from\s+["']\.\/status-colors["']/)
})

// --- Map page integration ---

test("map page imports MapFilters and filterLeads", () => {
  assert.match(pageSource, /import\s+\{[^}]*MapFilters[^}]*\}\s+from\s+"@\/components\/map\/map-filters"/)
  assert.match(pageSource, /import\s+\{[^}]*filterLeads[^}]*\}\s+from\s+"@\/components\/map\/map-filters"/)
})

test("map page queries clusters from convex", () => {
  assert.match(pageSource, /useQuery\(api\.clusters\.list\)/)
})

test("map page uses zustand store for filter state", () => {
  assert.match(pageSource, /useMapStore\(\(s\)\s*=>\s*s\.filters\)/)
})

test("map page computes filteredLeads with useMemo", () => {
  assert.match(pageSource, /const\s+filteredLeads\s*=\s*useMemo\(/)
  assert.match(pageSource, /filterLeads[^(]*\([^,]*leads\s*\?\?\s*\[\][^,]*,\s*filters\)/)
})

test("map page passes filteredLeads to MapContent", () => {
  assert.match(pageSource, /<MapContent\s+leads=\{filteredLeads\}/)
})

test("map page renders MapFilters with value, onChange, and clusters props", () => {
  assert.match(pageSource, /<MapFilters/)
  assert.match(pageSource, /value=\{filters\}/)
  assert.match(pageSource, /onChange=\{setFilters\}/)
  assert.match(pageSource, /clusters=\{clusterOptions\}/)
})

test("map page wraps content in relative container for overlay positioning", () => {
  assert.match(pageSource, /relative/)
})
