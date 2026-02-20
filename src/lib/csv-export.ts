type ExportLead = {
  name: string;
  type: string;
  locationDescription?: string;
  imagePrompt?: string;
  categories?: string[];
  address?: string;
  city?: string;
  region?: string;
  province?: string;
  postalCode?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  website?: string;
  socialLinks?: { instagram?: string; facebook?: string };
  products?: string[];
};

const CSV_COLUMNS = [
  "name",
  "type",
  "description",
  "address",
  "city",
  "state",
  "postalCode",
  "countryCode",
  "latitude",
  "longitude",
  "placeId",
  "website",
  "instagram",
  "facebook",
  "products",
  "imagePrompt",
  "categories",
] as const;

function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function leadsToCSV(leads: ExportLead[]): string {
  const header = CSV_COLUMNS.join(",");

  const rows = leads.map((lead) => {
    const values: string[] = [
      lead.name ?? "",
      lead.type ?? "",
      lead.locationDescription ?? "",
      lead.address ?? "",
      lead.city ?? "",
      lead.province ?? lead.region ?? "",
      lead.postalCode ?? "",
      lead.countryCode ?? "",
      lead.latitude != null ? String(lead.latitude) : "",
      lead.longitude != null ? String(lead.longitude) : "",
      lead.placeId ?? "",
      lead.website ?? "",
      lead.socialLinks?.instagram ?? "",
      lead.socialLinks?.facebook ?? "",
      lead.products ? lead.products.join(", ") : "",
      lead.imagePrompt ?? "",
      lead.categories ? lead.categories.join(", ") : "",
    ];
    return values.map(escapeField).join(",");
  });

  return [header, ...rows].join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
