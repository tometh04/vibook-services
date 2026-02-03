"use client"

import { memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useChartColors } from "@/hooks/use-chart-colors"
import { formatUSD } from "@/lib/currency"

interface SellerData {
  id: string
  name: string
  totalSales: number
  margin: number
  operationsCount: number
  avgMarginPercent: number
}

interface SalesBySellerChartProps {
  data: SellerData[]
}

const chartConfig = {
  Ventas: {
    label: "Ventas",
    color: "hsl(var(--chart-1))",
  },
  Margen: {
    label: "Margen",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

export const SalesBySellerChart = memo(function SalesBySellerChart({ data }: SalesBySellerChartProps) {
  const colors = useChartColors()
  const chartData = data.map((seller) => ({
    name: seller.name,
    Ventas: seller.totalSales,
    Margen: seller.margin,
  }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ventas por Vendedor</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas por Vendedor</CardTitle>
        <CardDescription>Desglose de ventas y margen por vendedor</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full sm:h-[300px]">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
            />
            <ChartTooltip
              cursor={false}
              formatter={(value) => formatUSD(Number(value))}
              content={<ChartTooltipContent />}
            />
            <Bar dataKey="Ventas" fill={colors["1"]} radius={8} />
            <Bar dataKey="Margen" fill={colors["2"]} radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})
