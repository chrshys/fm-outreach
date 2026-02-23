export const VALID_CATEGORIES = [
  "produce",
  "eggs_dairy",
  "meat_poultry",
  "seafood",
  "baked_goods",
  "pantry",
  "plants",
  "handmade",
  "wellness",
  "beverages",
  "prepared",
] as const;

export type CategoryKey = (typeof VALID_CATEGORIES)[number];

export const LEGACY_CATEGORY_MAP: Record<string, CategoryKey | undefined> = {
  dairy: "eggs_dairy",
  eggs: "eggs_dairy",
  meat: "meat_poultry",
  honey: "pantry",
  "baked goods": "baked_goods",
  preserves: "pantry",
  flowers: "plants",
  nursery: "plants",
  "value-added": undefined,
  other: undefined,
};

export function normalizeCategoryKey(raw: string): CategoryKey | undefined {
  const lower = raw.toLowerCase().trim();
  if ((VALID_CATEGORIES as readonly string[]).includes(lower)) {
    return lower as CategoryKey;
  }
  return LEGACY_CATEGORY_MAP[lower];
}
