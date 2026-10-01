"use client";

import { AlertTriangle, CircleCheck, Phone, Star, Users, Video } from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import { LocalTimeRange } from "@/components/local-time";
import { groupFeatures } from "@/components/rooms/room-card";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import type { Meeting } from "@/lib/calendar/types";
import { roomColumns, type SlotStatus, slotStatus } from "@/lib/rooms/grid";
import type { RoomResult, SearchResponse } from "@/lib/rooms/types";
import { cn, formatFeet } from "@/lib/utils";
import { type RowBox, useRowAlignment } from "./use-row-alignment";

const STATUS_LABEL: Record<SlotStatus, string> = {
  booked: "Booked",
  available: "Available",
  busy: "Busy",
  unknown: "Unknown",
};

/** Figma "room availability". Content sits 18px/14px in whatever the border width. */
const STATUS_CLASS: Record<SlotStatus, string> = {
  booked: "border-2 border-rooms-accent bg-rooms-accent/20 px-4 py-3",
  available: "border border-rooms-light bg-rooms-light/10 px-[17px] py-[13px]",
  busy: "border-2 border-rooms-warn/20 px-4 py-3",
  unknown: "border-2 border-dashed border-rooms-light/30 px-4 py-3",
};

function StatusChip({ status }: { status: SlotStatus }) {
  if (status === "booked") {
    return (
      <span className="inline-flex h-6 items-center gap-2 text-sm font-medium text-rooms-accent">
        Booked
        <CircleCheck className="size-4" aria-hidden />
      </span>
    );
  }
  return (
    <Badge
      variant={status === "busy" ? "destructive" : status === "unknown" ? "outline" : "default"}
      className={cn("h-6", status === "available" && "bg-rooms-light/20")}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/**
 * One room's cell in a meeting's row. Free cells for meetings the user can
 * change are buttons that book the room for that meeting.
 */
function SlotCell({
  room,
  meeting,
  status,
  bookable,
  dimmed,
  showMeeting,
  style,
  onBook,
  onHover,
}: {
  room: RoomResult;
  meeting: Meeting;
  status: SlotStatus;
  bookable: boolean;
  dimmed: boolean;
  /** Names the meeting in the cell, for when it isn't beside its meeting card. */
  showMeeting: boolean;
  style?: React.CSSProperties;
  onBook: () => void;
  onHover: (meetingId: string | null) => void;
}) {
  const tooSmall = status === "available" && room.capacity != null && room.capacity < meeting.acceptedCount;
  const when = <LocalTimeRange start={meeting.start} end={meeting.end} />;
  const content = (
    <>
      <span className="sr-only">
        {bookable ? `Book ${room.name} for ` : `${room.name}, `}
        {meeting.title}, {when}:{" "}
      </span>
      <span className="flex w-full items-center justify-between gap-2">
        <StatusChip status={status} />
        {tooSmall && (
          <span title={`Seats ${room.capacity}, ${meeting.acceptedCount} accepted`} className="text-rooms-warn">
            <AlertTriangle className="size-4" aria-hidden />
            <span className="sr-only">
              {" "}
              (fits {room.capacity} of {meeting.acceptedCount})
            </span>
          </span>
        )}
      </span>
      {showMeeting && (
        <span className="flex flex-col gap-1 text-xs text-rooms-xpale" aria-hidden>
          <span className="line-clamp-2 font-semibold">{meeting.title}</span>
          {when}
        </span>
      )}
    </>
  );
  const className = cn(
    "flex w-full flex-col items-start gap-2 overflow-clip rounded-lg text-left transition-[background-color,opacity]",
    STATUS_CLASS[status],
    dimmed && "opacity-40",
    style ? "absolute inset-x-0" : "min-h-28",
  );
  const hover = {
    onPointerEnter: () => onHover(meeting.id),
    onPointerLeave: () => onHover(null),
  };

  if (!bookable) {
    return (
      <div className={className} style={style} {...hover}>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onBook}
      onFocus={() => onHover(meeting.id)}
      onBlur={() => onHover(null)}
      className={cn(
        className,
        "hover:bg-rooms-light/20 hover:opacity-100 focus-visible:bg-rooms-light/20 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      )}
      style={style}
      {...hover}
    >
      {content}
    </button>
  );
}

/** Figma room column header: name, seats and A/V icons, and the favorite star. */
function RoomHeader({ room, favorite }: { room: RoomResult; favorite: { on: boolean; onToggle: () => void } }) {
  const { media, phone } = groupFeatures(room.features);
  const where = [room.buildingName, room.floorName && `Floor ${room.floorName}`, room.distanceFt != null && formatFeet(room.distanceFt)]
    .filter(Boolean)
    .join(" · ");
  return (
    <header className="sticky top-0 z-10 flex items-start gap-2 bg-rooms-xdark pb-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-sm leading-[18px] font-semibold text-white" title={`${room.name} · ${where}`}>
          {room.name}
        </h3>
        <p className="flex items-center gap-2 text-sm leading-4 text-rooms-xpale">
          <span className="inline-flex items-center gap-1">
            <Users className="size-4 text-rooms-light" aria-hidden />
            {room.capacity ?? "?"}
            <span className="sr-only"> seats</span>
          </span>
          {media.length > 0 && (
            <span title={media.join(", ")}>
              <Video className="size-4 text-rooms-light" aria-hidden />
              <span className="sr-only">{media.join(", ")}</span>
            </span>
          )}
          {phone.length > 0 && (
            <span title={phone.join(", ")}>
              <Phone className="size-4 text-rooms-light" aria-hidden />
              <span className="sr-only">{phone.join(", ")}</span>
            </span>
          )}
        </p>
      </div>
      <IconButton
        aria-label={favorite.on ? `Remove ${room.name} from favorites` : `Add ${room.name} to favorites`}
        aria-pressed={favorite.on}
        onClick={favorite.onToggle}
        className="p-1 text-rooms-xpale aria-pressed:border-transparent aria-pressed:bg-transparent aria-pressed:text-rooms-accent [&_svg]:size-4"
      >
        <Star className={cn(favorite.on && "fill-current")} />
      </IconButton>
    </header>
  );
}

/**
 * Rooms tab: one column per room (favorites, then rooms from recent meetings,
 * then the best matches, which lead once a meeting is selected) and one row
 * per meeting in the meetings list, level
 * with its card. Each cell says whether the room is booked on, free, or busy
 * for that meeting. Hovering a row highlights its meeting; a selected meeting's
 * row is banded and the others fade.
 */
export function RoomsTab({
  data,
  meetings,
  meetingsScroller,
  selectedMeetingId,
  isFavorite,
  onToggleFavorite,
  freeOnly,
  onHoverMeeting,
  onBook,
}: {
  data: SearchResponse;
  /** The meetings listed on the left, one row each. */
  meetings: Meeting[];
  /** The meetings list's scroll container, which the rows line up with. */
  meetingsScroller: HTMLElement | null;
  selectedMeetingId: string | null;
  isFavorite: (room: RoomResult) => boolean;
  onToggleFavorite: (room: RoomResult) => void;
  freeOnly: boolean;
  onHoverMeeting: (meetingId: string | null) => void;
  onBook: (room: RoomResult, meeting: Meeting) => void;
}) {
  const [grid, setGrid] = useState<HTMLDivElement | null>(null);
  const alignment = useRowAlignment(meetingsScroller, grid);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    grid?.scrollTo({ left: 0 });
  }, [grid, selectedMeetingId]);

  const columns = roomColumns(data, { isFavorite, freeOnly, meetingSelected: selectedMeetingId !== null });
  const covered = new Set(data.coveredIds);
  const aligned = alignment?.mode === "aligned" ? alignment : null;
  const selectedRow = selectedMeetingId ? aligned?.rows.get(selectedMeetingId) : undefined;
  const rows = aligned ? meetings.filter((m) => aligned.rows.has(m.id)) : meetings;

  const cells = (room: RoomResult) =>
    rows.map((meeting) => {
      const status = slotStatus(room, meeting, covered);
      const box: RowBox | undefined = aligned?.rows.get(meeting.id);
      return (
        <li key={meeting.id}>
          <SlotCell
            room={room}
            meeting={meeting}
            status={status}
            bookable={status === "available" && meeting.canModify && Date.parse(meeting.end) > now}
            dimmed={selectedMeetingId !== null && meeting.id !== selectedMeetingId}
            showMeeting={!aligned}
            style={box && { top: box.top, height: box.height }}
            onBook={() => onBook(room, meeting)}
            onHover={onHoverMeeting}
          />
        </li>
      );
    });

  if (!columns.length) {
    return (
      <p className="m-4 rounded-lg border border-dashed border-rooms-light/30 p-4 text-center text-xs text-rooms-xlight">
        No rooms match these filters. Try a smaller group size or fewer features.
      </p>
    );
  }

  return (
    <div ref={setGrid} className="min-h-0 flex-1 overflow-auto overscroll-contain">
      <div className="relative flex w-max" style={aligned ? { height: aligned.height } : undefined}>
        {selectedRow && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-y border-rooms-accent/40 bg-rooms-accent/10"
            style={{ top: selectedRow.top - 8, height: selectedRow.height + 16 }}
          />
        )}
        {columns.map((room) => (
          <section key={room.id} aria-label={room.name} className="relative w-52 shrink-0 border-r border-rooms-bg-light px-4">
            <RoomHeader room={room} favorite={{ on: isFavorite(room), onToggle: () => onToggleFavorite(room) }} />
            {aligned?.gaps.map((gap) => (
              <div
                key={gap.top}
                aria-hidden
                className="absolute inset-x-4 rounded-lg bg-rooms-dark"
                style={{ top: gap.top, height: gap.height }}
              />
            ))}
            {alignment && (
              <ul className={cn(aligned ? "absolute inset-x-4 top-0" : "flex flex-col gap-4 pb-4")}>{cells(room)}</ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
