import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface ClustersCardStats {
  clusters: { name: string; count: number }[]
  unclustered: number
}

interface ClustersCardProps {
  stats: ClustersCardStats
}

export function ClustersCard({ stats }: ClustersCardProps) {
  const topClusters = [...stats.clusters]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return (
    <Card data-testid="clusters-card">
      <CardHeader className="p-4">
        <CardTitle>Clusters</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {topClusters.length > 0 ? (
          <div className="space-y-2" data-testid="clusters-card-list">
            {topClusters.map((cluster) => (
              <div key={cluster.name} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{cluster.name}</span>
                <span className="font-medium">{cluster.count}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground">Unclustered</span>
              <span className="font-medium">{stats.unclustered}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No clusters yet</p>
        )}
      </CardContent>
    </Card>
  )
}
