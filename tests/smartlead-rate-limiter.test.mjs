import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/smartlead/rateLimiter.ts", "utf8");
const clientSource = fs.readFileSync("convex/smartlead/client.ts", "utf8");

// --- Module structure ---

test("rateLimiter exports rateLimitedFetch function", () => {
  assert.match(source, /export\s+async\s+function\s+rateLimitedFetch\(/);
});

test("rateLimitedFetch accepts url and options parameters", () => {
  assert.match(
    source,
    /rateLimitedFetch\(\s*url:\s*string,\s*options:\s*RequestInit/,
  );
});

test("rateLimitedFetch returns a Promise<Response>", () => {
  assert.match(source, /Promise<Response>/);
});

// --- Token bucket type ---

test("defines TokenBucket type with tokens, lastRefill, maxTokens, refillIntervalMs", () => {
  assert.match(source, /type\s+TokenBucket\s*=/);
  assert.match(source, /tokens:\s*number/);
  assert.match(source, /lastRefill:\s*number/);
  assert.match(source, /maxTokens:\s*number/);
  assert.match(source, /refillIntervalMs:\s*number/);
});

// --- Two-window configuration ---

test("short bucket allows 10 requests per 2-second window", () => {
  assert.match(source, /createBucket\(10,\s*2[_]?000\)/);
});

test("long bucket allows 60 requests per 60-second window", () => {
  assert.match(source, /createBucket\(60,\s*60[_]?000\)/);
});

test("defines both shortBucket and longBucket", () => {
  assert.match(source, /const\s+shortBucket\s*=/);
  assert.match(source, /const\s+longBucket\s*=/);
});

// --- Bucket refill logic ---

test("refillBucket resets tokens to maxTokens when interval has elapsed", () => {
  assert.match(source, /bucket\.tokens\s*=\s*bucket\.maxTokens/);
  assert.match(source, /bucket\.lastRefill\s*=\s*now/);
});

test("refillBucket checks elapsed time against refillIntervalMs", () => {
  assert.match(source, /elapsed\s*>=\s*bucket\.refillIntervalMs/);
});

// --- Token availability check ---

test("hasToken checks if bucket has available tokens after refill", () => {
  assert.match(source, /function\s+hasToken\(bucket:\s*TokenBucket\)/);
  assert.match(source, /bucket\.tokens\s*>\s*0/);
});

test("consume decrements bucket tokens", () => {
  assert.match(source, /function\s+consume\(bucket:\s*TokenBucket\)/);
  assert.match(source, /bucket\.tokens--/);
});

// --- waitForTokens atomicity ---

test("waitForTokens checks both buckets before consuming", () => {
  const waitFn = source.slice(
    source.indexOf("async function waitForTokens"),
    source.indexOf("export async function rateLimitedFetch"),
  );
  assert.match(waitFn, /hasToken\(shortBucket\)\s*&&\s*hasToken\(longBucket\)/);
});

test("waitForTokens consumes from both buckets atomically when both have tokens", () => {
  const waitFn = source.slice(
    source.indexOf("async function waitForTokens"),
    source.indexOf("export async function rateLimitedFetch"),
  );
  assert.match(waitFn, /consume\(shortBucket\)/);
  assert.match(waitFn, /consume\(longBucket\)/);
});

// --- Retry configuration ---

test("MAX_RETRIES is set to 3", () => {
  assert.match(source, /const\s+MAX_RETRIES\s*=\s*3/);
});

test("BASE_BACKOFF_MS is set to 1000 (1 second)", () => {
  assert.match(source, /const\s+BASE_BACKOFF_MS\s*=\s*1[_]?000/);
});

// --- 429 retry with exponential backoff ---

test("rateLimitedFetch checks for 429 status code", () => {
  assert.match(source, /response\.status\s*!==\s*429/);
});

test("rateLimitedFetch uses exponential backoff on 429", () => {
  assert.match(source, /BASE_BACKOFF_MS\s*\*\s*Math\.pow\(2,\s*attempt\)/);
});

test("rateLimitedFetch retries up to MAX_RETRIES times", () => {
  assert.match(source, /attempt\s*<=\s*MAX_RETRIES/);
  assert.match(source, /attempt\s*===\s*MAX_RETRIES/);
});

test("rateLimitedFetch returns the 429 response after exhausting retries", () => {
  const retryBlock = source.slice(
    source.indexOf("for (let attempt"),
    source.indexOf("// Unreachable"),
  );
  assert.match(retryBlock, /return\s+response/);
});

// --- Logging ---

test("logs rate limit wait times", () => {
  assert.match(source, /\[smartlead-rate-limiter\]\s*Waiting/);
});

test("logs 429 retry attempts with attempt number", () => {
  assert.match(source, /\[smartlead-rate-limiter\]\s*429\s*received/);
  assert.match(source, /retry\s+\$\{attempt\s*\+\s*1\}\/\$\{MAX_RETRIES\}/);
});

test("logs when giving up after max retries", () => {
  assert.match(source, /giving\s+up/);
});

// --- Sleep helper ---

test("defines sleep helper using setTimeout", () => {
  assert.match(source, /function\s+sleep\(ms:\s*number\)/);
  assert.match(source, /setTimeout\(resolve,\s*ms\)/);
});

// --- msUntilRefill ---

test("msUntilRefill calculates remaining time until bucket refills", () => {
  assert.match(source, /function\s+msUntilRefill\(bucket:\s*TokenBucket\)/);
  assert.match(source, /bucket\.refillIntervalMs\s*-\s*elapsed/);
});

// --- Client integration ---

test("client.ts imports rateLimitedFetch from rateLimiter", () => {
  assert.match(clientSource, /import\s*\{\s*rateLimitedFetch\s*\}\s*from\s*["']\.\/rateLimiter["']/);
});

test("client.ts uses rateLimitedFetch instead of bare fetch", () => {
  assert.match(clientSource, /rateLimitedFetch\(url,/);
});

test("client.ts no longer has inline 429 handling (delegated to rate limiter)", () => {
  assert.doesNotMatch(clientSource, /response\.status\s*===\s*429/);
  assert.doesNotMatch(clientSource, /rate\s+limit\s+exceeded/i);
});

// --- Testing helper ---

test("exports _resetBucketsForTesting helper", () => {
  assert.match(source, /export\s+function\s+_resetBucketsForTesting\(\)/);
});
