import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/dashboard/social-touches.tsx",
  "utf8",
)

test("exports SocialTouches as a named export", () => {
  assert.match(source, /export function SocialTouches/)
})

test("exports SocialTouchesStats interface", () => {
  assert.match(source, /export interface SocialTouchesStats/)
})

test("SocialTouchesStats has dmsSent, dmReplies, follows fields", () => {
  assert.match(source, /dmsSent: number/)
  assert.match(source, /dmReplies: number/)
  assert.match(source, /follows: number/)
})

test("accepts SocialTouchesProps with stats prop", () => {
  assert.match(source, /interface SocialTouchesProps/)
  assert.match(source, /stats: SocialTouchesStats/)
})

test("uses Card components from shadcn/ui", () => {
  assert.match(
    source,
    /import\s*\{[\s\S]*Card[\s\S]*\}\s*from\s*"@\/components\/ui\/card"/,
  )
})

test("uses p-4 on CardHeader and p-4 pt-0 on CardContent per design rules", () => {
  assert.match(source, /CardHeader className="p-4"/)
  assert.match(source, /CardContent className="p-4 pt-0"/)
})

test("card title is Social Touches (7d)", () => {
  assert.match(source, />Social Touches \(7d\)</)
})

test("has a data-testid on the card", () => {
  assert.match(source, /data-testid="social-touches"/)
})

test("has a data-testid on the stats container", () => {
  assert.match(source, /data-testid="social-touches-stats"/)
})

test("renders DMs Sent, Replies, and Follows labels", () => {
  assert.match(source, />DMs Sent</)
  assert.match(source, />Replies</)
  assert.match(source, />Follows</)
})

test("displays stat values from props", () => {
  assert.match(source, /\{stats\.dmsSent\}/)
  assert.match(source, /\{stats\.dmReplies\}/)
  assert.match(source, /\{stats\.follows\}/)
})

test("uses vertical stat layout with space-y-2", () => {
  assert.match(source, /space-y-2/)
})

test("stat rows use flex between layout", () => {
  assert.match(source, /flex items-center justify-between/)
})

test("stat labels use muted foreground text", () => {
  assert.match(source, /text-muted-foreground/)
})

test("stat values use font-medium", () => {
  assert.match(source, /font-medium/)
})

// Verify page.tsx integrates the component
const pageSource = fs.readFileSync("src/app/page.tsx", "utf8")

test("page.tsx imports SocialTouches component", () => {
  assert.match(
    pageSource,
    /import\s+\{\s*SocialTouches\s*\}\s+from\s+"@\/components\/dashboard\/social-touches"/,
  )
})

test("page.tsx renders SocialTouches with stats prop", () => {
  assert.match(pageSource, /<SocialTouches/)
  assert.match(pageSource, /stats=\{\{/)
})
