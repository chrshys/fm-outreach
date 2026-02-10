"use client"

import "leaflet/dist/leaflet.css"

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet"

import { getStatusColor } from "./status-colors"

const NIAGARA_CENTER: [number, number] = [43.08, -79.08]
const DEFAULT_ZOOM = 8

type LeadMarker = {
  _id: string
  name: string
  type: string
  city: string
  status: string
  latitude: number
  longitude: number
  clusterId?: string
}

type MapContentProps = {
  leads: LeadMarker[]
}

function formatType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function MapContent({ leads }: MapContentProps) {
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
              <div className="text-sm">
                <p className="font-semibold">{lead.name}</p>
                <p className="text-muted-foreground">
                  {formatType(lead.type)} · {lead.city}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
