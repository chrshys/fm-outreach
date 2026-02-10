import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function pct(n: number, d: number): string {
  if (d === 0) return "0%"
  return `${Math.round((n / d) * 100)}%`
}

interface MetricCardsProps {
  onboarded: number
  totalLeads: number
  replies30d: number
  sent30d: number
  followUpCount: number
  overdueCount: number
}

export function MetricCards({
  onboarded,
  totalLeads,
  replies30d,
  sent30d,
  followUpCount,
  overdueCount,
}: MetricCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="metric-cards">
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Sellers Onboarded
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold">{onboarded} / 100</p>
          <p className="text-xs text-muted-foreground">Goal progress</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold">{totalLeads}</p>
          <p className="text-xs text-muted-foreground">All statuses</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Replies (30d)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold">{replies30d}</p>
          <p className="text-xs text-muted-foreground">
            {pct(replies30d, sent30d)} reply rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Follow-ups Due
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold">{followUpCount}</p>
          {overdueCount > 0 ? (
            <p className="text-xs text-red-600">{overdueCount} overdue</p>
          ) : (
            <p className="text-xs text-muted-foreground">None overdue</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
