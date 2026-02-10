export type ImportedLead = {
  name: string;
  type: "farm" | "farmers_market";
  address: string;
  city: string;
  region: string;
  province: "ON";
  source: "spreadsheet_import";
  status: "new_lead";
  consentSource: string;
  followUpCount: 0;
  createdAt: number;
  updatedAt: number;
  contactEmail?: string;
  website?: string;
  contactPhone?: string;
  notes?: string;
  socialLinks?: {
    instagram?: string;
  };
};

type BuildLeadOptions = {
  filename: string;
  now: number;
  importDate: string;
};

const DEFAULT_REGION = "Niagara";

export function deriveLeadType(categories: string): ImportedLead["type"] {
  return /farmer['’]s market/i.test(categories) ? "farmers_market" : "farm";
}

export function buildImportedLead(
  row: Record<string, string>,
  options: BuildLeadOptions,
): ImportedLead {
  const name = row["Name"]?.trim() ?? "";
  const contactEmail = row["Email address"]?.trim() ?? "";
  const website = row["URL"]?.trim() ?? "";
  const instagram = row["Instagram"]?.trim() ?? "";
  const contactPhone = row["Phone"]?.trim() ?? "";
  const address = row["Address"]?.trim() ?? "";
  const city = row["Town / City"]?.trim() ?? "";
  const notes = row["Hours"]?.trim() ?? "";
  const categories = row["Categories"]?.trim() ?? "";

  return {
    name,
    type: deriveLeadType(categories),
    address,
    city,
    region: DEFAULT_REGION,
    province: "ON",
    source: "spreadsheet_import",
    status: "new_lead",
    consentSource: `spreadsheet_import - ${options.filename} - ${options.importDate}`,
    followUpCount: 0,
    createdAt: options.now,
    updatedAt: options.now,
    ...(contactEmail ? { contactEmail } : {}),
    ...(website ? { website } : {}),
    ...(contactPhone ? { contactPhone } : {}),
    ...(notes ? { notes } : {}),
    ...(instagram ? { socialLinks: { instagram } } : {}),
  };
}
