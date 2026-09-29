"use client";

import type * as React from "react";
import { RoomCard } from "@/components/rooms/room-card";
import { Button } from "@/components/ui/button";
import type { RoomResult, SearchResponse } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";
import { AvailabilityTimeline } from "./availability-timeline";

export interface CoverMeeting {
  id: string;
  title: string;
  start: string;
}

const dayTime = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });

/**
 * One dot per meeting on the left that still needs a room: accent when this
 * room is free for it, warn outline when it's taken.
 */
function MeetingCoverage({ meetings, freeFor }: { meetings: CoverMeeting[]; freeFor: string[] | null }) {
  if (!meetings.length || !freeFor) return null;
  const free = new Set(freeFor);
  return (
    <div className="flex items-center gap-2 text-xs text-rooms-xlight">
      <ul className="flex flex-wrap gap-1" aria-hidden>
        {meetings.map((m) => (
          <li
            key={m.id}
            title={`${m.title} · ${dayTime.format(new Date(m.start))}: ${free.has(m.id) ? "free" : "taken"}`}
            className={cn("size-2.5 rounded-full", free.has(m.id) ? "bg-rooms-accent" : "border border-rooms-warn/70")}
          />
        ))}
      </ul>
      <span>
        Free for {meetings.filter((m) => free.has(m.id)).length} of {meetings.length}
        <span className="sr-only"> meetings that need a room</span>
      </span>
    </div>
  );
}

function Column({ title, hint, rooms, children }: { title: string; hint: string; rooms: RoomResult[]; children: (room: RoomResult) => React.ReactNode }) {
  return (
    <section aria-label={title} className="flex min-h-0 flex-col gap-3">
      <header className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-rooms-xpale">{title}</h3>
        <span className="text-xs text-rooms-xlight">{rooms.length}</span>
      </header>
      {rooms.length ? (
        <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto pb-1">{rooms.map((r) => <li key={r.id}>{children(r)}</li>)}</ul>
      ) : (
        <p className="rounded-lg border border-dashed border-rooms-light/30 p-4 text-center text-xs text-rooms-xlight">{hint}</p>
      )}
    </section>
  );
}

/**
 * Rooms tab: favorites, then rooms from your recent meetings, then the best
 * matches for the current filters. Each room appears in one column only.
 */
export function RoomsTab({
  data,
  selectedId,
  needed,
  isFavorite,
  onToggleFavorite,
  freeOnly,
  onFreeOnlyChange,
  coverMeetings,
  onSelect,
  renderAction,
}: {
  data: SearchResponse;
  selectedId: string | null;
  needed?: number;
  isFavorite: (room: RoomResult) => boolean;
  onToggleFavorite: (room: RoomResult) => void;
  freeOnly: boolean;
  onFreeOnlyChange: (freeOnly: boolean) => void;
  /** Meetings on the left that still need a room. */
  coverMeetings: CoverMeeting[];
  onSelect: (room: RoomResult) => void;
  renderAction: (room: RoomResult) => React.ReactNode;
}) {
  const byId = new Map(data.rooms.map((r) => [r.id, r]));
  const shown = (r: RoomResult | undefined): r is RoomResult => r !== undefined && (!freeOnly || r.available === true);

  // Just-starred rooms first, then saved favorites (newest first), minus any just un-starred.
  const saved = data.favoriteIds.map((id) => byId.get(id)).filter((r) => r !== undefined);
  const starred = data.rooms.filter((r) => isFavorite(r) && !data.favoriteIds.includes(r.id));
  const allFavorites = [...starred, ...saved.filter(isFavorite)];
  const favorites = allFavorites.filter(shown);
  const taken = new Set(allFavorites.map((r) => r.id));
  const recent = data.recentIds.filter((id) => !taken.has(id)).map((id) => byId.get(id)).filter(shown);
  recent.forEach((r) => taken.add(r.id));
  const best = data.rooms.filter((r) => r.matches && !taken.has(r.id));

  const card = (room: RoomResult) => (
    <RoomCard
      room={room}
      selected={room.id === selectedId}
      needed={needed}
      favorite={{ on: isFavorite(room), onToggle: () => onToggleFavorite(room) }}
      onSelect={() => onSelect(room)}
      action={renderAction(room)}
      stacked
    >
      <AvailabilityTimeline
        busy={room.busy}
        dayStart={data.window.dayStart}
        dayEnd={data.window.dayEnd}
        start={data.window.start}
        end={data.window.end}
      />
      <MeetingCoverage meetings={coverMeetings} freeFor={room.freeFor} />
    </RoomCard>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <Button size="sm" aria-pressed={freeOnly} onClick={() => onFreeOnlyChange(!freeOnly)}>
          Free only
        </Button>
        {coverMeetings.length > 0 && (
          <p className="flex items-center gap-2 text-xs text-rooms-xlight">
            <span className="size-2.5 rounded-full bg-rooms-accent" aria-hidden />
            Dots show which of your {coverMeetings.length} meetings without a room each room is free for
          </p>
        )}
      </div>
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto xl:grid-cols-3 xl:overflow-visible">
        <Column title="Favorites" hint="Star a room to keep it here." rooms={favorites}>
          {card}
        </Column>
        <Column title="Recent" hint="Rooms from your recent meetings show up here." rooms={recent}>
          {card}
        </Column>
        <Column title="Best match" hint="No rooms match these filters. Try a smaller group size or fewer features." rooms={best}>
          {card}
        </Column>
      </div>
    </div>
  );
}
