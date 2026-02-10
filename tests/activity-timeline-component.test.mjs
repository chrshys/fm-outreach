import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/activity-timeline.tsx", "utf8")

test("activity timeline defines required activity types with unique icon and color metadata", () => {
  const activityTypes = [
    "email_sent",
    "email_opened",
    "call_logged",
    "meeting_scheduled",
    "note_added",
    "status_changed",
    "social_message_sent",
  ]

  for (const type of activityTypes) {
    assert.match(source, new RegExp(`${type}:\\s*\\{`))
  }

  assert.match(source, /icon:\s*Mail,/)
  assert.match(source, /icon:\s*MailOpen,/)
  assert.match(source, /icon:\s*Phone,/)
  assert.match(source, /icon:\s*CalendarCheck2,/)
  assert.match(source, /icon:\s*StickyNote,/)
  assert.match(source, /icon:\s*Flag,/)
  assert.match(source, /icon:\s*MessageCircle,/)

  assert.match(source, /dotClassName:\s*"bg-blue-500"/)
  assert.match(source, /dotClassName:\s*"bg-cyan-500"/)
  assert.match(source, /dotClassName:\s*"bg-emerald-500"/)
  assert.match(source, /dotClassName:\s*"bg-violet-500"/)
  assert.match(source, /dotClassName:\s*"bg-amber-500"/)
  assert.match(source, /dotClassName:\s*"bg-rose-500"/)
  assert.match(source, /dotClassName:\s*"bg-indigo-500"/)
})

test("activity timeline uses relative timestamps and shows optional channel badge", () => {
  assert.match(source, /formatDistanceToNow\(date, \{ addSuffix: true \}\)/)
  assert.match(source, /if \(Number\.isNaN\(date\.getTime\(\)\)\) \{\s*return "Invalid date"\s*\}/s)
  assert.match(source, /\{activity\.channel \? \(/)
  assert.match(source, /<Badge variant="outline" className="text-\[11px\] font-medium">/)
  assert.match(source, /\{channelLabelByType\[activity\.channel\] \?\? activity\.channel\}/)
})

test("activity timeline renders vertical line and dot indicator structure", () => {
  assert.match(source, /className=\"relative pl-10\"/)
  assert.match(source, /className=\"absolute top-0 bottom-0 left-3 w-px bg-border\"/)
  assert.match(source, /\"absolute top-1\.5 left-\[9px\] size-3 rounded-full border-2 border-background\"/)
})
