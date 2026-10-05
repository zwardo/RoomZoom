import * as React from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Figma "icon button": a 20px icon with 2px padding. Hover tints the
 * background, press outlines it, and `aria-pressed` fills it (Selected).
 * Always pass an `aria-label`, since the button has no visible text; it's also
 * the tooltip unless `tooltip` says otherwise (`false` for none).
 */
export function IconButton({
  className,
  type = "button",
  tooltip,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string; tooltip?: React.ReactNode }) {
  return (
    <Tooltip content={tooltip === undefined ? props["aria-label"] : tooltip}>
      <button
        type={type}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md border border-transparent p-0.5 text-rooms-light transition-colors hover:bg-rooms-light/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:border-rooms-light disabled:pointer-events-none disabled:opacity-30 aria-pressed:border-rooms-light aria-pressed:bg-rooms-light aria-pressed:text-rooms-xdark [&_svg]:size-5 [&_svg]:shrink-0",
          className,
        )}
        {...props}
      />
    </Tooltip>
  );
}
