import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { MapFiltersValue } from "@/components/map/map-filters"
import { defaultMapFilters } from "@/components/map/map-filters"

export type Viewport = {
  center: [number, number]
  zoom: number
}

const DEFAULT_VIEWPORT: Viewport = {
  center: [43.08, -79.08],
  zoom: 8,
}

type MapState = {
  viewport: Viewport
  filters: MapFiltersValue
  viewMode: "clusters" | "discovery"
  globalGridId: string | null
  selectedCellId: string | null
  selectedLeadId: string | null
}

type MapActions = {
  setViewport: (viewport: Viewport) => void
  setFilters: (filters: MapFiltersValue) => void
  setViewMode: (viewMode: "clusters" | "discovery") => void
  setGlobalGridId: (id: string | null) => void
  setSelectedCellId: (id: string | null) => void
  setSelectedLeadId: (id: string | null) => void
}

export const useMapStore = create<MapState & MapActions>()(
  persist(
    (set) => ({
      viewport: DEFAULT_VIEWPORT,
      filters: defaultMapFilters,
      viewMode: "clusters",
      globalGridId: null,
      selectedCellId: null,
      selectedLeadId: null,

      setViewport: (viewport) => set({ viewport }),
      setFilters: (filters) => set({ filters }),
      setViewMode: (viewMode) => set({ viewMode }),
      setGlobalGridId: (id) => set({ globalGridId: id }),
      setSelectedCellId: (id) => set({ selectedCellId: id }),
      setSelectedLeadId: (id) => set({ selectedLeadId: id }),
    }),
    {
      name: "fm-map-state",
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return null
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str) : null
        },
        setItem: (name, value) => {
          if (typeof window === "undefined") return
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          if (typeof window === "undefined") return
          localStorage.removeItem(name)
        },
      },
      partialize: (state) =>
        ({
          viewport: state.viewport,
          filters: state.filters,
          viewMode: state.viewMode,
          globalGridId: state.globalGridId,
        }) as unknown as MapState & MapActions,
    },
  ),
)
