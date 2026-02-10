export type ActivityListItem = {
  _id: string;
  leadId: string;
  type: string;
  description: string;
  channel?: string;
  createdAt: number;
};

export type ActivityListOptions = {
  cursor?: string;
  pageSize: number;
};

function decodeCursor(cursor: string | undefined): number {
  if (cursor === undefined) {
    return 0;
  }

  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export function listActivitiesPage(
  activities: ActivityListItem[],
  options: ActivityListOptions,
): {
  activities: ActivityListItem[];
  cursor: string | null;
} {
  const sorted = [...activities].sort((a, b) => b.createdAt - a.createdAt);

  const start = decodeCursor(options.cursor);
  const end = start + options.pageSize;
  const page = sorted.slice(start, end);
  const nextCursor = end < sorted.length ? String(end) : null;

  return {
    activities: page,
    cursor: nextCursor,
  };
}
