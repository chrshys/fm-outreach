import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface EmailActivityStats {
  sent: number
  opened: number
  clicked: number
}

interface EmailActivityProps {
  stats: EmailActivityStats
}

export function EmailActivity({ stats }: EmailActivityProps) {
  return (
    <Card data-testid="email-activity">
      <CardHeader className="p-4">
        <CardTitle>Email Activity (7d)</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between text-sm" data-testid="email-activity-stats">
          <div className="text-center">
            <span className="text-muted-foreground">Sent</span>
            <p className="font-medium text-lg">{stats.sent}</p>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground">Opened</span>
            <p className="font-medium text-lg">{stats.opened}</p>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground">Clicked</span>
            <p className="font-medium text-lg">{stats.clicked}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
