import Link from "next/link"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface FollowUpLeadItem {
  _id: string
  name: string
  city: string
  type: string
  nextFollowUpAt: number
}

export interface NeedsFollowUpStats {
  dueToday: FollowUpLeadItem[]
  overdue: FollowUpLeadItem[]
  now: number
}

interface NeedsFollowUpProps {
  stats: NeedsFollowUpStats
}

function daysOverdue(nextFollowUpAt: number, now: number): number {
  const MS_PER_DAY = 86_400_000
  return Math.floor((now - nextFollowUpAt) / MS_PER_DAY)
}

function toLabel(value: string): string {
  return value
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

export function NeedsFollowUp({ stats }: NeedsFollowUpProps) {
  const { dueToday, overdue, now } = stats
  const items = [...overdue, ...dueToday]

  if (items.length === 0) return null

  return (
    <Card data-testid="needs-follow-up">
      <CardHeader className="p-4">
        <CardTitle>Needs Follow-up</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2" data-testid="needs-follow-up-list">
          {items.map((lead) => {
            const days = daysOverdue(lead.nextFollowUpAt, now)
            const overdueText =
              days > 0
                ? `${days} day${days === 1 ? "" : "s"} overdue`
                : "Due today"
            return (
              <div key={lead._id} className="flex items-center justify-between text-sm">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/leads/${lead._id}`}
                    className="font-medium hover:underline"
                  >
                    {lead.name}
                  </Link>
                  <span className="ml-2 text-muted-foreground">
                    {lead.city} &middot; {toLabel(lead.type)}
                  </span>
                </div>
                <span className={days > 0 ? "text-red-600 shrink-0" : "text-muted-foreground shrink-0"}>
                  {overdueText}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-3">
          <Link
            href="/leads?needsFollowUp=true"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
