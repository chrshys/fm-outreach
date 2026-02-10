interface CampaignRow {
  _id: string;
  name: string;
  status: string;
  leadCount: number;
  smartleadCampaignId?: string;
}

interface EmailRow {
  smartleadCampaignId: string;
  openedAt?: number;
  repliedAt?: number;
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
  emails: EmailRow[],
): ActiveCampaignResult[] {
  // Index emails by smartleadCampaignId for O(1) lookup
  const emailsByCampaign = new Map<
    string,
    { sent: number; opened: number; replied: number }
  >();

  for (const email of emails) {
    let bucket = emailsByCampaign.get(email.smartleadCampaignId);
    if (!bucket) {
      bucket = { sent: 0, opened: 0, replied: 0 };
      emailsByCampaign.set(email.smartleadCampaignId, bucket);
    }
    bucket.sent++;
    if (email.openedAt) bucket.opened++;
    if (email.repliedAt) bucket.replied++;
  }

  return campaigns
    .filter((c) => c.status === "active" || c.status === "paused")
    .map((c) => {
      const bucket = c.smartleadCampaignId
        ? emailsByCampaign.get(c.smartleadCampaignId)
        : undefined;
      const sent = bucket?.sent ?? 0;
      const opened = bucket?.opened ?? 0;
      const replied = bucket?.replied ?? 0;

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
