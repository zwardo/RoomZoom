"use client";

import { CheckCircle, Footprints, LoaderCircle, Lock } from "lucide-react";
import { LocalTimeRange } from "@/components/local-time";
import type { HoveredMeeting } from "@/components/meetings/hovered-meeting";
import { MultiRoomCard } from "@/components/rooms/multi-room-card";
import { type CardRoom, RoomCard } from "@/components/rooms/room-card";
import { Alert } from "@/components/ui/alert";
import { Badge, FilterChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Meeting } from "@/lib/calendar/types";
import type { RoomResult, SearchResponse } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";
import { FiltersPanel, type SlotForm } from "./filters-panel";
import { FloorMap, isDrawn } from "./floor-map";
import { RoomsTab } from "./rooms-tab";
import type { RoomFilters } from "./use-room-search";

export type RoomsView = "map" | "rooms";

/** What a room card's buttons ask for; the screen decides whether it needs confirming. */
export type RoomAction = { kind: "book" | "add" | "switch"; room: RoomResult } | { kind: "remove"; room: CardRoom };

/** Keeps the plan clear of the building/floor selectors above it and the room card below at rest. */
const MAP_INSETS = "px-8 pt-14 pb-28";

/**
 * Figma "rooms + map" panel: Rooms/Map tabs, the selected-meeting chip and
 * filters in the header, then the floor map with the building/floor selectors,
 * zoom controls and selected room's card floating over it, or the Rooms tab's
 * room-by-meeting grid.
 */
