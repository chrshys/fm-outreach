"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type FollowUpReminderProps = {
  leadId: Id<"leads">
  nextFollowUpAt?: number
}

function formatDisplayDate(timestamp: number | undefined) {
  if (timestamp === undefined) {
    return "None set"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(timestamp))
}

function formatDateInputValue(timestamp: number | undefined) {
  if (timestamp === undefined) {
    return ""
  }

  return new Date(timestamp).toISOString().slice(0, 10)
}

function parseDateInputValue(dateInput: string) {
  const [yearValue, monthValue, dayValue] = dateInput.split("-")
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  return new Date(year, month - 1, day).getTime()
}

export function FollowUpReminder({ leadId, nextFollowUpAt }: FollowUpReminderProps) {
  const setFollowUp = useMutation(api.leads.setFollowUp)
  const [isOpen, setIsOpen] = useState(false)
  const [dateInput, setDateInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function openDialog() {
    setDateInput(formatDateInputValue(nextFollowUpAt))
    setIsOpen(true)
  }

  function closeDialog() {
    if (isSubmitting) {
      return
    }

    setIsOpen(false)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (dateInput.length === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      await setFollowUp({
        leadId,
        nextFollowUpAt: parseDateInputValue(dateInput),
      })
      setIsOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set follow-up reminder")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Next follow-up: {formatDisplayDate(nextFollowUpAt)}</p>
      <Button type="button" variant="outline" onClick={openDialog}>
        Set Reminder
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Follow-up Reminder</DialogTitle>
            <DialogDescription>Select when this lead should be followed up.</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="follow-up-date">Follow-up date</Label>
              <Input
                id="follow-up-date"
                type="date"
                required
                disabled={isSubmitting}
                value={dateInput}
                onChange={(event) => setDateInput(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || dateInput.length === 0}>
                Save Reminder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
