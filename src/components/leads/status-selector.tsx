"use client"

import type { Doc } from "../../../convex/_generated/dataModel"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type LeadStatus = Doc<"leads">["status"]

type StatusOption = {
  value: LeadStatus
  label: string
  colorClassName: string
}

const statusOptions: StatusOption[] = [
  { value: "new_lead", label: "New Lead", colorClassName: "bg-blue-500" },
  { value: "enriched", label: "Enriched", colorClassName: "bg-indigo-500" },
  { value: "outreach_started", label: "Outreach Started", colorClassName: "bg-amber-500" },
  { value: "replied", label: "Replied", colorClassName: "bg-violet-500" },
  { value: "meeting_booked", label: "Meeting Booked", colorClassName: "bg-emerald-500" },
  { value: "onboarded", label: "Onboarded", colorClassName: "bg-green-500" },
  { value: "declined", label: "Declined", colorClassName: "bg-rose-500" },
  { value: "not_interested", label: "Not Interested", colorClassName: "bg-zinc-500" },
  { value: "bounced", label: "Bounced", colorClassName: "bg-red-500" },
  { value: "no_response", label: "No Response", colorClassName: "bg-orange-500" },
  { value: "no_email", label: "No Email", colorClassName: "bg-stone-500" },
]

type StatusSelectorProps = {
  value: LeadStatus
  disabled?: boolean
  onChange: (status: LeadStatus) => void | Promise<void>
}

export function StatusSelector({ value, disabled = false, onChange }: StatusSelectorProps) {
  return (
    <Select value={value} disabled={disabled} onValueChange={(nextValue) => void onChange(nextValue as LeadStatus)}>
      <SelectTrigger className="w-[210px]">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${option.colorClassName}`} aria-hidden="true" />
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
