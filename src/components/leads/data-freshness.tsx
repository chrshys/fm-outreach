"use client"

import { useRef, useState } from "react"
import { useAction } from "convex/react"
import { RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Doc, Id } from "../../../convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EnrichmentProgress } from "@/components/leads/enrichment-progress"

const SOURCE_LABELS: Record<string, string> = {
  google_places: "Google Places",
  website_scraper: "Website",
  hunter: "Hunter.io",
  claude_analysis: "Claude",
  social_discovery: "Social Discovery",
}

type StalenessLevel = "fresh" | "aging" | "stale"

function getStaleness(enrichedAt: number): StalenessLevel {
  const daysSince = (Date.now() - enrichedAt) / (1000 * 60 * 60 * 24)
  if (daysSince < 30) return "fresh"
  if (daysSince <= 90) return "aging"
  return "stale"
}

const STALENESS_CONFIG: Record<StalenessLevel, { label: string; className: string }> = {
  fresh: { label: "Fresh", className: "bg-green-100 text-green-800" },
  aging: { label: "Aging", className: "bg-amber-100 text-amber-800" },
  stale: { label: "Stale", className: "bg-red-100 text-red-800" },
}

type EnrichmentSourceEntry = { source: string; detail?: string; fetchedAt: number }

function latestBySource(sources: EnrichmentSourceEntry[]): EnrichmentSourceEntry[] {
  const map = new Map<string, EnrichmentSourceEntry>()
  for (const entry of sources) {
    const existing = map.get(entry.source)
    if (!existing || entry.fetchedAt > existing.fetchedAt) {
      map.set(entry.source, entry)
    }
  }
  return [...map.values()]
}

type DataFreshnessProps = {
  leadId: Id<"leads">
  enrichedAt?: number
  enrichmentSources?: Doc<"leads">["enrichmentSources"]
}

export function DataFreshness({ leadId, enrichedAt, enrichmentSources }: DataFreshnessProps) {
  const batchEnrich = useAction(api.enrichment.batchEnrichPublic.batchEnrich)
  const [isEnriching, setIsEnriching] = useState(false)
  const enrichmentSinceRef = useRef(0)
  const hasBeenEnriched = enrichedAt !== undefined

  async function handleEnrich() {
    setIsEnriching(true)
    enrichmentSinceRef.current = Date.now()
    toast.info(hasBeenEnriched ? "Re-enriching lead..." : "Enriching lead...")

    try {
      const result = await batchEnrich({
        leadIds: [leadId],
        overwrite: hasBeenEnriched ? true : undefined,
      })
      const { succeeded, failed } = result as {
        succeeded: number
        failed: number
        skipped: number
      }

      if (failed === 0 && succeeded > 0) {
        toast.success("Enrichment complete")
      } else if (failed > 0) {
        toast.error("Enrichment failed")
      } else {
        toast.info("Enrichment skipped")
      }
    } catch {
      toast.error("Enrichment failed. Please try again.")
    } finally {
      setIsEnriching(false)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p>
            <span className="font-medium">Last enriched:</span>{" "}
            {enrichedAt
              ? new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(enrichedAt))
              : "Never enriched"}
          </p>
          {enrichedAt && (
            <Badge className={STALENESS_CONFIG[getStaleness(enrichedAt)].className}>
              {STALENESS_CONFIG[getStaleness(enrichedAt)].label}
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isEnriching}
          onClick={handleEnrich}
        >
          {isEnriching ? (
            <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 size-3.5" />
          )}
          {isEnriching ? "Enriching..." : hasBeenEnriched ? "Re-enrich" : "Enrich"}
        </Button>
      </div>

      {enrichmentSources && enrichmentSources.length > 0 && (
        <div>
          <p className="font-medium mb-2">Enrichment sources:</p>
          <div className="flex flex-wrap gap-1.5">
            {latestBySource(enrichmentSources).map((entry) => (
              <Badge
                key={entry.source}
                variant="outline"
                className="font-normal"
              >
                {SOURCE_LABELS[entry.source] ?? entry.source}
                {" \u00B7 "}
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(entry.fetchedAt))}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {isEnriching && (
        <EnrichmentProgress
          leadIds={[leadId]}
          since={enrichmentSinceRef.current}
        />
      )}
    </div>
  )
}
