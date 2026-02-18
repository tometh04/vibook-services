"use client"

import * as React from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface City {
  name: string
  iata: string
  country: string
}

// Top world cities with IATA airport codes
const CITIES: City[] = [
  // Argentina
  { name: "Buenos Aires", iata: "EZE", country: "Argentina" },
  { name: "Córdoba", iata: "COR", country: "Argentina" },
  { name: "Mendoza", iata: "MDZ", country: "Argentina" },
  { name: "Rosario", iata: "ROS", country: "Argentina" },
  { name: "Bariloche", iata: "BRC", country: "Argentina" },
  { name: "Salta", iata: "SLA", country: "Argentina" },
  { name: "Tucumán", iata: "TUC", country: "Argentina" },
  { name: "Mar del Plata", iata: "MDQ", country: "Argentina" },
  { name: "Neuquén", iata: "NQN", country: "Argentina" },
  { name: "Iguazú", iata: "IGR", country: "Argentina" },
  // España
  { name: "Madrid", iata: "MAD", country: "España" },
  { name: "Barcelona", iata: "BCN", country: "España" },
  { name: "Sevilla", iata: "SVQ", country: "España" },
  { name: "Valencia", iata: "VLC", country: "España" },
  { name: "Bilbao", iata: "BIO", country: "España" },
  { name: "Málaga", iata: "AGP", country: "España" },
  { name: "Palma de Mallorca", iata: "PMI", country: "España" },
  { name: "Tenerife", iata: "TFN", country: "España" },
  { name: "Ibiza", iata: "IBZ", country: "España" },
  // USA
  { name: "Nueva York", iata: "JFK", country: "Estados Unidos" },
  { name: "Los Ángeles", iata: "LAX", country: "Estados Unidos" },
  { name: "Miami", iata: "MIA", country: "Estados Unidos" },
  { name: "Chicago", iata: "ORD", country: "Estados Unidos" },
  { name: "San Francisco", iata: "SFO", country: "Estados Unidos" },
  { name: "Las Vegas", iata: "LAS", country: "Estados Unidos" },
  { name: "Orlando", iata: "MCO", country: "Estados Unidos" },
  { name: "Boston", iata: "BOS", country: "Estados Unidos" },
  { name: "Washington D.C.", iata: "DCA", country: "Estados Unidos" },
  { name: "Houston", iata: "IAH", country: "Estados Unidos" },
  { name: "Dallas", iata: "DFW", country: "Estados Unidos" },
  { name: "Seattle", iata: "SEA", country: "Estados Unidos" },
  { name: "Atlanta", iata: "ATL", country: "Estados Unidos" },
  { name: "Denver", iata: "DEN", country: "Estados Unidos" },
  { name: "Cancún", iata: "CUN", country: "México" },
  // Europa
  { name: "Londres", iata: "LHR", country: "Reino Unido" },
  { name: "París", iata: "CDG", country: "Francia" },
  { name: "Ámsterdam", iata: "AMS", country: "Países Bajos" },
  { name: "Roma", iata: "FCO", country: "Italia" },
  { name: "Milán", iata: "MXP", country: "Italia" },
  { name: "Venecia", iata: "VCE", country: "Italia" },
  { name: "Florencia", iata: "FLR", country: "Italia" },
  { name: "Frankfurt", iata: "FRA", country: "Alemania" },
  { name: "Berlín", iata: "BER", country: "Alemania" },
  { name: "Múnich", iata: "MUC", country: "Alemania" },
  { name: "Lisboa", iata: "LIS", country: "Portugal" },
  { name: "Oporto", iata: "OPO", country: "Portugal" },
  { name: "Zúrich", iata: "ZRH", country: "Suiza" },
  { name: "Ginebra", iata: "GVA", country: "Suiza" },
  { name: "Viena", iata: "VIE", country: "Austria" },
  { name: "Bruselas", iata: "BRU", country: "Bélgica" },
  { name: "Copenhague", iata: "CPH", country: "Dinamarca" },
  { name: "Estocolmo", iata: "ARN", country: "Suecia" },
  { name: "Oslo", iata: "OSL", country: "Noruega" },
  { name: "Helsinki", iata: "HEL", country: "Finlandia" },
  { name: "Atenas", iata: "ATH", country: "Grecia" },
  { name: "Praga", iata: "PRG", country: "República Checa" },
  { name: "Budapest", iata: "BUD", country: "Hungría" },
  { name: "Varsovia", iata: "WAW", country: "Polonia" },
  { name: "Dubái", iata: "DXB", country: "Emiratos Árabes" },
  { name: "Estambul", iata: "IST", country: "Turquía" },
  { name: "Moscú", iata: "SVO", country: "Rusia" },
  // América Latina
  { name: "São Paulo", iata: "GRU", country: "Brasil" },
  { name: "Río de Janeiro", iata: "GIG", country: "Brasil" },
  { name: "Santiago de Chile", iata: "SCL", country: "Chile" },
  { name: "Lima", iata: "LIM", country: "Perú" },
  { name: "Bogotá", iata: "BOG", country: "Colombia" },
  { name: "Medellín", iata: "MDE", country: "Colombia" },
  { name: "Caracas", iata: "CCS", country: "Venezuela" },
  { name: "Quito", iata: "UIO", country: "Ecuador" },
  { name: "Guayaquil", iata: "GYE", country: "Ecuador" },
  { name: "Montevideo", iata: "MVD", country: "Uruguay" },
  { name: "Asunción", iata: "ASU", country: "Paraguay" },
  { name: "La Paz", iata: "LPB", country: "Bolivia" },
  { name: "Ciudad de México", iata: "MEX", country: "México" },
  { name: "Guadalajara", iata: "GDL", country: "México" },
  { name: "Monterrey", iata: "MTY", country: "México" },
  { name: "La Habana", iata: "HAV", country: "Cuba" },
  { name: "Santo Domingo", iata: "SDQ", country: "Rep. Dominicana" },
  { name: "Punta Cana", iata: "PUJ", country: "Rep. Dominicana" },
  { name: "San José", iata: "SJO", country: "Costa Rica" },
  { name: "Ciudad de Panamá", iata: "PTY", country: "Panamá" },
  // Asia
  { name: "Tokio", iata: "NRT", country: "Japón" },
  { name: "Osaka", iata: "KIX", country: "Japón" },
  { name: "Pekín", iata: "PEK", country: "China" },
  { name: "Shanghái", iata: "PVG", country: "China" },
  { name: "Hong Kong", iata: "HKG", country: "Hong Kong" },
  { name: "Singapur", iata: "SIN", country: "Singapur" },
  { name: "Bangkok", iata: "BKK", country: "Tailandia" },
  { name: "Bali", iata: "DPS", country: "Indonesia" },
  { name: "Yakarta", iata: "CGK", country: "Indonesia" },
  { name: "Seúl", iata: "ICN", country: "Corea del Sur" },
  { name: "Mumbai", iata: "BOM", country: "India" },
  { name: "Delhi", iata: "DEL", country: "India" },
  { name: "Kuala Lumpur", iata: "KUL", country: "Malasia" },
  { name: "Manila", iata: "MNL", country: "Filipinas" },
  { name: "Hanói", iata: "HAN", country: "Vietnam" },
  { name: "Ho Chi Minh", iata: "SGN", country: "Vietnam" },
  // África y Oceanía
  { name: "El Cairo", iata: "CAI", country: "Egipto" },
  { name: "Johannesburgo", iata: "JNB", country: "Sudáfrica" },
  { name: "Casablanca", iata: "CMN", country: "Marruecos" },
  { name: "Nairobi", iata: "NBO", country: "Kenia" },
  { name: "Sídney", iata: "SYD", country: "Australia" },
  { name: "Melbourne", iata: "MEL", country: "Australia" },
  { name: "Auckland", iata: "AKL", country: "Nueva Zelanda" },
  // Caribe y destinos turísticos
  { name: "Aruba", iata: "AUA", country: "Aruba" },
  { name: "Curaçao", iata: "CUR", country: "Curaçao" },
  { name: "Bahamas", iata: "NAS", country: "Bahamas" },
  { name: "Jamaica", iata: "KIN", country: "Jamaica" },
  { name: "Maldivas", iata: "MLE", country: "Maldivas" },
  { name: "Dubrovnik", iata: "DBV", country: "Croacia" },
  { name: "Split", iata: "SPU", country: "Croacia" },
  { name: "Reikiavik", iata: "KEF", country: "Islandia" },
  { name: "Marrakech", iata: "RAK", country: "Marruecos" },
]

interface CitySearchProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CitySearch({
  value,
  onChange,
  placeholder = "Buscar ciudad...",
  disabled = false,
}: CitySearchProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    if (!query || query.length < 1) return CITIES.slice(0, 50)
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return CITIES.filter((city) => {
      const name = city.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      const iata = city.iata.toLowerCase()
      const country = city.country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      return name.includes(q) || iata.includes(q) || country.includes(q)
    }).slice(0, 50)
  }, [query])

  const displayValue = value || ""

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !displayValue && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 opacity-50" />
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar ciudad o código IATA..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No se encontró la ciudad.</CommandEmpty>
            <CommandGroup>
              {filtered.map((city) => {
                const label = `${city.name} (${city.iata})`
                return (
                  <CommandItem
                    key={city.iata}
                    value={label}
                    onSelect={() => {
                      onChange(label)
                      setOpen(false)
                      setQuery("")
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        displayValue === label ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{city.name} <span className="font-mono text-xs text-muted-foreground">({city.iata})</span></span>
                      <span className="text-xs text-muted-foreground">{city.country}</span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
