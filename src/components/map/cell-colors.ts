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

export function getCellColor(status: string): CellColorResult {
  return CELL_COLORS[status as CellStatus] ?? DEFAULT_CELL_COLOR
}
