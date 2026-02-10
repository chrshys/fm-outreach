interface LeadRow {
  _id: string;
  name: string;
  city: string;
  type: string;
  nextFollowUpAt?: number;
}

export interface FollowUpItem {
  _id: string;
  name: string;
  city: string;
  type: string;
  nextFollowUpAt: number;
}

export interface FollowUpsDueResult {
  dueToday: FollowUpItem[];
  overdue: FollowUpItem[];
}

export function getFollowUpsDue(
  leads: LeadRow[],
  now: number,
  limit: number = 10,
): FollowUpsDueResult {
  const MS_PER_DAY = 86_400_000;
  const startOfTodayMs = now - (now % MS_PER_DAY);
  const endOfTodayMs = startOfTodayMs + MS_PER_DAY - 1;

  const dueToday: FollowUpItem[] = [];
  const overdue: FollowUpItem[] = [];

  for (const lead of leads) {
    if (lead.nextFollowUpAt == null) continue;
    if (lead.nextFollowUpAt > endOfTodayMs) continue;

    const item: FollowUpItem = {
      _id: lead._id,
      name: lead.name,
      city: lead.city,
      type: lead.type,
      nextFollowUpAt: lead.nextFollowUpAt,
    };

    if (lead.nextFollowUpAt < startOfTodayMs) {
      overdue.push(item);
    } else {
      dueToday.push(item);
    }
  }

  // Sort by most overdue first (earliest nextFollowUpAt first)
  overdue.sort((a, b) => a.nextFollowUpAt - b.nextFollowUpAt);
  dueToday.sort((a, b) => a.nextFollowUpAt - b.nextFollowUpAt);

  return {
    dueToday: dueToday.slice(0, limit),
    overdue: overdue.slice(0, limit),
  };
}
