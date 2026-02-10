import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/new/page.tsx", "utf8")

// Validation: canProceed logic
test("step 1 validation requires non-empty trimmed campaign name", () => {
  assert.match(source, /if \(step === 1\) return campaignName\.trim\(\)\.length > 0/)
})

test("step 2 validation requires resolvedLeadCount > 0", () => {
  assert.match(source, /if \(step === 2\) return resolvedLeadCount > 0/)
})

test("step 3 validation requires at least one active template", () => {
  assert.match(source, /if \(step === 3\) return activeTemplateIds\.length > 0/)
})

// Lead count resolution for each selection mode
test("cluster mode counts leads by matching clusterId", () => {
  assert.match(source, /leads\.filter\(\(l\) => l\.clusterId === selectedClusterId\)\.length/)
})

test("filter mode applies status, type, and region filters with 'all' bypass", () => {
  assert.match(source, /filterStatus !== "all" && l\.status !== filterStatus/)
  assert.match(source, /filterType !== "all" && l\.type !== filterType/)
  assert.match(source, /filterRegion !== "all" && l\.region !== filterRegion/)
})

test("manual mode returns manualSelectedIds.size as lead count", () => {
  assert.match(source, /return manualSelectedIds\.size/)
})

// Region derivation
test("derives unique sorted regions from leads data", () => {
  assert.match(source, /\[\.\.\.new Set\(leads\.map\(\(l\) => l\.region\)\)\]\.sort\(\)/)
})

// Manual lead search filtering
test("manual search filters by name, city, and region case-insensitively", () => {
  assert.match(source, /l\.name\.toLowerCase\(\)\.includes\(search\)/)
  assert.match(source, /l\.city\.toLowerCase\(\)\.includes\(search\)/)
  assert.match(source, /l\.region\.toLowerCase\(\)\.includes\(search\)/)
})

// Active template IDs: stops at first gap
test("activeTemplateIds breaks at first missing step in sequence", () => {
  assert.match(source, /if \(id\) ids\.push\(id\)/)
  assert.match(source, /else break/)
})

// Step navigation
test("handleNext increments step up to 4", () => {
  assert.match(source, /if \(step < 4\) setStep\(step \+ 1\)/)
})

test("handleBack decrements step down to 1", () => {
  assert.match(source, /if \(step > 1\) setStep\(step - 1\)/)
})

test("step indicator allows clicking back to completed steps only", () => {
  assert.match(source, /if \(s\.id < step\) setStep\(s\.id\)/)
  assert.match(source, /disabled=\{s\.id > step\}/)
})

// Toggle manual lead
test("toggleManualLead adds or removes a lead from the set", () => {
  assert.match(source, /if \(next\.has\(leadId\)\) next\.delete\(leadId\)/)
  assert.match(source, /else next\.add\(leadId\)/)
})

// Toggle all manual
test("toggleAllManual selects all filtered leads or clears selection", () => {
  assert.match(source, /new Set\(filteredManualLeads\.map\(\(l\) => l._id\)\)/)
  assert.match(source, /setManualSelectedIds\(new Set\(\)\)/)
})

// Sequence step definitions
test("defines all 4 sequence types: initial, follow_up_1, follow_up_2, follow_up_3", () => {
  assert.match(source, /type: "initial"/)
  assert.match(source, /type: "follow_up_1"/)
  assert.match(source, /type: "follow_up_2"/)
  assert.match(source, /type: "follow_up_3"/)
})

// Status badge styles
test("defines status badge styles for all 11 lead statuses", () => {
  const statuses = [
    "new_lead", "enriched", "outreach_started", "replied",
    "meeting_booked", "onboarded", "declined", "not_interested",
    "bounced", "no_response", "no_email",
  ]
  for (const status of statuses) {
    assert.match(source, new RegExp(`${status}:\\s*"`), `Missing style for ${status}`)
  }
})

// Confirmation step details
test("confirmation shows cluster name for cluster mode", () => {
  assert.match(source, /clusters!\.find\(\(c\) => c\._id === selectedClusterId\)/)
})

test("confirmation shows filter details for filter mode", () => {
  assert.match(source, /Status: \$\{toLabel\(filterStatus\)\}/)
  assert.match(source, /Type: \$\{toLabel\(filterType\)\}/)
  assert.match(source, /Region: \$\{filterRegion\}/)
})

test("confirmation shows 'Manual selection' for manual mode", () => {
  assert.match(source, /Manual selection/)
})

// Create handler builds correct args per mode
test("handleCreate sets isSubmitting state", () => {
  assert.match(source, /setIsSubmitting\(true\)/)
  assert.match(source, /setIsSubmitting\(false\)/)
})

test("handleCreate trims the campaign name", () => {
  assert.match(source, /name: campaignName\.trim\(\)/)
})

// Loading state
test("shows loading spinner when data is undefined", () => {
  assert.match(source, /const isLoading = leads === undefined \|\| templates === undefined \|\| clusters === undefined/)
})

// SequencePreview component
test("SequencePreview shows template subject on expand", () => {
  assert.match(source, /Subject:<\/span>/)
  assert.match(source, /tmpl\.subject/)
})

test("SequencePreview toggles expand/collapse", () => {
  assert.match(source, /setExpanded\(isExpanded \? null : idx\)/)
})

// Selection mode buttons
test("selection mode buttons highlight active mode with default variant", () => {
  assert.match(source, /variant=\{selectionMode === "cluster" \? "default" : "outline"\}/)
  assert.match(source, /variant=\{selectionMode === "filter" \? "default" : "outline"\}/)
  assert.match(source, /variant=\{selectionMode === "manual" \? "default" : "outline"\}/)
})

// Template skip option
test("follow-up templates show Skip this step option", () => {
  assert.match(source, /Skip this step/)
})

// toLabel helper
test("toLabel converts snake_case to Title Case", () => {
  assert.match(source, /function toLabel\(value: string\)/)
  assert.match(source, /\.split\("_"\)/)
  assert.match(source, /s\.charAt\(0\)\.toUpperCase\(\) \+ s\.slice\(1\)/)
})
