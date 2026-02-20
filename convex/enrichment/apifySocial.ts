import { v } from "convex/values";

import { action } from "../_generated/server";

export type ApifySocialResult = {
  email: string | null;
  phone: string | null;
  website: string | null;
};

const FACEBOOK_RUN_URL =
  "https://api.apify.com/v2/acts/apify~facebook-page-contact-information/run-sync-get-dataset-items";

const INSTAGRAM_RUN_URL =
  "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items";

const APIFY_TIMEOUT_MS = 30_000;

function parseFacebookItem(data: unknown): {
  email: string | null;
  phone: string | null;
  website: string | null;
} {
  const empty = { email: null, phone: null, website: null };
  if (!Array.isArray(data) || data.length === 0) return empty;

  const item = data[0];
  if (typeof item !== "object" || item === null) return empty;

  const obj = item as Record<string, unknown>;
  return {
    email: typeof obj.email === "string" && obj.email ? obj.email : null,
    phone: typeof obj.phone === "string" && obj.phone ? obj.phone : null,
    website: typeof obj.website === "string" && obj.website ? obj.website : null,
  };
}

function parseInstagramItem(data: unknown): { externalUrl: string | null } {
  if (!Array.isArray(data) || data.length === 0) return { externalUrl: null };

  const item = data[0];
  if (typeof item !== "object" || item === null) return { externalUrl: null };

  const obj = item as Record<string, unknown>;
  return {
    externalUrl:
      typeof obj.externalUrl === "string" && obj.externalUrl
        ? obj.externalUrl
        : null,
  };
}

export const scrapeSocialPages = action({
  args: {
    facebookUrl: v.optional(v.string()),
    instagramUsername: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<ApifySocialResult | null> => {
    const apiToken = process.env.APIFY_API_TOKEN;
    if (!apiToken) {
      return null;
    }

    if (!args.facebookUrl && !args.instagramUsername) {
      return null;
    }

    const result: ApifySocialResult = {
      email: null,
      phone: null,
      website: null,
    };

    // Facebook scrape
    if (args.facebookUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          APIFY_TIMEOUT_MS,
        );

        try {
          const response = await fetch(FACEBOOK_RUN_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ pageUrls: [args.facebookUrl] }),
            signal: controller.signal,
          });

          if (response.ok) {
            let data: unknown;
            try {
              data = await response.json();
            } catch {
              data = null;
            }
            const fb = parseFacebookItem(data);
            if (fb.email) result.email = fb.email;
            if (fb.phone) result.phone = fb.phone;
            if (fb.website) result.website = fb.website;
          }
        } finally {
          clearTimeout(timeout);
        }
      } catch {
        // Facebook call failed — continue to Instagram
      }
    }

    // Instagram scrape (only if still missing email)
    if (args.instagramUsername && !result.email) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          APIFY_TIMEOUT_MS,
        );

        try {
          const response = await fetch(INSTAGRAM_RUN_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ usernames: [args.instagramUsername] }),
            signal: controller.signal,
          });

          if (response.ok) {
            let data: unknown;
            try {
              data = await response.json();
            } catch {
              data = null;
            }
            const ig = parseInstagramItem(data);
            if (ig.externalUrl) {
              result.website = result.website ?? ig.externalUrl;
            }
          }
        } finally {
          clearTimeout(timeout);
        }
      } catch {
        // Instagram call failed — return what we have
      }
    }

    return result;
  },
});
