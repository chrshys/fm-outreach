"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { api } from "../../../convex/_generated/api"

import { AppLayout } from "@/components/layout/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const API_KEY_FIELDS = [
  { key: "smartlead_api_key", label: "Smartlead API Key" },
  { key: "google_places_api_key", label: "Google Places API Key" },
  { key: "hunter_api_key", label: "Hunter.io API Key" },
  { key: "anthropic_api_key", label: "Anthropic API Key" },
] as const

type ApiKeyField = (typeof API_KEY_FIELDS)[number]["key"]

export default function SettingsPage() {
  const settings = useQuery(api.settings.getAll)
  const setBatch = useMutation(api.settings.setBatch)

  // API Keys state
  const [apiKeys, setApiKeys] = useState<Record<ApiKeyField, string>>({
    smartlead_api_key: "",
    google_places_api_key: "",
    hunter_api_key: "",
    anthropic_api_key: "",
  })
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [savingApiKeys, setSavingApiKeys] = useState(false)

  // Sender Identity state
  const [senderName, setSenderName] = useState("")
  const [senderEmail, setSenderEmail] = useState("")
  const [senderAddress, setSenderAddress] = useState("")
  const [emailSignature, setEmailSignature] = useState("")
  const [savingSender, setSavingSender] = useState(false)
  const [senderErrors, setSenderErrors] = useState<Record<string, string>>({})

  // Load existing values when settings arrive
  useEffect(() => {
    if (!settings) return
    setApiKeys({
      smartlead_api_key: settings.smartlead_api_key ?? "",
      google_places_api_key: settings.google_places_api_key ?? "",
      hunter_api_key: settings.hunter_api_key ?? "",
      anthropic_api_key: settings.anthropic_api_key ?? "",
    })
    setSenderName(settings.sender_name ?? "")
    setSenderEmail(settings.sender_email ?? "")
    setSenderAddress(settings.sender_address ?? "")
    setEmailSignature(settings.email_signature ?? "")
  }, [settings])

  function toggleVisibility(key: string) {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSaveApiKeys(e: React.FormEvent) {
    e.preventDefault()
    setSavingApiKeys(true)
    try {
      const items = API_KEY_FIELDS.map((field) => ({
        key: field.key,
        value: apiKeys[field.key],
      }))
      await setBatch({ items })
    } finally {
      setSavingApiKeys(false)
    }
  }

  async function handleSaveSender(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!senderName.trim()) errors.sender_name = "Sender name is required"
    if (!senderEmail.trim()) errors.sender_email = "Sender email is required"
    if (!senderAddress.trim()) errors.sender_address = "Mailing address is required"
    if (Object.keys(errors).length > 0) {
      setSenderErrors(errors)
      return
    }
    setSenderErrors({})
    setSavingSender(true)
    try {
      await setBatch({
        items: [
          { key: "sender_name", value: senderName },
          { key: "sender_email", value: senderEmail },
          { key: "sender_address", value: senderAddress },
          { key: "email_signature", value: emailSignature },
        ],
      })
    } finally {
      setSavingSender(false)
    }
  }

  if (settings === undefined) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* API Keys Card */}
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Configure API keys for external services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSaveApiKeys(e)} className="space-y-4">
              {API_KEY_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {!apiKeys[field.key] && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Not configured
                      </Badge>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id={field.key}
                      type={visibleKeys[field.key] ? "text" : "password"}
                      value={apiKeys[field.key]}
                      onChange={(e) =>
                        setApiKeys((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder={`Enter ${field.label}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => toggleVisibility(field.key)}
                      aria-label={
                        visibleKeys[field.key] ? "Hide value" : "Show value"
                      }
                    >
                      {visibleKeys[field.key] ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="submit" disabled={savingApiKeys}>
                {savingApiKeys && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Save API Keys
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sender Identity Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sender Identity</CardTitle>
            <CardDescription>
              Configure your sender profile for outbound emails.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSaveSender(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sender_name">Sender Name</Label>
                <Input
                  id="sender_name"
                  value={senderName}
                  onChange={(e) => {
                    setSenderName(e.target.value)
                    setSenderErrors((prev) => {
                      const next = { ...prev }
                      delete next.sender_name
                      return next
                    })
                  }}
                  placeholder="Your name or business name"
                  aria-invalid={!!senderErrors.sender_name}
                />
                {senderErrors.sender_name && (
                  <p className="text-sm text-destructive">{senderErrors.sender_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender_email">Sender Email</Label>
                <Input
                  id="sender_email"
                  type="email"
                  value={senderEmail}
                  onChange={(e) => {
                    setSenderEmail(e.target.value)
                    setSenderErrors((prev) => {
                      const next = { ...prev }
                      delete next.sender_email
                      return next
                    })
                  }}
                  placeholder="you@example.com"
                  aria-invalid={!!senderErrors.sender_email}
                />
                {senderErrors.sender_email && (
                  <p className="text-sm text-destructive">{senderErrors.sender_email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender_address">
                  Mailing Address
                  <span className="text-muted-foreground font-normal ml-1">
                    (required for CASL)
                  </span>
                </Label>
                <Input
                  id="sender_address"
                  value={senderAddress}
                  onChange={(e) => {
                    setSenderAddress(e.target.value)
                    setSenderErrors((prev) => {
                      const next = { ...prev }
                      delete next.sender_address
                      return next
                    })
                  }}
                  placeholder="123 Main St, City, Province, Postal Code"
                  aria-invalid={!!senderErrors.sender_address}
                />
                {senderErrors.sender_address && (
                  <p className="text-sm text-destructive">{senderErrors.sender_address}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_signature">Email Signature</Label>
                <Textarea
                  id="email_signature"
                  value={emailSignature}
                  onChange={(e) => setEmailSignature(e.target.value)}
                  placeholder="Your email signature..."
                  rows={4}
                />
              </div>
              <Button type="submit" disabled={savingSender}>
                {savingSender && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Save Sender Identity
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
