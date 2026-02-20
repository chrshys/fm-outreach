export type SocialDiscoveryResult = {
  facebook?: string;
  instagram?: string;
};

export type SocialDiscoveryInput = {
  googlePlacesWebsite?: string;
};

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
  if (input.googlePlacesWebsite) {
    return extractFromGooglePlacesWebsite(input.googlePlacesWebsite);
  }

  return {};
}
