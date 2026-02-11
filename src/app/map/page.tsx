"use client"

import { useCallback, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useQuery } from "convex/react"
import { useMutation } from "convex/react"
import { PenTool } from "lucide-react"

import { api } from "../../../convex/_generated/api"
import { AppLayout } from "@/components/layout/app-layout"
import {
  MapFilters,
  defaultMapFilters,
  filterLeads,
} from "@/components/map/map-filters"
import type { MapFiltersValue } from "@/components/map/map-filters"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const leads = useQuery(api.leads.listWithCoords)
  const clusters = useQuery(api.clusters.list)
  const createCluster = useMutation(api.clusters.createPolygonCluster)
  const [filters, setFilters] = useState<MapFiltersValue>(defaultMapFilters)

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
    () => (clusters ?? []).map((c) => ({ id: c._id, name: c.name })),
    [clusters],
  )

  const filteredLeads = useMemo(
    () => filterLeads(leads ?? [], filters),
    [leads, filters],
  )

  const filteredClusters = useMemo(() => {
    const all = clusters ?? []
    const selected =
      filters.clusterId !== "all"
        ? all.filter((c) => c._id === filters.clusterId)
        : all
    return selected.map((c) => ({
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
      (c) => c._id === pendingCluster.clusterId,
    )
    return alreadyInQuery ? null : pendingCluster.boundary
  }, [pendingCluster, clusters])

  const previewLeadCount = useMemo(() => {
    if (!drawnPolygon || !leads) return 0
    return leads.filter((lead) =>
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
    const result = await createCluster({ name: clusterName.trim(), boundary: drawnPolygon })
    setPendingCluster({ boundary: drawnPolygon, clusterId: result.clusterId })
    setShowNamingDialog(false)
    setDrawnPolygon(null)
    setClusterName("")
  }, [drawnPolygon, clusterName, createCluster])

  const handleCancelDialog = useCallback(() => {
    setShowNamingDialog(false)
    setDrawnPolygon(null)
    setClusterName("")
  }, [])

  return (
    <AppLayout>
      <div className="relative h-[calc(100vh-73px)] -m-6">
        <MapContent
          leads={filteredLeads}
          clusters={filteredClusters}
          isDrawing={isDrawing}
          onPolygonDrawn={handlePolygonDrawn}
          pendingPolygon={pendingPolygon}
        />
        <MapFilters
          value={filters}
          onChange={setFilters}
          clusters={clusterOptions}
        />
        <div className="absolute right-3 top-3 z-[1000]">
          <Button
            size="sm"
            variant={isDrawing ? "default" : "outline"}
            className="bg-card shadow-md"
            onClick={() => setIsDrawing((prev) => !prev)}
          >
            <PenTool className="mr-1.5 size-4" />
            {isDrawing ? "Cancel Drawing" : "Draw Cluster"}
          </Button>
        </div>
        <Dialog open={showNamingDialog} onOpenChange={(open) => {
          if (!open) handleCancelDialog()
        }}>
          <DialogContent>
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
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
