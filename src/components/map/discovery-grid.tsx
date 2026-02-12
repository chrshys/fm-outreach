"use client"

import { useState, useMemo, useCallback } from "react"
import { Rectangle, useMap, useMapEvents } from "react-leaflet"
import { computeVirtualGrid } from "@/lib/virtual-grid"
import type { VirtualCell } from "@/lib/virtual-grid"
import { getCellColor, VIRTUAL_CELL_STYLE } from "./cell-colors"
import type { CellData } from "./discovery-grid-shared"

export type { CellAction, CellData } from "./discovery-grid-shared"
export { DISCOVERY_MECHANISMS, MAX_DEPTH, getAvailableActions, formatShortDate, getStatusBadgeColor } from "./discovery-grid-shared"

type DiscoveryGridProps = {
  cells: CellData[]
  selectedCellId: string | null
  onCellSelect: (cellId: string | null) => void
  cellSizeKm: number
  gridId: string
  activatedBoundsKeys: string[]
  onActivateCell: (cell: VirtualCell) => Promise<string>
}

type DiscoveryGridCellProps = {
  cell: CellData
  isSelected: boolean
  onCellSelect: (cellId: string | null) => void
}

type VirtualGridCellProps = {
  cell: VirtualCell
  onActivateCell: (cell: VirtualCell) => Promise<string>
  onCellSelect: (cellId: string | null) => void
}

function VirtualGridCell({ cell, onActivateCell, onCellSelect }: VirtualGridCellProps) {
  const [activating, setActivating] = useState(false)
  const bounds: [[number, number], [number, number]] = [
    [cell.swLat, cell.swLng],
    [cell.neLat, cell.neLng],
  ]
  const handleClick = async () => {
    if (activating) return
    setActivating(true)
    try {
      const cellId = await onActivateCell(cell)
      onCellSelect(cellId)
    } finally {
      setActivating(false)
    }
  }
  return (
    <Rectangle
      bounds={bounds}
      pathOptions={VIRTUAL_CELL_STYLE}
      eventHandlers={{
        click: handleClick,
      }}
    />
  )
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

function getMapBounds(map: ReturnType<typeof useMap>) {
  const b = map.getBounds()
  return {
    swLat: b.getSouth(),
    swLng: b.getWest(),
    neLat: b.getNorth(),
    neLng: b.getEast(),
  }
}

export default function DiscoveryGrid({ cells, selectedCellId, onCellSelect, cellSizeKm, activatedBoundsKeys, onActivateCell }: DiscoveryGridProps) {
  const map = useMap()
  const [mapBounds, setMapBounds] = useState<{ swLat: number; swLng: number; neLat: number; neLng: number }>(() => getMapBounds(map))

  const updateBounds = useCallback(() => {
    setMapBounds(getMapBounds(map))
  }, [map])

  useMapEvents({
    moveend: () => updateBounds(),
    zoomend: () => updateBounds(),
  })

  const virtualCells = useMemo(() => {
    if (!mapBounds || map.getZoom() < 8) return []
    return computeVirtualGrid(mapBounds, cellSizeKm)
  }, [mapBounds, cellSizeKm, map])

  const activatedSet = useMemo(() => new Set(activatedBoundsKeys), [activatedBoundsKeys])

  const persistedBoundsKeySet = useMemo(
    () => new Set(cells.map((c) => c.boundsKey).filter((k): k is string => k !== undefined)),
    [cells],
  )

  const filteredVirtualCells = useMemo(
    () => virtualCells.filter((vc) => !activatedSet.has(vc.key) && !persistedBoundsKeySet.has(vc.key)),
    [virtualCells, activatedSet, persistedBoundsKeySet],
  )

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
      {filteredVirtualCells.map((vc) => (
        <VirtualGridCell
          key={vc.key}
          cell={vc}
          onActivateCell={onActivateCell}
          onCellSelect={onCellSelect}
        />
      ))}
    </>
  )
}
