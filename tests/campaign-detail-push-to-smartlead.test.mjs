import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/[id]/page.tsx", "utf8")

// --- Imports ---

test("imports Rocket icon from lucide-react", () => {
  assert.match(source, /import\s+\{[\s\S]*Rocket[\s\S]*\}\s+from\s+"lucide-react"/)
})

test("imports Dialog components from ui/dialog", () => {
  assert.match(source, /import\s+\{[\s\S]*Dialog[\s\S]*DialogContent[\s\S]*DialogDescription[\s\S]*DialogFooter[\s\S]*DialogHeader[\s\S]*DialogTitle[\s\S]*\}\s+from\s+"@\/components\/ui\/dialog"/)
})

test("calls useAction with pushToSmartlead action", () => {
  assert.match(source, /useAction\(\s*api\.campaigns\.pushToSmartlead\.pushToSmartlead/)
})

test("fetches generated emails with useQuery for approval counts", () => {
  assert.match(source, /useQuery\(api\.generatedEmails\.listByCampaign,\s*\{\s*campaignId\s*\}\)/)
})

// --- State ---

test("has showPushDialog state", () => {
  assert.match(source, /useState\(false\)/)
  assert.match(source, /showPushDialog/)
  assert.match(source, /setShowPushDialog/)
})

test("has isPushing state for loading indicator", () => {
  assert.match(source, /isPushing/)
  assert.match(source, /setIsPushing/)
})

// --- Approval logic ---

test("computes approvedCount from emails", () => {
  assert.match(source, /approvedCount/)
  assert.match(source, /emails\.filter/)
})

test("computes allApproved — true when all emails are approved or rejected with at least one approved", () => {
  assert.match(source, /allApproved/)
  assert.match(source, /approvedCount \+ rejectedCount === emails\.length/)
  assert.match(source, /approvedCount > 0/)
})

test("computes canPush gated on draft status, no existing smartleadCampaignId, and allApproved", () => {
  assert.match(source, /canPush/)
  assert.match(source, /campaign\.status === "draft"/)
  assert.match(source, /!campaign\.smartleadCampaignId/)
  assert.match(source, /allApproved/)
})

// --- Button rendering ---

test("renders Push to Smartlead button only for draft campaigns without smartleadCampaignId", () => {
  assert.match(source, /Push to Smartlead/)
  assert.match(source, /campaign\.status === "draft" && !campaign\.smartleadCampaignId/)
})

test("Push to Smartlead button is disabled when canPush is false", () => {
  assert.match(source, /disabled=\{!canPush\}/)
})

test("Push to Smartlead button opens the confirmation dialog", () => {
  assert.match(source, /onClick=\{.*setShowPushDialog\(true\).*\}/)
})

test("Push to Smartlead button uses Rocket icon", () => {
  assert.match(source, /<Rocket[\s\S]*?>[\s\S]*?Push to Smartlead/)
})

// --- Confirmation dialog ---

test("renders Dialog with open controlled by showPushDialog", () => {
  assert.match(source, /<Dialog\s+open=\{showPushDialog\}\s+onOpenChange=\{setShowPushDialog\}/)
})

test("dialog has title Push to Smartlead", () => {
  assert.match(source, /<DialogTitle>Push to Smartlead<\/DialogTitle>/)
})

test("dialog description mentions lead count and Smartlead launch instructions", () => {
  assert.match(source, /create the campaign in Smartlead/)
  assert.match(source, /approvedCount/)
  assert.match(source, /launch it from Smartlead/)
})

test("dialog has Cancel button that closes the dialog", () => {
  assert.match(source, /setShowPushDialog\(false\)/)
  assert.match(source, /Cancel/)
})

test("dialog Cancel button is disabled while pushing", () => {
  const dialogFooter = source.match(/<DialogFooter>[\s\S]*?<\/DialogFooter>/)
  assert.ok(dialogFooter, "DialogFooter should exist")
  assert.match(dialogFooter[0], /disabled=\{isPushing\}/)
})

test("dialog has Confirm Push button that calls handlePushToSmartlead", () => {
  assert.match(source, /Confirm Push/)
  assert.match(source, /handlePushToSmartlead/)
})

test("Confirm Push button is disabled while pushing", () => {
  const confirmButton = source.match(/handlePushToSmartlead[\s\S]*?disabled=\{isPushing\}/)
  assert.ok(confirmButton, "Confirm Push button should be disabled when isPushing")
})

test("shows spinner when pushing", () => {
  assert.match(source, /isPushing \?[\s\S]*?Loader2[\s\S]*?animate-spin[\s\S]*?Rocket/)
})

test("button text changes to Pushing while in progress", () => {
  assert.match(source, /isPushing \? "Pushing…" : "Confirm Push"/)
})

// --- handlePushToSmartlead function ---

test("handlePushToSmartlead sets isPushing true before calling action", () => {
  const fn = source.match(/async function handlePushToSmartlead[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn, "handlePushToSmartlead function should exist")
  assert.match(fn[0], /setIsPushing\(true\)/)
})

test("handlePushToSmartlead calls pushToSmartlead action with campaignId", () => {
  const fn = source.match(/async function handlePushToSmartlead[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /pushToSmartlead\(\{\s*campaignId\s*\}\)/)
})

test("handlePushToSmartlead closes dialog on success", () => {
  const fn = source.match(/async function handlePushToSmartlead[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /setShowPushDialog\(false\)/)
})

test("handlePushToSmartlead shows success toast with sequence steps and leads added", () => {
  const fn = source.match(/async function handlePushToSmartlead[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /toast\.success/)
  assert.match(fn[0], /result\.sequenceSteps/)
  assert.match(fn[0], /result\.leadsAdded/)
})

test("handlePushToSmartlead shows error toast on failure", () => {
  const fn = source.match(/async function handlePushToSmartlead[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /toast\.error/)
})

test("handlePushToSmartlead resets isPushing in finally block", () => {
  const fn = source.match(/async function handlePushToSmartlead[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /finally[\s\S]*?setIsPushing\(false\)/)
})

// --- Loading state includes emails ---

test("loading state waits for emails query", () => {
  assert.match(source, /emails === undefined/)
})
