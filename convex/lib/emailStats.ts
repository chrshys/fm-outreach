interface EmailRow {
  sentAt: number;
  openedAt?: number;
  clickedAt?: number;
  repliedAt?: number;
}

export interface EmailActivityCounts {
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
}

export interface EmailStatsResult {
  last7Days: EmailActivityCounts;
  last30Days: EmailActivityCounts;
}

export function aggregateEmailStats(
  emails: EmailRow[],
  now: number,
): EmailStatsResult {
  const MS_PER_DAY = 86_400_000;
  const cutoff7 = now - 7 * MS_PER_DAY;
  const cutoff30 = now - 30 * MS_PER_DAY;

  const last7: EmailActivityCounts = { sent: 0, opened: 0, clicked: 0, replied: 0 };
  const last30: EmailActivityCounts = { sent: 0, opened: 0, clicked: 0, replied: 0 };

  for (const email of emails) {
    // Last 30 days
    if (email.sentAt >= cutoff30) {
      last30.sent++;
      if (email.openedAt) last30.opened++;
      if (email.clickedAt) last30.clicked++;
      if (email.repliedAt) last30.replied++;
    }

    // Last 7 days (subset of 30)
    if (email.sentAt >= cutoff7) {
      last7.sent++;
      if (email.openedAt) last7.opened++;
      if (email.clickedAt) last7.clicked++;
      if (email.repliedAt) last7.replied++;
    }
  }

  return { last7Days: last7, last30Days: last30 };
}
