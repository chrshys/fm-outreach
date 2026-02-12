"use client"

import { useCallback, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Grid2x2Plus, Minimize2, Play, Plus, Search, X } from "lucide-react"
import { toast } from "sonner"

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import type { CellData, CellAction } from "./discovery-grid-shared"
import type { VirtualCell } from "@/lib/virtual-grid"
import { DISCOVERY_MECHANISMS, MAX_DEPTH, getStatusBadgeColor, formatShortDate } from "./discovery-grid-shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

type DiscoveryPanelProps = {
  globalGridId: Id<"discoveryGrids"> | null
  cells: CellData[]
  selectedCellId: string | null
  selectedVirtualCell?: VirtualCell | null
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

export function DiscoveryPanel({ globalGridId, cells, selectedCellId, selectedVirtualCell, onCellAction }: DiscoveryPanelProps) {
  const [open, setOpen] = useState(true)
  const [newQuery, setNewQuery] = useState("")
  const [editingQuery, setEditingQuery] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const editInputRef = useRef<HTMLInputElement>(null)
  const [editingField, setEditingField] = useState<"region" | "province" | null>(null)
  const [fieldEditValue, setFieldEditValue] = useState("")
  const fieldEditInputRef = useRef<HTMLInputElement>(null)

  // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
  const grids = useQuery(api.discovery.gridCells.listGrids) as GridWithStats[] | undefined
  const updateGridQueries = useMutation(api.discovery.gridCells.updateGridQueries)
  const updateGridMetadata = useMutation(api.discovery.gridCells.updateGridMetadata)

  const selectedGrid = grids?.find((g) => g._id === globalGridId) ?? null
  const persistedCell = cells.find((c) => c._id === selectedCellId) ?? null
  const selectedCell: CellData | null = persistedCell ?? (selectedVirtualCell ? {
    _id: selectedVirtualCell.key,
    swLat: selectedVirtualCell.swLat,
    swLng: selectedVirtualCell.swLng,
    neLat: selectedVirtualCell.neLat,
    neLng: selectedVirtualCell.neLng,
    depth: 0,
    status: "unsearched" as const,
  } : null)

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

  const handleStartFieldEdit = useCallback((field: "region" | "province", currentValue: string) => {
    setEditingField(field)
    setFieldEditValue(currentValue)
    setTimeout(() => fieldEditInputRef.current?.focus(), 0)
  }, [])

  const handleSaveFieldEdit = useCallback(async () => {
    if (!selectedGrid || editingField === null) return
    const trimmed = fieldEditValue.trim()
    if (!trimmed || trimmed === selectedGrid[editingField]) {
      setEditingField(null)
      return
    }
    try {
      await updateGridMetadata({
        gridId: selectedGrid._id,
        [editingField]: trimmed,
      })
      setEditingField(null)
    } catch {
      toast.error(`Failed to update ${editingField}`)
    }
  }, [selectedGrid, editingField, fieldEditValue, updateGridMetadata])

  const handleCancelFieldEdit = useCallback(() => {
    setEditingField(null)
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
          {/* Settings */}
          {selectedGrid && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Settings</Label>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium" aria-label="Grid name">
                      <input type="hidden" placeholder="Grid name" />
                      {selectedGrid.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Region</span>
                    {editingField === "region" ? (
                      <input
                        ref={fieldEditInputRef}
                        className="w-28 rounded border bg-transparent px-1 py-0.5 text-xs outline-none"
                        placeholder="Region"
                        value={fieldEditValue}
                        onChange={(e) => setFieldEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveFieldEdit()
                          if (e.key === "Escape") handleCancelFieldEdit()
                        }}
                        onBlur={handleSaveFieldEdit}
                        aria-label="Edit region"
                      />
                    ) : (
                      <button
                        type="button"
                        className="cursor-text font-medium hover:underline"
                        onClick={() => handleStartFieldEdit("region", selectedGrid.region)}
                        aria-label="Click to edit region"
                      >
                        {selectedGrid.region}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Province</span>
                    {editingField === "province" ? (
                      <input
                        ref={fieldEditInputRef}
                        className="w-28 rounded border bg-transparent px-1 py-0.5 text-xs outline-none"
                        placeholder="Province"
                        value={fieldEditValue}
                        onChange={(e) => setFieldEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveFieldEdit()
                          if (e.key === "Escape") handleCancelFieldEdit()
                        }}
                        onBlur={handleSaveFieldEdit}
                        aria-label="Edit province"
                      />
                    ) : (
                      <button
                        type="button"
                        className="cursor-text font-medium hover:underline"
                        onClick={() => handleStartFieldEdit("province", selectedGrid.province)}
                        aria-label="Click to edit province"
                      >
                        {selectedGrid.province}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Progress Stats */}
          {selectedGrid && (
            <>
              <Separator />
              <div className="space-y-1.5">
                {selectedCell && selectedCell.status !== "unsearched" ? (
                  <>
                    <Label className="text-xs text-muted-foreground">Cell Progress</Label>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Status</span>
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getStatusBadgeColor(selectedCell.status)}`}>
                          {selectedCell.status}
                        </span>
                      </div>
                      {selectedCell.resultCount !== undefined && (
                        <div className="flex justify-between">
                          <span>Results</span>
                          <span className="font-medium">{selectedCell.resultCount}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Leads Found</span>
                        <span className="font-medium text-green-500">
                          {selectedCell.leadsFound ?? 0}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Label className="text-xs text-muted-foreground">Grid Progress</Label>
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
                  </>
                )}
              </div>
            </>
          )}

          {/* Selected Cell */}
          {selectedCell && (
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
                      <div key={mechanism.id} className="flex items-center justify-between text-xs">
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
          {selectedGrid && (
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
