import { v } from "convex/values";

import { action } from "../_generated/server";

const FETCH_TIMEOUT_MS = 5000;

const CONTACT_SUBPAGES = ["/contact", "/about", "/contact-us", "/about-us"];

export type WebsiteScraperResult = {
  emails: string[];
  socialLinks: {
    facebook: string[];
    instagram: string[];
    twitter: string[];
    linkedin: string[];
  };
  products: string[];
  platform: "shopify" | "square" | null;
  rawHtml: string;
};

const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const MAILTO_REGEX = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

const FACEBOOK_REGEX =
  /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+/gi;

const INSTAGRAM_REGEX =
  /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/gi;

const TWITTER_REGEX =
  /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9._-]+/gi;

const LINKEDIN_REGEX =
  /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._-]+/gi;

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

function extractEmails(html: string): string[] {
  const mailtoMatches = html.match(MAILTO_REGEX) ?? [];
  const mailtoEmails = mailtoMatches.map((m) =>
    m.replace(/^mailto:/i, "").split("?")[0].toLowerCase(),
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
  twitter: string[];
  linkedin: string[];
} {
  const fbMatches = html.match(FACEBOOK_REGEX) ?? [];
  const igMatches = html.match(INSTAGRAM_REGEX) ?? [];
  const twMatches = html.match(TWITTER_REGEX) ?? [];
  const liMatches = html.match(LINKEDIN_REGEX) ?? [];

  return {
    facebook: [...new Set(fbMatches)],
    instagram: [...new Set(igMatches)],
    twitter: [...new Set(twMatches)],
    linkedin: [...new Set(liMatches)],
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

function resolveSubpageUrl(baseUrl: string, subpath: string): string | null {
  try {
    const parsed = new URL(baseUrl);
    parsed.pathname = subpath;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function findContactLinks(html: string, baseUrl: string): string[] {
  const CONTACT_LINK_REGEX =
    /<a[^>]+href=["']([^"']*(?:contact|about)[^"']*)["'][^>]*>/gi;
  const links: string[] = [];
  let match;
  while ((match = CONTACT_LINK_REGEX.exec(html)) !== null) {
    const href = match[1];
    try {
      const resolved = new URL(href, baseUrl).toString();
      const resolvedHost = new URL(resolved).hostname;
      const baseHost = new URL(baseUrl).hostname;
      if (resolvedHost === baseHost) {
        links.push(resolved);
      }
    } catch {
      // Skip invalid URLs
    }
  }
  return [...new Set(links)];
}

async function fetchPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
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

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mergeResults(
  base: WebsiteScraperResult,
  subpageHtml: string,
): void {
  const subEmails = extractEmails(subpageHtml);
  for (const email of subEmails) {
    if (!base.emails.includes(email)) {
      base.emails.push(email);
    }
  }

  const subSocial = extractSocialLinks(subpageHtml);
  for (const fb of subSocial.facebook) {
    if (!base.socialLinks.facebook.includes(fb)) {
      base.socialLinks.facebook.push(fb);
    }
  }
  for (const ig of subSocial.instagram) {
    if (!base.socialLinks.instagram.includes(ig)) {
      base.socialLinks.instagram.push(ig);
    }
  }
  for (const tw of subSocial.twitter) {
    if (!base.socialLinks.twitter.includes(tw)) {
      base.socialLinks.twitter.push(tw);
    }
  }
  for (const li of subSocial.linkedin) {
    if (!base.socialLinks.linkedin.includes(li)) {
      base.socialLinks.linkedin.push(li);
    }
  }
}

export const scrapeWebsite = action({
  args: {
    url: v.string(),
  },
  handler: async (_ctx, args): Promise<WebsiteScraperResult | null> => {
    const html = await fetchPage(args.url);
    if (!html) {
      return null;
    }

    const emails = extractEmails(html);
    const socialLinks = extractSocialLinks(html);
    const products = extractProducts(html);
    const platform = detectPlatform(html);

    const result: WebsiteScraperResult = {
      emails,
      socialLinks,
      products,
      platform,
      rawHtml: html,
    };

    // If no emails found on homepage, try contact/about subpages
    if (result.emails.length === 0) {
      // First check for contact-like links in the homepage HTML
      const contactLinks = findContactLinks(html, args.url);
      // Also try common subpage paths
      const subpageUrls = CONTACT_SUBPAGES
        .map((path) => resolveSubpageUrl(args.url, path))
        .filter((u): u is string => u !== null);

      const allUrls = [...new Set([...contactLinks, ...subpageUrls])];

      for (const subUrl of allUrls) {
        const subHtml = await fetchPage(subUrl);
        if (subHtml) {
          mergeResults(result, subHtml);
        }
        // Stop after finding an email
        if (result.emails.length > 0) break;
      }
    }

    return result;
  },
});
