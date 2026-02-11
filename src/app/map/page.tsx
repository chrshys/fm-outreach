"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useQuery } from "convex/react"

import { api } from "../../../convex/_generated/api"
import { AppLayout } from "@/components/layout/app-layout"
import {
  MapFilters,
  defaultMapFilters,
  filterLeads,
} from "@/components/map/map-filters"
import type { MapFiltersValue } from "@/components/map/map-filters"

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
  const [filters, setFilters] = useState<MapFiltersValue>(defaultMapFilters)

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

  return (
    <AppLayout>
      <div className="relative h-[calc(100vh-73px)] -m-6">
        <MapContent
          leads={filteredLeads}
          clusters={filteredClusters}
        />
        <MapFilters
          value={filters}
          onChange={setFilters}
          clusters={clusterOptions}
        />
      </div>
    </AppLayout>
  )
}
