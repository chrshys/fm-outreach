import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/settings/email-templates.tsx",
  "utf8",
)

test("is a client component", () => {
  assert.match(source, /"use client"/)
})

test("queries email templates with useQuery", () => {
  assert.match(source, /useQuery\(api\.emailTemplates\.list\)/)
})

test("uses create mutation", () => {
  assert.match(source, /useMutation\(api\.emailTemplates\.create\)/)
})

test("uses update mutation", () => {
  assert.match(source, /useMutation\(api\.emailTemplates\.update\)/)
})

test("uses remove mutation", () => {
  assert.match(source, /useMutation\(api\.emailTemplates\.remove\)/)
})

test("renders Card with Email Templates title and description", () => {
  assert.match(source, /Email Templates/)
  assert.match(source, /Manage prompt templates/)
})

test("has Add Template button with Plus icon", () => {
  assert.match(source, /Add Template/)
  assert.match(source, /<Plus/)
})

test("displays template name in the list", () => {
  assert.match(source, /template\.name/)
})

test("displays sequence type badge with labels", () => {
  assert.match(source, /SEQUENCE_LABELS\[template\.sequenceType\]/)
})

test("has all four sequence type labels", () => {
  assert.match(source, /initial:\s*"Initial"/)
  assert.match(source, /follow_up_1:\s*"Follow-up 1"/)
  assert.match(source, /follow_up_2:\s*"Follow-up 2"/)
  assert.match(source, /follow_up_3:\s*"Follow-up 3"/)
})

test("shows default badge for default templates", () => {
  assert.match(source, /template\.isDefault/)
  assert.match(source, /Default/)
  assert.match(source, /<Star/)
})

test("has edit button with Pencil icon for each template", () => {
  assert.match(source, /<Pencil/)
  assert.match(source, /openEdit/)
})

test("has delete button with Trash2 icon for each template", () => {
  assert.match(source, /<Trash2/)
  assert.match(source, /openDelete/)
})

test("edit button has accessible label", () => {
  assert.match(source, /aria-label=\{`Edit \$\{template\.name\}`\}/)
})

test("delete button has accessible label", () => {
  assert.match(source, /aria-label=\{`Delete \$\{template\.name\}`\}/)
})

test("has edit/create dialog with form fields", () => {
  assert.match(source, /id="template-name"/)
  assert.match(source, /id="template-sequence-type"/)
  assert.match(source, /id="template-subject"/)
  assert.match(source, /id="template-prompt"/)
})

test("dialog title changes based on create vs edit mode", () => {
  assert.match(source, /Edit Template/)
  assert.match(source, /New Template/)
})

test("subject line uses Input component", () => {
  assert.match(source, /id="template-subject"/)
  assert.match(source, /Subject Line Template/)
})

test("prompt uses Textarea with 10 rows", () => {
  assert.match(source, /id="template-prompt"/)
  assert.match(source, /Prompt Template/)
  assert.match(source, /rows=\{10\}/)
})

test("has Select dropdown for sequence type with all options", () => {
  assert.match(source, /<Select/)
  assert.match(source, /<SelectTrigger/)
  assert.match(source, /<SelectContent/)
  assert.match(source, /SEQUENCE_TYPES\.map/)
})

test("validates required fields before saving", () => {
  assert.match(source, /Name is required/)
  assert.match(source, /Subject is required/)
  assert.match(source, /Prompt is required/)
})

test("displays inline validation errors", () => {
  assert.match(source, /errors\.name/)
  assert.match(source, /errors\.subject/)
  assert.match(source, /errors\.prompt/)
  assert.match(source, /text-destructive/)
})

test("clears field errors on change", () => {
  assert.match(source, /delete next\.name/)
  assert.match(source, /delete next\.subject/)
  assert.match(source, /delete next\.prompt/)
})

test("has delete confirmation dialog", () => {
  assert.match(source, /Delete Template/)
  assert.match(source, /Are you sure you want to delete/)
  assert.match(source, /cannot be undone/)
})

test("delete dialog shows template name", () => {
  assert.match(source, /deletingTemplate\?\.name/)
})

test("delete uses destructive button variant", () => {
  assert.match(source, /variant="destructive"/)
})

test("save button is disabled while saving", () => {
  assert.match(source, /disabled=\{saving\}/)
})

test("delete button is disabled while deleting", () => {
  assert.match(source, /disabled=\{deleting\}/)
})

test("shows loading spinner while templates are undefined", () => {
  assert.match(source, /templates === undefined/)
  assert.match(source, /Loader2/)
})

test("shows empty state when no templates exist", () => {
  assert.match(source, /templates\.length === 0/)
  assert.match(source, /No templates yet/)
})

test("calls createTemplate for new templates", () => {
  assert.match(source, /await createTemplate\(/)
})

test("calls updateTemplate for existing templates", () => {
  assert.match(source, /await updateTemplate\(/)
})

test("calls removeTemplate on delete confirm", () => {
  assert.match(source, /await removeTemplate\(/)
})

test("dialog has cancel and submit buttons", () => {
  assert.match(source, /Cancel/)
  assert.match(source, /Save Changes/)
  assert.match(source, /Create Template/)
})

test("displays subject line preview in template list", () => {
  assert.match(source, /template\.subject/)
})
