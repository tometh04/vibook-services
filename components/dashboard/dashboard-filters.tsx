"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"

export interface DashboardFiltersState {
  dateFrom: string
  dateTo: string
  agencyId: string
  sellerId: string
}

interface DashboardFiltersProps {
  agencies: Array<{ id: string; name: string }>
  sellers: Array<{ id: string; name: string }>
  value: DashboardFiltersState
  defaultValue: DashboardFiltersState
  onChange: (filters: DashboardFiltersState) => void
}

export function DashboardFilters({
  agencies,
  sellers,
  value,
  defaultValue,
  onChange,
}: DashboardFiltersProps) {
  const [filters, setFilters] = useState(value)

  useEffect(() => {
    setFilters(value)
  }, [value])

  useEffect(() => {
    onChange(filters)
  }, [filters, onChange])

  const handleChange = (field: keyof DashboardFiltersState, newValue: string) => {
    setFilters((prev) => ({ ...prev, [field]: newValue }))
  }

  const handleReset = () => {
    setFilters(defaultValue)
  }

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm sm:p-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Rango de fechas</Label>
          <DateRangePicker
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onChange={(dateFrom, dateTo) => {
              setFilters((prev) => ({ ...prev, dateFrom, dateTo }))
            }}
            placeholder="Seleccionar rango"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Agencia</Label>
          <Select value={filters.agencyId} onValueChange={(newValue) => handleChange("agencyId", newValue)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Vendedor</Label>
          <Select value={filters.sellerId} onValueChange={(newValue) => handleChange("sellerId", newValue)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {sellers.map((seller) => (
                <SelectItem key={seller.id} value={seller.id}>
                  {seller.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
          Reiniciar filtros
        </Button>
      </div>
    </div>
  )
}

