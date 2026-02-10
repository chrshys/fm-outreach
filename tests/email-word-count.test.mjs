import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const actionSource = fs.readFileSync("convex/email/generateEmail.ts", "utf8");
const composerSource = fs.readFileSync("src/components/leads/email-composer.tsx", "utf8");

// --- Backend: countBodyWords ---

test("exports countBodyWords function", () => {
  assert.match(actionSource, /export\s+function\s+countBodyWords\(/);
});

test("countBodyWords strips CASL footer before counting", () => {
  assert.match(actionSource, /body\.indexOf\("\\n---\\n"\)/);
  assert.match(actionSource, /body\.slice\(0,\s*footerIndex\)/);
});

test("countBodyWords splits on whitespace and filters empty strings", () => {
  assert.match(actionSource, /\.trim\(\)\.split\(\/\\s\+\/\)\.filter\(Boolean\)\.length/);
});

test("countBodyWords returns full body word count when no footer present", () => {
  assert.match(actionSource, /footerIndex !== -1 \? body\.slice\(0, footerIndex\) : body/);
});

// --- Backend: word count constants ---

test("defines EMAIL_MIN_WORDS as 50", () => {
  assert.match(actionSource, /const\s+EMAIL_MIN_WORDS\s*=\s*50/);
});

test("defines EMAIL_MAX_WORDS as 125", () => {
  assert.match(actionSource, /const\s+EMAIL_MAX_WORDS\s*=\s*125/);
});

// --- Backend: word count validation after generation ---

test("validates word count after generating email", () => {
  assert.match(actionSource, /const\s+wordCount\s*=\s*countBodyWords\(result\.body\)/);
});

test("throws when word count is below minimum", () => {
  assert.match(actionSource, /wordCount\s*<\s*EMAIL_MIN_WORDS/);
});

test("throws when word count is above maximum", () => {
  assert.match(actionSource, /wordCount\s*>\s*EMAIL_MAX_WORDS/);
});

test("error message includes actual word count and allowed range", () => {
  assert.match(actionSource, /Generated email body is \$\{wordCount\} words \(must be \$\{EMAIL_MIN_WORDS\}-\$\{EMAIL_MAX_WORDS\}\)/);
});

test("word count validation runs after subject/body presence check", () => {
  const presenceCheck = actionSource.indexOf("missing subject or body");
  const wordCountCheck = actionSource.indexOf("countBodyWords(result.body)");
  assert.ok(presenceCheck > 0, "presence check should exist");
  assert.ok(wordCountCheck > 0, "word count check should exist");
  assert.ok(wordCountCheck > presenceCheck, "word count check should come after presence check");
});

// --- Frontend: word count range indicator ---

test("word counter shows destructive color when out of 50-125 range", () => {
  assert.match(composerSource, /wordCount < 50 \|\| wordCount > 125/);
  assert.match(composerSource, /text-destructive/);
});

// --- Prompt still includes word count instruction ---

test("generation prompt includes 50-125 word constraint", () => {
  assert.match(actionSource, /50-125\s*words/);
});

test("generation prompt excludes CASL footer from word count", () => {
  assert.match(actionSource, /NOT counting the CASL footer/);
});
