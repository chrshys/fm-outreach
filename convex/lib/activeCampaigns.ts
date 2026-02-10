interface CampaignRow {
  _id: string;
  name: string;
  status: string;
  leadCount: number;
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
  };
}

export interface ActiveCampaignResult {
  _id: string;
  name: string;
  status: "active" | "paused";
  leadCount: number;
  stats: {
    sent: number;
    openRate: number;
    replyRate: number;
  };
}

export function buildActiveCampaigns(
  campaigns: CampaignRow[],
): ActiveCampaignResult[] {
  return campaigns
    .filter((c) => c.status === "active" || c.status === "paused")
    .map((c) => {
      const sent = c.stats?.sent ?? 0;
      const opened = c.stats?.opened ?? 0;
      const replied = c.stats?.replied ?? 0;

      return {
        _id: c._id,
        name: c.name,
        status: c.status as "active" | "paused",
        leadCount: c.leadCount,
        stats: {
          sent,
          openRate: sent > 0 ? opened / sent : 0,
          replyRate: sent > 0 ? replied / sent : 0,
        },
      };
    });
}
