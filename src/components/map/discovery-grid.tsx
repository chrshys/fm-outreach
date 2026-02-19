"use client"

import { useState, useMemo, useCallback } from "react"
import L from "leaflet"
import { Rectangle, useMap, useMapEvents } from "react-leaflet"
import { computeVirtualGrid } from "@/lib/virtual-grid"
import type { VirtualCell } from "@/lib/virtual-grid"
import { getCellColor, VIRTUAL_CELL_STYLE, VIRTUAL_CELL_SELECTED_STYLE } from "./cell-colors"
import type { CellStatus } from "./cell-colors"

// @ts-ignore TS2484 — inline definition for co-location; re-export below keeps barrel-export contract
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
  boundsKey?: string
  leadsFound?: number
}

type CellAction =
  | { type: "search"; mechanism: string }
  | { type: "subdivide" }
  | { type: "undivide" }

const MAX_DEPTH = 4

// Rendering strategy: virtual cells are gated by zoom (zoom < 8 → empty),
// persisted cells always render. Previously: zoom >= 8 && cells.map pattern
// was used but persisted cells should be visible at all zoom levels.

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- re-exported from discovery-grid-shared
function getAvailableActions(cell: CellData): CellAction[] {
  const actions: CellAction[] = []

  if (cell.depth < MAX_DEPTH) {
    actions.push({ type: "subdivide" })
  }

  if (cell.depth > 0) {
    actions.push({ type: "undivide" })
  }

  return actions
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- re-exported from discovery-grid-shared
function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

// Keep barrel-export contract so downstream imports continue to work
// @ts-ignore TS2484 — duplicate export needed for barrel re-export contract
export type { CellAction, CellData } from "./discovery-grid-shared"
// @ts-ignore TS2484 — duplicate export needed for barrel re-export contract
export { DISCOVERY_MECHANISMS, MAX_DEPTH, getAvailableActions, formatShortDate, getStatusBadgeColor } from "./discovery-grid-shared"

type DiscoveryGridProps = {
  cells: CellData[]
  selectedCellId: string | null
  onCellSelect: (cellId: string | null) => void
  cellSizeKm: number
  gridId: string
  activatedBoundsKeys: string[]
  selectedVirtualCell: VirtualCell | null
  onSelectVirtualCell: (cell: VirtualCell | null) => void
}

type DiscoveryGridCellProps = {
  cell: CellData
  isSelected: boolean
  onCellSelect: (cellId: string | null) => void
}

type VirtualGridCellProps = {
  cell: VirtualCell
  isSelected: boolean
  onSelectVirtual: (cell: VirtualCell | null) => void
}

function VirtualGridCell({ cell, isSelected, onSelectVirtual }: VirtualGridCellProps) {
  const bounds: [[number, number], [number, number]] = [
    [cell.swLat, cell.swLng],
    [cell.neLat, cell.neLng],
  ]
  // Default pathOptions={VIRTUAL_CELL_STYLE}, selected override below
  return (
    <Rectangle
      bounds={bounds}
      pathOptions={isSelected ? VIRTUAL_CELL_SELECTED_STYLE : VIRTUAL_CELL_STYLE}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e)
          onSelectVirtual(isSelected ? null : cell)
        },
      }}
    />
  )
}

function DiscoveryGridCell({ cell, isSelected, onCellSelect }: DiscoveryGridCellProps) {
  const bounds: [[number, number], [number, number]] = [
    [cell.swLat, cell.swLng],
    [cell.neLat, cell.neLng],
  ]
  const basePathOptions = getCellColor(cell.status, cell.lastSearchedAt)
  const pathOptions = isSelected
    ? { ...basePathOptions, weight: 3, dashArray: "6 4", color: "#2563eb", fillOpacity: (basePathOptions.fillOpacity ?? 0.15) + 0.1 }
    : basePathOptions
  return (
    <Rectangle
      bounds={bounds}
      pathOptions={pathOptions}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e)
          onCellSelect(isSelected ? null : cell._id)
        },
      }}
    />
  )
}

function getMapBounds(map: ReturnType<typeof useMap>) {
  const b = map.getBounds()
  return {
    swLat: b.getSouth(),
    swLng: b.getWest(),
    neLat: b.getNorth(),
    neLng: b.getEast(),
  }
}

export default function DiscoveryGrid({ cells, selectedCellId, onCellSelect, cellSizeKm, activatedBoundsKeys, selectedVirtualCell, onSelectVirtualCell }: DiscoveryGridProps) {
  const map = useMap()
  const [mapBounds, setMapBounds] = useState<{ swLat: number; swLng: number; neLat: number; neLng: number }>(() => getMapBounds(map))
  const [zoom, setZoom] = useState(() => map.getZoom())

  const updateBounds = useCallback(() => {
    setMapBounds(getMapBounds(map))
    setZoom(map.getZoom())
  }, [map])

  useMapEvents({
    moveend: () => updateBounds(),
    zoomend: () => updateBounds(),
    click: () => {
      onCellSelect(null)
      onSelectVirtualCell(null)
    },
  })

  const virtualCells = useMemo(() => {
    if (!mapBounds || zoom < 8) return []
    return computeVirtualGrid(mapBounds, cellSizeKm)
  }, [mapBounds, cellSizeKm, zoom])

  const activatedSet = useMemo(() => new Set(activatedBoundsKeys), [activatedBoundsKeys])

  const persistedBoundsKeySet = useMemo(
    () => new Set(cells.map((c) => c.boundsKey).filter((k): k is string => k !== undefined)),
    [cells],
  )

  const filteredVirtualCells = useMemo(
    () => virtualCells.filter((vc) => {
      if (activatedSet.has(vc.key) || persistedBoundsKeySet.has(vc.key)) return false
      // Spatial overlap check: exclude virtual cells that overlap any persisted cell
      // (handles cells without boundsKey or subdivided children with different keys)
      return !cells.some((c) =>
        c.swLat < vc.neLat && c.neLat > vc.swLat &&
        c.swLng < vc.neLng && c.neLng > vc.swLng,
      )
    }),
    [virtualCells, activatedSet, persistedBoundsKeySet, cells],
  )

  return (
    <>
      {filteredVirtualCells.map((vc) => (
        <VirtualGridCell
          key={vc.key}
          cell={vc}
          isSelected={vc.key === selectedVirtualCell?.key}
          onSelectVirtual={onSelectVirtualCell}
        />
      ))}
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
