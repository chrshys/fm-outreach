import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const composerSource = fs.readFileSync("src/components/leads/social-dm-composer.tsx", "utf8")
const logActivitySource = fs.readFileSync("src/components/leads/log-social-activity.tsx", "utf8")
const logResponseSource = fs.readFileSync("src/components/leads/log-social-response.tsx", "utf8")

test("SocialDmComposer imports FollowUpPrompt", () => {
  assert.match(composerSource, /import \{ FollowUpPrompt \} from "\.\/follow-up-prompt"/)
})

test("SocialDmComposer shows follow-up prompt after logging activity", () => {
  assert.match(composerSource, /setShowFollowUpPrompt\(true\)/)
  assert.match(composerSource, /<FollowUpPrompt/)
  assert.match(composerSource, /open=\{showFollowUpPrompt\}/)
  assert.match(composerSource, /onOpenChange=\{setShowFollowUpPrompt\}/)
})

test("SocialDmComposer tracks follow-up prompt state", () => {
  assert.match(composerSource, /useState\(false\)/)
  assert.match(composerSource, /showFollowUpPrompt/)
})

test("LogSocialActivity imports FollowUpPrompt", () => {
  assert.match(logActivitySource, /import \{ FollowUpPrompt \} from "\.\/follow-up-prompt"/)
})

test("LogSocialActivity shows follow-up prompt only for DM sent activities", () => {
  assert.match(logActivitySource, /wasDmSent/)
  assert.match(logActivitySource, /activeAction\.type === "social_dm_sent"/)
  assert.match(logActivitySource, /setShowFollowUpPrompt\(true\)/)
  assert.match(logActivitySource, /<FollowUpPrompt/)
})

test("LogSocialResponse imports FollowUpPrompt", () => {
  assert.match(logResponseSource, /import \{ FollowUpPrompt \} from "\.\/follow-up-prompt"/)
})

test("LogSocialResponse shows follow-up prompt after logging response", () => {
  assert.match(logResponseSource, /setShowFollowUpPrompt\(true\)/)
  assert.match(logResponseSource, /<FollowUpPrompt/)
  assert.match(logResponseSource, /open=\{showFollowUpPrompt\}/)
  assert.match(logResponseSource, /onOpenChange=\{setShowFollowUpPrompt\}/)
})
