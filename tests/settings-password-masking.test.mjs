import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/settings/page.tsx", "utf8")

// --- Default masking ---

test("API key inputs default to password type (masked)", () => {
  // The ternary expression ensures password is the default when visibleKeys[field.key] is falsy
  assert.match(source, /type=\{visibleKeys\[field\.key\] \? "text" : "password"\}/)
})

test("visibleKeys state initializes as empty object so all fields start hidden", () => {
  assert.match(source, /useState<Record<string, boolean>>\(\{\}\)/)
})

// --- Toggle function ---

test("toggleVisibility function flips the boolean for a given key", () => {
  assert.match(source, /function toggleVisibility\(key: string\)/)
  assert.match(source, /setVisibleKeys\(\(prev\) => \(\{ \.\.\.prev, \[key\]: !prev\[key\] \}\)\)/)
})

test("toggle button calls toggleVisibility with the field key on click", () => {
  assert.match(source, /onClick=\{\(\) => toggleVisibility\(field\.key\)\}/)
})

// --- Eye icons ---

test("imports both Eye and EyeOff icons from lucide-react", () => {
  assert.match(source, /import\s+\{[^}]*Eye[^}]*EyeOff[^}]*\}\s+from\s+"lucide-react"/)
})

test("shows Eye icon when field is hidden (password mode)", () => {
  // When visibleKeys[field.key] is false, the else branch renders <Eye>
  assert.match(source, /<Eye className="size-3\.5" \/>/)
})

test("shows EyeOff icon when field is visible (text mode)", () => {
  // When visibleKeys[field.key] is true, the if branch renders <EyeOff>
  assert.match(source, /<EyeOff className="size-3\.5" \/>/)
})

// --- Toggle button styling and positioning ---

test("toggle button is positioned inside the input with absolute positioning", () => {
  assert.match(source, /className="absolute right-2 top-1\/2 -translate-y-1\/2"/)
})

test("toggle button uses ghost variant and icon-xs size", () => {
  assert.match(source, /variant="ghost"/)
  assert.match(source, /size="icon-xs"/)
})

test("toggle button has type=button to prevent form submission", () => {
  assert.match(source, /type="button"/)
})

// --- Accessibility ---

test("toggle button aria-label says 'Show value' when field is hidden", () => {
  assert.match(source, /"Show value"/)
})

test("toggle button aria-label says 'Hide value' when field is visible", () => {
  assert.match(source, /"Hide value"/)
})

test("aria-label switches based on visibility state", () => {
  assert.match(
    source,
    /aria-label=\{\s*visibleKeys\[field\.key\] \? "Hide value" : "Show value"\s*\}/
  )
})

// --- Input wrapper structure ---

test("each API key input is wrapped in a relative div for toggle positioning", () => {
  assert.match(source, /<div className="relative">[\s\S]*?<Input[\s\S]*?type=\{visibleKeys/)
})

// --- All four fields get the same treatment ---

test("all four API key fields are rendered via map with the same toggle pattern", () => {
  assert.match(source, /API_KEY_FIELDS\.map\(\(field\)/)
  // Verify all four keys are defined
  assert.match(source, /smartlead_api_key/)
  assert.match(source, /google_places_api_key/)
  assert.match(source, /hunter_api_key/)
  assert.match(source, /anthropic_api_key/)
})

test("the toggle pattern is inside the map so every field gets a toggle button", () => {
  // The map callback contains the toggle button
  assert.match(
    source,
    /API_KEY_FIELDS\.map\(\(field\)[\s\S]*?toggleVisibility\(field\.key\)[\s\S]*?\)\)\}/
  )
})
