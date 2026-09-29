import { cva, type VariantProps } from "class-variance-authority";
import { XCircle } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Figma "chip": pill with a medium 12px label on a 20-30% tint of its color. */
export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs leading-none font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-rooms-light/30 text-rooms-light",
        outline: "border border-rooms-light/30 text-muted-foreground",
        success: "bg-rooms-accent/30 text-rooms-accent",
        warning: "bg-warning/20 text-warning",
        destructive: "bg-rooms-warn/20 text-rooms-warn",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Figma "filter-chip": an applied filter the user can clear with the x-circle. */
export function FilterChip({
  children,
  onRemove,
  removeLabel,
  variant = "success",
  className,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
  variant?: VariantProps<typeof badgeVariants>["variant"];
  className?: string;
}) {
  return (
    <span className={cn(badgeVariants({ variant }), "max-w-full gap-1 py-0.5 pr-0.5", className)}>
      <span className="truncate">{children}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="shrink-0 rounded-full opacity-90 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-4"
      >
        <XCircle aria-hidden />
      </button>
    </span>
  );
}
