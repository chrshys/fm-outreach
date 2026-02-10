import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/app/campaigns/[id]/page.tsx", "utf8")

// --- Launch Campaign button ---

test("imports useAction from convex/react", () => {
  assert.match(source, /import\s+\{[^}]*useAction[^}]*\}\s+from\s+"convex\/react"/)
})

test("imports the launchCampaign action from Convex API", () => {
  assert.match(source, /api\.campaigns\.launchCampaign\.launchCampaign/)
})

test("renders Launch Campaign button only when campaign status is pushed", () => {
  assert.match(source, /campaign\.status\s*===\s*"pushed"/)
  assert.match(source, /Launch Campaign/)
})

test("renders Play icon on the launch button", () => {
  assert.match(source, /import\s+\{[^}]*Play[^}]*\}\s+from\s+"lucide-react"/)
  assert.match(source, /<Play\s/)
})

// --- Confirmation dialog ---

test("imports Dialog components", () => {
  assert.match(source, /import\s+\{[^}]*Dialog[^}]*\}\s+from\s+"@\/components\/ui\/dialog"/)
  assert.match(source, /DialogContent/)
  assert.match(source, /DialogHeader/)
  assert.match(source, /DialogTitle/)
  assert.match(source, /DialogDescription/)
  assert.match(source, /DialogFooter/)
})

test("renders launch confirmation dialog with title", () => {
  assert.match(source, /<DialogTitle>Launch Campaign<\/DialogTitle>/)
})

test("dialog describes the action with lead count", () => {
  assert.match(source, /start sending emails to all/)
  assert.match(source, /campaign\.leadCount/)
})

test("dialog has Cancel and Confirm Launch buttons", () => {
  assert.match(source, /Cancel/)
  assert.match(source, /Confirm Launch/)
})

test("dialog shows loading state while launching", () => {
  assert.match(source, /isLaunching/)
  assert.match(source, /Launching…/)
  assert.match(source, /Loader2/)
})

// --- Success/error handling ---

test("imports toast from sonner", () => {
  assert.match(source, /import\s+\{\s*toast\s*\}\s+from\s+"sonner"/)
})

test("shows success toast after launch", () => {
  assert.match(source, /toast\.success\("Campaign launched/)
})

test("shows error toast on failure", () => {
  assert.match(source, /toast\.error\(/)
})

// --- State management ---

test("uses useState for showLaunchDialog", () => {
  assert.match(source, /useState\(false\)/)
  assert.match(source, /showLaunchDialog/)
  assert.match(source, /setShowLaunchDialog/)
})

test("uses useState for isLaunching", () => {
  assert.match(source, /isLaunching/)
  assert.match(source, /setIsLaunching/)
})

test("handleLaunchCampaign calls the action with campaignId", () => {
  assert.match(source, /await\s+launchCampaignAction\(\{\s*campaignId\s*\}\)/)
})

test("handleLaunchCampaign closes dialog on success", () => {
  assert.match(source, /setShowLaunchDialog\(false\)/)
})
