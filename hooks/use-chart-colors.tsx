"use client"

import * as React from "react"
const chartColors = {
  "1": "hsl(var(--chart-1))",
  "2": "hsl(var(--chart-2))",
  "3": "hsl(var(--chart-3))",
  "4": "hsl(var(--chart-4))",
  "5": "hsl(var(--chart-5))",
  "6": "hsl(var(--chart-6))",
}

export function useChartColors() {
  return chartColors
}
