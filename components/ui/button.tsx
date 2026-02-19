import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--orbit-accent)] text-white hover:opacity-90",
        secondary:
          "border border-[color:var(--orbit-border)] bg-[color:var(--orbit-panel)] text-[color:var(--orbit-fg)] hover:bg-[color:var(--orbit-panel-muted)]",
        ghost:
          "text-[color:var(--orbit-fg)] hover:bg-[color:var(--orbit-panel)]",
        destructive: "bg-red-500 text-white hover:bg-red-400",
        outline:
          "border border-[color:var(--orbit-border)] bg-transparent text-[color:var(--orbit-fg)] hover:bg-[color:var(--orbit-panel)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
