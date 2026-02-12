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

export default function DiscoveryGrid({ cells, selectedCellId, onCellSelect, cellSizeKm, gridId, activatedBoundsKeys, onActivateCell }: DiscoveryGridProps) {
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
