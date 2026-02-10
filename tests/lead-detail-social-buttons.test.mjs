import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")

test("imports Facebook and Instagram icons from lucide-react", () => {
  assert.match(source, /import \{[^}]*Facebook[^}]*\} from "lucide-react"/)
  assert.match(source, /import \{[^}]*Instagram[^}]*\} from "lucide-react"/)
})

test("renders Facebook icon button that opens profile URL in new tab", () => {
  assert.match(source, /lead\.socialLinks\?\.facebook/)
  assert.match(
    source,
    /target="_blank"[\s\S]*?rel="noopener noreferrer"[\s\S]*?aria-label="Open Facebook profile"/,
  )
  assert.match(source, /<Facebook className="h-4 w-4" \/>/)
})

test("renders Instagram icon button that opens profile URL in new tab", () => {
  assert.match(source, /lead\.socialLinks\?\.instagram/)
  assert.match(
    source,
    /target="_blank"[\s\S]*?rel="noopener noreferrer"[\s\S]*?aria-label="Open Instagram profile"/,
  )
  assert.match(source, /<Instagram className="h-4 w-4" \/>/)
})

test("only shows social icon buttons when the link exists and is non-empty", () => {
  // Facebook button is conditionally rendered with trim check
  assert.match(
    source,
    /\{lead\.socialLinks\?\.facebook\?\.trim\(\) \? \(/,
  )
  // Instagram button is conditionally rendered with trim check
  assert.match(
    source,
    /\{lead\.socialLinks\?\.instagram\?\.trim\(\) \? \(/,
  )
})

test("normalizes Facebook URL by prepending https:// when missing", () => {
  assert.match(
    source,
    /lead\.socialLinks\.facebook\.trim\(\)\.startsWith\("http"\)/,
  )
  assert.match(
    source,
    /`https:\/\/\$\{lead\.socialLinks\.facebook\.trim\(\)\}`/,
  )
})

test("normalizes Instagram URL by prepending https:// when missing", () => {
  assert.match(
    source,
    /lead\.socialLinks\.instagram\.trim\(\)\.startsWith\("http"\)/,
  )
  assert.match(
    source,
    /`https:\/\/\$\{lead\.socialLinks\.instagram\.trim\(\)\}`/,
  )
})
