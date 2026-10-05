"use client";

import { Filter } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { ROOM_PRIORITIES, type RoomPriority, type SearchResponse } from "@/lib/rooms/types";
import { DURATIONS, formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { DEFAULT_FILTERS, type RoomFilters } from "./use-room-search";

const PRIORITY_LABELS: Record<RoomPriority, string> = {
  nearest: "Nearest first",
  smallest: "Smallest that fits",
  name: "Name (A–Z)",
};

export interface SlotForm {
  date: string;
  time: string;
  duration: number;
}

/** Figma filter icon button plus a popover with the room search filters. */
export function FiltersPanel({
  slot,
  onSlotChange,
  timeLocked,
  filters,
  onFiltersChange,
  facets,
  defaultMinCapacity = DEFAULT_FILTERS.minCapacity,
}: {
  /** Headcount of the selected meeting; "Reset" returns to it and it doesn't count as an active filter. */
  defaultMinCapacity?: number;
  slot: SlotForm;
  onSlotChange: (slot: SlotForm) => void;
  /** A selected meeting fixes the time, so only room filters stay editable. */
  timeLocked: boolean;
  filters: RoomFilters;
  onFiltersChange: (filters: RoomFilters) => void;
  facets: SearchResponse["facets"] | undefined;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const active =
    filters.buildingId !== "" || filters.features.length > 0 || filters.availableOnly || filters.minCapacity !== defaultMinCapacity;
  const buildingFloors = facets?.buildings.find((b) => b.id === filters.buildingId)?.floors ?? [];
  const durations = DURATIONS.includes(slot.duration) ? DURATIONS : [...DURATIONS, slot.duration].sort((a, b) => a - b);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const patch = (p: Partial<RoomFilters>) => onFiltersChange({ ...filters, ...p });

  return (
    <div ref={ref} className="relative">
      <IconButton
        aria-label="Room filters"
        tooltip={open ? false : active ? "Room filters (some applied)" : "Room filters"}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)}
        className={cn(active && !open && "bg-rooms-light/20")}
        aria-pressed={open}
      >
        <Filter />
      </IconButton>
      {active && !open && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-rooms-accent" aria-hidden />}
      {open && (
        <form
          id={`${id}-panel`}
          aria-label="Room filters"
          onSubmit={(e) => e.preventDefault()}
          className="absolute top-full right-0 z-40 mt-2 grid w-[min(28rem,calc(100vw-3rem))] grid-cols-2 gap-3 rounded-xl border border-rooms-light/30 bg-rooms-dark p-4 shadow-2xl shadow-black/50"
        >
          <Field label="Date" htmlFor={`${id}-date`}>
            <Input
              id={`${id}-date`}
              type="date"
              value={slot.date}
              disabled={timeLocked}
              onChange={(e) => onSlotChange({ ...slot, date: e.target.value })}
            />
          </Field>
          <Field label="Start" htmlFor={`${id}-time`}>
            <Input
              id={`${id}-time`}
              type="time"
              step={900}
              value={slot.time}
              disabled={timeLocked}
              onChange={(e) => onSlotChange({ ...slot, time: e.target.value })}
            />
          </Field>
          <Field label="Duration" htmlFor={`${id}-duration`}>
            <Select
              id={`${id}-duration`}
              value={slot.duration}
              disabled={timeLocked}
              onChange={(e) => onSlotChange({ ...slot, duration: Number(e.target.value) })}
            >
              {durations.map((d) => (
                <option key={d} value={d}>
                  {formatDuration(d)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="People" htmlFor={`${id}-people`}>
            <Input
              id={`${id}-people`}
              type="number"
              min={1}
              max={200}
              value={filters.minCapacity}
              onChange={(e) => patch({ minCapacity: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Field>
          <Field label="Building" htmlFor={`${id}-building`}>
            <Select id={`${id}-building`} value={filters.buildingId} onChange={(e) => patch({ buildingId: e.target.value, floorId: "" })}>
              <option value="">All buildings</option>
              {facets?.buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Floor" htmlFor={`${id}-floor`}>
            <Select
              id={`${id}-floor`}
              value={filters.floorId}
              disabled={!filters.buildingId}
              onChange={(e) => patch({ floorId: e.target.value })}
            >
              <option value="">{filters.buildingId ? "All floors" : "Pick a building"}</option>
              {buildingFloors.map((f) => (
                <option key={f.id} value={f.id}>
                  Floor {f.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioritize" htmlFor={`${id}-priority`}>
            <Select
              id={`${id}-priority`}
              value={filters.priority}
              onChange={(e) => patch({ priority: e.target.value as RoomPriority })}
            >
              {ROOM_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
          {timeLocked && (
            <p className="col-span-full text-xs text-rooms-xlight">The time comes from the selected meeting.</p>
          )}
          {facets && facets.features.length > 0 && (
            <fieldset className="col-span-full flex flex-wrap items-center gap-2">
              <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Features</legend>
              {facets.features.map((f) => {
                const on = filters.features.includes(f);
                return (
                  <Button
                    key={f}
                    size="sm"
                    aria-pressed={on}
                    onClick={() => patch({ features: on ? filters.features.filter((x) => x !== f) : [...filters.features, f] })}
                  >
                    {f}
                  </Button>
                );
              })}
            </fieldset>
          )}
          <div className="col-span-full flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-rooms-xpale">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-rooms-accent)]"
                checked={filters.availableOnly}
                onChange={(e) => patch({ availableOnly: e.target.checked })}
              />
              Free rooms only
            </label>
            <Button variant="ghost" size="sm" disabled={!active} onClick={() => onFiltersChange({ ...DEFAULT_FILTERS, minCapacity: defaultMinCapacity, priority: filters.priority })}>
              Reset filters
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
