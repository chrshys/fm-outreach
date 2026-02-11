"use client"

import { Rectangle, Tooltip } from "react-leaflet"
import { getCellColor } from "./cell-colors"
import type { CellStatus } from "./cell-colors"

export type CellAction =
  | { type: "search"; mechanism: string }
  | { type: "subdivide" }
  | { type: "undivide" }

export type CellData = {
  _id: string
  swLat: number
  swLng: number
  neLat: number
  neLng: number
  depth: number
  status: CellStatus
  parentCellId?: string
  resultCount?: number
  querySaturation?: Array<{ query: string; count: number }>
  lastSearchedAt?: number
}

type DiscoveryGridProps = {
  cells: CellData[]
  onCellAction: (cellId: string, action: CellAction) => void
}

export const DISCOVERY_MECHANISMS = [
  { id: "google_places", label: "Google Places", enabled: true },
  { id: "web_scraper", label: "Web Scraping", enabled: false },
] as const

const MAX_DEPTH = 4

export function getAvailableActions(cell: CellData): CellAction[] {
  if (cell.status === "searching") return []

  const actions: CellAction[] = DISCOVERY_MECHANISMS
    .filter((m) => m.enabled)
    .map((m) => ({ type: "search" as const, mechanism: m.id }))

  if (cell.depth < MAX_DEPTH) {
    actions.push({ type: "subdivide" })
  }

  if (cell.parentCellId) {
    actions.push({ type: "undivide" })
  }

  return actions
}

function formatTooltip(cell: CellData): string {
  const label = cell.status.charAt(0).toUpperCase() + cell.status.slice(1)

  if (cell.status === "unsearched") return "Unsearched"
  if (cell.status === "searching") return "Searching…"

  const parts = [`${label} — ${cell.resultCount ?? 0} results`]

  if (cell.status === "saturated" && cell.querySaturation) {
    const topQueries = cell.querySaturation
      .filter((qs) => qs.count >= 20)
      .map((qs) => `${qs.query} (${qs.count})`)
    if (topQueries.length > 0) {
      parts.push(`Dense: ${topQueries.join(", ")}`)
    }
    if (cell.depth < MAX_DEPTH) {
      parts.push("Click to subdivide")
    } else {
      parts.push("Max depth reached")
    }
  }

  return parts.join("\n")
}

export default function DiscoveryGrid({ cells, onCellAction }: DiscoveryGridProps) {
  return (
    <>
      {cells.map((cell) => {
        const pathOptions = getCellColor(cell.status)
        const bounds: [[number, number], [number, number]] = [
          [cell.swLat, cell.swLng],
          [cell.neLat, cell.neLng],
        ]
        return (
          <Rectangle
            key={cell._id}
            bounds={bounds}
            pathOptions={pathOptions}
            eventHandlers={{ click: () => onCellAction(cell._id, { type: "search", mechanism: "click" }) }}
          >
            <Tooltip>{formatTooltip(cell)}</Tooltip>
          </Rectangle>
        )
      })}
    </>
  )
}
