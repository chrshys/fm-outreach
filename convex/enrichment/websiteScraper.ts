import { v } from "convex/values";

import { action } from "../_generated/server";

const FETCH_TIMEOUT_MS = 5000;

export type WebsiteScraperResult = {
  emails: string[];
  socialLinks: {
    facebook: string[];
    instagram: string[];
  };
  products: string[];
  platform: "shopify" | "square" | null;
};

const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const MAILTO_REGEX = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

const FACEBOOK_REGEX =
  /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+/gi;

const INSTAGRAM_REGEX =
  /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/gi;

function isBoilerplateEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".svg") ||
    lower.endsWith(".webp") ||
    lower.includes("example.com") ||
    lower.includes("sentry")
  );
}

function extractEmails(html: string): string[] {
  const mailtoMatches = html.match(MAILTO_REGEX) ?? [];
  const mailtoEmails = mailtoMatches.map((m) =>
    m.replace(/^mailto:/i, "").toLowerCase(),
  );

  const generalMatches = html.match(EMAIL_REGEX) ?? [];
  const generalEmails = generalMatches.map((e) => e.toLowerCase());

  const all = [...mailtoEmails, ...generalEmails];
  const unique = [...new Set(all)].filter((e) => !isBoilerplateEmail(e));
  return unique;
}

function extractSocialLinks(html: string): {
  facebook: string[];
  instagram: string[];
} {
  const fbMatches = html.match(FACEBOOK_REGEX) ?? [];
  const igMatches = html.match(INSTAGRAM_REGEX) ?? [];

  return {
    facebook: [...new Set(fbMatches)],
    instagram: [...new Set(igMatches)],
  };
}

function extractProducts(html: string): string[] {
  const products: string[] = [];

  const ogProductMatch = html.match(
    /<meta[^>]+property=["']og:type["'][^>]+content=["']product["'][^>]*>/gi,
  );
  if (ogProductMatch) {
    const titleMatch = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    );
    if (titleMatch?.[1]) {
      products.push(titleMatch[1]);
    }
  }

  const jsonLdBlocks = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (jsonLdBlocks) {
    for (const block of jsonLdBlocks) {
      const content = block.replace(
        /<script[^>]*>|<\/script>/gi,
        "",
      );
      try {
        const data = JSON.parse(content) as {
          "@type"?: string;
          name?: string;
        };
        if (data["@type"] === "Product" && data.name) {
          products.push(data.name);
        }
      } catch {
        // Ignore malformed JSON-LD
      }
    }
  }

  return [...new Set(products)];
}

function detectPlatform(html: string): "shopify" | "square" | null {
  if (
    html.includes("myshopify.com") ||
    html.includes("cdn.shopify.com") ||
    html.includes("Shopify.theme")
  ) {
    return "shopify";
  }

  if (
    html.includes("squareup.com") ||
    html.includes("square.site") ||
    html.includes("squarespace") === false &&
      html.includes("square-marketplace")
  ) {
    return "square";
  }

  const metaShopify = /<meta[^>]+name=["']generator["'][^>]+content=["'][^"']*Shopify[^"']*["']/i;
  if (metaShopify.test(html)) {
    return "shopify";
  }

  return null;
}

export const scrapeWebsite = action({
  args: {
    url: v.string(),
  },
  handler: async (_ctx, args): Promise<WebsiteScraperResult | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let html: string;
    try {
      const response = await fetch(args.url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; FruitlandBot/1.0)",
          Accept: "text/html",
        },
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        return null;
      }

      html = await response.text();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }

    const emails = extractEmails(html);
    const socialLinks = extractSocialLinks(html);
    const products = extractProducts(html);
    const platform = detectPlatform(html);

    return {
      emails,
      socialLinks,
      products,
      platform,
    };
  },
});
