import { formatDistanceToNow } from "date-fns"
import {
  CalendarCheck2,
  CheckCircle2,
  Flag,
  Mail,
  MailOpen,
  MessageCircle,
  Phone,
  Reply,
  Sparkles,
  StickyNote,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type LeadActivityType =
  | "email_sent"
  | "email_opened"
  | "call_logged"
  | "phone_call"
  | "meeting_scheduled"
  | "meeting_booked"
  | "note_added"
  | "status_changed"
  | "social_message_sent"
  | "social_dm_sent"
  | "enrichment_started"
  | "enrichment_finished"
  | string

export type LeadActivityChannel = "email" | "phone" | "sms" | "facebook" | "instagram" | "in_person" | string

export type LeadActivity = {
  id: string
  type: LeadActivityType
  description: string
  timestamp: string | number | Date
  channel?: LeadActivityChannel | null
}

type ActivityTimelineProps = {
  activities: LeadActivity[]
  className?: string
}

type ActivityMeta = {
  icon: LucideIcon
  iconClassName: string
  dotClassName: string
}

const activityMetaByType: Record<string, ActivityMeta> = {
  email_sent: {
    icon: Mail,
    iconClassName: "text-blue-600",
    dotClassName: "bg-blue-500",
  },
  email_opened: {
    icon: MailOpen,
    iconClassName: "text-cyan-600",
    dotClassName: "bg-cyan-500",
  },
  email_replied: {
    icon: Reply,
    iconClassName: "text-emerald-600",
    dotClassName: "bg-emerald-500",
  },
  call_logged: {
    icon: Phone,
    iconClassName: "text-emerald-600",
    dotClassName: "bg-emerald-500",
  },
  phone_call: {
    icon: Phone,
    iconClassName: "text-emerald-600",
    dotClassName: "bg-emerald-500",
  },
  meeting_scheduled: {
    icon: CalendarCheck2,
    iconClassName: "text-violet-600",
    dotClassName: "bg-violet-500",
  },
  meeting_booked: {
    icon: CalendarCheck2,
    iconClassName: "text-violet-600",
    dotClassName: "bg-violet-500",
  },
  note_added: {
    icon: StickyNote,
    iconClassName: "text-amber-600",
    dotClassName: "bg-amber-500",
  },
  status_changed: {
    icon: Flag,
    iconClassName: "text-rose-600",
    dotClassName: "bg-rose-500",
  },
  social_message_sent: {
    icon: MessageCircle,
    iconClassName: "text-indigo-600",
    dotClassName: "bg-indigo-500",
  },
  social_dm_sent: {
    icon: MessageCircle,
    iconClassName: "text-indigo-600",
    dotClassName: "bg-indigo-500",
  },
  enrichment_started: {
    icon: Sparkles,
    iconClassName: "text-teal-600",
    dotClassName: "bg-teal-500",
  },
  enrichment_finished: {
    icon: CheckCircle2,
    iconClassName: "text-teal-600",
    dotClassName: "bg-teal-500",
  },
}

const channelLabelByType: Record<LeadActivityChannel, string> = {
  email: "Email",
  phone: "Phone",
  sms: "SMS",
  facebook: "Facebook",
  instagram: "Instagram",
  in_person: "In Person",
}

function formatRelativeTimestamp(timestamp: LeadActivity["timestamp"]): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return "Invalid date"
  }

  return formatDistanceToNow(date, { addSuffix: true })
}

export function ActivityTimeline({ activities, className }: ActivityTimelineProps) {
  return (
    <ul className={cn("space-y-4", className)}>
      {activities.map((activity) => {
        const meta = activityMetaByType[activity.type] ?? activityMetaByType.note_added
        const Icon = meta.icon

        return (
          <li key={activity.id} className="relative pl-10">
            <span className="absolute top-0 bottom-0 left-3 w-px bg-border" aria-hidden="true" />
            <span
              className={cn(
                "absolute top-1.5 left-[9px] size-3 rounded-full border-2 border-background",
                meta.dotClassName
              )}
              aria-hidden="true"
            />

            <div className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-start gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted" aria-hidden="true">
                  <Icon className={cn("size-4", meta.iconClassName)} />
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm text-foreground">{activity.description}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground">{formatRelativeTimestamp(activity.timestamp)}</p>
                    {activity.channel ? (
                      <Badge variant="outline" className="text-[11px] font-medium">
                        {channelLabelByType[activity.channel] ?? activity.channel}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
