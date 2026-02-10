import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const uiSource = fs.readFileSync(
  "src/components/settings/email-templates.tsx",
  "utf8",
)
const mutationSource = fs.readFileSync("convex/emailTemplates.ts", "utf8")

// --- Backend: update mutation saves changes ---

test("update mutation accepts all editable fields as optional args", () => {
  assert.match(
    mutationSource,
    /update = mutation\(\{[\s\S]*?name:\s*v\.optional\(v\.string\(\)\)/s,
  )
  assert.match(
    mutationSource,
    /update = mutation\(\{[\s\S]*?subject:\s*v\.optional\(v\.string\(\)\)/s,
  )
  assert.match(
    mutationSource,
    /update = mutation\(\{[\s\S]*?prompt:\s*v\.optional\(v\.string\(\)\)/s,
  )
  assert.match(
    mutationSource,
    /update = mutation\(\{[\s\S]*?isDefault:\s*v\.optional\(v\.boolean\(\)\)/s,
  )
  assert.match(
    mutationSource,
    /update = mutation\(\{[\s\S]*?sequenceType:\s*v\.optional\(/s,
  )
})

test("update mutation patches the database record", () => {
  assert.match(mutationSource, /await ctx\.db\.patch\(id, patch\)/)
})

test("update mutation throws when template not found", () => {
  assert.match(
    mutationSource,
    /if \(template === null\)\s*\{\s*throw new Error\("Template not found"\)/s,
  )
})

// --- UI: edit dialog populates form with existing data ---

test("openEdit sets editingId from template._id", () => {
  assert.match(uiSource, /setEditingId\(template\._id\)/)
})

test("openEdit populates form with all template fields", () => {
  assert.match(uiSource, /name:\s*template\.name/)
  assert.match(uiSource, /sequenceType:\s*template\.sequenceType/)
  assert.match(uiSource, /subject:\s*template\.subject/)
  assert.match(uiSource, /prompt:\s*template\.prompt/)
  assert.match(uiSource, /isDefault:\s*template\.isDefault/)
})

// --- UI: handleSave calls updateTemplate when editingId is set ---

test("handleSave calls updateTemplate when editing an existing template", () => {
  assert.match(uiSource, /if \(editingId\)\s*\{/)
  assert.match(uiSource, /await updateTemplate\(\{/)
})

test("handleSave passes all form fields to updateTemplate", () => {
  // Extract the updateTemplate call block
  const updateBlock = uiSource.match(
    /await updateTemplate\(\{[\s\S]*?\}\)/,
  )?.[0]
  assert.ok(updateBlock, "updateTemplate call block should exist")
  assert.match(updateBlock, /id:\s*editingId/)
  assert.match(updateBlock, /name:\s*form\.name/)
  assert.match(updateBlock, /sequenceType:\s*form\.sequenceType/)
  assert.match(updateBlock, /subject:\s*form\.subject/)
  assert.match(updateBlock, /prompt:\s*form\.prompt/)
  assert.match(updateBlock, /isDefault:\s*form\.isDefault/)
})

test("handleSave closes the dialog after successful save", () => {
  assert.match(uiSource, /setEditDialogOpen\(false\)/)
})

// --- UI: isDefault checkbox exists in the form ---

test("form includes isDefault checkbox", () => {
  assert.match(uiSource, /id="template-is-default"/)
  assert.match(uiSource, /Set as default for this sequence type/)
})

test("isDefault checkbox is wired to form state", () => {
  assert.match(uiSource, /checked=\{form\.isDefault\}/)
  assert.match(uiSource, /onCheckedChange/)
})

// --- UI: validation prevents saving empty fields ---

test("validates name, subject, and prompt before saving", () => {
  assert.match(uiSource, /Name is required/)
  assert.match(uiSource, /Subject is required/)
  assert.match(uiSource, /Prompt is required/)
})

test("sets saving state during save operation", () => {
  assert.match(uiSource, /setSaving\(true\)/)
  assert.match(uiSource, /setSaving\(false\)/)
})

// --- UI: save button reflects edit mode ---

test("save button shows 'Save Changes' in edit mode", () => {
  assert.match(uiSource, /Save Changes/)
})

test("dialog title shows 'Edit Template' in edit mode", () => {
  assert.match(uiSource, /Edit Template/)
})
