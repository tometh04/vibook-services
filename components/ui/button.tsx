import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:bg-primary-dark hover:shadow-[0_4px_16px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_4px_rgba(0,0,0,0.1)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:bg-destructive/90 hover:shadow-[0_4px_16px_rgba(239,68,68,0.3)] hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border-2 border-primary bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-[0_4px_12px_rgba(59,130,246,0.15)] hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:bg-secondary/90 hover:shadow-[0_4px_16px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 active:translate-y-0",
        accent: "bg-accent text-accent-foreground shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:bg-accent/90 hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 active:translate-y-0",
        ghost: "hover:bg-accent/10 hover:text-accent font-semibold",
        link: "text-primary underline-offset-4 hover:underline font-semibold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
