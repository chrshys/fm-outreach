import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const VALID_EVENT_TYPES = [
  "EMAIL_SENT",
  "EMAIL_OPEN",
  "EMAIL_LINK_CLICK",
  "EMAIL_REPLY",
  "LEAD_UNSUBSCRIBED",
  "LEAD_CATEGORY_UPDATED",
] as const;

export type SmartleadEventType = (typeof VALID_EVENT_TYPES)[number];

export type SmartleadWebhookPayload = {
  event_type: SmartleadEventType;
  [key: string]: unknown;
};

function isValidEventType(type: unknown): type is SmartleadEventType {
  return (
    typeof type === "string" &&
    (VALID_EVENT_TYPES as readonly string[]).includes(type)
  );
}

const EVENT_HANDLER_MAP = {
  EMAIL_SENT: internal.smartlead.webhookHandlers.handleEmailSent,
  EMAIL_OPEN: internal.smartlead.webhookHandlers.handleEmailOpen,
  EMAIL_LINK_CLICK: internal.smartlead.webhookHandlers.handleEmailLinkClick,
  EMAIL_REPLY: internal.smartlead.webhookHandlers.handleEmailReply,
  LEAD_UNSUBSCRIBED: internal.smartlead.webhookHandlers.handleLeadUnsubscribed,
  LEAD_CATEGORY_UPDATED:
    internal.smartlead.webhookHandlers.handleLeadCategoryUpdated,
} as const;

const smartleadWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("event_type" in body)) {
    return new Response("Missing event_type", { status: 400 });
  }

  const { event_type } = body as { event_type: unknown };

  if (!isValidEventType(event_type)) {
    console.log(
      `[smartlead-webhook] Unknown event type: ${String(event_type)}`,
    );
    return new Response("Unknown event type", { status: 400 });
  }

  console.log(`[smartlead-webhook] Received ${event_type} event`);

  const handler = EVENT_HANDLER_MAP[event_type];
  await ctx.runMutation(handler, { payload: body as Record<string, unknown> });

  return new Response("OK", { status: 200 });
});

const http = httpRouter();

http.route({
  path: "/smartlead-webhook",
  method: "POST",
  handler: smartleadWebhook,
});

export default http;
