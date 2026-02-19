import type { StalenessLevel } from "@/lib/enrichment"
import { getStaleness } from "@/lib/enrichment"

export type CellStatus = "unsearched" | "searching" | "searched" | "saturated"

interface CellColorResult {
  color: string
  fillColor: string
  fillOpacity: number
}

const CELL_COLORS: Record<CellStatus, CellColorResult> = {
  unsearched: { color: "#9ca3af", fillColor: "#9ca3af", fillOpacity: 0.15 },
  searching: { color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.25 },
  searched: { color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.2 },
  saturated: { color: "#f97316", fillColor: "#f97316", fillOpacity: 0.3 },
}

const DEFAULT_CELL_COLOR: CellColorResult = {
  color: "#9ca3af",
  fillColor: "#9ca3af",
  fillOpacity: 0.15,
}

export const VIRTUAL_CELL_STYLE = {
  color: "#9ca3af",
  fillColor: "#9ca3af",
  fillOpacity: 0.08,
  weight: 1,
}

export const VIRTUAL_CELL_FAINT_STYLE = {
  color: "#d1d5db",
  fillColor: "#d1d5db",
  fillOpacity: 0.05,
  weight: 0.5,
}

export const VIRTUAL_CELL_SELECTED_STYLE = {
  color: "#2563eb",
  fillColor: "#9ca3af",
  fillOpacity: 0.12,
  weight: 3,
  dashArray: "6 4",
}

export const SEARCHED_FRESHNESS: Record<StalenessLevel, CellColorResult> = {
  fresh: { color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.2 },
  aging: { color: "#a3e635", fillColor: "#a3e635", fillOpacity: 0.2 },
  stale: { color: "#ca8a04", fillColor: "#ca8a04", fillOpacity: 0.2 },
}

export const SATURATED_FRESHNESS: Record<StalenessLevel, CellColorResult> = {
  fresh: { color: "#f97316", fillColor: "#f97316", fillOpacity: 0.3 },
  aging: { color: "#d97706", fillColor: "#d97706", fillOpacity: 0.25 },
  stale: { color: "#92400e", fillColor: "#92400e", fillOpacity: 0.2 },
}

export function getCellColor(status: string, lastSearchedAt?: number): CellColorResult {
  if (lastSearchedAt !== undefined) {
    const staleness = getStaleness(lastSearchedAt)
    if (status === "searched") return SEARCHED_FRESHNESS[staleness]
    if (status === "saturated") return SATURATED_FRESHNESS[staleness]
  }
  return CELL_COLORS[status as CellStatus] ?? DEFAULT_CELL_COLOR
}
