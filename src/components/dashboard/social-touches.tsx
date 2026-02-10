import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface SocialTouchesStats {
  dmsSent: number
  dmReplies: number
  follows: number
}

interface SocialTouchesProps {
  stats: SocialTouchesStats
}

export function SocialTouches({ stats }: SocialTouchesProps) {
  return (
    <Card data-testid="social-touches">
      <CardHeader className="p-4">
        <CardTitle>Social Touches (7d)</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2" data-testid="social-touches-stats">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">DMs Sent</span>
            <span className="font-medium">{stats.dmsSent}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Replies</span>
            <span className="font-medium">{stats.dmReplies}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Follows</span>
            <span className="font-medium">{stats.follows}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
