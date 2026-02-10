const STATUSES = [
  "new_lead",
  "enriched",
  "outreach_started",
  "replied",
  "meeting_booked",
  "onboarded",
  "no_email",
  "declined",
  "not_interested",
  "bounced",
  "no_response",
] as const;

type LeadStatus = (typeof STATUSES)[number];

export function countByStatus(
  leads: { status: string }[],
): Record<LeadStatus, number> {
  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, 0]),
  ) as Record<LeadStatus, number>;

  for (const lead of leads) {
    if (lead.status in counts) {
      counts[lead.status as LeadStatus]++;
    }
  }

  return counts;
}
