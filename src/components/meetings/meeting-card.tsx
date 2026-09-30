"use client";

import { AlertTriangle } from "lucide-react";
import Image from "next/image";
import { LocalTimeRange } from "@/components/local-time";
import { LocationMeta } from "@/components/rooms/location-meta";
import { MetaList } from "@/components/ui/meta-list";
import type { Meeting } from "@/lib/calendar/types";
import type { RoomLocation } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";

/** Figma "room status": booked room(s) in accent, otherwise why there's no room. */
export function RoomStatus({ meeting }: { meeting: Meeting }) {
  if (meeting.rooms.length) {
    return (
      <p className="text-sm text-rooms-accent">
        {meeting.rooms.map((r) => (r.status === "accepted" ? r.name : `${r.name} (${r.status === "needsAction" ? "pending" : r.status})`)).join(", ")}
      </p>
    );
  }
  return <p className="text-sm text-rooms-pale">{meeting.canModify ? "No room booked *" : "Organizer manages room"}</p>;
}

/**
 * Figma "meeting-card". Medium by default, Hover lightens and outlines it,
 * Selected tints it accent, and meetings the user can't change use the Dark
 * "Disabled" surface (still selectable so the room shows on the map).
 */
export function MeetingCard({
  meeting,
  location,
  selected,
  highlighted = false,
  onSelect,
  onDirections,
}: {
  meeting: Meeting;
  location: RoomLocation | null;
  selected: boolean;
  /** Shows the Hover state while the pointer is elsewhere, e.g. over this meeting's row in the Rooms tab. */
  highlighted?: boolean;
  onSelect: () => void;
  onDirections?: () => void;
}) {
  const hasRoom = meeting.rooms.length > 0;
  const locked = !meeting.canModify;
  const tooSmall = hasRoom && location?.capacity != null && location.capacity < meeting.acceptedCount;
  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-5 overflow-clip rounded-lg border-2 border-transparent px-4 py-3 transition-colors",
        selected
          ? "border-rooms-accent bg-rooms-accent/20"
          : highlighted
            ? "border-rooms-light bg-rooms-bg-light"
            : cn(locked ? "bg-rooms-dark" : "bg-rooms-medium", "hover:border-rooms-light hover:bg-rooms-bg-light"),
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="absolute inset-0 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        <span className="sr-only">
          {selected ? "Deselect" : "Select"} {meeting.title}
        </span>
      </button>
      <div className={cn("pointer-events-none flex min-w-0 flex-1 flex-col gap-1.5", locked && "opacity-75")}>
        <p className="text-base leading-5 font-semibold text-rooms-xpale">{meeting.title}</p>
        <RoomStatus meeting={meeting} />
        <LocationMeta location={hasRoom ? location : null} />
        <MetaList
          className="text-xs text-rooms-xpale"
          items={[
            `${meeting.acceptedCount} accepted`,
            hasRoom && meeting.inOfficeCount != null && `~${meeting.inOfficeCount} in room`,
            tooSmall && (
              <span key="cap" className="inline-flex items-center gap-1 text-rooms-warn">
                <AlertTriangle className="size-3.5" aria-hidden />
                Room fits {location.capacity}
              </span>
            ),
          ]}
        />
      </div>
      <p className="pointer-events-none flex h-6 shrink-0 items-center text-sm text-rooms-xpale">
        <LocalTimeRange start={meeting.start} end={meeting.end} />
      </p>
      <button
        type="button"
        onClick={onDirections}
        disabled={!hasRoom || !onDirections}
        aria-label={`Directions to ${meeting.rooms[0]?.name ?? "the room"}`}
        className="absolute right-4 bottom-3 rounded-md p-0.5 transition-colors hover:bg-rooms-light/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-30"
      >
        <Image src="/icons/directions.svg" alt="" width={20} height={20} />
      </button>
    </div>
  );
}

/** Figma meeting-card "Empty" state. `data-empty-row` lets the Rooms tab grid fill the gap it leaves. */
export function NoMeetings() {
  return (
    <p data-empty-row className="w-full px-4 py-1 text-center text-base leading-5 text-rooms-xpale opacity-75">
      No meetings
    </p>
  );
}
