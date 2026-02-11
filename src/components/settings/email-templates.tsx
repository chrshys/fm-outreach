"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type SequenceType = "initial" | "follow_up_1" | "follow_up_2" | "follow_up_3"

const SEQUENCE_LABELS: Record<SequenceType, string> = {
  initial: "Initial",
  follow_up_1: "Follow-up 1",
  follow_up_2: "Follow-up 2",
  follow_up_3: "Follow-up 3",
}

const SEQUENCE_TYPES: SequenceType[] = [
  "initial",
  "follow_up_1",
  "follow_up_2",
  "follow_up_3",
]

interface TemplateFormState {
  name: string
  sequenceType: SequenceType
  subject: string
  prompt: string
  isDefault: boolean
}

const EMPTY_FORM: TemplateFormState = {
  name: "",
  sequenceType: "initial",
  subject: "",
  prompt: "",
  isDefault: false,
}

export function EmailTemplates() {
  const templates = useQuery(api.emailTemplates.list)
  const createTemplate = useMutation(api.emailTemplates.create)
  const updateTemplate = useMutation(api.emailTemplates.update)
  const removeTemplate = useMutation(api.emailTemplates.remove)
  const ensureSeeded = useMutation(api.emailTemplates.ensureSeeded)
  const seededRef = useRef(false)

  useEffect(() => {
    if (templates !== undefined && templates.length === 0 && !seededRef.current) {
      seededRef.current = true
      void ensureSeeded()
    }
  }, [templates, ensureSeeded])

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<"emailTemplates"> | null>(null)
  const [deletingId, setDeletingId] = useState<Id<"emailTemplates"> | null>(null)
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setEditDialogOpen(true)
  }

  function openEdit(template: {
    _id: Id<"emailTemplates">
    name: string
    sequenceType: SequenceType
    subject: string
    prompt: string
    isDefault: boolean
  }) {
    setEditingId(template._id)
    setForm({
      name: template.name,
      sequenceType: template.sequenceType,
      subject: template.subject,
      prompt: template.prompt,
      isDefault: template.isDefault,
    })
    setErrors({})
    setEditDialogOpen(true)
  }

  function openDelete(id: Id<"emailTemplates">) {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = "Name is required"
    if (!form.subject.trim()) newErrors.subject = "Subject is required"
    if (!form.prompt.trim()) newErrors.prompt = "Prompt is required"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      if (editingId) {
        await updateTemplate({
          id: editingId,
          name: form.name,
          sequenceType: form.sequenceType,
          subject: form.subject,
          prompt: form.prompt,
          isDefault: form.isDefault,
        })
      } else {
        await createTemplate({
          name: form.name,
          sequenceType: form.sequenceType,
          subject: form.subject,
          prompt: form.prompt,
          isDefault: form.isDefault,
        })
      }
      setEditDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    setDeleting(true)
    try {
      await removeTemplate({ id: deletingId })
      setDeleteDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template")
    } finally {
      setDeleting(false)
    }
  }

  if (templates === undefined) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const deletingTemplate = deletingId
    ? templates.find((t: { _id: string }) => t._id === deletingId)
    : null

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Manage prompt templates for each step of the outreach sequence.
              </CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No templates yet. Add one to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {templates.map((template: { _id: Id<"emailTemplates">; name: string; sequenceType: SequenceType; subject: string; prompt: string; isDefault: boolean }) => (
                <div
                  key={template._id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {template.name}
                      </span>
                      {template.isDefault && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="size-3" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {SEQUENCE_LABELS[template.sequenceType]}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {template.subject}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(template)}
                      aria-label={`Edit ${template.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openDelete(template._id)}
                      aria-label={`Delete ${template.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit / Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Template" : "New Template"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the template details below."
                : "Create a new email template for your outreach sequence."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">Name</Label>
                <Input
                  id="template-name"
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.name
                      return next
                    })
                  }}
                  placeholder="e.g. Cold Intro — Farm"
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-sequence-type">Sequence Type</Label>
                <Select
                  value={form.sequenceType}
                  onValueChange={(value: SequenceType) =>
                    setForm((prev) => ({ ...prev, sequenceType: value }))
                  }
                >
                  <SelectTrigger id="template-sequence-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEQUENCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {SEQUENCE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-subject">Subject Line Template</Label>
              <Input
                id="template-subject"
                value={form.subject}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, subject: e.target.value }))
                  setErrors((prev) => {
                    const next = { ...prev }
                    delete next.subject
                    return next
                  })
                }}
                placeholder='e.g. {{farmName}} + Fruitland Market'
                aria-invalid={!!errors.subject}
              />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-prompt">Prompt Template</Label>
              <Textarea
                id="template-prompt"
                value={form.prompt}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, prompt: e.target.value }))
                  setErrors((prev) => {
                    const next = { ...prev }
                    delete next.prompt
                    return next
                  })
                }}
                placeholder="Write the prompt that will be used to generate the email..."
                rows={10}
                aria-invalid={!!errors.prompt}
              />
              {errors.prompt && (
                <p className="text-sm text-destructive">{errors.prompt}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="template-is-default"
                checked={form.isDefault}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    isDefault: checked === true,
                  }))
                }
              />
              <Label htmlFor="template-is-default">
                Set as default for this sequence type
              </Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editingId ? "Save Changes" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingTemplate?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
