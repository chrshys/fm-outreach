"use client"

import { useQuery } from "convex/react"
import { Loader2, Sparkles } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

type EnrichmentProgressProps = {
  leadIds: Id<"leads">[]
  since: number
}

export function EnrichmentProgress({ leadIds, since }: EnrichmentProgressProps) {
  const progress = useQuery(api.activities.enrichmentProgress, {
    leadIds,
    since,
  })

  if (progress === undefined) {
    return null
  }

  const completed = progress.finished + progress.skipped
  const percent = progress.total > 0 ? Math.round((completed / progress.total) * 100) : 0
  const allDone = completed >= progress.total

  if (allDone) {
    return null
  }

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <div className="flex flex-1 items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            Enriching: {completed} of {progress.total} leads
          </span>
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
      </div>
    </div>
  )
}
