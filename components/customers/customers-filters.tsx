"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"

interface CustomersFiltersProps {
  onFilterChange: (filters: { search: string }) => void
}

export function CustomersFilters({ onFilterChange }: CustomersFiltersProps) {
  const [search, setSearch] = useState("")

  const handleApplyFilters = () => {
    onFilterChange({ search })
  }

  const handleClearFilters = () => {
    setSearch("")
    onFilterChange({ search: "" })
  }

  const hasActiveFilters = search !== ""

  return (
    <Card>
      <CardContent className="pt-4 sm:pt-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 items-end">
          <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
            <Label className="text-xs" htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="Nombre, teléfono, email, documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApplyFilters()
                }
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button onClick={handleApplyFilters} className="w-full sm:w-auto">Buscar</Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={handleClearFilters} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

