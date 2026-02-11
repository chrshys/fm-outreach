"use client"

import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  clusterId: string | "all"
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
    value.clusterId !== "all"
      ? {
          key: "clusterId",
          label: `Cluster: ${clusters.find((c) => c.id === value.clusterId)?.name ?? "Unknown"}`,
          clear: () => onChange({ ...value, clusterId: "all" }),
        }
      : null,
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
          <Select value={value.clusterId} onValueChange={(clusterId) => onChange({ ...value, clusterId })}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Cluster" />
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
        )}

        <Button
          type="button"
          variant={value.hasEmail ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...value, hasEmail: !value.hasEmail })}
        >
          Has Email
        </Button>
        <Button
          type="button"
          variant={value.hasSocial ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...value, hasSocial: !value.hasSocial })}
        >
          Has Social
        </Button>
        <Button
          type="button"
          variant={value.hasFacebook ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...value, hasFacebook: !value.hasFacebook })}
        >
          Has Facebook
        </Button>
        <Button
          type="button"
          variant={value.hasInstagram ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...value, hasInstagram: !value.hasInstagram })}
        >
          Has Instagram
        </Button>
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
