"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useConvex } from "convex/react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import type { KeyboardEvent, MouseEvent } from "react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

import { BulkActions } from "@/components/leads/bulk-actions"
import {
  LeadFilters,
  type LeadFiltersValue,
  type LeadSource,
  type LeadStatus,
  type LeadType,
} from "@/components/leads/lead-filters"
import { LeadSearch } from "@/components/leads/lead-search"
import { AppLayout } from "@/components/layout/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Lead = {
  _id: string
  name: string
  type: LeadType
  city: string
  status: LeadStatus
  source: LeadSource
  contactEmail?: string
  socialLinks?: {
    instagram?: string
    facebook?: string
  }
  updatedAt: number
  nextFollowUpAt?: number
}

type LeadSortField = "name" | "city" | "status"
type LeadSortOrder = "asc" | "desc"

const clusters = [
  { id: "cluster-east-coast" as Id<"clusters">, name: "East Coast" },
  { id: "cluster-gulf-coast" as Id<"clusters">, name: "Gulf Coast" },
]

const statusClassNames: Record<LeadStatus, string> = {
  new_lead: "bg-blue-100 text-blue-800",
  enriched: "bg-indigo-100 text-indigo-800",
  outreach_started: "bg-amber-100 text-amber-800",
  replied: "bg-violet-100 text-violet-800",
  meeting_booked: "bg-emerald-100 text-emerald-800",
  onboarded: "bg-green-100 text-green-800",
  declined: "bg-rose-100 text-rose-800",
  not_interested: "bg-zinc-200 text-zinc-800",
  bounced: "bg-red-100 text-red-800",
  no_response: "bg-orange-100 text-orange-800",
  no_email: "bg-stone-200 text-stone-800",
}

