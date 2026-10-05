"use client";

import * as React from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Extra screen-reader text after the label. */
  srLabel?: string;
  tooltip?: React.ReactNode;
}

/**
 * Figma "segmented button": a single-choice radio group. The active pill
 * slides between options and uses a difference blend, so the label under it
 * inverts to dark as it passes.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ...props
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
} & ({ "aria-label": string } | { "aria-labelledby": string })) {
  const refs = React.useRef(new Map<T, HTMLButtonElement>());
  const [pill, setPill] = React.useState<{ x: number; w: number } | null>(null);

  React.useLayoutEffect(() => {
    const el = refs.current.get(value);
    if (!el) return setPill(null);
    const measure = () => setPill({ x: el.offsetLeft, w: el.offsetWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, options]);

  function onKeyDown(e: React.KeyboardEvent) {
    const i = options.findIndex((o) => o.value === value);
    const next = {
      ArrowRight: i + 1,
      ArrowDown: i + 1,
      ArrowLeft: i - 1,
      ArrowUp: i - 1,
      Home: 0,
      End: options.length - 1,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const option = options[(next + options.length) % options.length];
    onChange(option.value);
    refs.current.get(option.value)?.focus();
  }

  return (
    <div
      role="radiogroup"
      {...props}
      onKeyDown={onKeyDown}
      className={cn(
        "relative isolate flex shrink-0 items-center gap-2 overflow-clip rounded-md bg-rooms-medium p-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card",
        className,
      )}
    >
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <Tooltip key={o.value} content={o.tooltip}>
            <button
              ref={(el) => {
                if (el) refs.current.set(o.value, el);
                else refs.current.delete(o.value);
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-base whitespace-nowrap text-rooms-light transition-colors focus-visible:outline-none",
                !checked && "cursor-pointer hover:bg-rooms-light/10",
              )}
            >
              {o.label}
              {o.srLabel && <span className="sr-only"> {o.srLabel}</span>}
            </button>
          </Tooltip>
        );
      })}
      {pill && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 left-0 h-6 rounded-md bg-rooms-light mix-blend-difference transition-[translate,width] duration-200 ease-out motion-reduce:transition-none"
          style={{ width: pill.w, translate: `${pill.x}px 0` }}
        />
      )}
    </div>
  );
}
