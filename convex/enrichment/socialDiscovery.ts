export type SocialDiscoveryResult = {
  facebook?: string;
  instagram?: string;
};

export type SocialDiscoveryInput = {
  websiteHtml?: string;
  googlePlacesWebsite?: string;
};

const FACEBOOK_URL_REGEX =
  /https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9._-]+)\/?/gi;

const INSTAGRAM_URL_REGEX =
  /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._-]+)\/?/gi;

const FACEBOOK_HOMEPAGE_SLUGS = new Set([
  "",
  "facebook",
  "home",
  "login",
  "watch",
  "marketplace",
  "groups",
  "gaming",
  "pages",
  "help",
  "settings",
  "privacy",
  "policies",
  "sharer",
  "sharer.php",
  "share",
  "dialog",
  "tr",
]);

const INSTAGRAM_HOMEPAGE_SLUGS = new Set([
  "",
  "instagram",
  "explore",
  "reels",
  "stories",
  "accounts",
  "about",
  "legal",
  "privacy",
  "terms",
  "p",
  "tv",
  "direct",
]);

function isValidFacebookPage(url: string): boolean {
  const match = url.match(
    /https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9._-]+)\/?$/i,
  );
  if (!match) return false;

  const slug = match[1].toLowerCase();
  return !FACEBOOK_HOMEPAGE_SLUGS.has(slug);
}

function isValidInstagramPage(url: string): boolean {
  const match = url.match(
    /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._-]+)\/?$/i,
  );
  if (!match) return false;

  const slug = match[1].toLowerCase();
  return !INSTAGRAM_HOMEPAGE_SLUGS.has(slug);
}

function extractFacebookUrls(text: string): string[] {
  const matches = text.match(FACEBOOK_URL_REGEX) ?? [];
  return [...new Set(matches)]
    .map((url) => url.replace(/\/$/, ""))
    .filter(isValidFacebookPage);
}

function extractInstagramUrls(text: string): string[] {
  const matches = text.match(INSTAGRAM_URL_REGEX) ?? [];
  return [...new Set(matches)]
    .map((url) => url.replace(/\/$/, ""))
    .filter(isValidInstagramPage);
}

function extractFromGooglePlacesWebsite(
  website: string,
): SocialDiscoveryResult {
  const result: SocialDiscoveryResult = {};

  if (
    /facebook\.com/i.test(website) &&
    isValidFacebookPage(website.replace(/\/$/, ""))
  ) {
    result.facebook = website.replace(/\/$/, "");
  }

  if (
    /instagram\.com/i.test(website) &&
    isValidInstagramPage(website.replace(/\/$/, ""))
  ) {
    result.instagram = website.replace(/\/$/, "");
  }

  return result;
}

export function discoverSocialLinks(
  input: SocialDiscoveryInput,
): SocialDiscoveryResult {
  const result: SocialDiscoveryResult = {};

  if (input.websiteHtml) {
    const fbUrls = extractFacebookUrls(input.websiteHtml);
    if (fbUrls.length > 0) {
      result.facebook = fbUrls[0];
    }

    const igUrls = extractInstagramUrls(input.websiteHtml);
    if (igUrls.length > 0) {
      result.instagram = igUrls[0];
    }
  }

  if (input.googlePlacesWebsite) {
    const placesResult = extractFromGooglePlacesWebsite(
      input.googlePlacesWebsite,
    );

    if (placesResult.facebook && !result.facebook) {
      result.facebook = placesResult.facebook;
    }

    if (placesResult.instagram && !result.instagram) {
      result.instagram = placesResult.instagram;
    }
  }

  return result;
}
