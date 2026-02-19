import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-[#4f545c] text-[#b5bac1]",
        admin: "border-red-400/50 bg-red-500/10 text-red-300",
        moderator: "border-indigo-400/50 bg-indigo-500/10 text-indigo-300",
        guest: "border-[#4f545c] bg-[#4f545c]/20 text-[#b5bac1]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
