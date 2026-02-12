import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { LeadFiltersValue } from "@/components/leads/lead-filters"

export type LeadSortField = "name" | "city" | "status"
export type LeadSortOrder = "asc" | "desc"

export const defaultFilters: LeadFiltersValue = {
  status: "all",
  type: "all",
  source: "all",
  clusterId: "all",
  hasEmail: false,
  hasSocial: false,
  hasFacebook: false,
  hasInstagram: false,
  needsFollowUp: false,
}

type LeadsState = {
  filters: LeadFiltersValue
  searchTerm: string
  sortBy: LeadSortField
  sortOrder: LeadSortOrder
}

type LeadsActions = {
  setFilters: (filters: LeadFiltersValue) => void
  setSearchTerm: (searchTerm: string) => void
  setSortBy: (sortBy: LeadSortField) => void
  setSortOrder: (sortOrder: LeadSortOrder) => void
}

export const useLeadsStore = create<LeadsState & LeadsActions>()(
  persist(
    (set) => ({
      filters: defaultFilters,
      searchTerm: "",
      sortBy: "name",
      sortOrder: "asc",

      setFilters: (filters) => set({ filters }),
      setSearchTerm: (searchTerm) => set({ searchTerm }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
    }),
    {
      name: "fm-leads-state",
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return null
          const str = sessionStorage.getItem(name)
          return str ? JSON.parse(str) : null
        },
        setItem: (name, value) => {
          if (typeof window === "undefined") return
          sessionStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          if (typeof window === "undefined") return
          sessionStorage.removeItem(name)
        },
      },
      partialize: (state) =>
        ({
          filters: state.filters,
          searchTerm: state.searchTerm,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
        }) as unknown as LeadsState & LeadsActions,
    },
  ),
)
