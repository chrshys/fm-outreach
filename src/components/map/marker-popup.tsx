import Link from "next/link"

import { Badge } from "@/components/ui/badge"

const statusClassNames: Record<string, string> = {
  new_lead: "bg-blue-100 text-blue-800",
  enriched: "bg-indigo-100 text-indigo-800",
  outreach_started: "bg-amber-100 text-amber-800",
  replied: "bg-violet-100 text-violet-800",
  meeting_booked: "bg-emerald-100 text-emerald-800",
  onboarded: "bg-green-100 text-green-800",
  declined: "bg-rose-100 text-rose-800",
  not_interested: "bg-zinc-200 text-zinc-800",
  bounced: "bg-red-100 text-red-800",
  no_response: "bg-orange-100 text-orange-800",
  no_email: "bg-stone-200 text-stone-800",
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

type MarkerPopupProps = {
  id: string
  name: string
  type: string
  city: string
  status: string
  contactEmail?: string
}

export function MarkerPopup({ id, name, type, city, status, contactEmail }: MarkerPopupProps) {
  return (
    <div className="min-w-[180px] space-y-1.5 text-sm">
      <p className="font-semibold">{name}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{formatLabel(type)}</Badge>
        <Badge className={statusClassNames[status] ?? ""}>{formatLabel(status)}</Badge>
      </div>
      <p className="text-muted-foreground">{city}</p>
      {contactEmail && (
        <p className="text-muted-foreground truncate">{contactEmail}</p>
      )}
      <Link
        href={`/leads/${id}`}
        className="inline-block text-sm font-medium text-primary hover:underline"
      >
        View Detail
      </Link>
    </div>
  )
}
