"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { ChevronDown, Grid2x2Plus, Minimize2, Play, Plus, Search, X } from "lucide-react"
import { toast } from "sonner"

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import type { MapBounds } from "./map-bounds-emitter"
import type { CellData, CellAction } from "./discovery-grid"
import { DISCOVERY_MECHANISMS, MAX_DEPTH, getStatusBadgeColor, formatShortDate } from "./discovery-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

type DiscoveryPanelProps = {
  mapBounds: MapBounds | null
  selectedGridId: Id<"discoveryGrids"> | null
  onGridSelect: (gridId: Id<"discoveryGrids">) => void
  cells: CellData[]
  selectedCellId: string | null
  onCellAction: (cellId: string, action: CellAction) => void
}

type GridWithStats = {
  _id: Id<"discoveryGrids">
  name: string
  region: string
  province: string
  queries: string[]
  cellSizeKm: number
  totalLeadsFound: number
  createdAt: number
  totalLeafCells: number
  searchedCount: number
  saturatedCount: number
  searchingCount: number
}

const CELL_STATUS_LEGEND: { status: string; color: string; label: string }[] = [
  { status: "unsearched", color: "#9ca3af", label: "Unsearched" },
  { status: "searching", color: "#3b82f6", label: "Searching" },
  { status: "searched", color: "#22c55e", label: "Searched" },
  { status: "saturated", color: "#f97316", label: "Saturated" },
]

