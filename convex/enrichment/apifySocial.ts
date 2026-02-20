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
            const items = (await response.json()) as Record<string, unknown>[];
            if (Array.isArray(items) && items.length > 0) {
              const item = items[0];
              if (typeof item.email === "string" && item.email) {
                result.email = item.email;
              }
              if (typeof item.phone === "string" && item.phone) {
                result.phone = item.phone;
              }
              if (typeof item.website === "string" && item.website) {
                result.website = item.website;
              }
            }
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
            const items = (await response.json()) as Record<string, unknown>[];
            if (Array.isArray(items) && items.length > 0) {
              const item = items[0];
              // Extract website from external URL or bio
              if (typeof item.externalUrl === "string" && item.externalUrl) {
                result.website = result.website ?? item.externalUrl;
              }
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
