"use client"

import { memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useChartColors } from "@/hooks/use-chart-colors"
import { formatUSD, formatUSDCompact } from "@/lib/currency"

interface CashflowData {
  date: string
  income: number
  expense: number
  net: number
}

interface CashflowChartProps {
  data: CashflowData[]
}

const chartConfig = {
  Ingresos: {
    label: "Ingresos",
    color: "hsl(var(--chart-5))",
  },
  Egresos: {
    label: "Egresos",
    color: "hsl(var(--chart-6))",
  },
  Neto: {
    label: "Neto",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export const CashflowChart = memo(function CashflowChart({ data }: CashflowChartProps) {
  const colors = useChartColors()
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), "dd/MM", { locale: es }),
    Ingresos: item.income,
    Egresos: item.expense,
    Neto: item.net,
  }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Flujo de Caja</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flujo de Caja</CardTitle>
        <CardDescription>Ingresos, egresos y flujo neto en el tiempo</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full sm:h-[300px]">
          <LineChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => formatUSDCompact(Number(value))}
            />
            <ChartTooltip
              cursor={false}
              formatter={(value) => formatUSD(Number(value))}
              content={<ChartTooltipContent />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="Ingresos"
              stroke={colors["1"]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Egresos"
              stroke={colors["2"]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Neto"
              stroke={colors["3"]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})