export function DiscoveryPanel({ mapBounds, selectedGridId, onGridSelect, cells, selectedCellId, onCellAction }: DiscoveryPanelProps) {
  const [open, setOpen] = useState(true)
  const [showNewGridForm, setShowNewGridForm] = useState(false)
  const [gridName, setGridName] = useState("")
  const [region, setRegion] = useState("")
  const [province, setProvince] = useState("")
  const [newQuery, setNewQuery] = useState("")
  const [showGridSelector, setShowGridSelector] = useState(false)
  const [editingQuery, setEditingQuery] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const editInputRef = useRef<HTMLInputElement>(null)

  // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
  const grids = useQuery(api.discovery.gridCells.listGrids) as GridWithStats[] | undefined
  const generateGrid = useMutation(api.discovery.gridCells.generateGrid)
  const updateGridQueries = useMutation(api.discovery.gridCells.updateGridQueries)

  const selectedGrid = grids?.find((g) => g._id === selectedGridId) ?? grids?.[0] ?? null
  const selectedCell = cells.find((c) => c._id === selectedCellId) ?? null

  // Auto-select first grid if none selected
  useEffect(() => {
    if (!selectedGridId && grids && grids.length > 0) {
      onGridSelect(grids[0]._id)
    }
  }, [selectedGridId, grids, onGridSelect])

  const handleCreateGrid = useCallback(async () => {
    if (!gridName.trim() || !region.trim() || !province.trim() || !mapBounds) return
    try {
      const result = await generateGrid({
        name: gridName.trim(),
        region: region.trim(),
        province: province.trim(),
        swLat: mapBounds.swLat,
        swLng: mapBounds.swLng,
        neLat: mapBounds.neLat,
        neLng: mapBounds.neLng,
      })
      onGridSelect(result.gridId as Id<"discoveryGrids">)
      setShowNewGridForm(false)
      setGridName("")
      setRegion("")
      setProvince("")
      toast.success(`Grid created with ${result.cellCount} cells`)
    } catch {
      toast.error("Failed to create grid")
    }
  }, [gridName, region, province, mapBounds, generateGrid, onGridSelect])

  const handleAddQuery = useCallback(async () => {
    if (!newQuery.trim() || !selectedGrid) return
    const trimmed = newQuery.trim()
    if (selectedGrid.queries.includes(trimmed)) {
      toast.error("Query already exists")
      return
    }
    try {
      await updateGridQueries({
        gridId: selectedGrid._id,
        queries: [...selectedGrid.queries, trimmed],
      })
      setNewQuery("")
    } catch {
      toast.error("Failed to add query")
    }
  }, [newQuery, selectedGrid, updateGridQueries])

  const handleRemoveQuery = useCallback(async (queryToRemove: string) => {
    if (!selectedGrid) return
    try {
      await updateGridQueries({
        gridId: selectedGrid._id,
        queries: selectedGrid.queries.filter((q) => q !== queryToRemove),
      })
    } catch {
      toast.error("Failed to remove query")
    }
  }, [selectedGrid, updateGridQueries])

  const handleStartEdit = useCallback((query: string) => {
    setEditingQuery(query)
    setEditValue(query)
    setTimeout(() => editInputRef.current?.focus(), 0)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!selectedGrid || editingQuery === null) return
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === editingQuery) {
      setEditingQuery(null)
      return
    }
    if (selectedGrid.queries.includes(trimmed)) {
      toast.error("Query already exists")
      return
    }
    try {
      await updateGridQueries({
        gridId: selectedGrid._id,
        queries: selectedGrid.queries.map((q) => q === editingQuery ? trimmed : q),
      })
      setEditingQuery(null)
    } catch {
      toast.error("Failed to update query")
    }
  }, [selectedGrid, editingQuery, editValue, updateGridQueries])

  const handleCancelEdit = useCallback(() => {
    setEditingQuery(null)
  }, [])

  if (!open) {
    return (
      <div className="absolute left-3 top-3 z-10">
        <Button
          size="sm"
          variant="outline"
          className="bg-card shadow-md"
          onClick={() => setOpen(true)}
        >
          <Search className="mr-1.5 size-4" />
          Discovery
        </Button>
      </div>
    )
  }

  return (
    <div className="absolute left-3 top-3 z-10">
      <div className="w-72 rounded-lg border bg-card p-3 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Discovery</span>
          <button
            type="button"
            className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
            aria-label="Close discovery panel"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Grid Selector */}
          {grids && grids.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Grid</Label>
              <div className="relative">
                <button
                  type="button"
                  className="flex h-8 w-full items-center justify-between rounded-md border bg-background px-2 text-sm"
                  onClick={() => setShowGridSelector(!showGridSelector)}
                >
                  <span className="truncate">{selectedGrid?.name ?? "Select grid"}</span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
                {showGridSelector && (
                  <div className="absolute top-9 left-0 z-20 w-full rounded-md border bg-popover p-1 shadow-md">
                    {grids.map((grid) => (
                      <button
                        key={grid._id}
                        type="button"
                        className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => {
                          onGridSelect(grid._id)
                          setShowGridSelector(false)
                          setShowNewGridForm(false)
                        }}
                      >
                        <span className="truncate">{grid.name}</span>
                      </button>
                    ))}
                    <Separator className="my-1" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() => {
                        setShowNewGridForm(true)
                        setShowGridSelector(false)
                      }}
                    >
                      <Plus className="size-3.5" />
                      New Grid
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Grid Form */}
          {(showNewGridForm || !grids || grids.length === 0) && (
            <div className="space-y-2 rounded-md border p-2">
              <span className="text-xs font-medium">New Grid</span>
              <div className="space-y-1.5">
                <Input
                  placeholder="Grid name"
                  value={gridName}
                  onChange={(e) => setGridName(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  Bounds (from current map view)
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <Input
                    readOnly
                    value={mapBounds ? mapBounds.swLat.toFixed(4) : "—"}
                    className="h-7 text-xs"
                    aria-label="SW Latitude"
                  />
                  <Input
                    readOnly
                    value={mapBounds ? mapBounds.swLng.toFixed(4) : "—"}
                    className="h-7 text-xs"
                    aria-label="SW Longitude"
                  />
                  <Input
                    readOnly
                    value={mapBounds ? mapBounds.neLat.toFixed(4) : "—"}
                    className="h-7 text-xs"
                    aria-label="NE Latitude"
                  />
                  <Input
                    readOnly
                    value={mapBounds ? mapBounds.neLng.toFixed(4) : "—"}
                    className="h-7 text-xs"
                    aria-label="NE Longitude"
                  />
                </div>
              </div>
              <div className="flex gap-1.5">
                {grids && grids.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 text-xs"
                    onClick={() => setShowNewGridForm(false)}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  disabled={!gridName.trim() || !region.trim() || !province.trim() || !mapBounds}
                  onClick={handleCreateGrid}
                >
                  Create Grid
                </Button>
              </div>
            </div>
          )}

          {/* Progress Stats */}
          {selectedGrid && !showNewGridForm && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Progress</Label>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Searched</span>
                    <span className="font-medium">
                      {selectedGrid.searchedCount + selectedGrid.saturatedCount} / {selectedGrid.totalLeafCells}
                    </span>
                  </div>
                  {selectedGrid.searchingCount > 0 && (
                    <div className="flex justify-between">
                      <span>Searching</span>
                      <span className="font-medium text-blue-500">
                        {selectedGrid.searchingCount}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Saturated</span>
                    <span className="font-medium text-orange-500">
                      {selectedGrid.saturatedCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Leads Found</span>
                    <span className="font-medium text-green-500">
                      {selectedGrid.totalLeadsFound}
                    </span>
                  </div>
                  {selectedGrid.totalLeafCells > 0 && (
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{
                          width: `${Math.round(((selectedGrid.searchedCount + selectedGrid.saturatedCount) / selectedGrid.totalLeafCells) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Selected Cell */}
          {selectedCell && !showNewGridForm && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Selected Cell</Label>
                <div className="flex items-center justify-between text-xs">
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getStatusBadgeColor(selectedCell.status)}`}>
                    {selectedCell.status}
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedCell.status !== "unsearched" && selectedCell.resultCount !== undefined && (
                      <span className="text-muted-foreground">{selectedCell.resultCount} results</span>
                    )}
                    <span className="text-muted-foreground">d{selectedCell.depth}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {DISCOVERY_MECHANISMS.map((mechanism) => {
                    const isDisabled = !mechanism.enabled || selectedCell.status === "searching"
                    const lastRun = mechanism.id === "google_places" && selectedCell.lastSearchedAt
                      ? formatShortDate(selectedCell.lastSearchedAt)
                      : "\u2014"
                    return (
                      <div key={mechanism.id} className={`flex items-center justify-between text-xs ${isDisabled ? "opacity-50" : ""}`}>
                        <span>{mechanism.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">{lastRun}</span>
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-colors ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
                            disabled={isDisabled}
                            onClick={() => onCellAction(selectedCell._id, { type: "search", mechanism: mechanism.id })}
                          >
                            <Play className="size-3" />
                            Run
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-colors ${selectedCell.depth >= MAX_DEPTH || selectedCell.status === "searching" ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
                    disabled={selectedCell.depth >= MAX_DEPTH || selectedCell.status === "searching"}
                    onClick={() => onCellAction(selectedCell._id, { type: "subdivide" })}
                  >
                    <Grid2x2Plus className="size-3" />
                    Split
                  </button>
                  {selectedCell.depth > 0 && (
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-colors ${selectedCell.status === "searching" ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
                      disabled={selectedCell.status === "searching"}
                      onClick={() => onCellAction(selectedCell._id, { type: "undivide" })}
                    >
                      <Minimize2 className="size-3" />
                      Merge
                    </button>
                  )}
                </div>
                {selectedCell.querySaturation && selectedCell.querySaturation.length > 0 && (
                  <div className="space-y-0.5 pt-1">
                    <span className="text-[10px] text-muted-foreground">Query Saturation</span>
                    {selectedCell.querySaturation.map((qs) => (
                      <div key={qs.query} className="flex items-center justify-between text-xs">
                        <span className="truncate">{qs.query}</span>
                        <span className="text-muted-foreground">{qs.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Search Queries */}
          {selectedGrid && !showNewGridForm && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Search Queries</Label>
                <div className="flex flex-wrap gap-1">
                  {selectedGrid.queries.map((query) => (
                    <Badge key={query} variant="secondary" className="gap-1 pr-1 text-xs">
                      {editingQuery === query ? (
                        <input
                          ref={editInputRef}
                          className="w-20 bg-transparent text-xs outline-none"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit()
                            if (e.key === "Escape") handleCancelEdit()
                          }}
                          onBlur={handleSaveEdit}
                          aria-label={`Edit query: ${query}`}
                        />
                      ) : (
                        <button
                          type="button"
                          className="cursor-text"
                          onClick={() => handleStartEdit(query)}
                          aria-label={`Click to edit query: ${query}`}
                        >
                          {query}
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-black/10"
                        aria-label={`Remove query: ${query}`}
                        onClick={() => handleRemoveQuery(query)}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <form
                  className="flex gap-1"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleAddQuery()
                  }}
                >
                  <Input
                    placeholder="Add query…"
                    value={newQuery}
                    onChange={(e) => setNewQuery(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    disabled={!newQuery.trim()}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </form>
              </div>
            </>
          )}

          {/* Color Legend */}
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cell Status</Label>
            <div className="grid grid-cols-2 gap-1">
              {CELL_STATUS_LEGEND.map((item) => (
                <div key={item.status} className="flex items-center gap-1.5">
                  <span
                    className="inline-block size-2.5 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
