import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/[id]/preview/page.tsx", "utf8")

// --- Launch Campaign button ---

test("imports Play icon from lucide-react", () => {
  assert.match(source, /import\s+\{[\s\S]*Play[\s\S]*\}\s+from\s+"lucide-react"/)
})

test("calls useAction with launchCampaign action", () => {
  assert.match(source, /useAction\(\s*api\.campaigns\.launchCampaign\.launchCampaign/)
})

test("has showLaunchDialog state", () => {
  assert.match(source, /showLaunchDialog/)
  assert.match(source, /setShowLaunchDialog/)
})

test("has isLaunching state for loading indicator", () => {
  assert.match(source, /isLaunching/)
  assert.match(source, /setIsLaunching/)
})

test("renders Launch Campaign button only for pushed campaigns", () => {
  assert.match(source, /Launch Campaign/)
  assert.match(source, /campaign\.status === "pushed"/)
})

test("Launch Campaign button opens the launch confirmation dialog", () => {
  assert.match(source, /setShowLaunchDialog\(true\)/)
})

test("Launch Campaign button uses Play icon", () => {
  assert.match(source, /<Play[\s\S]*?>[\s\S]*?Launch Campaign/)
})

// --- Launch confirmation dialog ---

test("renders launch Dialog with open controlled by showLaunchDialog", () => {
  assert.match(source, /<Dialog\s+open=\{showLaunchDialog\}\s+onOpenChange=\{setShowLaunchDialog\}/)
})

test("launch dialog has title Launch Campaign", () => {
  assert.match(source, /<DialogTitle>Launch Campaign<\/DialogTitle>/)
})

test("launch dialog description mentions sending emails", () => {
  assert.match(source, /start sending emails/)
})

test("launch dialog has Cancel button that closes the dialog", () => {
  assert.match(source, /setShowLaunchDialog\(false\)/)
})

test("launch dialog has Confirm Launch button that calls handleLaunchCampaign", () => {
  assert.match(source, /Confirm Launch/)
  assert.match(source, /handleLaunchCampaign/)
})

test("Confirm Launch button is disabled while launching", () => {
  assert.match(source, /isLaunching \? "Launching…" : "Confirm Launch"/)
})

test("shows spinner when launching", () => {
  assert.match(source, /isLaunching \?[\s\S]*?Loader2[\s\S]*?animate-spin[\s\S]*?Play/)
})

// --- handleLaunchCampaign function ---

test("handleLaunchCampaign sets isLaunching true before calling action", () => {
  const fn = source.match(/async function handleLaunchCampaign[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn, "handleLaunchCampaign function should exist")
  assert.match(fn[0], /setIsLaunching\(true\)/)
})

test("handleLaunchCampaign calls launchCampaignAction with campaignId", () => {
  const fn = source.match(/async function handleLaunchCampaign[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /launchCampaignAction\(\{\s*campaignId\s*\}\)/)
})

test("handleLaunchCampaign closes dialog on success", () => {
  const fn = source.match(/async function handleLaunchCampaign[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /setShowLaunchDialog\(false\)/)
})

test("handleLaunchCampaign shows success toast on launch", () => {
  const fn = source.match(/async function handleLaunchCampaign[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /toast\.success/)
})

test("handleLaunchCampaign shows error toast on failure", () => {
  const fn = source.match(/async function handleLaunchCampaign[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /toast\.error/)
})

test("handleLaunchCampaign resets isLaunching in finally block", () => {
  const fn = source.match(/async function handleLaunchCampaign[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /finally[\s\S]*?setIsLaunching\(false\)/)
})
