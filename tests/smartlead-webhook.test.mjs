import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/http.ts", "utf8");

// --- HTTP router setup ---

test("imports httpRouter from convex/server", () => {
  assert.match(source, /import\s*\{\s*httpRouter\s*\}\s*from\s*["']convex\/server["']/);
});

test("imports httpAction from generated server", () => {
  assert.match(source, /import\s*\{\s*httpAction\s*\}\s*from\s*["'].\/_generated\/server["']/);
});

test("creates an httpRouter instance", () => {
  assert.match(source, /httpRouter\(\)/);
});

test("exports default http router", () => {
  assert.match(source, /export\s+default\s+http/);
});

// --- Route registration ---

test("registers POST /smartlead-webhook route", () => {
  assert.match(source, /path:\s*["']\/smartlead-webhook["']/);
  assert.match(source, /method:\s*["']POST["']/);
});

// --- Event type validation ---

test("defines EMAIL_SENT as a valid event type", () => {
  assert.match(source, /EMAIL_SENT/);
});

test("defines EMAIL_OPEN as a valid event type", () => {
  assert.match(source, /EMAIL_OPEN/);
});

test("defines EMAIL_LINK_CLICK as a valid event type", () => {
  assert.match(source, /EMAIL_LINK_CLICK/);
});

test("defines EMAIL_REPLY as a valid event type", () => {
  assert.match(source, /EMAIL_REPLY/);
});

test("defines LEAD_UNSUBSCRIBED as a valid event type", () => {
  assert.match(source, /LEAD_UNSUBSCRIBED/);
});

test("defines LEAD_CATEGORY_UPDATED as a valid event type", () => {
  assert.match(source, /LEAD_CATEGORY_UPDATED/);
});

// --- Request validation ---

test("validates request body is valid JSON", () => {
  assert.match(source, /request\.json\(\)/);
  assert.match(source, /Invalid JSON/);
});

test("returns 400 when event_type is missing", () => {
  assert.match(source, /Missing event_type/);
});

test("returns 400 for unknown event types", () => {
  assert.match(source, /Unknown event type/);
});

test("validates event_type with isValidEventType function", () => {
  assert.match(source, /isValidEventType/);
});

// --- Response behavior ---

test("returns 200 OK for valid webhook payloads", () => {
  assert.match(source, /new\s+Response\(["']OK["'],\s*\{\s*status:\s*200\s*\}\)/);
});

test("returns 400 status for invalid requests", () => {
  assert.match(source, /status:\s*400/);
});

// --- Logging ---

test("logs received event type", () => {
  assert.match(source, /\[smartlead-webhook\].*Received/);
});

test("logs unknown event types", () => {
  assert.match(source, /\[smartlead-webhook\].*Unknown event type/);
});

// --- Types ---

test("exports SmartleadEventType type", () => {
  assert.match(source, /export\s+type\s+SmartleadEventType/);
});

test("exports SmartleadWebhookPayload type", () => {
  assert.match(source, /export\s+type\s+SmartleadWebhookPayload/);
});

test("SmartleadWebhookPayload includes event_type field", () => {
  assert.match(source, /event_type:\s*SmartleadEventType/);
});
