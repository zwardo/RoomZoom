import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Figma "button": resting state is a dashed outline, hover goes solid, press
 * tints the fill, and `aria-pressed`/`aria-selected` renders the filled
 * "Selected" state (used for tabs and toggles).
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 text-sm leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-dashed border-rooms-light text-rooms-light hover:border-solid active:border-solid active:border-rooms-light/30 active:bg-rooms-light/20 aria-pressed:border-solid aria-pressed:bg-rooms-light aria-pressed:font-medium aria-pressed:text-rooms-xdark aria-selected:border-solid aria-selected:bg-rooms-light aria-selected:font-medium aria-selected:text-rooms-xdark",
        accent:
          "border-dashed border-rooms-accent text-rooms-accent hover:border-solid active:border-solid active:border-rooms-accent/30 active:bg-rooms-accent/20 aria-pressed:border-solid aria-pressed:bg-rooms-accent aria-pressed:font-medium aria-pressed:text-rooms-xdark",
        solid: "border-rooms-light bg-rooms-light font-medium text-rooms-xdark hover:bg-rooms-pale hover:border-rooms-pale",
        outline: "border border-rooms-light/30 text-rooms-light hover:bg-rooms-light/20",
        ghost: "border-transparent text-rooms-light hover:bg-rooms-light/20",
        destructive: "border-dashed border-rooms-warn text-rooms-warn hover:border-solid active:bg-rooms-warn/20",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-3 py-1.5",
        sm: "px-2.5 py-1 text-xs",
        lg: "px-4 py-2",
        icon: "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
