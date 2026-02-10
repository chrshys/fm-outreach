import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/clusters/cluster-detail.tsx", "utf8")

test("is a client component", () => {
  assert.match(source, /^"use client"/)
})

test("fetches clusters and leads with useQuery", () => {
  assert.match(source, /import\s+\{.*useQuery.*\}\s+from\s+"convex\/react"/)
  assert.match(source, /useQuery\(api\.clusters\.list\)/)
  assert.match(source, /useQuery\(api\.clusters\.getLeads,\s*\{\s*clusterId\s*\}\)/)
})

test("uses updateName mutation for editable cluster name", () => {
  assert.match(source, /import\s+\{.*useMutation.*\}\s+from\s+"convex\/react"/)
  assert.match(source, /useMutation\(api\.clusters\.updateName\)/)
  assert.match(source, /await updateName\(\{\s*clusterId,\s*name\s*\}\)/)
})

test("renders editable cluster name with EditableClusterName", () => {
  assert.match(source, /function EditableClusterName\(/)
  assert.match(source, /<EditableClusterName/)
  assert.match(source, /value=\{cluster\.name\}/)
  assert.match(source, /onSave=/)
})

test("EditableClusterName has editing state with optimistic updates", () => {
  assert.match(source, /const \[isEditing, setIsEditing\] = useState\(false\)/)
  assert.match(source, /const \[optimisticValue, setOptimisticValue\] = useState<string \| null>\(null\)/)
  assert.match(source, /setOptimisticValue\(draft\)/)
  assert.match(source, /onClick=\{\(\) => setIsEditing\(true\)\}/)
})

test("EditableClusterName saves on blur and Enter key", () => {
  assert.match(source, /onBlur=\{\(\) => void saveValue\(\)\}/)
  assert.match(source, /if \(event\.key === "Enter"\)/)
  assert.match(source, /event\.currentTarget\.blur\(\)/)
})

test("EditableClusterName cancels on Escape key", () => {
  assert.match(source, /if \(event\.key === "Escape"\)/)
  assert.match(source, /setIsEditing\(false\)/)
})

test("renders stat cards for leads count, radius, and center", () => {
  assert.match(source, /cluster\.leadCount/)
  assert.match(source, /cluster\.radiusKm/)
  assert.match(source, /cluster\.centerLat\.toFixed\(2\)/)
  assert.match(source, /cluster\.centerLng\.toFixed\(2\)/)
})

test("renders ClusterMap with dynamic import (no SSR)", () => {
  assert.match(source, /import dynamic from "next\/dynamic"/)
  assert.match(source, /const ClusterMap = dynamic\(\(\) => import\("\.\/cluster-map"\), \{ ssr: false \}\)/)
  assert.match(source, /<ClusterMap/)
})

test("passes cluster center and radius to ClusterMap", () => {
  assert.match(source, /centerLat=\{cluster\.centerLat\}/)
  assert.match(source, /centerLng=\{cluster\.centerLng\}/)
  assert.match(source, /radiusKm=\{cluster\.radiusKm\}/)
})

test("renders a leads table with Name, Status, and Email columns", () => {
  assert.match(source, /from "@\/components\/ui\/table"/)
  assert.match(source, /Table,/)
  assert.match(source, /TableHeader,/)
  assert.match(source, /TableBody,/)
  assert.match(source, /<TableHead>Name<\/TableHead>/)
  assert.match(source, /<TableHead>Status<\/TableHead>/)
  assert.match(source, /<TableHead>Email<\/TableHead>/)
})

test("lead names in table link to /leads/[id]", () => {
  assert.match(source, /import Link from "next\/link"/)
  assert.match(source, /href=\{`\/leads\/\$\{lead\._id\}`\}/)
})

test("shows lead email or dash in table", () => {
  assert.match(source, /lead\.contactEmail \?\? "—"/)
})

test("shows status badge for each lead", () => {
  assert.match(source, /import\s+\{\s*Badge\s*\}\s+from\s+"@\/components\/ui\/badge"/)
  assert.match(source, /<Badge variant="secondary">\{toLabel\(lead\.status\)\}<\/Badge>/)
})

test("shows loading and empty states for leads", () => {
  assert.match(source, /Loading leads\.\.\./)
  assert.match(source, /No leads assigned to this cluster\./)
})

test("shows loading state when cluster is not found", () => {
  assert.match(source, /Loading cluster\.\.\./)
})

test("exports ClusterDetail as named export", () => {
  assert.match(source, /export function ClusterDetail\(/)
})
