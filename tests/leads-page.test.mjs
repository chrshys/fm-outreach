import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/leads/page.tsx", "utf8")

test("wraps the leads page content with AppLayout", () => {
  assert.match(source, /import\s+\{\s*AppLayout\s*\}\s+from\s+"@\/components\/layout\/app-layout"/)
  assert.match(source, /<AppLayout>[\s\S]*<\/AppLayout>/)
})

test("loads leads from Convex and paginates until cursor is exhausted", () => {
  assert.match(source, /import\s+\{[^}]*useConvex[^}]*\}\s+from\s+"convex\/react"/)
  assert.match(source, /const\s+convex\s*=\s*useConvex\(\)/)
  assert.match(source, /await\s+convex\.query\(api\.leads\.list,\s*\{[\s\S]*cursor,[\s\S]*\}\)/)
  assert.match(source, /loadedLeads\.push\(\.\.\.result\.leads\)/)
  assert.match(source, /if\s*\(result\.cursor\s*===\s*null\)\s*\{\s*break\s*\}/)
})

test("renders the leads data table columns", () => {
  assert.match(source, /<h2[^>]*>Leads<\/h2>/)
  for (const column of [
    "Type",
    "Contact Email",
    "Last Activity",
    "Follow-up Due",
  ]) {
    assert.match(source, new RegExp(`<TableHead>${column}<\\/TableHead>`))
  }

  assert.match(source, /TableHead[^>]*>FB<\/TableHead>/)
  assert.match(source, /TableHead[^>]*>IG<\/TableHead>/)

  for (const sortableColumn of ["Name", "City", "Status"]) {
    assert.match(source, new RegExp(`>\\s*${sortableColumn}\\s*<`))
  }
})

test("supports sorting by name, city, and status and passes sort args to list query", () => {
  assert.match(source, /import\s+\{[^}]*LeadSortField[^}]*\}\s+from\s+"@\/lib\/leads-store"/)
  assert.match(source, /const sortBy = useLeadsStore/)
  assert.match(source, /const sortOrder = useLeadsStore/)
  assert.match(source, /sortBy,/)
  assert.match(source, /sortOrder,/)
  assert.match(source, /if \(sortBy === field\) \{\s*setSortOrder\(sortOrder === "asc" \? "desc" : "asc"\)/s)
  assert.match(source, /setSortBy\(field\)/)
  assert.match(source, /setSortOrder\("asc"\)/)
  assert.match(source, /onClick=\{\(\) => toggleSort\("name"\)\}/)
  assert.match(source, /onClick=\{\(\) => toggleSort\("city"\)\}/)
  assert.match(source, /onClick=\{\(\) => toggleSort\("status"\)\}/)
  assert.match(source, /aria-label="Sort by name"/)
  assert.match(source, /aria-label="Sort by city"/)
  assert.match(source, /aria-label="Sort by status"/)
})

test("passes status, type, and hasEmail filters to the leads list query", () => {
  assert.match(source, /status:\s*filters\.status === "all" \? undefined : filters\.status/)
  assert.match(source, /type:\s*filters\.type === "all" \? undefined : filters\.type/)
  assert.match(source, /hasEmail:\s*filters\.hasEmail \? true : undefined/)
})

test("includes loading/empty states, checkbox, status badge, and social indicator badges", () => {
  assert.match(source, /Loading leads\.\.\./)
  assert.match(source, /No leads match the selected filters\./)
  assert.match(source, /import\s+\{\s*Checkbox\s*\}\s+from\s+"@\/components\/ui\/checkbox"/)
  assert.match(source, /import\s+\{\s*Badge\s*\}\s+from\s+"@\/components\/ui\/badge"/)
  assert.match(source, /Select all leads/)
  assert.match(source, /social\.facebook \? <Badge/)
  assert.match(source, /social\.instagram \? <Badge/)
  assert.match(source, /Overdue/)
})

test("renders lead search above filters and filters by name and city", () => {
  assert.match(source, /import\s+\{\s*LeadSearch\s*\}\s+from\s+"@\/components\/leads\/lead-search"/)
  assert.match(source, /<LeadSearch\s+value=\{searchTerm\}\s+onChange=\{setSearchTerm\}\s*\/>/)
  assert.match(source, /<LeadSearch[\s\S]*<LeadFilters/)
  assert.match(source, /lead\.name\.toLowerCase\(\)\.includes\(normalizedSearch\)/)
  assert.match(source, /lead\.city\.toLowerCase\(\)\.includes\(normalizedSearch\)/)
})

test("navigates to lead detail when a row is clicked", () => {
  assert.match(source, /import\s+\{\s*useRouter\s*\}\s+from\s+"next\/navigation"/)
  assert.match(source, /router\.push\(`\/leads\/\$\{leadId\}`\)/)
  assert.match(source, /function isInteractiveTarget\(target: EventTarget \| null\)/)
  assert.match(source, /target\.closest\("button, a, input, textarea, select, \[role='checkbox'\]"\)/)
  assert.match(source, /function handleRowClick\(event: MouseEvent<HTMLTableRowElement>, leadId: string\)/)
  assert.match(source, /function handleRowKeyDown\(event: KeyboardEvent<HTMLTableRowElement>, leadId: string\)/)
  assert.match(source, /onClick=\{\(event\) => handleRowClick\(event, lead\._id\)\}/)
  assert.match(source, /onKeyDown=\{\(event\) => handleRowKeyDown\(event, lead\._id\)\}/)
})
