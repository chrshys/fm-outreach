"use client"

import { Rectangle, Tooltip } from "react-leaflet"
import { getCellColor } from "./cell-colors"
import type { CellStatus } from "./cell-colors"

export type CellData = {
  _id: string
  swLat: number
  swLng: number
  neLat: number
  neLng: number
  depth: number
  status: CellStatus
  resultCount?: number
  querySaturation?: Array<{ query: string; count: number }>
  lastSearchedAt?: number
}

type DiscoveryGridProps = {
  cells: CellData[]
  onCellClick: (cellId: string) => void
}

const MAX_DEPTH = 4

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

export default function DiscoveryGrid({ cells, onCellClick }: DiscoveryGridProps) {
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
            eventHandlers={{ click: () => onCellClick(cell._id) }}
          >
            <Tooltip>{formatTooltip(cell)}</Tooltip>
          </Rectangle>
        )
      })}
    </>
  )
}
