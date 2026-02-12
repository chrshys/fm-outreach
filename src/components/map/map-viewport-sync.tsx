"use client"

import { useRef } from "react"
import { useMap, useMapEvents } from "react-leaflet"

import { useMapStore } from "@/lib/map-store"

/**
 * Renderless component that syncs Leaflet's viewport with the zustand store.
 * Must be rendered inside a <MapContainer>.
 *
 * On mount: restores the persisted center/zoom via map.setView().
 * On moveend/zoomend: writes the current center/zoom back to the store.
 */
export function MapViewportSync() {
  const map = useMap()
  const restored = useRef(false)

  // Restore persisted viewport once on mount
  if (!restored.current) {
    const { viewport } = useMapStore.getState()
    map.setView(viewport.center, viewport.zoom, { animate: false })
    restored.current = true
  }

  useMapEvents({
    moveend: () => {
      const c = map.getCenter()
      useMapStore.getState().setViewport({
        center: [c.lat, c.lng],
        zoom: map.getZoom(),
      })
    },
    zoomend: () => {
      const c = map.getCenter()
      useMapStore.getState().setViewport({
        center: [c.lat, c.lng],
        zoom: map.getZoom(),
      })
    },
  })

  return null
}
