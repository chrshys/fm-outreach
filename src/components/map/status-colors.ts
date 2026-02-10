export const STATUS_COLORS: Record<string, string> = {
  new_lead: "#6b7280", // gray-500
  enriched: "#3b82f6", // blue-500
  outreach_started: "#f59e0b", // amber-500
  replied: "#22c55e", // green-500
  meeting_booked: "#a855f7", // purple-500
  onboarded: "#10b981", // emerald-500
  no_email: "#f97316", // orange-500
  declined: "#ef4444", // red-500
  not_interested: "#ef4444", // red-500
  bounced: "#64748b", // slate-500
  no_response: "#64748b", // slate-500
}

const DEFAULT_COLOR = "#6b7280" // gray-500

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? DEFAULT_COLOR
}
