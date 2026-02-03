"use client"

import { memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useChartColors } from "@/hooks/use-chart-colors"
import { formatUSD, formatUSDCompact } from "@/lib/currency"

interface DestinationData {
  destination: string
  totalSales: number
  totalMargin: number
  operationsCount: number
  avgMarginPercent: number
}

interface DestinationsChartProps {
  data: DestinationData[]
}

const chartConfig = {
  Ventas: {
    label: "Ventas",
    color: "hsl(var(--chart-1))",
  },
  Operaciones: {
    label: "Operaciones",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export const DestinationsChart = memo(function DestinationsChart({ data }: DestinationsChartProps) {
  const colors = useChartColors()
  const chartData = data.map((dest) => ({
    name: dest.destination,
    Ventas: dest.totalSales,
    Operaciones: dest.operationsCount,
  }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Destinos</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Destinos</CardTitle>
        <CardDescription>Ventas y operaciones por destino</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full sm:h-[300px]">
          <BarChart accessibilityLayer data={chartData} layout="vertical">
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => formatUSDCompact(Number(value))}
            />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={120}
            />
            <ChartTooltip
              cursor={false}
              formatter={(value, name) =>
                name === "Operaciones"
                  ? Number(value).toLocaleString("es-AR")
                  : formatUSD(Number(value))
              }
              content={<ChartTooltipContent />}
            />
            <Bar dataKey="Ventas" fill={colors["1"]} radius={8} />
            <Bar dataKey="Operaciones" fill={colors["2"]} radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})
