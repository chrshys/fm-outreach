export type StalenessLevel = "fresh" | "aging" | "stale"

export function getStaleness(enrichedAt: number): StalenessLevel {
  const daysSince = (Date.now() - enrichedAt) / (1000 * 60 * 60 * 24)
  if (daysSince < 30) return "fresh"
  if (daysSince <= 90) return "aging"
  return "stale"
}

export const STALENESS_CONFIG: Record<StalenessLevel, { label: string; className: string }> = {
  fresh: { label: "Fresh", className: "bg-green-100 text-green-800" },
  aging: { label: "Aging", className: "bg-amber-100 text-amber-800" },
  stale: { label: "Stale", className: "bg-red-100 text-red-800" },
}

export type EnrichmentSourceEntry = { source: string; detail?: string; fetchedAt: number }

export function latestBySource(sources: EnrichmentSourceEntry[]): EnrichmentSourceEntry[] {
  const map = new Map<string, EnrichmentSourceEntry>()
  for (const entry of sources) {
    const existing = map.get(entry.source)
    if (!existing || entry.fetchedAt > existing.fetchedAt) {
      map.set(entry.source, entry)
    }
  }
  return [...map.values()]
}
