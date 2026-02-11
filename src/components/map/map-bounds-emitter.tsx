"use client"

import { useEffect } from "react"
import { useMap, useMapEvents } from "react-leaflet"

export type MapBounds = {
  swLat: number
  swLng: number
  neLat: number
  neLng: number
}

type MapBoundsEmitterProps = {
  onBoundsChange: (bounds: MapBounds) => void
}

function getBounds(map: ReturnType<typeof useMap>): MapBounds {
  const b = map.getBounds()
  return {
    swLat: b.getSouthWest().lat,
    swLng: b.getSouthWest().lng,
    neLat: b.getNorthEast().lat,
    neLng: b.getNorthEast().lng,
  }
}

export function MapBoundsEmitter({ onBoundsChange }: MapBoundsEmitterProps) {
  const map = useMap()

  useMapEvents({
    moveend: () => onBoundsChange(getBounds(map)),
    zoomend: () => onBoundsChange(getBounds(map)),
  })

  useEffect(() => {
    onBoundsChange(getBounds(map))
  }, [map, onBoundsChange])

  return null
}
