import type { Doc } from "../_generated/dataModel";

const DEFAULT_SEARCH_LIMIT = 50;

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function compareLeadsByNameAndCity(a: Doc<"leads">, b: Doc<"leads">): number {
  const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  if (nameCompare !== 0) {
    return nameCompare;
  }

  return a.city.localeCompare(b.city, undefined, { sensitivity: "base" });
}

export function searchLeads(
  leads: Doc<"leads">[],
  text: string,
  limit = DEFAULT_SEARCH_LIMIT,
): Doc<"leads">[] {
  const normalizedText = normalizeSearchValue(text);
  if (normalizedText.length === 0) {
    return [];
  }

  return leads
    .filter((lead) => {
      const normalizedName = normalizeSearchValue(lead.name);
      const normalizedCity = normalizeSearchValue(lead.city);

      return (
        normalizedName.includes(normalizedText) || normalizedCity.includes(normalizedText)
      );
    })
    .sort(compareLeadsByNameAndCity)
    .slice(0, limit);
}
