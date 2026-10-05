"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date | null | undefined, b: Date) {
  return Boolean(a) && a!.getFullYear() === b.getFullYear() && a!.getMonth() === b.getMonth() && a!.getDate() === b.getDate();
}

/** Six Sunday-first weeks covering `month`, padded with the neighbouring months like the Figma picker. */
export function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

/**
 * Figma "calendar picker". Dates before `min` are disabled. Arrow keys move
 * focus between days; the grid follows the WAI-ARIA date picker pattern.
 */
export function Calendar({
  selected,
  onSelect,
  min,
  className,
}: {
  selected: Date | null;
  onSelect: (day: Date) => void;
  min?: Date;
  className?: string;
}) {
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(() => startOfDay(selected ?? today));
  const [focused, setFocused] = useState(() => startOfDay(selected ?? today));
  const days = monthGrid(month);
  const minDay = min ? startOfDay(min) : null;
  const label = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function shiftMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function moveFocus(day: Date, delta: number) {
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + delta);
    setFocused(next);
    if (next.getMonth() !== month.getMonth() || next.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-day="${next.toDateString()}"]`)?.focus());
  }

  return (
    <div className={cn("flex flex-col gap-4 rounded-xl bg-rooms-dark px-6 py-4", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-rooms-xpale" aria-live="polite">
          {label}
        </p>
        <div className="flex items-center gap-1 text-rooms-light">
          <Tooltip content="Previous month">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="rounded-md p-0.5 hover:bg-rooms-light/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Next month">
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="rounded-md p-0.5 hover:bg-rooms-light/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </Tooltip>
        </div>
      </div>
      <div role="grid" aria-label={label} className="grid grid-cols-[repeat(7,1.5rem)] gap-x-4 gap-y-2 text-center text-xs">
        <div role="row" className="contents">
          {WEEKDAYS.map((d, i) => (
            <span key={i} role="columnheader" className="flex h-6 items-center justify-center text-rooms-xpale">
              {d}
            </span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, week) => (
          <div role="row" className="contents" key={week}>
            {days.slice(week * 7, week * 7 + 7).map((day) => {
              const outside = day.getMonth() !== month.getMonth();
              const isToday = sameDay(today, day);
              const isSelected = sameDay(selected, day);
              const disabled = Boolean(minDay && day < minDay);
              return (
                <div role="gridcell" key={day.toISOString()} aria-selected={isSelected} className="flex justify-center">
                  <button
                    type="button"
                    data-day={day.toDateString()}
                    tabIndex={sameDay(focused, day) ? 0 : -1}
                    disabled={disabled}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                    onClick={() => onSelect(day)}
                    onKeyDown={(e) => {
                      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
                      if (delta) {
                        e.preventDefault();
                        moveFocus(day, delta);
                      }
                    }}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30",
                      outside ? "text-rooms-xlight" : "text-rooms-xpale",
                      "hover:text-rooms-light",
                      isToday && "bg-rooms-light/30 text-rooms-light",
                      isSelected && "border border-rooms-accent bg-rooms-accent/20 font-medium text-rooms-accent hover:text-rooms-accent",
                    )}
                  >
                    {day.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
