"use client"

import "leaflet-draw/dist/leaflet.draw.css"

import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet-draw"

type PolygonDrawProps = {
  isDrawing: boolean
  onPolygonDrawn: (latlngs: { lat: number; lng: number }[]) => void
}

export function PolygonDraw({ isDrawing, onPolygonDrawn }: PolygonDrawProps) {
  const map = useMap()
  const handlerRef = useRef<L.Draw.Polygon | null>(null)

  useEffect(() => {
    if (!isDrawing) {
      if (handlerRef.current) {
        handlerRef.current.disable()
        handlerRef.current = null
      }
      return
    }

    const handler = new L.Draw.Polygon(map as unknown as L.DrawMap, {
      shapeOptions: {
        color: "#3b82f6",
        weight: 2,
        fillOpacity: 0.15,
      },
    })

    handler.enable()
    handlerRef.current = handler

    const onCreated = (e: L.LeafletEvent) => {
      const event = e as L.DrawEvents.Created
      const layer = event.layer as L.Polygon
      const latlngs = (layer.getLatLngs()[0] as L.LatLng[]).map((ll) => ({
        lat: ll.lat,
        lng: ll.lng,
      }))
      map.removeLayer(layer)
      onPolygonDrawn(latlngs)

      if (handlerRef.current) {
        handlerRef.current.disable()
        handlerRef.current = null
      }
    }

    map.on(L.Draw.Event.CREATED, onCreated)

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated)
      if (handlerRef.current) {
        handlerRef.current.disable()
        handlerRef.current = null
      }
    }
  }, [isDrawing, map, onPolygonDrawn])

  return null
}
