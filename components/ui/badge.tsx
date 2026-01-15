import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-[0_1px_4px_rgba(0,0,0,0.1)] hover:bg-primary-dark hover:shadow-[0_2px_8px_rgba(59,130,246,0.25)]",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground shadow-[0_1px_4px_rgba(0,0,0,0.1)] hover:bg-secondary/90",
        accent:
          "border-transparent bg-accent text-accent-foreground shadow-[0_1px_4px_rgba(0,0,0,0.1)] hover:bg-accent/90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-[0_1px_4px_rgba(0,0,0,0.1)] hover:bg-destructive/90",
        success:
          "border-transparent bg-success text-success-foreground shadow-[0_1px_4px_rgba(0,0,0,0.1)] hover:bg-success/90",
        outline: "text-foreground border-foreground/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
