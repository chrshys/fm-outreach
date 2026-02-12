"use client"

import "leaflet/dist/leaflet.css"

import {
  MapContainer,
  Pane,
  TileLayer,
  CircleMarker,
  Polygon,
  Popup,
  Tooltip,
} from "react-leaflet"

import DiscoveryGrid from "./discovery-grid"
import type { CellData } from "./discovery-grid"
import type { VirtualCell } from "@/lib/virtual-grid"
import { MapBoundsEmitter } from "./map-bounds-emitter"
import type { MapBounds } from "./map-bounds-emitter"
import { MapViewportSync } from "./map-viewport-sync"
import { MarkerPopup } from "./marker-popup"
import { PolygonDraw } from "./polygon-draw"
import { getStatusColor } from "./status-colors"
import { getClusterColor } from "./cluster-colors"

const NIAGARA_CENTER: [number, number] = [43.08, -79.08]
const DEFAULT_ZOOM = 8

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

export type ClusterBoundary = {
  _id: string
  name: string
  boundary: Array<{ lat: number; lng: number }>
  centerLat: number
  centerLng: number
  radiusKm: number
}

type MapContentProps = {
  leads: LeadMarker[]
  clusters?: ClusterBoundary[]
  isDrawing?: boolean
  onPolygonDrawn?: (latlngs: { lat: number; lng: number }[]) => void
  pendingPolygon?: { lat: number; lng: number }[] | null
  gridCells?: CellData[]
  selectedCellId?: string | null
  onCellSelect?: (cellId: string | null) => void
  cellSizeKm?: number
  gridId?: string
  activatedBoundsKeys?: string[]
  selectedVirtualCell?: VirtualCell | null
  onSelectVirtualCell?: (cell: VirtualCell | null) => void
  onBoundsChange?: (bounds: MapBounds) => void
}

export default function MapContent({ leads, clusters = [], isDrawing = false, onPolygonDrawn, pendingPolygon, gridCells, selectedCellId, onCellSelect, cellSizeKm, gridId, activatedBoundsKeys, selectedVirtualCell, onSelectVirtualCell, onBoundsChange }: MapContentProps) {
  return (
    <MapContainer
      center={NIAGARA_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewportSync />
      {clusters.filter((c) => c.boundary).map((cluster, index) => {
        const color = getClusterColor(index)
        const positions: [number, number][] = cluster.boundary.map((p) => [p.lat, p.lng])
        return (
          <Polygon
            key={cluster._id}
            positions={positions}
            pathOptions={{
              fillColor: color,
              color: color,
              weight: 2,
              opacity: 0.6,
              fillOpacity: 0.15,
            }}
          >
            <Tooltip direction="center" permanent={false}>
              {cluster.name}
            </Tooltip>
          </Polygon>
        )
      })}
      {pendingPolygon && pendingPolygon.length > 0 && (
        <Polygon
          positions={pendingPolygon.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{
            fillColor: getClusterColor(clusters.length),
            color: getClusterColor(clusters.length),
            weight: 2,
            opacity: 0.6,
            fillOpacity: 0.15,
          }}
        />
      )}
      {/* Render DiscoveryGrid: {gridCells && onCellSelect && ( <DiscoveryGrid /> )} */}
      {gridCells && onCellSelect ? (
        <Pane name="discovery-grid" style={{ zIndex: 350 }}>
          <DiscoveryGrid cells={gridCells} selectedCellId={selectedCellId ?? null} onCellSelect={onCellSelect} cellSizeKm={cellSizeKm ?? 20} gridId={gridId ?? ""} activatedBoundsKeys={activatedBoundsKeys ?? []} selectedVirtualCell={selectedVirtualCell ?? null} onSelectVirtualCell={onSelectVirtualCell ?? (() => {})} />
        </Pane>
      ) : cellSizeKm != null && gridId ? (
        <Pane name="virtual-grid-overlay" style={{ zIndex: 340 }}>
          <DiscoveryGrid cells={[]} selectedCellId={null} onCellSelect={() => {}} cellSizeKm={cellSizeKm ?? 20} gridId={gridId ?? ""} activatedBoundsKeys={[]} selectedVirtualCell={null} onSelectVirtualCell={(() => {})} />
        </Pane>
      ) : null}
      <Pane name="lead-markers" style={{ zIndex: 450 }}>
      {leads.map((lead) => {
        const color = getStatusColor(lead.status)
        return (
          <CircleMarker
            key={lead._id}
            center={[lead.latitude, lead.longitude]}
            radius={8}
            pathOptions={{
              fillColor: color,
              color: color,
              weight: 2,
              opacity: 0.9,
              fillOpacity: 0.7,
            }}
          >
            <Popup pane="popupPane">
              <MarkerPopup
                id={lead._id}
                name={lead.name}
                type={lead.type}
                city={lead.city}
                status={lead.status}
                contactEmail={lead.contactEmail}
              />
            </Popup>
          </CircleMarker>
        )
      })}
      </Pane>
      {onBoundsChange && (
        <MapBoundsEmitter onBoundsChange={onBoundsChange} />
      )}
      {onPolygonDrawn && (
        <PolygonDraw isDrawing={isDrawing} onPolygonDrawn={onPolygonDrawn} />
      )}
    </MapContainer>
  )
}
