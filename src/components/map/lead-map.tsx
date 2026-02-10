"use client"

import "leaflet/dist/leaflet.css"

import dynamic from "next/dynamic"
import { MapContainer, TileLayer } from "react-leaflet"
import type { MapContainerProps } from "react-leaflet"

const NIAGARA_CENTER: [number, number] = [43.08, -79.08]
const DEFAULT_ZOOM = 8

type LeadMapInnerProps = Omit<MapContainerProps, "children"> & {
  children?: React.ReactNode
}

function LeadMapInner({ children, ...props }: LeadMapInnerProps) {
  return (
    <MapContainer
      center={NIAGARA_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      {...props}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  )
}

const LeadMap = dynamic(() => Promise.resolve(LeadMapInner), {
  ssr: false,
})

export { LeadMap, NIAGARA_CENTER, DEFAULT_ZOOM }
