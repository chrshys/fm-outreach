import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/email-composer.tsx", "utf8")

// --- Component structure ---

test("exports EmailComposer component", () => {
  assert.match(source, /export\s+function\s+EmailComposer\(/)
})

test("accepts leadId and leadName props", () => {
  assert.match(source, /type EmailComposerProps = \{/)
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

// --- Compose Email button ---

test("renders Compose Email button with Mail icon", () => {
  assert.match(source, />\s*Compose Email\s*</)
  assert.match(source, /<Mail\s/)
})

// --- Template dropdown ---

test("fetches templates via useQuery", () => {
  assert.match(source, /useQuery\(api\.emailTemplates\.list\)/)
})

test("renders template select dropdown", () => {
  assert.match(source, /<Select/)
  assert.match(source, /<SelectTrigger/)
  assert.match(source, /Select a template/)
})

test("maps templates to SelectItem options", () => {
  assert.match(source, /templates\?\.map\(\(template\)\s*=>/)
  assert.match(source, /<SelectItem\s+key=\{template\._id\}\s+value=\{template\._id\}/)
})

// --- Generate button ---

test("renders Generate button with Sparkles icon", () => {
  assert.match(source, />\s*Generate\s*</)
  assert.match(source, /<Sparkles\s/)
})

test("Generate button is disabled when no template selected", () => {
  assert.match(source, /disabled=\{!selectedTemplateId \|\| isGenerating\}/)
})

test("calls generateEmail action on generate", () => {
  assert.match(source, /useAction\(api\.email\.generateEmail\.generateEmail\)/)
  assert.match(source, /await generateEmail\(\{/)
  assert.match(source, /leadId,/)
  assert.match(source, /templateId:\s*selectedTemplateId as Id<"emailTemplates">/)
})

// --- Loading state ---

test("shows loading indicator during generation", () => {
  assert.match(source, /<Loader2\s+className="mr-2 size-4 animate-spin"/)
  assert.match(source, /Generating…/)
})

test("disables template select during generation", () => {
  assert.match(source, /<Select[\s\S]*?disabled=\{isGenerating\}/)
})

test("disables subject and body inputs during generation", () => {
  const subjectInput = source.match(/id="email-subject"[\s\S]*?disabled=\{isGenerating\}/)
  const bodyInput = source.match(/id="email-body"[\s\S]*?disabled=\{isGenerating\}/)
  assert.ok(subjectInput, "subject input should be disabled during generation")
  assert.ok(bodyInput, "body input should be disabled during generation")
})

// --- Error handling ---

test("displays generation error message", () => {
  assert.match(source, /generateError/)
  assert.match(source, /text-destructive/)
})

test("catches and extracts error message from generation failure", () => {
  assert.match(source, /error instanceof Error \? error\.message : "Failed to generate email"/)
})

// --- Editable preview ---

test("renders editable subject input", () => {
  assert.match(source, /<Input[\s\S]*?id="email-subject"/)
  assert.match(source, /value=\{subject\}/)
  assert.match(source, /onChange=\{.*setSubject/)
})

test("renders editable body textarea", () => {
  assert.match(source, /<Textarea[\s\S]*?id="email-body"/)
  assert.match(source, /value=\{body\}/)
  assert.match(source, /onChange=\{.*setBody/)
})

test("populates subject and body from generation result", () => {
  assert.match(source, /setSubject\(result\.subject\)/)
  assert.match(source, /setBody\(result\.body\)/)
})

// --- Word count ---

test("displays word count indicator", () => {
  assert.match(source, /\{wordCount\} words/)
  assert.match(source, /function countWords\(text:\s*string\):\s*number/)
})

test("countWords splits on whitespace and filters empty", () => {
  assert.match(source, /text\.trim\(\)\.split\(\/\\s\+\/\)\.filter\(Boolean\)\.length/)
})

// --- Save Draft ---

test("renders Save Draft button", () => {
  assert.match(source, />\s*Save Draft\s*</)
})

test("Save Draft is disabled when no content", () => {
  assert.match(source, /disabled=\{isGenerating \|\| !hasContent\}/)
  assert.match(source, /const hasContent = subject\.trim\(\)\.length > 0 && body\.trim\(\)\.length > 0/)
})

test("saves draft locally with subject, body, templateId, and timestamp", () => {
  assert.match(source, /type EmailDraft = \{/)
  assert.match(source, /subject:\s*string/)
  assert.match(source, /body:\s*string/)
  assert.match(source, /templateId:\s*Id<"emailTemplates"> \| null/)
  assert.match(source, /savedAt:\s*number/)
  assert.match(source, /setDraft\(savedDraft\)/)
  assert.match(source, /savedAt:\s*Date\.now\(\)/)
})

test("closes sheet after saving draft", () => {
  assert.match(source, /setDraft\(savedDraft\)\s*\n\s*setIsOpen\(false\)/)
})

test("shows draft saved timestamp when draft exists", () => {
  assert.match(source, /Draft saved/)
  assert.match(source, /new Date\(draft\.savedAt\)\.toLocaleTimeString\(\)/)
})

// --- Cancel ---

test("renders Cancel button that closes the sheet", () => {
  assert.match(source, />\s*Cancel\s*</)
  assert.match(source, /onClick=\{.*setIsOpen\(false\)/)
})

// --- Prevents closing during generation ---

test("prevents closing sheet during generation", () => {
  assert.match(source, /if \(!open && isGenerating\)\s*\{\s*return\s*\}/)
})

// --- Resets state on open ---

test("resets state when sheet opens", () => {
  assert.match(source, /function resetState\(\)/)
  assert.match(source, /setSelectedTemplateId\(""\)/)
  assert.match(source, /setSubject\(""\)/)
  assert.match(source, /setBody\(""\)/)
  assert.match(source, /setGenerateError\(null\)/)
})
