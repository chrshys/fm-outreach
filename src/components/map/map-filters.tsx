"use client"

import { useMemo, useState } from "react"
import { Filter, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LEAD_STATUSES, LEAD_TYPES } from "@/components/leads/lead-filters"
import type { LeadStatus, LeadType } from "@/components/leads/lead-filters"
import { getStatusColor } from "./status-colors"

export type MapFiltersValue = {
  statuses: LeadStatus[]
  types: LeadType[]
  clusterId: string | "all"
}

export const defaultMapFilters: MapFiltersValue = {
  statuses: [],
  types: [],
  clusterId: "all",
}

type ClusterOption = {
  id: string
  name: string
}

type MapFiltersProps = {
  value: MapFiltersValue
  onChange: (next: MapFiltersValue) => void
  clusters: ClusterOption[]
}

function toLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function MultiSelectPopover<T extends string>({
  label,
  options,
  selected,
  onToggle,
  renderOption,
}: {
  label: string
  options: readonly T[]
  selected: T[]
  onToggle: (value: T) => void
  renderOption?: (value: T) => React.ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start">
        <div className="space-y-1">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selected.includes(option)}
                onCheckedChange={() => onToggle(option)}
              />
              {renderOption ? renderOption(option) : toLabel(option)}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function MapFilters({ value, onChange, clusters }: MapFiltersProps) {
  const [open, setOpen] = useState(true)

  const activeCount = useMemo(() => {
    let count = 0
    if (value.statuses.length > 0) count++
    if (value.types.length > 0) count++
    if (value.clusterId !== "all") count++
    return count
  }, [value])

  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; clear: () => void }[] = []
    if (value.statuses.length > 0) {
      filters.push({
        key: "statuses",
        label: `Status (${value.statuses.length})`,
        clear: () => onChange({ ...value, statuses: [] }),
      })
    }
    if (value.types.length > 0) {
      filters.push({
        key: "types",
        label: `Type (${value.types.length})`,
        clear: () => onChange({ ...value, types: [] }),
      })
    }
    if (value.clusterId !== "all") {
      const cluster = clusters.find((c) => c.id === value.clusterId)
      filters.push({
        key: "clusterId",
        label: `Cluster: ${cluster?.name ?? "Unknown"}`,
        clear: () => onChange({ ...value, clusterId: "all" }),
      })
    }
    return filters
  }, [value, onChange, clusters])

  function toggleStatus(status: LeadStatus) {
    const next = value.statuses.includes(status)
      ? value.statuses.filter((s) => s !== status)
      : [...value.statuses, status]
    onChange({ ...value, statuses: next })
  }

  function toggleType(type: LeadType) {
    const next = value.types.includes(type)
      ? value.types.filter((t) => t !== type)
      : [...value.types, type]
    onChange({ ...value, types: next })
  }

  return (
    <div className="absolute left-3 top-3 z-[1000]">
      {!open ? (
        <Button
          size="sm"
          variant="outline"
          className="bg-card shadow-md"
          onClick={() => setOpen(true)}
        >
          <Filter className="mr-1.5 size-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      ) : (
        <div className="w-72 rounded-lg border bg-card p-3 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Filters</span>
            <button
              type="button"
              className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <MultiSelectPopover
                label="Select statuses"
                options={LEAD_STATUSES}
                selected={value.statuses}
                onToggle={toggleStatus}
                renderOption={(status) => (
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: getStatusColor(status) }}
                    />
                    {toLabel(status)}
                  </span>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <MultiSelectPopover
                label="Select types"
                options={LEAD_TYPES}
                selected={value.types}
                onToggle={toggleType}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cluster</Label>
              <Select
                value={value.clusterId}
                onValueChange={(clusterId) => onChange({ ...value, clusterId })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Clusters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clusters</SelectItem>
                  {clusters.map((cluster) => (
                    <SelectItem key={cluster.id} value={cluster.id}>
                      {cluster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeFilters.map((filter) => (
                <Badge key={filter.key} variant="secondary" className="gap-1 pr-1 text-xs">
                  <span>{filter.label}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-black/10"
                    aria-label={`Clear ${filter.label}`}
                    onClick={filter.clear}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function filterLeads<
  T extends { status: string; type: string; clusterId?: string },
>(leads: T[], filters: MapFiltersValue): T[] {
  return leads.filter((lead) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(lead.status as LeadStatus)) {
      return false
    }
    if (filters.types.length > 0 && !filters.types.includes(lead.type as LeadType)) {
      return false
    }
    if (filters.clusterId !== "all" && lead.clusterId !== filters.clusterId) {
      return false
    }
    return true
  })
}
