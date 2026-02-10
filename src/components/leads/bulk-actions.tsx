"use client"

import { useState } from "react"
import { useAction, useMutation } from "convex/react"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import type { Id } from "../../../convex/_generated/dataModel"
import { api } from "../../../convex/_generated/api"

import { LEAD_STATUSES, type LeadStatus } from "@/components/leads/lead-filters"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ClusterOption = {
  id: Id<"clusters">
  name: string
}

type BulkActionsProps = {
  selectedLeadIds: Id<"leads">[]
  clusterOptions: ClusterOption[]
  onComplete: () => void
}

function toLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

export function BulkActions({ selectedLeadIds, clusterOptions, onComplete }: BulkActionsProps) {
  const bulkUpdateStatus = useMutation(api.leads.bulkUpdateStatus)
  const bulkAssignCluster = useMutation(api.leads.bulkAssignCluster)
  const batchEnrich = useAction(api.enrichment.batchEnrichPublic.batchEnrich)
  const [isApplying, setIsApplying] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)

  if (selectedLeadIds.length === 0) {
    return null
  }

  async function handleChangeStatus(status: LeadStatus) {
    setIsApplying(true)

    try {
      await bulkUpdateStatus({
        leadIds: selectedLeadIds,
        status,
      })
      onComplete()
    } finally {
      setIsApplying(false)
    }
  }

  async function handleAssignCluster(clusterId: Id<"clusters">) {
    setIsApplying(true)

    try {
      await bulkAssignCluster({
        leadIds: selectedLeadIds,
        clusterId,
      })
      onComplete()
    } finally {
      setIsApplying(false)
    }
  }

  async function handleEnrichSelected() {
    setIsEnriching(true)
    toast.info(`Enriching ${selectedLeadIds.length} lead${selectedLeadIds.length === 1 ? "" : "s"}...`)

    try {
      const result = await batchEnrich({ leadIds: selectedLeadIds })
      const { succeeded, failed, skipped } = result as {
        succeeded: number
        failed: number
        skipped: number
      }

      if (failed === 0) {
        toast.success(`Enrichment complete: ${succeeded} enriched, ${skipped} skipped`)
      } else {
        toast.warning(`Enrichment done: ${succeeded} enriched, ${failed} failed, ${skipped} skipped`)
      }

      onComplete()
    } catch {
      toast.error("Enrichment failed. Please try again.")
    } finally {
      setIsEnriching(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
      <p className="mr-2 text-sm font-medium">{selectedLeadIds.length} selected</p>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={isApplying}>
            Change Status
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {LEAD_STATUSES.map((status) => (
            <DropdownMenuItem key={status} onClick={() => handleChangeStatus(status)}>
              {toLabel(status)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={isApplying}>
            Assign to Cluster
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {clusterOptions.length === 0 ? (
            <DropdownMenuItem disabled>No clusters available</DropdownMenuItem>
          ) : (
            clusterOptions.map((cluster) => (
              <DropdownMenuItem key={cluster.id} onClick={() => handleAssignCluster(cluster.id)}>
                {cluster.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isEnriching || isApplying}
        onClick={handleEnrichSelected}
      >
        <Sparkles className="mr-1.5 size-3.5" />
        {isEnriching ? "Enriching..." : "Enrich Selected"}
      </Button>
    </div>
  )
}
