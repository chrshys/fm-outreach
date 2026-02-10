import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/new/page.tsx", "utf8")

// SequencePreview component structure
test("SequencePreview accepts templateIds and templates props", () => {
  assert.match(source, /function SequencePreview\(\{/)
  assert.match(source, /templateIds/)
  assert.match(source, /templates/)
})

test("SequencePreview shows step count in description", () => {
  assert.match(source, /templateIds\.length/)
  assert.match(source, /step.*in this sequence/)
})

test("SequencePreview uses expand/collapse with ChevronUp and ChevronDown icons", () => {
  assert.match(source, /ChevronUp/)
  assert.match(source, /ChevronDown/)
})

// Lead selection mode icons
test("cluster mode button uses MapPin icon", () => {
  assert.match(source, /MapPin/)
  assert.match(source, /By Cluster/)
})

test("filter mode button uses Filter icon", () => {
  assert.match(source, /Filter/)
  assert.match(source, /By Filter/)
})

test("manual mode button uses Users icon", () => {
  assert.match(source, /Users/)
  assert.match(source, /Manual/)
})

// Lead count display
test("displays lead count with Users icon in a summary bar", () => {
  assert.match(source, /<Users className="size-4 text-muted-foreground" \/>/)
  assert.match(source, /resolvedLeadCount/)
})

test("lead count uses singular/plural text", () => {
  assert.match(source, /resolvedLeadCount !== 1 \? "s" : ""/)
})

// Manual lead table columns
test("manual lead table includes Name, Type, City, Status columns", () => {
  assert.match(source, /<TableHead>Name<\/TableHead>/)
  assert.match(source, /<TableHead>Type<\/TableHead>/)
  assert.match(source, /<TableHead>City<\/TableHead>/)
  assert.match(source, /<TableHead>Status<\/TableHead>/)
})

test("manual lead table shows empty state when no leads found", () => {
  assert.match(source, /No leads found\./)
})

// Cluster select has placeholder
test("cluster dropdown has Select a cluster placeholder", () => {
  assert.match(source, /Select a cluster/)
})

test("cluster dropdown shows lead count per cluster", () => {
  assert.match(source, /c\.leadCount/)
  assert.match(source, /leads\)/)
})

// Template select shows empty state
test("template select shows message when no templates exist for a step", () => {
  assert.match(source, /No templates for this step/)
})

// Template default indicator
test("template select marks default templates", () => {
  assert.match(source, /t\.isDefault \? " \(Default\)" : ""/)
})

// Step indicator shows check icon for completed steps
test("step indicator shows Check icon for completed steps", () => {
  assert.match(source, /s\.id < step/)
  assert.match(source, /<Check className="size-3\.5" \/>/)
})

// Step indicator shows step number for future steps
test("step indicator shows step number badge for incomplete steps", () => {
  assert.match(source, /place-items-center rounded-full/)
  assert.match(source, /\{s\.id\}/)
})

// Campaign name autoFocus
test("campaign name input has autoFocus", () => {
  assert.match(source, /autoFocus/)
})

// Filter select widths
test("filter selects use consistent width", () => {
  const matches = source.match(/w-\[180px\]/g)
  assert.ok(matches && matches.length >= 3, "Expected at least 3 filter selects with w-[180px]")
})

// handleCreate builds filter args with spread conditionals
test("handleCreate only includes non-all filter values in targetFilter", () => {
  assert.match(source, /filterStatus !== "all" && \{ status: filterStatus \}/)
  assert.match(source, /filterType !== "all" && \{ type: filterType \}/)
  assert.match(source, /filterRegion !== "all" && \{ region: filterRegion \}/)
})

// Max width constraint
test("page uses max-w-3xl width constraint", () => {
  assert.match(source, /max-w-3xl/)
})

// Manual lead table has scrollable container
test("manual lead table has scrollable container with max height", () => {
  assert.match(source, /max-h-\[400px\] overflow-auto/)
})

// Step descriptions
test("step 1 has descriptive help text for campaign naming", () => {
  assert.match(source, /Give this campaign a descriptive name/)
})

test("step 2 has help text about targeting leads", () => {
  assert.match(source, /Choose how to target leads/)
})

test("step 3 has help text about template sequence selection", () => {
  assert.match(source, /Select templates for each step of the email sequence/)
})

test("step 4 has help text about reviewing details", () => {
  assert.match(source, /Review your campaign details before creating the draft/)
})

// Back button disabled on step 1
test("Back button disabled on first step", () => {
  assert.match(source, /disabled=\{step === 1\}/)
})

// Sequence preview only shows when templates are selected
test("SequencePreview only renders when activeTemplateIds has entries", () => {
  assert.match(source, /activeTemplateIds\.length > 0/)
})

// Template downstream clearing: sets empty string for cleared steps
test("clearing a template step sets downstream steps to empty string", () => {
  assert.match(source, /next\[SEQUENCE_STEPS\[i\]\.type\] = ""/)
})

// Campaign name placeholder
test("campaign name input has example placeholder", () => {
  assert.match(source, /Ontario Farm Outreach/)
})
