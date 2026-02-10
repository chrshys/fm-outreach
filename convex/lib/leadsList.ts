export type LeadStatus =
  | "new_lead"
  | "enriched"
  | "outreach_started"
  | "replied"
  | "meeting_booked"
  | "onboarded"
  | "declined"
  | "not_interested"
  | "bounced"
  | "no_response"
  | "no_email";

export type LeadType = "farm" | "farmers_market" | "retail_store" | "roadside_stand" | "other";

export type LeadSource =
  | "spreadsheet_import"
  | "google_places"
  | "farm_directory"
  | "manual"
  | "web_scrape";

export type LeadSortField = "name" | "city" | "status" | "updatedAt";
export type LeadSortOrder = "asc" | "desc";

export type LeadListItem = {
  _id: string;
  name: string;
  city: string;
  status: LeadStatus;
  type: LeadType;
  source: LeadSource;
  updatedAt: number;
  clusterId?: string;
  contactEmail?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
  };
  nextFollowUpAt?: number;
};

export type LeadListFilters = {
  status?: LeadStatus;
  type?: LeadType;
  clusterId?: string;
  hasEmail?: boolean;
  hasSocial?: boolean;
  hasFacebook?: boolean;
  hasInstagram?: boolean;
  source?: LeadSource;
  needsFollowUp?: boolean;
  now: number;
};

export type LeadListOptions = {
  filters: LeadListFilters;
  sortBy?: LeadSortField;
  sortOrder?: LeadSortOrder;
  cursor?: string;
  pageSize: number;
};

function hasEmail(lead: LeadListItem): boolean {
  return typeof lead.contactEmail === "string" && lead.contactEmail.trim().length > 0;
}

function hasSocial(lead: LeadListItem): boolean {
  return Boolean(
    (typeof lead.socialLinks?.instagram === "string" && lead.socialLinks.instagram.trim().length > 0) ||
      (typeof lead.socialLinks?.facebook === "string" && lead.socialLinks.facebook.trim().length > 0),
  );
}

function hasFacebook(lead: LeadListItem): boolean {
  return typeof lead.socialLinks?.facebook === "string" && lead.socialLinks.facebook.trim().length > 0;
}

function hasInstagram(lead: LeadListItem): boolean {
  return typeof lead.socialLinks?.instagram === "string" && lead.socialLinks.instagram.trim().length > 0;
}

function matchesFilters(lead: LeadListItem, filters: LeadListFilters): boolean {
  if (filters.status !== undefined && lead.status !== filters.status) {
    return false;
  }

  if (filters.type !== undefined && lead.type !== filters.type) {
    return false;
  }

  if (filters.clusterId !== undefined && lead.clusterId !== filters.clusterId) {
    return false;
  }

  if (filters.source !== undefined && lead.source !== filters.source) {
    return false;
  }

  if (filters.hasEmail === true && !hasEmail(lead)) {
    return false;
  }

  if (filters.hasEmail === false && hasEmail(lead)) {
    return false;
  }

  if (filters.hasSocial === true && !hasSocial(lead)) {
    return false;
  }

  if (filters.hasSocial === false && hasSocial(lead)) {
    return false;
  }

  if (filters.hasFacebook === true && !hasFacebook(lead)) {
    return false;
  }

  if (filters.hasFacebook === false && hasFacebook(lead)) {
    return false;
  }

  if (filters.hasInstagram === true && !hasInstagram(lead)) {
    return false;
  }

  if (filters.hasInstagram === false && hasInstagram(lead)) {
    return false;
  }

  if (filters.needsFollowUp === true) {
    if (lead.nextFollowUpAt === undefined || lead.nextFollowUpAt > filters.now) {
      return false;
    }
  }

  if (filters.needsFollowUp === false) {
    if (lead.nextFollowUpAt !== undefined && lead.nextFollowUpAt <= filters.now) {
      return false;
    }
  }

  return true;
}

function compareValues(a: LeadListItem, b: LeadListItem, field: LeadSortField): number {
  if (field === "updatedAt") {
    return a.updatedAt - b.updatedAt;
  }

  return a[field].localeCompare(b[field], undefined, { sensitivity: "base" });
}

function decodeCursor(cursor: string | undefined): number {
  if (cursor === undefined) {
    return 0;
  }

  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export function listLeadsPage(leads: LeadListItem[], options: LeadListOptions): {
  leads: LeadListItem[];
  cursor: string | null;
} {
  const sortBy = options.sortBy ?? "name";
  const sortOrder = options.sortOrder ?? "asc";

  const filtered = leads
    .filter((lead) => matchesFilters(lead, options.filters))
    .sort((a, b) => {
      const comparison = compareValues(a, b, sortBy);
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const start = decodeCursor(options.cursor);
  const end = start + options.pageSize;
  const page = filtered.slice(start, end);
  const nextCursor = end < filtered.length ? String(end) : null;

  return {
    leads: page,
    cursor: nextCursor,
  };
}
