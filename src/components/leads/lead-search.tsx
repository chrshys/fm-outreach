"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

type LeadSearchProps = {
  value: string
  onChange: (value: string) => void
}

export function LeadSearch({ value, onChange }: LeadSearchProps) {
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onChange(inputValue)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [inputValue, onChange])

  return (
    <div className="relative max-w-sm">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={inputValue}
        aria-label="Search leads by name or city"
        placeholder="Search by name or city"
        onChange={(event) => setInputValue(event.target.value)}
        className="pl-9"
      />
    </div>
  )
}
