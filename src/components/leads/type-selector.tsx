"use client"

import type { Doc } from "../../../convex/_generated/dataModel"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type LeadType = Doc<"leads">["type"]

type TypeOption = {
  value: LeadType
  label: string
}

const typeOptions: TypeOption[] = [
  { value: "farm", label: "Farm" },
  { value: "farmers_market", label: "Farmers Market" },
  { value: "retail_store", label: "Retail Store" },
  { value: "roadside_stand", label: "Roadside Stand" },
  { value: "other", label: "Other" },
]

type TypeSelectorProps = {
  value: LeadType
  disabled?: boolean
  onChange: (type: LeadType) => void | Promise<void>
}

export function TypeSelector({ value, disabled = false, onChange }: TypeSelectorProps) {
  return (
    <Select value={value} disabled={disabled} onValueChange={(nextValue) => void onChange(nextValue as LeadType)}>
      <SelectTrigger className="w-[170px]">
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent>
        {typeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