export function RoomsPanel({
  view,
  onViewChange,
  meeting,
  previousMeeting,
  onClearMeeting,
  slot,
  slotForm,
  onSlotFormChange,
  filters,
  onFiltersChange,
  defaultMinCapacity,
  data,
  loading,
  error,
  selectedEmail,
  onSelectRoom,
  mapFloorId,
  onMapFloorChange,
  onRoomAction,
  pendingEmail,
  isFavorite,
  onToggleFavorite,
  meetings,
  meetingsScroller,
  hoveredMeeting,
  onBookSlot,
  onRemoveSlot,
  notice,
}: {
  view: RoomsView;
  onViewChange: (view: RoomsView) => void;
  meeting: Meeting | null;
  /** The meeting right before this one; distances are measured from its room. */
  previousMeeting: Meeting | null;
  onClearMeeting: () => void;
  slot: { start: Date; end: Date };
  slotForm: SlotForm;
  onSlotFormChange: (slot: SlotForm) => void;
  filters: RoomFilters;
  onFiltersChange: (filters: RoomFilters) => void;
  defaultMinCapacity: number;
  data: SearchResponse | null;
  loading: boolean;
  error: string | null;
  /** Resource email of the room in the card: a catalog room, or an off-campus room on the meeting. */
  selectedEmail: string | null;
  onSelectRoom: (email: string | null) => void;
  mapFloorId: string | null;
  onMapFloorChange: (floorId: string) => void;
  onRoomAction: (action: RoomAction) => void;
  /** A room being booked straight from its card, without a dialog. */
  pendingEmail: string | null;
  isFavorite: (room: RoomResult) => boolean;
  onToggleFavorite: (room: RoomResult) => void;
  /** Meetings in the meetings list; the Rooms tab gives each a row. */
  meetings: Meeting[];
  /** The meetings list's scroll container, which the Rooms tab rows line up with. */
  meetingsScroller: HTMLElement | null;
  hoveredMeeting: HoveredMeeting;
  /** Books a room for one of the listed meetings (a cell in the Rooms tab). */
  onBookSlot: (room: RoomResult, meeting: Meeting) => void;
  /** Takes a room off one of the listed meetings (a booked cell in the Rooms tab). */
  onRemoveSlot: (room: RoomResult, meeting: Meeting) => void;
  notice: React.ReactNode;
}) {
  const catalog = new Map(data?.rooms.map((r) => [r.email.toLowerCase(), r]));
  const selected = (selectedEmail && catalog.get(selectedEmail.toLowerCase())) || null;
  // Rooms on the meeting that aren't in the catalog are on another campus and can't be mapped yet.
  const meetingRooms: CardRoom[] = meeting?.rooms.map((r) => catalog.get(r.email.toLowerCase()) ?? r) ?? [];
  const onMeeting = new Set(meetingRooms.map((r) => r.email.toLowerCase()));
  const selectedOnMeeting = meetingRooms.find((r) => r.email.toLowerCase() === selectedEmail?.toLowerCase()) ?? null;

  const floors = data?.floors ?? [];
  const activeFloor =
    floors.find((f) => f.id === mapFloorId) ??
    floors.find((f) => f.id === selected?.floorId) ??
    floors.find((f) => f.id === data?.myDesk?.floorId) ??
    floors.find((f) => f.id === data?.rooms[0]?.floorId) ??
    floors[0] ??
    null;
  const buildings = [...new Map(floors.map((f) => [f.buildingId, { id: f.buildingId, name: f.buildingName }])).values()];
  // Favorites and recent rooms ride along for the Rooms tab; the map and counts stick to the filters.
  const matching = data?.rooms.filter((r) => r.matches || onMeeting.has(r.email.toLowerCase())) ?? [];
  const undrawn = matching.filter((r) => r.floorId === activeFloor?.id && !isDrawn(r)).length;
  const free = matching.filter((r) => r.available === true).length;
  const needed = meeting ? meeting.acceptedCount : undefined;

  const messages = (
    <>
      {notice}
      {error && <Alert variant="error">{error}</Alert>}
      {previousMeeting && data?.fromRoom && (
        <p className="flex shrink-0 items-center gap-2 text-xs text-rooms-pale">
          <Footprints className="size-4 shrink-0 text-rooms-accent" aria-hidden />
          <span>
            Back-to-back after {previousMeeting.title}: distances are from{" "}
            <span className="text-rooms-accent">{data.fromRoom.name}</span>
          </span>
        </p>
      )}
    </>
  );

  const organizerNote = (
    <span className="inline-flex items-center gap-1 text-xs text-rooms-pale">
      <Lock className="size-3.5" aria-hidden />
      Organizer manages room
    </span>
  );

  /** Figma "Room booked": the room's status chip and Remove room. */
  function bookedAction(room: CardRoom) {
    const status = meeting?.rooms.find((r) => r.email.toLowerCase() === room.email.toLowerCase())?.status;
    return (
      <>
        {status === "declined" ? (
          <Badge variant="destructive" className="h-6">
            Declined
          </Badge>
        ) : status === "accepted" ? (
          <Badge variant="success" className="h-6 [&_svg]:size-4">
            <CheckCircle aria-hidden />
            Booked
          </Badge>
        ) : (
          <Badge className="h-6">Pending</Badge>
        )}
        {meeting?.canModify ? (
          <Button variant="accentGhost" onClick={() => onRoomAction({ kind: "remove", room })}>
            Remove room<span className="sr-only"> {room.name}</span>
          </Button>
        ) : (
          organizerNote
        )}
      </>
    );
  }

  /** Figma "Room selected", "Room switch or add" and "Room busy", for a room not on the meeting. */
  function candidateAction(room: RoomResult) {
    if (room.available === false) {
      return (
        <Badge variant="destructive" className="h-6">
          Busy
        </Badge>
      );
    }
    if (meeting && !meeting.canModify) return organizerNote;
    const unknown = room.available !== true;
    const name = <span className="sr-only"> {room.name}</span>;
    if (meeting?.rooms.length) {
      return (
        <>
          <Button variant="accentGhost" disabled={unknown} onClick={() => onRoomAction({ kind: "add", room })}>
            Add room{name}
          </Button>
          <Button variant="accent" disabled={unknown} onClick={() => onRoomAction({ kind: "switch", room })}>
            Switch room{name}
          </Button>
        </>
      );
    }
    const pending = pendingEmail === room.email;
    return (
      <Button variant="accent" disabled={unknown || pending} onClick={() => onRoomAction({ kind: "book", room })}>
        {pending ? "Booking…" : "Book room"}
        {name}
      </Button>
    );
  }

  let selectedCard: React.ReactNode = null;
  if (meeting && selectedOnMeeting) {
    selectedCard =
      meetingRooms.length > 1 ? (
        <MultiRoomCard
          rooms={meetingRooms}
          activeEmail={selectedOnMeeting.email}
          onActivate={(room) => onSelectRoom(room.email)}
          needed={needed}
          action={bookedAction(selectedOnMeeting)}
        />
      ) : (
        <RoomCard room={selectedOnMeeting} tone="booked" needed={needed} action={bookedAction(selectedOnMeeting)} />
      );
  } else if (selected) {
    selectedCard = (
      <RoomCard
        room={selected}
        tone={selected.available === false ? "busy" : "selected"}
        needed={needed}
        action={candidateAction(selected)}
      />
    );
  }

  return (
    <section aria-label="Rooms" className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-rooms-xdark">
      <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <div role="tablist" aria-label="Rooms view" className="flex shrink-0 items-center gap-4">
            {(["rooms", "map"] as const).map((v) => (
              <Button
                key={v}
                role="tab"
                id={`tab-${v}`}
                aria-selected={view === v}
                aria-controls="rooms-tabpanel"
                onClick={() => onViewChange(v)}
              >
                {v === "rooms" ? "Rooms" : "Map"}
              </Button>
            ))}
          </div>
          <div className="min-w-0 pl-4">
            {meeting ? (
              <FilterChip onRemove={onClearMeeting} removeLabel={`Deselect ${meeting.title}`}>
                {meeting.title}
              </FilterChip>
            ) : (
              <p className="truncate text-xs text-rooms-light">
                Select a meeting, or book for <LocalTimeRange start={slot.start.toISOString()} end={slot.end.toISOString()} /> *
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {data && (
            <span className="hidden text-xs text-rooms-xlight sm:inline" aria-live="polite">
              {free} of {matching.length} free
            </span>
          )}
          <FiltersPanel
            slot={slotForm}
            onSlotChange={onSlotFormChange}
            timeLocked={Boolean(meeting)}
            filters={filters}
            onFiltersChange={onFiltersChange}
            facets={data?.facets}
            defaultMinCapacity={defaultMinCapacity}
          />
        </div>
      </div>

      <div
        id="rooms-tabpanel"
        role="tabpanel"
        aria-labelledby={`tab-${view}`}
        aria-busy={loading}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        {view === "map" && <div className="flex shrink-0 flex-col gap-4 px-6 empty:hidden">{messages}</div>}
        {!data && loading && !error && (
          <p className="flex items-center gap-2 px-6 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Checking room availability…
          </p>
        )}

        {data && view === "map" && (
          <div className="relative flex min-h-64 flex-1 items-center justify-center">
            {activeFloor ? (
              <FloorMap
                className={cn("absolute inset-0 transition-opacity", loading && "opacity-60")}
                insetClassName={MAP_INSETS}
                floor={activeFloor}
                rooms={matching}
                desk={data.myDesk}
                selected={selected}
                onSelect={(room) => onSelectRoom(room.email === selectedEmail ? null : room.email)}
              />
            ) : (
              <p className="rounded-lg border border-dashed border-rooms-light/30 p-8 text-center text-sm text-muted-foreground">
                No floor plans for these rooms yet.
              </p>
            )}
            {activeFloor && (
              <div className="absolute top-3 left-4 z-10 flex max-w-[calc(100%-5rem)] flex-wrap items-center gap-2">
                <SegmentedControl
                  aria-label="Building"
                  options={buildings.map((b) => ({
                    value: b.id,
                    label: b.name.replace(/^Building\b/i, "Bldg"),
                    srLabel: b.id === data.myDesk?.buildingId ? "(your desk)" : undefined,
                  }))}
                  value={activeFloor.buildingId}
                  onChange={(buildingId) => {
                    const inBuilding = floors.filter((f) => f.buildingId === buildingId);
                    const floor =
                      inBuilding.find((f) => f.id === data.myDesk?.floorId) ??
                      inBuilding.find((f) => f.id === selected?.floorId) ??
                      inBuilding[0];
                    if (floor) onMapFloorChange(floor.id);
                  }}
                />
                <SegmentedControl
                  aria-label="Floor"
                  options={floors
                    .filter((f) => f.buildingId === activeFloor.buildingId)
                    .map((f) => {
                      const desk = f.id === data.myDesk?.floorId;
                      return { value: f.id, label: f.name, srLabel: desk ? "(your desk)" : undefined, tooltip: desk && "Your desk" };
                    })}
                  value={activeFloor.id}
                  onChange={onMapFloorChange}
                />
                {undrawn > 0 && (
                  <span className="text-xs text-rooms-xlight">
                    {undrawn} room{undrawn === 1 ? "" : "s"} not drawn on this map yet
                  </span>
                )}
              </div>
            )}
            {selectedCard && <div className="absolute inset-x-4 bottom-4 z-10">{selectedCard}</div>}
          </div>
        )}

        {data && view === "rooms" && (
          <div className={cn("flex min-h-0 flex-1 flex-col transition-opacity", loading && "opacity-60")}>
            <RoomsTab
              data={data}
              meetings={meetings}
              meetingsScroller={meetingsScroller}
              selectedMeeting={meeting}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              freeOnly={filters.availableOnly}
              hovered={hoveredMeeting}
              onBook={onBookSlot}
              onRemove={onRemoveSlot}
            />
          </div>
        )}
        {/* Below the grid, so the rows stay level with the meeting cards. */}
        {view === "rooms" && <div className="flex shrink-0 flex-col gap-4 px-6 pb-4 empty:hidden">{messages}</div>}
      </div>
    </section>
  );
}
