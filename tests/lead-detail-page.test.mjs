import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")

test("uses Convex lead query and update mutation on lead detail page", () => {
  assert.match(source, /^"use client"/)
  assert.match(source, /useQuery\(api\.leads\.get,\s*\{\s*leadId,\s*\}\)/s)
  assert.match(source, /useMutation\(api\.leads\.update\)/)
  assert.match(source, /useMutation\(api\.leads\.updateStatus\)/)
})

test("renders inline editable values for lead fields", () => {
  assert.match(source, /function InlineEditableValue\(/)
  assert.match(source, /const \[optimisticValue, setOptimisticValue\] = useState<string \| null>\(null\)/)
  assert.match(source, /const displayValue = optimisticValue \?\? value \?\? ""/)
  assert.match(source, /<button[\s\S]*onClick=\{\(\) => setIsEditing\(true\)\}/)
  assert.match(source, /<Input[\s\S]*onBlur=\{\(\) => void saveValue\(\)\}/)
  assert.match(source, /<Textarea[\s\S]*onBlur=\{\(\) => void saveValue\(\)\}/)
  assert.match(source, /setOptimisticValue\(draft\)[\s\S]*setIsEditing\(false\)/)
  assert.match(source, /setOptimisticValue\(null\)/)
  assert.match(source, /\{displayValue\.trim\(\) \|\| "None"\}/)
})

test("saves field edits on Enter key", () => {
  assert.match(source, /if \(event\.key === "Enter"\)/)
  assert.match(source, /event\.currentTarget\.blur\(\)/)
})

test("wires editable contact and consent fields to update mutation", () => {
  assert.match(source, /updateField\("contactName", value\)/)
  assert.match(source, /updateField\("contactEmail", value\)/)
  assert.match(source, /updateSocialLink\("facebook", value\)/)
  assert.match(source, /updateField\("consentSource", value\)/)
  assert.match(source, /updateField\("notes", value\)/)
})

test("renders status selector and updates status through status mutation", () => {
  assert.match(source, /import \{ StatusSelector \} from "@\/components\/leads\/status-selector"/)
  assert.match(source, /import \{ Badge \} from "@\/components\/ui\/badge"/)
  assert.match(source, /<StatusSelector value=\{lead\.status\} disabled=\{isUpdatingStatus\} onChange=\{updateStatus\} \/>/)
  assert.match(source, /await updateLeadStatus\(\{\s*leadId,\s*status,\s*\}\)/s)
})

test("shows overdue, due-today, and upcoming follow-up badges in the lead detail header", () => {
  assert.match(source, /function getFollowUpStatus\(nextFollowUpAt\?: number\): FollowUpStatus/)
  assert.match(source, /if \(startOfDueDate < startOfToday\) \{\s*return "overdue"\s*\}/s)
  assert.match(source, /if \(startOfDueDate\.getTime\(\) === startOfToday\.getTime\(\)\) \{\s*return "due_today"\s*\}/s)
  assert.match(source, /return "upcoming"/)
  assert.match(source, /<Badge className="bg-red-100 text-red-800">Overdue<\/Badge>/)
  assert.match(source, /<Badge className="bg-amber-100 text-amber-800">Due Today<\/Badge>/)
  assert.match(source, /<Badge className="bg-sky-100 text-sky-800">Due \{formatFollowUpDate\(lead\.nextFollowUpAt!\)\}<\/Badge>/)
})

test("loads and renders activity timeline with logging controls", () => {
  assert.match(source, /useQuery\(api\.activities\.listByLead,\s*\{\s*leadId,\s*\}\)/s)
  assert.match(source, /import \{ ActivityTimeline \} from "@\/components\/leads\/activity-timeline"/)
  assert.match(source, /import \{ FollowUpReminder \} from "@\/components\/leads\/follow-up-reminder"/)
  assert.match(source, /import \{ LogActivity \} from "@\/components\/leads\/log-activity"/)
  assert.match(source, /<CardTitle>Follow-up Reminder<\/CardTitle>/)
  assert.match(source, /<FollowUpReminder leadId=\{leadId\} nextFollowUpAt=\{lead\.nextFollowUpAt\} \/>/)
  assert.match(source, /<CardTitle>Activity Timeline<\/CardTitle>/)
  assert.match(source, /<ActivityTimeline[\s\S]*activities=\{activitiesPage\.activities\.map\(\(activity\) => \(\{/s)
  assert.match(source, /type: activity\.type/)
  assert.match(source, /description: activity\.description/)
  assert.match(source, /timestamp: activity\.createdAt/)
  assert.match(source, /<LogActivity leadId=\{leadId\} \/>/)
})
