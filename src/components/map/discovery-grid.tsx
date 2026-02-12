"use client"

import { Rectangle } from "react-leaflet"
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
  selectedCellId: string | null
  onCellSelect: (cellId: string | null) => void
}

export const DISCOVERY_MECHANISMS = [
  { id: "google_places", label: "Google Places", enabled: true },
  { id: "web_scraper", label: "Web Scraping", enabled: true },
] as const

export const MAX_DEPTH = 4

export function getAvailableActions(cell: CellData): CellAction[] {
  const actions: CellAction[] = DISCOVERY_MECHANISMS
    .filter((m) => m.enabled)
    .map((m) => ({ type: "search" as const, mechanism: m.id }))

  if (cell.depth < MAX_DEPTH) {
    actions.push({ type: "subdivide" })
  }

  if (cell.depth > 0) {
    actions.push({ type: "undivide" })
  }

  return actions
}

export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function getStatusBadgeColor(status: CellStatus): string {
  switch (status) {
    case "unsearched": return "bg-gray-200 text-gray-700"
    case "searching": return "bg-blue-100 text-blue-700"
    case "searched": return "bg-green-100 text-green-700"
    case "saturated": return "bg-orange-100 text-orange-700"
  }
}

type DiscoveryGridCellProps = {
  cell: CellData
  isSelected: boolean
  onCellSelect: (cellId: string | null) => void
}

function DiscoveryGridCell({ cell, isSelected, onCellSelect }: DiscoveryGridCellProps) {
  const bounds: [[number, number], [number, number]] = [
    [cell.swLat, cell.swLng],
    [cell.neLat, cell.neLng],
  ]
  const basePathOptions = getCellColor(cell.status)
  const pathOptions = isSelected
    ? { ...basePathOptions, weight: 3, dashArray: "6 4", color: "#2563eb", fillOpacity: (basePathOptions.fillOpacity ?? 0.15) + 0.1 }
    : basePathOptions
  return (
    <Rectangle
      bounds={bounds}
      pathOptions={pathOptions}
      eventHandlers={{
        click: () => onCellSelect(isSelected ? null : cell._id),
      }}
    />
  )
}

export default function DiscoveryGrid({ cells, selectedCellId, onCellSelect }: DiscoveryGridProps) {
  return (
    <>
      {cells.map((cell) => (
        <DiscoveryGridCell
          key={cell._id}
          cell={cell}
          isSelected={cell._id === selectedCellId}
          onCellSelect={onCellSelect}
        />
      ))}
    </>
  )
}
