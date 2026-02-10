"use client"

import "leaflet/dist/leaflet.css"

import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"

const NIAGARA_CENTER: [number, number] = [43.08, -79.08]
const DEFAULT_ZOOM = 8

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

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
      {leads.map((lead) => (
        <Marker
          key={lead._id}
          position={[lead.latitude, lead.longitude]}
          icon={defaultIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{lead.name}</p>
              <p className="text-muted-foreground">
                {formatType(lead.type)} · {lead.city}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
