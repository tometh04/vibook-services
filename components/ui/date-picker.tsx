"use client"

import * as React from "react"
import { format, startOfDay, parse } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  disabled = false,
  minDate,
  maxDate,
}: DatePickerProps) {
  // Parsear como fecha LOCAL (no UTC) para evitar desfase de timezone
  const date = value ? parse(value.split("T")[0], "yyyy-MM-dd", new Date()) : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: es }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            if (selectedDate) {
              onChange(format(selectedDate, "yyyy-MM-dd"))
            }
          }}
          captionLayout="dropdown"
          fromYear={2000}
          toYear={new Date().getFullYear() + 5}
          initialFocus
          disabled={(d) => {
            if (minDate && startOfDay(d) < startOfDay(minDate)) return true
            if (maxDate && startOfDay(d) > startOfDay(maxDate)) return true
            return false
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