const defaultFilters: LeadFiltersValue = {
  status: "all",
  type: "all",
  source: "all",
  hasEmail: false,
  hasSocial: false,
  needsFollowUp: false,
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function toLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function isOverdue(value?: number) {
  if (value === undefined) {
    return false
  }

  const today = new Date()
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dueDate = new Date(value)
  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  return dueDay < currentDay
}

function hasSocial(lead: Lead) {
  const instagram = lead.socialLinks?.instagram?.trim()
  const facebook = lead.socialLinks?.facebook?.trim()
  return {
    instagram: Boolean(instagram),
    facebook: Boolean(facebook),
  }
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.closest("button, a, input, textarea, select, [role='checkbox']") !== null
}

export default function LeadsPage() {
  const router = useRouter()
  const convex = useConvex()
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [filters, setFilters] = useState<LeadFiltersValue>(defaultFilters)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<LeadSortField>("name")
  const [sortOrder, setSortOrder] = useState<LeadSortOrder>("asc")
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [reloadToken, setReloadToken] = useState(0)
  const [isLoadingLeads, setIsLoadingLeads] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const listArgs = useMemo(
    () => ({
      status: filters.status === "all" ? undefined : filters.status,
      type: filters.type === "all" ? undefined : filters.type,
      source: filters.source === "all" ? undefined : filters.source,
      hasEmail: filters.hasEmail ? true : undefined,
      hasSocial: filters.hasSocial ? true : undefined,
      needsFollowUp: filters.needsFollowUp ? true : undefined,
      sortBy,
      sortOrder,
    }),
    [filters, sortBy, sortOrder]
  )

  useEffect(() => {
    let cancelled = false

    async function loadAllLeads() {
      setIsLoadingLeads(true)
      setLoadError(null)
      setSelectedLeadIds([])

      try {
        const loadedLeads: Lead[] = []
        let cursor: string | undefined = undefined

        while (!cancelled) {
          const result = (await convex.query(api.leads.list, {
            ...listArgs,
            cursor,
          })) as { leads: Lead[]; cursor: string | null }

          loadedLeads.push(...result.leads)

          if (result.cursor === null) {
            break
          }

          cursor = result.cursor
        }

        if (!cancelled) {
          setAllLeads(loadedLeads)
        }
      } catch {
        if (!cancelled) {
          setLoadError("Unable to load leads.")
          setAllLeads([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLeads(false)
        }
      }
    }

    void loadAllLeads()

    return () => {
      cancelled = true
    }
  }, [convex, listArgs, reloadToken])

  const filteredLeads = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (normalizedSearch.length === 0) {
      return allLeads
    }

    return allLeads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(normalizedSearch) ||
        lead.city.toLowerCase().includes(normalizedSearch)
    )
  }, [allLeads, searchTerm])

  const allSelected = useMemo(
    () =>
      filteredLeads.length > 0 &&
      filteredLeads.every((lead) => selectedLeadIds.includes(lead._id)),
    [filteredLeads, selectedLeadIds]
  )

  function toggleAll(checked: boolean) {
    const visibleIds = filteredLeads.map((lead) => lead._id)

    if (checked) {
      setSelectedLeadIds((previous) => [...new Set([...previous, ...visibleIds])])
      return
    }

    setSelectedLeadIds((previous) => previous.filter((id) => !visibleIds.includes(id)))
  }

  function toggleLead(leadId: string, checked: boolean) {
    if (checked) {
      setSelectedLeadIds((previous) => [...new Set([...previous, leadId])])
      return
    }

    setSelectedLeadIds((previous) => previous.filter((id) => id !== leadId))
  }

  function goToLead(leadId: string) {
    router.push(`/leads/${leadId}`)
  }

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>, leadId: string) {
    if (isInteractiveTarget(event.target)) {
      return
    }

    goToLead(leadId)
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, leadId: string) {
    if (isInteractiveTarget(event.target)) {
      return
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      goToLead(leadId)
    }
  }

  function handleBulkActionComplete() {
    setSelectedLeadIds([])
    setReloadToken((previous) => previous + 1)
  }

  function toggleSort(field: LeadSortField) {
    if (sortBy === field) {
      setSortOrder((previous) => (previous === "asc" ? "desc" : "asc"))
      return
    }

    setSortBy(field)
    setSortOrder("asc")
  }

  function SortIcon({ field }: { field: LeadSortField }) {
    if (sortBy !== field) {
      return <ArrowUpDown className="size-4 text-muted-foreground" aria-hidden="true" />
    }

    if (sortOrder === "asc") {
      return <ArrowUp className="size-4" aria-hidden="true" />
    }

    return <ArrowDown className="size-4" aria-hidden="true" />
  }

  return (
    <AppLayout>
      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">Track outreach and follow-up timing by lead.</p>
        </div>

        <LeadSearch value={searchTerm} onChange={setSearchTerm} />
        <LeadFilters value={filters} onChange={setFilters} />
        <BulkActions
          selectedLeadIds={selectedLeadIds as Id<"leads">[]}
          clusterOptions={clusters}
          onComplete={handleBulkActionComplete}
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  aria-label="Select all leads"
                  onCheckedChange={(value) => toggleAll(value === true)}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="-ml-3 h-8 px-3"
                  onClick={() => toggleSort("name")}
                  aria-label="Sort by name"
                >
                  Name
                  <SortIcon field="name" />
                </Button>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="-ml-3 h-8 px-3"
                  onClick={() => toggleSort("city")}
                  aria-label="Sort by city"
                >
                  City
                  <SortIcon field="city" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="-ml-3 h-8 px-3"
                  onClick={() => toggleSort("status")}
                  aria-label="Sort by status"
                >
                  Status
                  <SortIcon field="status" />
                </Button>
              </TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Social</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Follow-up Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingLeads ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground text-center">
                  Loading leads...
                </TableCell>
              </TableRow>
            ) : loadError ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-red-600">
                  {loadError}
                </TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground text-center">
                  No leads match the selected filters.
                </TableCell>
              </TableRow>
            ) : null}

            {filteredLeads.map((lead) => {
              const selected = selectedLeadIds.includes(lead._id)
              const overdue = isOverdue(lead.nextFollowUpAt)
              const social = hasSocial(lead)

              return (
                <TableRow
                  key={lead._id}
                  role="link"
                  tabIndex={0}
                  data-state={selected ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={(event) => handleRowClick(event, lead._id)}
                  onKeyDown={(event) => handleRowKeyDown(event, lead._id)}
                >
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={selected}
                      aria-label={`Select ${lead.name}`}
                      onCheckedChange={(value) => toggleLead(lead._id, value === true)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{toLabel(lead.type)}</TableCell>
                  <TableCell>{lead.city}</TableCell>
                  <TableCell>
                    <Badge className={statusClassNames[lead.status]}>{toLabel(lead.status)}</Badge>
                  </TableCell>
                  <TableCell>{lead.contactEmail?.trim() || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Badge variant={social.facebook ? "default" : "outline"}>FB</Badge>
                      <Badge variant={social.instagram ? "default" : "outline"}>IG</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(lead.updatedAt)}</TableCell>
                  <TableCell>
                    {overdue ? (
                      <span className="font-medium text-red-600">Overdue</span>
                    ) : lead.nextFollowUpAt ? (
                      formatDate(lead.nextFollowUpAt)
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </section>
    </AppLayout>
  )
}
