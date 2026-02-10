import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const mutationSource = fs.readFileSync("convex/emailTemplates.ts", "utf8")
const componentSource = fs.readFileSync(
  "src/components/settings/email-templates.tsx",
  "utf8",
)

// --- ensureSeeded mutation ---

test("emailTemplates.ts imports defaultTemplates from seedTemplates", () => {
  assert.match(
    mutationSource,
    /import\s*\{[\s\S]*?defaultTemplates[\s\S]*?\}\s*from\s*"\.\/seeds\/seedTemplates"/,
  )
})

test("exports ensureSeeded as a public mutation", () => {
  assert.match(mutationSource, /export const ensureSeeded = mutation\(\{/)
})

test("ensureSeeded checks for existing templates before inserting", () => {
  assert.match(
    mutationSource,
    /ensureSeeded[\s\S]*?existing\.length > 0/,
  )
})

test("ensureSeeded is idempotent — returns early if templates exist", () => {
  // Should return skipped count when templates already exist
  assert.match(
    mutationSource,
    /ensureSeeded[\s\S]*?return \{ inserted: 0, skipped: existing\.length \}/,
  )
})

test("ensureSeeded inserts all defaultTemplates when table is empty", () => {
  assert.match(
    mutationSource,
    /ensureSeeded[\s\S]*?for \(const template of defaultTemplates\)/,
  )
  assert.match(
    mutationSource,
    /ensureSeeded[\s\S]*?ctx\.db\.insert\("emailTemplates"/,
  )
})

test("ensureSeeded returns inserted and skipped counts", () => {
  assert.match(
    mutationSource,
    /ensureSeeded[\s\S]*?return \{ inserted, skipped: 0 \}/,
  )
})

// --- Component auto-seed integration ---

test("component uses ensureSeeded mutation", () => {
  assert.match(
    componentSource,
    /useMutation\(api\.emailTemplates\.ensureSeeded\)/,
  )
})

test("component calls ensureSeeded when templates list is empty", () => {
  assert.match(componentSource, /templates\.length === 0/)
  assert.match(componentSource, /void ensureSeeded\(\)/)
})

test("component uses ref to prevent duplicate seed calls", () => {
  assert.match(componentSource, /seededRef/)
  assert.match(componentSource, /useRef\(false\)/)
  assert.match(componentSource, /seededRef\.current = true/)
})

test("component triggers seed in useEffect", () => {
  assert.match(componentSource, /useEffect\(/)
  assert.match(
    componentSource,
    /templates !== undefined && templates\.length === 0 && !seededRef\.current/,
  )
})
