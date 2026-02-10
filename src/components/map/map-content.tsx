"use client"

import "leaflet/dist/leaflet.css"

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  Tooltip,
} from "react-leaflet"

import { MarkerPopup } from "./marker-popup"
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
  centerLat: number
  centerLng: number
  radiusKm: number
}

type MapContentProps = {
  leads: LeadMarker[]
  clusters?: ClusterBoundary[]
}

export default function MapContent({ leads, clusters = [] }: MapContentProps) {
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
      {clusters.map((cluster, index) => {
        const color = getClusterColor(index)
        return (
          <Circle
            key={cluster._id}
            center={[cluster.centerLat, cluster.centerLng]}
            radius={cluster.radiusKm * 1000}
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
          </Circle>
        )
      })}
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
            <Popup>
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
    </MapContainer>
  )
}
