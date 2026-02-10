import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/social-dm-composer.tsx", "utf8")

// --- Component structure ---

test("exports SocialDmComposer component", () => {
  assert.match(source, /export\s+function\s+SocialDmComposer\(/)
})

test("accepts leadId and leadName props", () => {
  assert.match(source, /type SocialDmComposerProps = \{/)
  assert.match(source, /leadId:\s*Id<"leads">/)
  assert.match(source, /leadName:\s*string/)
})

// --- Sheet (not Dialog) ---

test("uses Sheet component for the composer panel", () => {
  assert.match(source, /import[\s\S]*Sheet[\s\S]*from\s*"@\/components\/ui\/sheet"/)
  assert.match(source, /<Sheet\s+open=/)
  assert.match(source, /<SheetContent/)
})

test("Sheet opens from the right side", () => {
  assert.match(source, /side="right"/)
})

// --- Draft Social DM button ---

test("renders Draft Social DM button with MessageCircle icon", () => {
  assert.match(source, />\s*Draft Social DM\s*</)
  assert.match(source, /<MessageCircle\s/)
})

// --- Channel selector ---

test("renders channel select dropdown", () => {
  assert.match(source, /<Select/)
  assert.match(source, /<SelectTrigger/)
  assert.match(source, /Select channel/)
})

test("offers Facebook and Instagram channel options", () => {
  assert.match(source, /<SelectItem\s+value="facebook">Facebook<\/SelectItem>/)
  assert.match(source, /<SelectItem\s+value="instagram">Instagram<\/SelectItem>/)
})

test("disables channel select during generation", () => {
  assert.match(source, /<Select[\s\S]*?disabled=\{isGenerating\}/)
})

// --- Generate DM button ---

test("renders Generate DM button with Sparkles icon", () => {
  assert.match(source, />\s*Generate DM\s*</)
  assert.match(source, /<Sparkles\s/)
})

test("Generate DM button is disabled when no channel selected", () => {
  assert.match(source, /disabled=\{!channel \|\| isGenerating\}/)
})

test("calls generateDM action on generate", () => {
  assert.match(source, /useAction\(api\.social\.generateDM\.generateDM\)/)
  assert.match(source, /await generateDM\(\{/)
  assert.match(source, /leadId,/)
  assert.match(source, /channel,/)
})

// --- Loading state ---

test("shows loading indicator during generation", () => {
  assert.match(source, /<Loader2\s+className="mr-2 size-4 animate-spin"/)
  assert.match(source, /Generating…/)
})

// --- Error handling ---

test("displays generation error message", () => {
  assert.match(source, /generateError/)
  assert.match(source, /text-destructive/)
})

test("catches and extracts error message from generation failure", () => {
  assert.match(source, /error instanceof Error \? error\.message : "Failed to generate DM"/)
})

// --- Editable text area ---

test("renders editable message textarea", () => {
  assert.match(source, /<Textarea[\s\S]*?id="dm-text"/)
  assert.match(source, /value=\{dmText\}/)
  assert.match(source, /setDmText/)
})

test("populates textarea from generation result", () => {
  assert.match(source, /setDmText\(result\)/)
})

// --- Word count ---

test("displays word count indicator", () => {
  assert.match(source, /\{wordCount\} words/)
  assert.match(source, /function countWords\(text:\s*string\):\s*number/)
})

test("word count warns outside 30-60 range", () => {
  assert.match(source, /wordCount < 30 \|\| wordCount > 60/)
  assert.match(source, /text-destructive/)
})

// --- Copy to Clipboard ---

test("renders Copy to Clipboard button with ClipboardCopy icon", () => {
  assert.match(source, />\s*Copy to Clipboard\s*</)
  assert.match(source, /<ClipboardCopy\s/)
})

test("Copy button is disabled when no text", () => {
  assert.match(source, /disabled=\{isGenerating \|\| !dmText\.trim\(\)\}/)
})

test("copies text using navigator.clipboard.writeText", () => {
  assert.match(source, /navigator\.clipboard\.writeText\(dmText\)/)
})

test("shows Copied! state after copying", () => {
  assert.match(source, /setCopied\(true\)/)
  assert.match(source, />\s*Copied!\s*</)
  assert.match(source, /<Check\s/)
})

// --- Log activity prompt ---

test("shows log activity prompt after copying", () => {
  assert.match(source, /setShowLogPrompt\(true\)/)
  assert.match(source, /Message copied! Log this activity\?/)
})

test("renders Log Activity button in prompt", () => {
  assert.match(source, /"Log Activity"/)
})

test("logs activity via createActivity mutation", () => {
  assert.match(source, /useMutation\(api\.activities\.create\)/)
  assert.match(source, /await createActivity\(\{/)
  assert.match(source, /type: "social_dm_sent"/)
  assert.match(source, /description: dmText/)
  assert.match(source, /channel,/)
})

test("closes sheet after logging activity", () => {
  assert.match(source, /setShowLogPrompt\(false\)\s*\n\s*setIsOpen\(false\)/)
})

test("renders Dismiss button to hide log prompt", () => {
  assert.match(source, />\s*Dismiss\s*</)
  assert.match(source, /setShowLogPrompt\(false\)/)
})

// --- Prevents closing during generation ---

test("prevents closing sheet during generation", () => {
  assert.match(source, /if \(!open && isGenerating\)\s*\{\s*return\s*\}/)
})

// --- Resets state on open ---

test("resets state when sheet opens", () => {
  assert.match(source, /function resetState\(\)/)
  assert.match(source, /setChannel\(""\)/)
  assert.match(source, /setDmText\(""\)/)
  assert.match(source, /setGenerateError\(null\)/)
  assert.match(source, /setCopied\(false\)/)
  assert.match(source, /setShowLogPrompt\(false\)/)
})

// --- Cancel ---

test("renders Cancel button that closes the sheet", () => {
  assert.match(source, />\s*Cancel\s*</)
  assert.match(source, /onClick=\{.*setIsOpen\(false\)/)
})
