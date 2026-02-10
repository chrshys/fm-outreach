"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useConvex } from "convex/react"
import { ExternalLink } from "lucide-react"
import type { KeyboardEvent, MouseEvent } from "react"
import { api } from "../../../../convex/_generated/api"

import { AppLayout } from "@/components/layout/app-layout"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type LeadStatus =
  | "new_lead"
  | "enriched"
  | "outreach_started"
  | "replied"
  | "meeting_booked"
  | "onboarded"
  | "declined"
  | "not_interested"
  | "bounced"
  | "no_response"
  | "no_email"

type SocialLead = {
  _id: string
  name: string
  city: string
  status: LeadStatus
  socialLinks?: {
    instagram?: string
    facebook?: string
  }
  nextFollowUpAt?: number
  lastSocialTouch?: number
}

const statusClassNames: Record<LeadStatus, string> = {
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

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function toLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function isOverdue(value?: number) {
  if (value === undefined) {
    return false
  }

  const today = new Date()
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dueDate = new Date(value)
  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  return dueDay < currentDay
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.closest("button, a, input, textarea, select, [role='checkbox']") !== null
}

function SocialLink({ url }: { url: string | undefined }) {
  const trimmed = url?.trim()
  if (!trimmed) {
    return <span className="text-muted-foreground">&mdash;</span>
  }

  const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center text-blue-600 hover:text-blue-800"
      aria-label="Open social profile"
    >
      <ExternalLink className="size-4" />
    </a>
  )
}

export default function SocialOutreachPage() {
  const router = useRouter()
  const convex = useConvex()
  const [leads, setLeads] = useState<SocialLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSocialLeads() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const result = await convex.query(api.leads.listSocialOutreach, {})

        if (!cancelled) {
          setLeads(result as SocialLead[])
        }
      } catch {
        if (!cancelled) {
          setLoadError("Unable to load social outreach leads.")
          setLeads([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadSocialLeads()

    return () => {
      cancelled = true
    }
  }, [convex])

  function goToLead(leadId: string) {
    router.push(`/leads/${leadId}`)
  }

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>, leadId: string) {
    if (isInteractiveTarget(event.target)) {
      return
    }

    goToLead(leadId)
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, leadId: string) {
    if (isInteractiveTarget(event.target)) {
      return
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      goToLead(leadId)
    }
  }

  return (
    <AppLayout>
      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">Track outreach and follow-up timing by lead.</p>
        </div>

        <Tabs defaultValue="social">
          <TabsList variant="line">
            <TabsTrigger value="all" asChild>
              <Link href="/leads">All Leads</Link>
            </TabsTrigger>
            <TabsTrigger value="social">Social Outreach</TabsTrigger>
          </TabsList>
        </Tabs>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Facebook</TableHead>
              <TableHead>Instagram</TableHead>
              <TableHead>Last Social Touch</TableHead>
              <TableHead>Follow-up Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground text-center">
                  Loading leads...
                </TableCell>
              </TableRow>
            ) : loadError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-red-600">
                  {loadError}
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground text-center">
                  No leads match the social outreach criteria.
                </TableCell>
              </TableRow>
            ) : null}

            {leads.map((lead) => {
              const overdue = isOverdue(lead.nextFollowUpAt)

              return (
                <TableRow
                  key={lead._id}
                  role="link"
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={(event) => handleRowClick(event, lead._id)}
                  onKeyDown={(event) => handleRowKeyDown(event, lead._id)}
                >
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.city}</TableCell>
                  <TableCell>
                    <Badge className={statusClassNames[lead.status]}>{toLabel(lead.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <SocialLink url={lead.socialLinks?.facebook} />
                  </TableCell>
                  <TableCell>
                    <SocialLink url={lead.socialLinks?.instagram} />
                  </TableCell>
                  <TableCell>
                    {lead.lastSocialTouch ? formatDate(lead.lastSocialTouch) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {overdue ? (
                      <span className="font-medium text-red-600">Overdue</span>
                    ) : lead.nextFollowUpAt ? (
                      formatDate(lead.nextFollowUpAt)
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </section>
    </AppLayout>
  )
}
