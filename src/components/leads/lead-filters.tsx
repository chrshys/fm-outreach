"use client"

import { ChevronDown, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const LEAD_STATUSES = [
  "new_lead",
  "enriched",
  "outreach_started",
  "replied",
  "meeting_booked",
  "onboarded",
  "declined",
  "not_interested",
  "bounced",
  "no_response",
  "no_email",
] as const

export const LEAD_TYPES = ["farm", "farmers_market", "retail_store", "roadside_stand", "other"] as const

export const LEAD_SOURCES = [
  "spreadsheet_import",
  "google_places",
  "farm_directory",
  "manual",
  "web_scrape",
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]
export type LeadType = (typeof LEAD_TYPES)[number]
export type LeadSource = (typeof LEAD_SOURCES)[number]

export type LeadFiltersValue = {
  status: LeadStatus | "all"
  type: LeadType | "all"
  source: LeadSource | "all"
  clusterIds: string[]
  hasEmail: boolean
  hasSocial: boolean
  hasFacebook: boolean
  hasInstagram: boolean
  needsFollowUp: boolean
}

type ClusterOption = {
  id: string
  name: string
}

type LeadFiltersProps = {
  value: LeadFiltersValue
  onChange: (next: LeadFiltersValue) => void
  clusters?: ClusterOption[]
}

function toLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

const CONTACT_FILTERS = [
  { key: "hasEmail", label: "Has Email" },
  { key: "hasSocial", label: "Has Social" },
  { key: "hasFacebook", label: "Has Facebook" },
  { key: "hasInstagram", label: "Has Instagram" },
] as const

function ContactFilterDropdown({
  value,
  onChange,
}: {
  value: LeadFiltersValue
  onChange: (next: LeadFiltersValue) => void
}) {
  const activeCount = CONTACT_FILTERS.filter((f) => value[f.key]).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant={activeCount > 0 ? "default" : "outline"} size="sm" className="gap-1">
          Contact Info
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 size-5 justify-center rounded-full p-0 text-xs">
              {activeCount}
            </Badge>
          )}
          <ChevronDown className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {CONTACT_FILTERS.map((filter) => (
          <label
            key={filter.key}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Checkbox
              checked={value[filter.key]}
              onCheckedChange={(checked) =>
                onChange({ ...value, [filter.key]: checked === true })
              }
            />
            {filter.label}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function ClusterFilterDropdown({
  value,
  onChange,
  clusters,
}: {
  value: LeadFiltersValue
  onChange: (next: LeadFiltersValue) => void
  clusters: ClusterOption[]
}) {
  const activeCount = value.clusterIds.length

  function toggle(clusterId: string, checked: boolean) {
    const next = checked
      ? [...value.clusterIds, clusterId]
      : value.clusterIds.filter((id) => id !== clusterId)
    onChange({ ...value, clusterIds: next })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant={activeCount > 0 ? "default" : "outline"} size="sm" className="gap-1">
          Clusters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 size-5 justify-center rounded-full p-0 text-xs">
              {activeCount}
            </Badge>
          )}
          <ChevronDown className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {clusters.map((cluster) => (
          <label
            key={cluster.id}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Checkbox
              checked={value.clusterIds.includes(cluster.id)}
              onCheckedChange={(checked) => toggle(cluster.id, checked === true)}
            />
            {cluster.name}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  )
}

export function LeadFilters({ value, onChange, clusters = [] }: LeadFiltersProps) {
  const activeFilters = [
    value.status !== "all"
      ? {
          key: "status",
          label: `Status: ${toLabel(value.status)}`,
          clear: () => onChange({ ...value, status: "all" }),
        }
      : null,
    value.type !== "all"
      ? {
          key: "type",
          label: `Type: ${toLabel(value.type)}`,
          clear: () => onChange({ ...value, type: "all" }),
        }
      : null,
    value.source !== "all"
      ? {
          key: "source",
          label: `Source: ${toLabel(value.source)}`,
          clear: () => onChange({ ...value, source: "all" }),
        }
      : null,
    ...value.clusterIds.map((id) => ({
      key: `cluster-${id}`,
      label: `Cluster: ${clusters.find((c) => c.id === id)?.name ?? "Unknown"}`,
      clear: () => onChange({ ...value, clusterIds: value.clusterIds.filter((cid) => cid !== id) }),
    })),
    value.hasEmail
      ? {
          key: "hasEmail",
          label: "Has Email",
          clear: () => onChange({ ...value, hasEmail: false }),
        }
      : null,
    value.hasSocial
      ? {
          key: "hasSocial",
          label: "Has Social",
          clear: () => onChange({ ...value, hasSocial: false }),
        }
      : null,
    value.hasFacebook
      ? {
          key: "hasFacebook",
          label: "Has Facebook",
          clear: () => onChange({ ...value, hasFacebook: false }),
        }
      : null,
    value.hasInstagram
      ? {
          key: "hasInstagram",
          label: "Has Instagram",
          clear: () => onChange({ ...value, hasInstagram: false }),
        }
      : null,
    value.needsFollowUp
      ? {
          key: "needsFollowUp",
          label: "Needs Follow-up",
          clear: () => onChange({ ...value, needsFollowUp: false }),
        }
      : null,
  ].filter((filter): filter is NonNullable<typeof filter> => filter !== null)

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={value.status} onValueChange={(status: LeadStatus | "all") => onChange({ ...value, status })}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LEAD_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {toLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.type} onValueChange={(type: LeadType | "all") => onChange({ ...value, type })}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {LEAD_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {toLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.source} onValueChange={(source: LeadSource | "all") => onChange({ ...value, source })}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {LEAD_SOURCES.map((source) => (
              <SelectItem key={source} value={source}>
                {toLabel(source)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {clusters.length > 0 && (
          <ClusterFilterDropdown value={value} onChange={onChange} clusters={clusters} />
        )}

        <ContactFilterDropdown value={value} onChange={onChange} />
        <Button
          type="button"
          variant={value.needsFollowUp ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...value, needsFollowUp: !value.needsFollowUp })}
        >
          Needs Follow-up
        </Button>
      </div>

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1 pr-1">
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
      ) : null}
    </div>
  )
}
