import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { STATUS_COLORS } from "@/components/map/status-colors"

const PIPELINE_ORDER = [
  "new_lead",
  "enriched",
  "outreach_started",
  "replied",
  "onboarded",
] as const

const PIPELINE_LABELS: Record<string, string> = {
  new_lead: "New",
  enriched: "Enriched",
  outreach_started: "Outreach",
  replied: "Replied",
  onboarded: "Onboarded",
}

interface PipelineFunnelProps {
  pipeline: Record<string, number>
}

export function PipelineFunnel({ pipeline }: PipelineFunnelProps) {
  const max = Math.max(...PIPELINE_ORDER.map((s) => pipeline[s] ?? 0), 1)

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle>Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2" data-testid="pipeline-funnel">
          {PIPELINE_ORDER.map((status) => {
            const count = pipeline[status] ?? 0
            const widthPct = Math.max((count / max) * 100, 2)
            return (
              <div key={status} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm text-muted-foreground">
                  {PIPELINE_LABELS[status]}
                </span>
                <div className="flex-1">
                  <div
                    className="h-5 rounded"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: STATUS_COLORS[status],
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium">{count}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
