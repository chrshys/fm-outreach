"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Rectangle, Tooltip } from "react-leaflet"
import L from "leaflet"
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
            <div key={mechanism.id} className={`flex items-center justify-between gap-2${!mechanism.enabled ? " opacity-50" : ""}`}>
              <span>{mechanism.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{lastRun}</span>
                <button
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs hover:bg-accent transition-colors ${disabled ? "pointer-events-none" : ""}${isSearching && mechanism.enabled ? " opacity-50" : ""}`}
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

      <div className="flex items-center gap-2 border-t pt-2">
        <button
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-colors ${cell.depth >= MAX_DEPTH || isSearching ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
          onClick={(e) => {
            e.stopPropagation()
            onCellAction(cell._id, { type: "subdivide" })
          }}
          disabled={cell.depth >= MAX_DEPTH || isSearching}
          title={cell.depth >= MAX_DEPTH ? "Maximum depth reached" : undefined}
        >
          <Grid2x2Plus className="h-3 w-3" />
          Split
        </button>
        {cell.depth > 0 && (
          <button
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-colors ${isSearching ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
            onClick={(e) => {
              e.stopPropagation()
              onCellAction(cell._id, { type: "undivide" })
            }}
            disabled={isSearching}
          >
            <Minimize2 className="h-3 w-3" />
            Merge
          </button>
        )}
      </div>
    </div>
  )
}

/** Delay in ms before the tooltip closes after the cursor leaves both cell and tooltip. */
const TOOLTIP_CLOSE_DELAY = 150

function DiscoveryGridCell({
  cell,
  onCellAction,
}: {
  cell: CellData
  onCellAction: (cellId: string, action: CellAction) => void
}) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  /* Prevent click/dblclick/contextmenu from reaching the Leaflet map.
     Leaflet's Popup calls disableClickPropagation but Tooltip does not,
     so buttons inside tooltips would otherwise be swallowed by the map. */
  useEffect(() => {
    const el = wrapperRef.current?.closest<HTMLElement>(".leaflet-tooltip")
    if (el) {
      L.DomEvent.disableClickPropagation(el)
      L.DomEvent.disableScrollPropagation(el)
    }
  })

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      setOpen(false)
      closeTimer.current = null
    }, TOOLTIP_CLOSE_DELAY)
  }, [cancelClose])

  const handleEnter = useCallback(() => {
    cancelClose()
    setOpen(true)
  }, [cancelClose])

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
      eventHandlers={{
        mouseover: handleEnter,
        mouseout: scheduleClose,
      }}
    >
      <Tooltip
        interactive
        permanent={open}
        className="!bg-card !border !border-border !rounded-lg !shadow-md !px-2.5 !py-2 !text-foreground"
        direction="top"
        offset={[0, -10]}
      >
        <div ref={wrapperRef} onMouseEnter={handleEnter} onMouseLeave={scheduleClose}>
          <CellTooltipContent cell={cell} onCellAction={onCellAction} />
        </div>
      </Tooltip>
    </Rectangle>
  )
}

export default function DiscoveryGrid({ cells, onCellAction }: DiscoveryGridProps) {
  return (
    <>
      {cells.map((cell) => (
        <DiscoveryGridCell
          key={cell._id}
          cell={cell}
          onCellAction={onCellAction}
        />
      ))}
    </>
  )
}
