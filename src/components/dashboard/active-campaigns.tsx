import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface ActiveCampaignItem {
  _id: string
  name: string
  status: "active" | "paused"
  leadCount: number
  stats: { sent: number; openRate: number; replyRate: number }
}

interface ActiveCampaignsProps {
  campaigns: ActiveCampaignItem[]
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-800",
  draft: "bg-gray-100 text-gray-800",
}

function pct(n: number, d: number): string {
  if (d === 0) return "0%"
  return `${Math.round((n / d) * 100)}%`
}

function toLabel(value: string): string {
  return value
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

export function ActiveCampaigns({ campaigns }: ActiveCampaignsProps) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle>Active Campaigns</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {campaigns.length > 0 ? (
          <div className="space-y-3" data-testid="active-campaigns-list">
            {campaigns.map((campaign) => (
              <div key={campaign._id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/campaigns/${campaign._id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {campaign.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Sent {campaign.stats.sent} &mdash; Opened{" "}
                    {pct(campaign.stats.openRate, 1)}
                  </p>
                </div>
                <Badge className={STATUS_STYLES[campaign.status]}>
                  {toLabel(campaign.status)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active campaigns</p>
        )}
      </CardContent>
    </Card>
  )
}
