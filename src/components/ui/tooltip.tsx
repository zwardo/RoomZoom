"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** How long the pointer rests on a trigger before its tooltip opens. Keyboard focus opens it right away. */
export const TOOLTIP_DELAY_MS = 400;

/** Shares the hover delay, and skips it while moving straight from one tooltip to the next. */
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={TOOLTIP_DELAY_MS} skipDelayDuration={300}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

/**
 * Figma-styled tooltip on its single child, which must accept a ref and DOM
 * props (an element or a forwardRef component). Renders the child alone when
 * `content` is empty. Tooltips only describe: anything a screen reader needs
 * should also be in the trigger's label or sr-only text.
 */
export function Tooltip({
  content,
  side = "top",
  align = "center",
  className,
  children,
}: {
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  children: React.ReactElement;
}) {
  if (content == null || content === false || content === "") return children;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            "z-50 max-w-64 rounded-md border border-rooms-light/30 bg-rooms-dark px-2 py-1 text-xs leading-4 text-rooms-xpale shadow-lg shadow-black/50 select-none",
            className,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow width={10} height={5} className="fill-rooms-dark" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
