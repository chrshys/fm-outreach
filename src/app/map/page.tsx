"use client"

import dynamic from "next/dynamic"
import { useQuery } from "convex/react"

import { api } from "../../../convex/_generated/api"
import { AppLayout } from "@/components/layout/app-layout"

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

  return (
    <AppLayout>
      <div className="h-[calc(100vh-73px)] -m-6">
        <MapContent leads={leads ?? []} />
      </div>
    </AppLayout>
  )
}
