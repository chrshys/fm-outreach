import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

// Files that should have error toasts for failed operations

const mapPage = fs.readFileSync("src/app/map/page.tsx", "utf8")
const clustersPage = fs.readFileSync("src/app/clusters/page.tsx", "utf8")
const clusterDetail = fs.readFileSync("src/components/clusters/cluster-detail.tsx", "utf8")
const bulkActions = fs.readFileSync("src/components/leads/bulk-actions.tsx", "utf8")
const logActivity = fs.readFileSync("src/components/leads/log-activity.tsx", "utf8")
const logSocialActivity = fs.readFileSync("src/components/leads/log-social-activity.tsx", "utf8")
const logSocialResponse = fs.readFileSync("src/components/leads/log-social-response.tsx", "utf8")
const socialDmComposer = fs.readFileSync("src/components/leads/social-dm-composer.tsx", "utf8")
const emailTemplates = fs.readFileSync("src/components/settings/email-templates.tsx", "utf8")
const leadDetailPage = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")
const followUpPrompt = fs.readFileSync("src/components/leads/follow-up-prompt.tsx", "utf8")
const followUpReminder = fs.readFileSync("src/components/leads/follow-up-reminder.tsx", "utf8")

// -- Import checks: every file with mutations imports toast from sonner --

test("map page imports toast from sonner", () => {
  assert.match(mapPage, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

test("clusters page imports toast from sonner", () => {
  assert.match(clustersPage, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

test("cluster-detail imports toast from sonner", () => {
  assert.match(clusterDetail, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

test("bulk-actions imports toast from sonner", () => {
  assert.match(bulkActions, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

test("log-activity imports toast from sonner", () => {
  assert.match(logActivity, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

test("log-social-activity imports toast from sonner", () => {
  assert.match(logSocialActivity, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

test("log-social-response imports toast from sonner", () => {
  assert.match(logSocialResponse, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

test("social-dm-composer imports toast from sonner", () => {
  assert.match(socialDmComposer, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

test("email-templates imports toast from sonner", () => {
  assert.match(emailTemplates, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

test("lead detail page imports toast from sonner", () => {
  assert.match(leadDetailPage, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

test("follow-up-prompt imports toast from sonner", () => {
  assert.match(followUpPrompt, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

test("follow-up-reminder imports toast from sonner", () => {
  assert.match(followUpReminder, /import\s*\{[^}]*toast[^}]*\}\s*from\s*"sonner"/)
})

// -- Error toast checks: each mutation/action has a catch block with toast.error --

test("map page: createCluster has error toast", () => {
  assert.match(mapPage, /createCluster\(/)
  assert.match(mapPage, /toast\.error\(.*"Failed to create cluster"\)/)
})

test("clusters page: deleteCluster has error toast", () => {
  assert.match(clustersPage, /deleteCluster\(/)
  assert.match(clustersPage, /toast\.error\(.*"Failed to delete cluster"\)/)
})

test("cluster-detail: EditableClusterName save has error toast", () => {
  assert.match(clusterDetail, /toast\.error\(.*"Failed to save name"\)/)
})

test("bulk-actions: handleChangeStatus has error toast", () => {
  assert.match(bulkActions, /bulkUpdateStatus\(/)
  assert.match(bulkActions, /toast\.error\(.*"Failed to update status"\)/)
})

test("bulk-actions: handleAssignCluster has error toast", () => {
  assert.match(bulkActions, /bulkAssignCluster\(/)
  assert.match(bulkActions, /toast\.error\(.*"Failed to assign cluster"\)/)
})

test("log-activity: createActivity has error toast", () => {
  assert.match(logActivity, /createActivity\(/)
  assert.match(logActivity, /toast\.error\(.*"Failed to log activity"\)/)
})

test("log-social-activity: createActivity has error toast", () => {
  assert.match(logSocialActivity, /createActivity\(/)
  assert.match(logSocialActivity, /toast\.error\(.*"Failed to log activity"\)/)
})

test("log-social-response: createActivity has error toast", () => {
  assert.match(logSocialResponse, /createActivity\(/)
  assert.match(logSocialResponse, /toast\.error\(.*"Failed to log response"\)/)
})

test("social-dm-composer: handleLogActivity has error toast", () => {
  assert.match(socialDmComposer, /createActivity\(/)
  assert.match(socialDmComposer, /toast\.error\(.*"Failed to log activity"\)/)
})

test("email-templates: handleSave has error toast", () => {
  assert.match(emailTemplates, /toast\.error\(.*"Failed to save template"\)/)
})

test("email-templates: handleDelete has error toast", () => {
  assert.match(emailTemplates, /toast\.error\(.*"Failed to delete template"\)/)
})

test("lead detail: updateField has error toast", () => {
  assert.match(leadDetailPage, /updateLead\(/)
  assert.match(leadDetailPage, /toast\.error\(.*"Failed to update field"\)/)
})

test("lead detail: updateSocialLink has error toast", () => {
  assert.match(leadDetailPage, /toast\.error\(.*"Failed to update social link"\)/)
})

test("lead detail: updateStatus has error toast", () => {
  assert.match(leadDetailPage, /updateLeadStatus\(/)
  assert.match(leadDetailPage, /toast\.error\(.*"Failed to update status"\)/)
})

test("lead detail: InlineEditableValue has error toast on save failure", () => {
  assert.match(leadDetailPage, /toast\.error\(.*"Failed to save changes"\)/)
})

test("follow-up-prompt: setFollowUp has error toast", () => {
  assert.match(followUpPrompt, /setFollowUp\(/)
  assert.match(followUpPrompt, /toast\.error\(.*"Failed to set follow-up"\)/)
})

test("follow-up-reminder: setFollowUp has error toast", () => {
  assert.match(followUpReminder, /setFollowUp\(/)
  assert.match(followUpReminder, /toast\.error\(.*"Failed to set follow-up reminder"\)/)
})

// -- Error message extraction pattern: all catch blocks use err instanceof Error --

test("all error toasts extract error message with instanceof check", () => {
  const files = [
    { name: "map page", source: mapPage },
    { name: "clusters page", source: clustersPage },
    { name: "cluster-detail", source: clusterDetail },
    { name: "bulk-actions", source: bulkActions },
    { name: "log-activity", source: logActivity },
    { name: "log-social-activity", source: logSocialActivity },
    { name: "log-social-response", source: logSocialResponse },
    { name: "social-dm-composer", source: socialDmComposer },
    { name: "email-templates", source: emailTemplates },
    { name: "lead detail page", source: leadDetailPage },
    { name: "follow-up-prompt", source: followUpPrompt },
    { name: "follow-up-reminder", source: followUpReminder },
  ]

  for (const { name, source } of files) {
    const toastErrorCalls = source.match(/toast\.error\(/g)
    assert.ok(toastErrorCalls && toastErrorCalls.length > 0, `${name} should have at least one toast.error call`)

    const instanceofPattern = /err instanceof Error \? err\.message :/g
    const instanceofMatches = source.match(instanceofPattern)
    assert.ok(
      instanceofMatches && instanceofMatches.length > 0,
      `${name} should use 'err instanceof Error ? err.message :' pattern`,
    )
  }
})
