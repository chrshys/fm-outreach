import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const settingsSource = fs.readFileSync("src/app/settings/page.tsx", "utf8")

test("settings page imports EmailTemplates component", () => {
  assert.match(
    settingsSource,
    /import\s+\{\s*EmailTemplates\s*\}\s+from\s+"@\/components\/settings\/email-templates"/,
  )
})

test("settings page renders EmailTemplates component", () => {
  assert.match(settingsSource, /<EmailTemplates\s*\/>/)
})

test("email templates section is placed after the grid cards", () => {
  const gridEnd = settingsSource.indexOf("</div>", settingsSource.indexOf("lg:grid-cols-2"))
  const templatesStart = settingsSource.indexOf("<EmailTemplates")
  assert.ok(templatesStart > gridEnd, "EmailTemplates should be after the grid section")
})

test("email templates section is placed before the domain config card", () => {
  const templatesStart = settingsSource.indexOf("<EmailTemplates")
  const domainStart = settingsSource.indexOf("Domain Configuration")
  assert.ok(
    templatesStart < domainStart,
    "EmailTemplates should be before Domain Configuration",
  )
})
