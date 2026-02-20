import { v } from "convex/values";

import { action } from "../_generated/server";

export type ApifyWebsiteResult = {
  emails: string[];
  phones: string[];
  socialLinks: {
    facebook: string | null;
    instagram: string | null;
  };
};

const APIFY_RUN_URL =
  "https://api.apify.com/v2/acts/betterdevsscrape~contact-details-extractor/run-sync-get-dataset-items";

const FACEBOOK_REGEX =
  /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+/i;

const INSTAGRAM_REGEX =
  /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/i;

function isBoilerplateEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".svg") ||
    lower.endsWith(".webp") ||
    lower.includes("example.com") ||
    lower.includes("sentry") ||
    lower.startsWith("noreply@") ||
    lower.startsWith("no-reply@") ||
    lower.includes("wixpress.com") ||
    lower.includes("wordpress.com") ||
    lower.includes("squarespace.com")
  );
}

function findSocialLink(
  data: Record<string, unknown>,
  regex: RegExp,
): string | null {
  const json = JSON.stringify(data);
  const match = json.match(regex);
  return match ? match[0] : null;
}

export const scrapeContacts = action({
  args: {
    url: v.string(),
  },
  handler: async (_ctx, args): Promise<ApifyWebsiteResult | null> => {
    const apiToken = process.env.APIFY_API_TOKEN;
    if (!apiToken) {
      return null;
    }

    const response = await fetch(APIFY_RUN_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startUrls: [{ url: args.url }],
        maxDepth: 0,
      }),
    });

    if (response.status === 429) {
      throw new Error("Apify rate limit exceeded (429)");
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Apify request failed: ${response.status} ${body}`,
      );
    }

    let items: unknown[];
    try {
      items = (await response.json()) as unknown[];
    } catch {
      return null;
    }

    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    const item = items[0] as Record<string, unknown>;

    // Extract emails
    const rawEmails = Array.isArray(item.emails)
      ? (item.emails as string[])
      : [];
    const emails = rawEmails
      .filter((e): e is string => typeof e === "string")
      .filter((e) => !isBoilerplateEmail(e));

    // Extract phones
    const phones = Array.isArray(item.phones)
      ? (item.phones as string[]).filter(
          (p): p is string => typeof p === "string",
        )
      : [];

    // Extract social links
    const facebook = findSocialLink(item, FACEBOOK_REGEX);
    const instagram = findSocialLink(item, INSTAGRAM_REGEX);

    return {
      emails,
      phones,
      socialLinks: {
        facebook,
        instagram,
      },
    };
  },
});
