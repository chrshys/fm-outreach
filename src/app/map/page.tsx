"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useQuery, useMutation } from "convex/react"
import { Grid3X3, PenTool } from "lucide-react"
import { toast } from "sonner"

import type { MapBounds } from "@/components/map/map-bounds-emitter"
import type { CellAction } from "@/components/map/discovery-grid-shared"
import type { VirtualCell } from "@/lib/virtual-grid"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { AppLayout } from "@/components/layout/app-layout"
import {
  MapFilters,
  defaultMapFilters,
  filterLeads,
} from "@/components/map/map-filters"
import type { MapFiltersValue } from "@/components/map/map-filters"
import { DiscoveryPanel } from "@/components/map/discovery-panel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog as DialogPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"
import { pointInPolygon } from "@/lib/point-in-polygon"

const MapContent = dynamic(() => import("@/components/map/map-content"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Loading map…</p>
    </div>
  ),
})

export default function MapPage() {
  // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
  const leads = useQuery(api.leads.listWithCoords)
  const clusters = useQuery(api.clusters.list)
  const createCluster = useMutation(api.clusters.createPolygonCluster)
  const [filters, setFilters] = useState<MapFiltersValue>(defaultMapFilters)
  const [viewMode, setViewMode] = useState<"clusters" | "discovery">("clusters")
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [selectedGridId, setSelectedGridId] = useState<Id<"discoveryGrids"> | null>(null)
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset derived state when grid changes
  useEffect(() => { setSelectedCellId(null) }, [selectedGridId])

  const handleGridSelect = useCallback((gridId: Id<"discoveryGrids">) => {
    setSelectedGridId(gridId)
    setSelectedCellId(null)
  }, [])

  const handleCellSelect = useCallback((cellId: string | null) => {
    setSelectedCellId(cellId)
  }, [])

  // Discovery queries & mutations
  const gridCellsResult = useQuery(
    api.discovery.gridCells.listCells,
    selectedGridId && viewMode === "discovery" ? { gridId: selectedGridId } : "skip",
  )
  const gridCells = gridCellsResult?.cells
  const activatedBoundsKeys = gridCellsResult?.activatedBoundsKeys

  // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
  const gridsResult = useQuery(api.discovery.gridCells.listGrids) as Array<{ _id: Id<"discoveryGrids">; cellSizeKm: number }> | undefined
  const selectedGridCellSizeKm = gridsResult?.find((g) => g._id === selectedGridId)?.cellSizeKm

  const activateCell = useMutation(api.discovery.gridCells.activateCell)
  const getOrCreateGlobalGrid = useMutation(api.discovery.gridCells.getOrCreateGlobalGrid)
  const handleActivateCell = useCallback(async (cell: VirtualCell): Promise<string> => {
    if (!selectedGridId) throw new Error("No grid selected")
    const result = await activateCell({
      gridId: selectedGridId,
      swLat: cell.swLat,
      swLng: cell.swLng,
      neLat: cell.neLat,
      neLng: cell.neLng,
      boundsKey: cell.key,
    })
    return result.cellId
  }, [selectedGridId, activateCell])

  const requestDiscoverCell = useMutation(api.discovery.discoverCell.requestDiscoverCell)
  const subdivideCell = useMutation(api.discovery.gridCells.subdivideCell)
  const undivideCell = useMutation(api.discovery.gridCells.undivideCell)

  const [isDrawing, setIsDrawing] = useState(false)
  const [drawnPolygon, setDrawnPolygon] = useState<
    { lat: number; lng: number }[] | null
  >(null)
  const [showNamingDialog, setShowNamingDialog] = useState(false)
  const [clusterName, setClusterName] = useState("")
  const [pendingCluster, setPendingCluster] = useState<{
    boundary: { lat: number; lng: number }[]
    clusterId: string
  } | null>(null)

  const clusterOptions = useMemo(
    () => (clusters ?? []).map((c: { _id: string; name: string }) => ({ id: c._id, name: c.name })),
    [clusters],
  )

  type LeadMarker = {
    _id: string
    name: string
    type: string
    city: string
    status: string
    contactEmail?: string
    latitude: number
    longitude: number
    clusterId?: string
  }

  const filteredLeads = useMemo(
    () => filterLeads<LeadMarker>((leads ?? []) as LeadMarker[], filters),
    [leads, filters],
  )

  type ClusterDoc = {
    _id: string
    name: string
    boundary: Array<{ lat: number; lng: number }>
    centerLat: number
    centerLng: number
    radiusKm: number
  }

  const filteredClusters = useMemo(() => {
    const all = (clusters ?? []) as ClusterDoc[]
    const selected =
      filters.clusterId !== "all"
        ? all.filter((c: ClusterDoc) => c._id === filters.clusterId)
        : all
    return selected.map((c: ClusterDoc) => ({
      _id: c._id,
      name: c.name,
      boundary: c.boundary,
      centerLat: c.centerLat,
      centerLng: c.centerLng,
      radiusKm: c.radiusKm,
    }))
  }, [clusters, filters.clusterId])

  const pendingPolygon = useMemo(() => {
    if (!pendingCluster) return null
    const alreadyInQuery = (clusters ?? []).some(
      (c: { _id: string }) => c._id === pendingCluster.clusterId,
    )
    return alreadyInQuery ? null : pendingCluster.boundary
  }, [pendingCluster, clusters])

  const previewLeadCount = useMemo(() => {
    if (!drawnPolygon || !leads) return 0
    return leads.filter((lead: { latitude: number; longitude: number }) =>
      pointInPolygon({ lat: lead.latitude, lng: lead.longitude }, drawnPolygon),
    ).length
  }, [drawnPolygon, leads])

  const handlePolygonDrawn = useCallback(
    (latlngs: { lat: number; lng: number }[]) => {
      setDrawnPolygon(latlngs)
      setIsDrawing(false)
      setShowNamingDialog(true)
    },
    [],
  )

  const handleCreateCluster = useCallback(async () => {
    if (!drawnPolygon || !clusterName.trim()) return
    try {
      const result = await createCluster({ name: clusterName.trim(), boundary: drawnPolygon })
      setPendingCluster({ boundary: drawnPolygon, clusterId: result.clusterId })
      setShowNamingDialog(false)
      setDrawnPolygon(null)
      setClusterName("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create cluster")
    }
  }, [drawnPolygon, clusterName, createCluster])

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds)
  }, [])

  const handleCancelDialog = useCallback(() => {
    setShowNamingDialog(false)
    setDrawnPolygon(null)
    setClusterName("")
  }, [])

  const handleCellAction = useCallback(async (cellId: string, action: CellAction) => {
    const cell = gridCells?.find((c) => c._id === cellId)
    if (!cell) return

    if (action.type === "search") {
      if (cell.status === "searching") {
        toast.info("Search already in progress")
        return
      }

      if (action.mechanism !== "google_places") {
        toast.info("Coming soon")
        return
      }

      try {
        await requestDiscoverCell({ cellId: cellId as Id<"discoveryCells"> })
        toast.success("Discovery started for cell")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to discover cell")
      }
      return
    }

    if (action.type === "subdivide") {
      if (cell.depth >= 4) {
        toast.info("Cell is already at maximum depth")
        return
      }
      try {
        await subdivideCell({ cellId: cellId as Id<"discoveryCells"> })
        toast.success("Cell subdivided into 4 quadrants")
        setSelectedCellId(null)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to subdivide cell")
      }
      return
    }

    if (action.type === "undivide") {
      try {
        await undivideCell({ cellId: cellId as Id<"discoveryCells"> })
        toast.success("Cell merged back to parent")
        setSelectedCellId(null)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to merge cell")
      }
      return
    }
  }, [gridCells, requestDiscoverCell, subdivideCell, undivideCell])

  return (
    <AppLayout>
      <div className="relative h-[calc(100vh-73px)] -m-6">
        <div className="isolate h-full w-full">
        <MapContent
          leads={filteredLeads}
          clusters={viewMode === "clusters" ? filteredClusters : []}
          isDrawing={viewMode === "clusters" && isDrawing}
          onPolygonDrawn={handlePolygonDrawn}
          pendingPolygon={pendingPolygon}
          gridCells={viewMode === "discovery" ? gridCells ?? undefined : undefined}
          selectedCellId={viewMode === "discovery" ? selectedCellId : null}
          onCellSelect={viewMode === "discovery" ? handleCellSelect : undefined}
          cellSizeKm={viewMode === "discovery" ? selectedGridCellSizeKm : undefined}
          gridId={viewMode === "discovery" && selectedGridId ? selectedGridId : undefined}
          activatedBoundsKeys={viewMode === "discovery" ? activatedBoundsKeys : undefined}
          onActivateCell={viewMode === "discovery" ? handleActivateCell : undefined}
          onBoundsChange={handleBoundsChange}
        />
        </div>
        {viewMode === "clusters" ? (
          <MapFilters
            value={filters}
            onChange={setFilters}
            clusters={clusterOptions}
          />
        ) : (
          <DiscoveryPanel mapBounds={mapBounds} selectedGridId={selectedGridId} onGridSelect={handleGridSelect} cells={viewMode === "discovery" ? gridCells ?? [] : []} selectedCellId={selectedCellId} onCellAction={handleCellAction} />
        )}
        <div className="absolute right-3 top-3 z-10 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-card shadow-md"
            onClick={() => {
              setViewMode((prev) => prev === "clusters" ? "discovery" : "clusters")
              setIsDrawing(false)
              setShowNamingDialog(false)
              setDrawnPolygon(null)
              setSelectedCellId(null)
            }}
          >
            <Grid3X3 className="mr-1.5 size-4" />
            {viewMode === "clusters" ? "Discovery" : "Clusters"}
          </Button>
          {viewMode === "clusters" && (
            <Button
              size="sm"
              variant={isDrawing ? "default" : "outline"}
              className="bg-card shadow-md"
              onClick={() => setIsDrawing((prev) => !prev)}
            >
              <PenTool className="mr-1.5 size-4" />
              {isDrawing ? "Cancel Drawing" : "Draw Cluster"}
            </Button>
          )}
        </div>
        <Dialog open={showNamingDialog} onOpenChange={(open) => {
          if (!open) handleCancelDialog()
        }}>
          <DialogPortal>
            <DialogOverlay className="z-[10000]" />
            <DialogPrimitive.Content className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[10000] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg">
              <DialogPrimitive.Close className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden">
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
              <DialogHeader>
                <DialogTitle>Name Your Cluster</DialogTitle>
                <DialogDescription>
                  {previewLeadCount} lead{previewLeadCount !== 1 ? "s" : ""} found
                  inside the drawn area.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="cluster-name">Cluster Name</Label>
                <Input
                  id="cluster-name"
                  placeholder="e.g. Downtown Core"
                  value={clusterName}
                  onChange={(e) => setClusterName(e.target.value)}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCancelDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCluster}
                  disabled={!clusterName.trim()}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>
      </div>
    </AppLayout>
  )
}
