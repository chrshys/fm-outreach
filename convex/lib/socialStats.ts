interface ActivityRow {
  type: string;
  createdAt: number;
}

export interface SocialActivityCounts {
  dmsSent: number;
  dmReplies: number;
  follows: number;
}

export interface SocialStatsResult {
  last7Days: SocialActivityCounts;
  last30Days: SocialActivityCounts;
}

const SOCIAL_TYPE_MAP: Record<string, keyof SocialActivityCounts> = {
  social_dm_sent: "dmsSent",
  social_dm_replied: "dmReplies",
  social_followed: "follows",
};

export function aggregateSocialStats(
  activities: ActivityRow[],
  now: number,
): SocialStatsResult {
  const MS_PER_DAY = 86_400_000;
  const cutoff7 = now - 7 * MS_PER_DAY;
  const cutoff30 = now - 30 * MS_PER_DAY;

  const last7: SocialActivityCounts = { dmsSent: 0, dmReplies: 0, follows: 0 };
  const last30: SocialActivityCounts = { dmsSent: 0, dmReplies: 0, follows: 0 };

  for (const activity of activities) {
    const key = SOCIAL_TYPE_MAP[activity.type];
    if (!key) continue;

    if (activity.createdAt >= cutoff30) {
      last30[key]++;
    }

    if (activity.createdAt >= cutoff7) {
      last7[key]++;
    }
  }

  return { last7Days: last7, last30Days: last30 };
}
