"use client"

import { Rectangle, Tooltip } from "react-leaflet"
import { Play, Grid2x2Plus, Minimize2 } from "lucide-react"
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

function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function getStatusBadgeColor(status: CellStatus): string {
  switch (status) {
    case "unsearched": return "bg-gray-200 text-gray-700"
    case "searching": return "bg-blue-100 text-blue-700"
    case "searched": return "bg-green-100 text-green-700"
    case "saturated": return "bg-orange-100 text-orange-700"
  }
}

function CellTooltipContent({
  cell,
  onCellAction,
}: {
  cell: CellData
  onCellAction: (cellId: string, action: CellAction) => void
}) {
  const label = cell.status.charAt(0).toUpperCase() + cell.status.slice(1)
  const isSearching = cell.status === "searching"

  return (
    <div className="flex flex-col gap-2 text-xs min-w-[200px]">
      <div className="flex items-center gap-2">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadgeColor(cell.status)}`}>
          {label}
        </span>
        {cell.status !== "unsearched" && (
          <span className="text-muted-foreground">{cell.resultCount ?? 0} results</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {DISCOVERY_MECHANISMS.map((mechanism) => {
          const lastRun = mechanism.id === "google_places" && cell.lastSearchedAt
            ? formatShortDate(cell.lastSearchedAt)
            : "—"
          const disabled = !mechanism.enabled || isSearching

          return (
            <div key={mechanism.id} className="flex items-center justify-between gap-2">
              <span>{mechanism.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{lastRun}</span>
                <button
                  className={`p-0.5 rounded hover:bg-accent ${disabled ? "opacity-50 pointer-events-none" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCellAction(cell._id, { type: "search", mechanism: mechanism.id })
                  }}
                  disabled={disabled}
                >
                  <Play className="h-3 w-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {!isSearching && (
        <div className="flex items-center gap-2 border-t pt-2">
          {cell.depth < MAX_DEPTH && (
            <button
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent text-[10px]"
              onClick={(e) => {
                e.stopPropagation()
                onCellAction(cell._id, { type: "subdivide" })
              }}
            >
              <Grid2x2Plus className="h-3 w-3" />
              Split
            </button>
          )}
          {cell.parentCellId && (
            <button
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent text-[10px]"
              onClick={(e) => {
                e.stopPropagation()
                onCellAction(cell._id, { type: "undivide" })
              }}
            >
              <Minimize2 className="h-3 w-3" />
              Merge
            </button>
          )}
        </div>
      )}
    </div>
  )
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
            <Tooltip interactive>
              <CellTooltipContent cell={cell} onCellAction={onCellAction} />
            </Tooltip>
          </Rectangle>
        )
      })}
    </>
  )
}
