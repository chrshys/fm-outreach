"use client"

import "leaflet/dist/leaflet.css"

import { MapContainer, TileLayer, Polygon, CircleMarker } from "react-leaflet"

import { getStatusColor } from "@/components/map/status-colors"

type LeadPoint = {
  _id: string
  latitude: number
  longitude: number
  status: string
}

type ClusterMapProps = {
  boundary: Array<{ lat: number; lng: number }>
  centerLat: number
  centerLng: number
  radiusKm: number
  leads: LeadPoint[]
}

export default function ClusterMap({ boundary, centerLat, centerLng, radiusKm, leads }: ClusterMapProps) {
  const zoom = radiusKm < 2 ? 13 : radiusKm < 5 ? 12 : radiusKm < 15 ? 10 : 9
  const positions: [number, number][] = boundary.map((p) => [p.lat, p.lng])

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={zoom}
      className="h-full w-full"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polygon
        positions={positions}
        pathOptions={{
          fillColor: "#3b82f6",
          color: "#3b82f6",
          weight: 2,
          opacity: 0.6,
          fillOpacity: 0.15,
        }}
      />
      {leads.map((lead) => {
        const color = getStatusColor(lead.status)
        return (
          <CircleMarker
            key={lead._id}
            center={[lead.latitude, lead.longitude]}
            radius={6}
            pathOptions={{
              fillColor: color,
              color: color,
              weight: 2,
              opacity: 0.9,
              fillOpacity: 0.7,
            }}
          />
        )
      })}
    </MapContainer>
  )
}
