import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/cell-colors.ts",
  "utf8",
)

test("imports StalenessLevel from @/lib/enrichment", () => {
  assert.match(source, /import\s+type\s*\{\s*StalenessLevel\s*\}\s*from\s*["']@\/lib\/enrichment["']/)
})

test("exports SEARCHED_FRESHNESS constant", () => {
  assert.match(source, /export\s+const\s+SEARCHED_FRESHNESS/)
})

test("exports SATURATED_FRESHNESS constant", () => {
  assert.match(source, /export\s+const\s+SATURATED_FRESHNESS/)
})

test("SEARCHED_FRESHNESS is typed as Record<StalenessLevel, CellColorResult>", () => {
  assert.match(source, /SEARCHED_FRESHNESS:\s*Record<StalenessLevel,\s*CellColorResult>/)
})

test("SATURATED_FRESHNESS is typed as Record<StalenessLevel, CellColorResult>", () => {
  assert.match(source, /SATURATED_FRESHNESS:\s*Record<StalenessLevel,\s*CellColorResult>/)
})

test("SEARCHED_FRESHNESS has fresh key with bright green (#4ade80)", () => {
  assert.match(source, /SEARCHED_FRESHNESS[\s\S]*?fresh:[\s\S]*?color:\s*"#4ade80"/)
})

test("SEARCHED_FRESHNESS has aging key with lime (#a3e635)", () => {
  assert.match(source, /SEARCHED_FRESHNESS[\s\S]*?aging:[\s\S]*?color:\s*"#a3e635"/)
})

test("SEARCHED_FRESHNESS has stale key with amber (#ca8a04)", () => {
  assert.match(source, /SEARCHED_FRESHNESS[\s\S]*?stale:[\s\S]*?color:\s*"#ca8a04"/)
})

test("SATURATED_FRESHNESS has fresh key with orange (#f97316)", () => {
  assert.match(source, /SATURATED_FRESHNESS[\s\S]*?fresh:[\s\S]*?color:\s*"#f97316"/)
})

test("SATURATED_FRESHNESS has aging key with dark amber (#d97706)", () => {
  assert.match(source, /SATURATED_FRESHNESS[\s\S]*?aging:[\s\S]*?color:\s*"#d97706"/)
})

test("SATURATED_FRESHNESS has stale key with brown (#92400e)", () => {
  assert.match(source, /SATURATED_FRESHNESS[\s\S]*?stale:[\s\S]*?color:\s*"#92400e"/)
})

test("SEARCHED_FRESHNESS fillOpacity values are between 0.15 and 0.4", () => {
  const freshBlock = source.match(/SEARCHED_FRESHNESS[\s\S]*?\{([\s\S]*?)\}/)?.[0]
  assert.ok(freshBlock, "SEARCHED_FRESHNESS block found")
  const opacities = [...freshBlock.matchAll(/fillOpacity:\s*([\d.]+)/g)].map(m => parseFloat(m[1]))
  for (const op of opacities) {
    assert.ok(op >= 0.15 && op <= 0.4, `fillOpacity ${op} is in range 0.15-0.4`)
  }
})

test("SATURATED_FRESHNESS fillOpacity values are between 0.15 and 0.3", () => {
  const satBlock = source.match(/SATURATED_FRESHNESS[\s\S]*?\n\}/)
  assert.ok(satBlock, "SATURATED_FRESHNESS block found")
  const opacities = [...satBlock[0].matchAll(/fillOpacity:\s*([\d.]+)/g)].map(m => parseFloat(m[1]))
  for (const op of opacities) {
    assert.ok(op >= 0.15 && op <= 0.3, `fillOpacity ${op} is in range 0.15-0.3`)
  }
})

test("both freshness maps cover all 3 staleness levels", () => {
  const levels = ["fresh", "aging", "stale"]
  for (const level of levels) {
    assert.match(source, new RegExp(`SEARCHED_FRESHNESS[\\s\\S]*?${level}:`), `SEARCHED_FRESHNESS missing ${level}`)
    assert.match(source, new RegExp(`SATURATED_FRESHNESS[\\s\\S]*?${level}:`), `SATURATED_FRESHNESS missing ${level}`)
  }
})
