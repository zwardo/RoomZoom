"use client";

import { CalendarDays, LoaderCircle, Plus } from "lucide-react";
import { type ComponentProps, type Ref, useState } from "react";
import { LocalDayLabel } from "@/components/local-time";
import { Alert } from "@/components/ui/alert";
import { FilterChip } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { IconButton } from "@/components/ui/icon-button";
import type { MeetingView } from "@/lib/meetings/load";
import { type HoveredMeeting, useIsMeetingHovered } from "./hovered-meeting";
import { MeetingCard, NoMeetings } from "./meeting-card";

/** Re-renders on its own when its meeting's hover changes, so hovering doesn't re-render the list. */
function HoverableMeetingCard({
  hovered,
  ...props
}: Omit<ComponentProps<typeof MeetingCard>, "highlighted"> & { hovered?: HoveredMeeting }) {
  const highlighted = useIsMeetingHovered(hovered, props.meeting.id);
  return <MeetingCard {...props} highlighted={highlighted} />;
}

/**
 * Figma "Meetings" panel: meetings grouped by day, or a single day once a date
 * is applied from the calendar picker.
 *
 * Each card's `<li>` carries `data-meeting-row` so the Rooms tab can line its
 * rows up with the cards inside `scrollRef`.
 */
export function MeetingsPanel({
  days,
  views,
  loading,
  error,
  selectedId,
  hovered,
  onSelect,
  onDirections,
  onCreate,
  date,
  onDateChange,
  scrollRef,
}: {
  /** Local midnights to render groups for, in order. */
  days: Date[];
  views: MeetingView[] | null;
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  /** The meeting shown in its Hover state, e.g. while its row is hovered in the Rooms tab. */
  hovered?: HoveredMeeting;
  onSelect: (view: MeetingView) => void;
  /** Unset hides the cards' directions buttons. */
  onDirections?: (view: MeetingView) => void;
  onCreate: () => void;
  /** The applied date filter, or null for the upcoming week. */
  date: Date | null;
  onDateChange: (date: Date | null) => void;
  scrollRef?: Ref<HTMLDivElement>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const byDay = new Map<string, MeetingView[]>();
  for (const v of views ?? []) {
    const key = new Date(v.meeting.start).toDateString();
    byDay.set(key, [...(byDay.get(key) ?? []), v]);
  }

  function renderCards(items: MeetingView[]) {
    return items.map((v) => (
      <li key={v.meeting.id} data-meeting-row={v.meeting.id}>
        <HoverableMeetingCard
          meeting={v.meeting}
          location={v.location}
          selected={v.meeting.id === selectedId}
          hovered={hovered}
          onSelect={() => onSelect(v)}
          onDirections={onDirections && (() => onDirections(v))}
        />
      </li>
    ));
  }

  return (
    <section aria-labelledby="meetings-heading" className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-rooms-xdark">
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <h2 id="meetings-heading" className="text-xl font-semibold text-rooms-xpale">
          Meetings
        </h2>
        <div className="flex items-center gap-3">
          <IconButton aria-label="New meeting" aria-haspopup="dialog" onClick={onCreate}>
            <Plus />
          </IconButton>
          <IconButton
            aria-label={pickerOpen ? "Hide calendar" : "Pick a date"}
            aria-pressed={pickerOpen}
            aria-expanded={pickerOpen}
            aria-controls="meetings-date-picker"
            onClick={() => setPickerOpen((o) => !o)}
          >
            <CalendarDays />
          </IconButton>
        </div>
      </div>

      {/* --grid-header-inset is set by the Rooms tab so the first card's row starts below its room headers. */}
      <div
        ref={scrollRef}
        className="scrollbar-auto-hide flex min-h-0 flex-1 flex-col overflow-y-auto pt-[calc(--spacing(1.5)+var(--grid-header-inset,0px))] pb-4"
        aria-busy={loading}
      >
        {pickerOpen && (
          <div id="meetings-date-picker" className="flex justify-center px-4 pb-2">
            <Calendar
              selected={date}
              onSelect={(day) => {
                onDateChange(day);
                setPickerOpen(false);
              }}
            />
          </div>
        )}

        {date && (
          <div className="px-4 pt-1">
            <FilterChip onRemove={() => onDateChange(null)} removeLabel="Clear date and show the upcoming week">
              {date.toLocaleDateString(undefined, { weekday: "short" })}{" "}
              {date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
            </FilterChip>
          </div>
        )}

        {error && (
          <div className="px-4 pt-2">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {!views && loading && (
          <p className="flex items-center gap-2 px-4 pt-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Loading your calendar…
          </p>
        )}

        {views &&
          (date ? (
            <ul className="flex flex-col gap-4 p-4">{views.length ? renderCards(views) : <NoMeetings />}</ul>
          ) : (
            days.map((day) => {
              const items = byDay.get(day.toDateString()) ?? [];
              return (
                <section key={day.toDateString()} aria-label={day.toDateString()} className="flex flex-col gap-4 p-4">
                  <h3 className="text-sm font-semibold text-rooms-xpale">
                    <LocalDayLabel iso={day.toISOString()} />
                  </h3>
                  <ul className="flex flex-col gap-4">{items.length ? renderCards(items) : <NoMeetings />}</ul>
                </section>
              );
            })
          ))}
      </div>
    </section>
  );
}
