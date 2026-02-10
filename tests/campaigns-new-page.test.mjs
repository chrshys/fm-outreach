import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/new/page.tsx", "utf8")

test("is a client component", () => {
  assert.match(source, /"use client"/)
})

test("wraps content with AppLayout", () => {
  assert.match(source, /import\s+\{\s*AppLayout\s*\}\s+from\s+"@\/components\/layout\/app-layout"/)
  assert.match(source, /<AppLayout[\s\S]*>[\s\S]*<\/AppLayout>/)
})

test("defines 4 wizard steps: Name, Select Leads, Template Sequence, Confirm", () => {
  assert.match(source, /label:\s*"Name"/)
  assert.match(source, /label:\s*"Select Leads"/)
  assert.match(source, /label:\s*"Template Sequence"/)
  assert.match(source, /label:\s*"Confirm"/)
})

test("renders step indicator nav", () => {
  assert.match(source, /aria-label="Campaign creation steps"/)
})

test("fetches leads with listAllSummary query", () => {
  assert.match(source, /useQuery\(api\.leads\.listAllSummary\)/)
})

test("fetches email templates with list query", () => {
  assert.match(source, /useQuery\(api\.emailTemplates\.list\)/)
})

test("fetches clusters with list query", () => {
  assert.match(source, /useQuery\(api\.clusters\.list\)/)
})

test("uses campaigns.create mutation", () => {
  assert.match(source, /useMutation\([\s\S]*?api\.campaigns\.create[\s\S]*?\)/)
})

// Step 1: Name
test("step 1 renders campaign name input", () => {
  assert.match(source, /id="campaign-name"/)
  assert.match(source, /Campaign name/)
})

// Step 2: Lead selection modes
test("supports three selection modes: cluster, filter, manual", () => {
  assert.match(source, /type SelectionMode = "cluster" \| "filter" \| "manual"/)
})

test("cluster mode renders cluster dropdown with Select", () => {
  assert.match(source, /Choose a cluster/)
  assert.match(source, /selectedClusterId/)
})

test("filter mode renders status, type, and region filter dropdowns", () => {
  assert.match(source, /filterStatus/)
  assert.match(source, /filterType/)
  assert.match(source, /filterRegion/)
})

test("manual mode renders lead table with checkboxes", () => {
  assert.match(source, /Select leads manually/)
  assert.match(source, /manualSelectedIds/)
  assert.match(source, /toggleManualLead/)
})

test("manual mode supports select-all checkbox", () => {
  assert.match(source, /toggleAllManual/)
})

test("manual mode supports search filtering", () => {
  assert.match(source, /manualSearch/)
  assert.match(source, /Search by name, city, or region/)
})

test("displays selected lead count", () => {
  assert.match(source, /resolvedLeadCount/)
  assert.match(source, /lead.*selected/)
})

// Step 3: Template Sequence
test("defines sequence steps with delays: Day 0, Day 3-4, Day 7-8, Day 14", () => {
  assert.match(source, /Day 0/)
  assert.match(source, /Day 3/)
  assert.match(source, /Day 7/)
  assert.match(source, /Day 14/)
})

test("groups templates by sequence type", () => {
  assert.match(source, /templatesByType/)
})

test("requires initial template, follow-ups are optional", () => {
  assert.match(source, /\(required\)/)
})

test("disables downstream selects when previous not selected", () => {
  assert.match(source, /isDisabled/)
  assert.match(source, /prevSelected/)
})

test("clears downstream selections when a step is removed", () => {
  assert.match(source, /Clear downstream selections/)
})

test("renders SequencePreview component", () => {
  assert.match(source, /SequencePreview/)
  assert.match(source, /Sequence Preview/)
})

// Step 4: Confirm
test("step 4 shows campaign name in confirmation", () => {
  assert.match(source, /Campaign Name/)
  assert.match(source, /campaignName/)
})

test("step 4 shows lead selection summary", () => {
  assert.match(source, /Lead Selection/)
})

test("step 4 shows email sequence summary", () => {
  assert.match(source, /Email Sequence/)
})

// Navigation
test("renders Back and Next navigation buttons", () => {
  assert.match(source, /Back/)
  assert.match(source, /Next/)
})

test("renders Create Draft button on final step", () => {
  assert.match(source, /Create Draft/)
})

test("disables Next when step validation fails", () => {
  assert.match(source, /disabled=\{!canProceed\}/)
})

// Data submission
test("passes targetClusterId for cluster selection mode", () => {
  assert.match(source, /args\.targetClusterId/)
})

test("passes targetFilter for filter selection mode", () => {
  assert.match(source, /args\.targetFilter/)
})

test("passes targetLeadIds for manual selection mode", () => {
  assert.match(source, /args\.targetLeadIds/)
})

test("navigates to /campaigns after creation", () => {
  assert.match(source, /router\.push\("\/campaigns"\)/)
})

test("shows success toast on creation", () => {
  assert.match(source, /toast\.success\("Campaign draft created"\)/)
})

test("shows error toast on failure", () => {
  assert.match(source, /toast\.error\("Failed to create campaign"\)/)
})

test("shows loading spinner while submitting", () => {
  assert.match(source, /isSubmitting/)
  assert.match(source, /Loader2/)
})
