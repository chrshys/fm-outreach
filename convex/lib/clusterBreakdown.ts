interface ClusterRow {
  _id: string;
  name: string;
}

interface LeadRow {
  clusterId?: string;
}

export interface ClusterCount {
  name: string;
  count: number;
}

export interface ClusterBreakdownResult {
  clusters: ClusterCount[];
  unclustered: number;
}

export function buildClusterBreakdown(
  clusters: ClusterRow[],
  leads: LeadRow[],
): ClusterBreakdownResult {
  const countsByClusterId = new Map<string, number>();

  let unclustered = 0;

  for (const lead of leads) {
    if (lead.clusterId) {
      countsByClusterId.set(
        lead.clusterId,
        (countsByClusterId.get(lead.clusterId) ?? 0) + 1,
      );
    } else {
      unclustered++;
    }
  }

  const result: ClusterCount[] = clusters.map((c) => ({
    name: c.name,
    count: countsByClusterId.get(c._id) ?? 0,
  }));

  return { clusters: result, unclustered };
}
