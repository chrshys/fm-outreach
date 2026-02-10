import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/dashboard/clusters-card.tsx",
  "utf8",
)

test("exports ClustersCard as a named export", () => {
  assert.match(source, /export function ClustersCard/)
})

test("exports ClustersCardStats interface", () => {
  assert.match(source, /export interface ClustersCardStats/)
})

test("ClustersCardStats has clusters and unclustered fields", () => {
  assert.match(source, /clusters: \{ name: string; count: number \}\[\]/)
  assert.match(source, /unclustered: number/)
})

test("accepts ClustersCardProps with stats prop", () => {
  assert.match(source, /interface ClustersCardProps/)
  assert.match(source, /stats: ClustersCardStats/)
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

test("card title is Clusters", () => {
  assert.match(source, />Clusters</)
})

test("has a data-testid on the card", () => {
  assert.match(source, /data-testid="clusters-card"/)
})

test("has a data-testid on the cluster list container", () => {
  assert.match(source, /data-testid="clusters-card-list"/)
})

test("sorts clusters by count descending and takes top 3", () => {
  assert.match(source, /\.sort\(/)
  assert.match(source, /b\.count - a\.count/)
  assert.match(source, /\.slice\(0, 3\)/)
})

test("renders cluster name and count for each cluster", () => {
  assert.match(source, /cluster\.name/)
  assert.match(source, /cluster\.count/)
})

test("renders Unclustered row with border-t separator", () => {
  assert.match(source, />Unclustered</)
  assert.match(source, /border-t/)
})

test("displays unclustered count from stats", () => {
  assert.match(source, /stats\.unclustered/)
})

test("shows empty state when no clusters exist", () => {
  assert.match(source, />No clusters yet</)
})

test("uses vertical layout with space-y-2", () => {
  assert.match(source, /space-y-2/)
})

test("cluster rows use flex between layout", () => {
  assert.match(source, /flex items-center justify-between/)
})

test("cluster name labels use muted foreground text", () => {
  assert.match(source, /text-muted-foreground/)
})

test("cluster count values use font-medium", () => {
  assert.match(source, /font-medium/)
})

// Verify page.tsx integrates the component
const pageSource = fs.readFileSync("src/app/page.tsx", "utf8")

test("page.tsx imports ClustersCard component", () => {
  assert.match(
    pageSource,
    /import\s+\{\s*ClustersCard\s*\}\s+from\s+"@\/components\/dashboard\/clusters-card"/,
  )
})

test("page.tsx renders ClustersCard with stats prop", () => {
  assert.match(pageSource, /<ClustersCard/)
  assert.match(pageSource, /stats=\{\{/)
})
