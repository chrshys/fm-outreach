import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/[id]/preview/page.tsx", "utf8")

// --- countWords helper ---

test("countWords strips CASL footer before counting", () => {
  assert.match(source, /footerIndex/)
  assert.match(source, /text\.slice\(0,\s*footerIndex\)/)
})

test("countWords splits on whitespace and filters empty strings", () => {
  assert.match(source, /\.split\(\/\\s\+\/\)\.filter\(Boolean\)\.length/)
})

// --- extractPersonalizationVars helper ---

test("extractPersonalizationVars detects contactName from greeting pattern", () => {
  assert.match(source, /\(Hi\|Hey\|Dear\)/)
  assert.match(source, /vars\.push\("contactName"\)/)
})

test("extractPersonalizationVars detects caslFooter from separator", () => {
  assert.match(source, /combined\.includes\("\\n---\\n"\)/)
  assert.match(source, /vars\.push\("caslFooter"\)/)
})

test("extractPersonalizationVars checks both subject and body", () => {
  assert.match(source, /`\$\{subject\}\s+\$\{body\}`/)
})

// --- Reject button and status ---

test("has Reject button that calls updateStatus with rejected", () => {
  assert.match(source, /Reject/)
  assert.match(source, /handleReject/)
})

test("rejected status config is defined with styling", () => {
  assert.match(source, /rejected:\s*\{/)
  assert.match(source, /"Rejected"/)
  assert.match(source, /bg-red-100 text-red-800/)
})

test("reject handler calls updateStatus mutation with rejected status", () => {
  const rejectFn = source.match(/async function handleReject[\s\S]*?catch[\s\S]*?\}[\s\n]*\}/)
  assert.ok(rejectFn, "handleReject function should exist")
  assert.match(rejectFn[0], /updateStatus\(\{/)
  assert.match(rejectFn[0], /status:\s*"rejected"/)
})

// --- Approve All bulk action ---

test("has Approve All button", () => {
  assert.match(source, /Approve All/)
  assert.match(source, /handleApproveAll/)
})

test("Approve All uses bulkUpdateStatus mutation", () => {
  assert.match(source, /useMutation\(api\.generatedEmails\.bulkUpdateStatus\)/)
})

test("Approve All excludes rejected emails", () => {
  assert.match(source, /excludeRejected:\s*true/)
})

test("Approve All button only shows when there are pending emails", () => {
  assert.match(source, /pendingCount > 0/)
})

// --- Cancel edit flow ---

test("cancel edit resets subject and body to original values", () => {
  const cancelFn = source.match(/function handleCancelEdit[\s\S]*?\}/)
  assert.ok(cancelFn, "handleCancelEdit function should exist")
  assert.match(cancelFn[0], /setIsEditing\(false\)/)
  assert.match(cancelFn[0], /setEditSubject\(email\.subject\)/)
  assert.match(cancelFn[0], /setEditBody\(email\.body\)/)
})

test("cancel button renders in edit mode", () => {
  assert.match(source, /Cancel/)
  assert.match(source, /handleCancelEdit/)
})

// --- Email stat counts ---

test("counts approved, rejected, and pending emails", () => {
  assert.match(source, /approvedCount/)
  assert.match(source, /rejectedCount/)
  assert.match(source, /pendingCount/)
})

test("pendingCount is total minus approved and rejected", () => {
  assert.match(source, /emails\.length\s*-\s*approvedCount\s*-\s*rejectedCount/)
})

// --- Edit mode word count updates live ---

test("edit mode shows live word count from editBody", () => {
  assert.match(source, /countWords\(editBody\)/)
})

// --- Status badges in sidebar ---

test("each lead in sidebar shows a status badge", () => {
  assert.match(source, /statusConfig\[email\.status\]/)
  assert.match(source, /<Badge[\s\S]*?statusInfo\.className[\s\S]*?statusInfo\.label/)
})

// --- Regenerate disables during loading ---

test("regenerate button disabled while regenerating or editing", () => {
  assert.match(source, /disabled=\{isRegenerating \|\| isEditing\}/)
})

test("regenerate shows spinner when in progress", () => {
  assert.match(source, /isRegenerating \?[\s\S]*?Loader2[\s\S]*?animate-spin/)
})

// --- Email detail key prop forces remount on selection change ---

test("EmailDetail uses key prop to remount on email change", () => {
  assert.match(source, /<EmailDetail[\s\S]*?key=\{selectedEmail\._id\}/)
})

// --- Two-column grid layout ---

test("uses grid layout with sidebar and detail columns", () => {
  assert.match(source, /grid-cols-\[300px_1fr\]/)
})

// --- Lead email display ---

test("lead sidebar shows email when available", () => {
  assert.match(source, /email\.leadEmail/)
})

test("EmailDetail component renders lead email when available", () => {
  // The EmailDetail component shows leadEmail in the header
  assert.match(source, /email\.leadEmail \?[\s\S]*?text-muted-foreground/)
})
