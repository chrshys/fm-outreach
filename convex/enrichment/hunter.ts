import { v } from "convex/values";

import { action } from "../_generated/server";

const DOMAIN_SEARCH_URL = "https://api.hunter.io/v2/domain-search";

export type HunterEmail = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  confidence: number;
};

export type HunterResult = {
  domain: string;
  emails: HunterEmail[];
};

type HunterApiEmail = {
  value?: string;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  confidence?: number;
};

type HunterApiResponse = {
  data?: {
    domain?: string;
    emails?: HunterApiEmail[];
  };
  errors?: Array<{ id?: string; code?: number; details?: string }>;
};

function parseEmails(apiEmails: HunterApiEmail[]): HunterEmail[] {
  return apiEmails
    .filter((e) => e.value)
    .map((e) => ({
      email: e.value!,
      firstName: e.first_name ?? null,
      lastName: e.last_name ?? null,
      position: e.position ?? null,
      confidence: e.confidence ?? 0,
    }));
}

export const searchDomain = action({
  args: {
    domain: v.string(),
  },
  handler: async (_ctx, args): Promise<HunterResult | null> => {
    const apiKey = process.env.HUNTER_API_KEY;

    if (!apiKey) {
      return null;
    }

    const encodedDomain = encodeURIComponent(args.domain);
    const response = await fetch(
      `${DOMAIN_SEARCH_URL}?domain=${encodedDomain}&api_key=${apiKey}`,
    );

    if (response.status === 429) {
      throw new Error("Hunter.io rate limit exceeded");
    }

    if (!response.ok) {
      throw new Error(`Hunter.io API error: ${response.status}`);
    }

    const data = (await response.json()) as HunterApiResponse;

    if (data.errors && data.errors.length > 0) {
      const err = data.errors[0];
      throw new Error(
        `Hunter.io error: ${err.details ?? err.id ?? "unknown"}`,
      );
    }

    if (!data.data?.emails || data.data.emails.length === 0) {
      return {
        domain: args.domain,
        emails: [],
      };
    }

    const emails = parseEmails(data.data.emails);

    return {
      domain: args.domain,
      emails,
    };
  },
});
