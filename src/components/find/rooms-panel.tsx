"use client";

import { Footprints, LoaderCircle, Lock } from "lucide-react";
import { LocalTimeRange } from "@/components/local-time";
import type { HoveredMeeting } from "@/components/meetings/hovered-meeting";
import { RoomCard } from "@/components/rooms/room-card";
import { Alert } from "@/components/ui/alert";
import { Badge, FilterChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Meeting } from "@/lib/calendar/types";
import type { RoomResult, SearchResponse } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";
import { FiltersPanel, type SlotForm } from "./filters-panel";
import { FloorMap } from "./floor-map";
import { RoomsTab } from "./rooms-tab";
import type { RoomFilters } from "./use-room-search";

export type RoomsView = "map" | "rooms";

/**
 * Figma "rooms + map" panel: Rooms/Map tabs, the selected-meeting chip and
 * filters in the header, then the floor map with the selected room's card
 * pinned to the bottom, or the Rooms tab's room-by-meeting grid.
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
  selected,
  onSelectRoom,
  mapFloorId,
  onMapFloorChange,
  onBook,
  isFavorite,
  onToggleFavorite,
  meetings,
  meetingsScroller,
  hoveredMeeting,
  onBookSlot,
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
  selected: RoomResult | null;
  onSelectRoom: (room: RoomResult | null) => void;
  mapFloorId: string | null;
  onMapFloorChange: (floorId: string) => void;
  onBook: (room: RoomResult) => void;
  isFavorite: (room: RoomResult) => boolean;
  onToggleFavorite: (room: RoomResult) => void;
  /** Meetings in the meetings list; the Rooms tab gives each a row. */
  meetings: Meeting[];
  /** The meetings list's scroll container, which the Rooms tab rows line up with. */
  meetingsScroller: HTMLElement | null;
  hoveredMeeting: HoveredMeeting;
  /** Books a room for one of the listed meetings (a cell in the Rooms tab). */
  onBookSlot: (room: RoomResult, meeting: Meeting) => void;
  notice: React.ReactNode;
}) {
  const floors = data?.floors ?? [];
  const activeFloor =
    floors.find((f) => f.id === mapFloorId) ??
    floors.find((f) => f.id === selected?.floorId) ??
    floors.find((f) => f.id === data?.myDesk?.floorId) ??
    floors.find((f) => f.id === data?.rooms[0]?.floorId) ??
    floors[0] ??
    null;
  const buildings = [...new Map(floors.map((f) => [f.buildingId, { id: f.buildingId, name: f.buildingName }])).values()];
  const onMeeting = new Set(meeting?.rooms.map((r) => r.email));
  const bookLabel = meeting ? (meeting.rooms.length ? "Switch room" : "Book room") : "Book room";
  // Favorites and recent rooms ride along for the Rooms tab; the map and counts stick to the filters.
  const matching = data?.rooms.filter((r) => r.matches || onMeeting.has(r.email)) ?? [];
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

  function bookAction(room: RoomResult) {
    if (onMeeting.has(room.email)) return <Badge variant="success">On this meeting</Badge>;
    if (meeting && !meeting.canModify) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-rooms-pale">
          <Lock className="size-3.5" aria-hidden />
          Organizer manages room
        </span>
      );
    }
    return (
      <Button variant="accent" disabled={room.available !== true} onClick={() => onBook(room)}>
        {room.available === false ? "Busy" : bookLabel}
        <span className="sr-only"> {room.name}</span>
      </Button>
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
        className={cn("flex min-h-0 flex-1 flex-col gap-4", view === "map" && "px-6 pb-6")}
      >
        {view === "map" && messages}
        {!data && loading && !error && (
          <p className={cn("flex items-center gap-2 text-sm text-muted-foreground", view === "rooms" && "px-6")}>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Checking room availability…
          </p>
        )}

        {data && view === "map" && (
          <>
            {activeFloor && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
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
              </div>
            )}
            <div className={cn("flex min-h-64 flex-1 items-center justify-center [container-type:size]", loading && "opacity-60")}>
              {activeFloor ? (
                <div style={{ width: `min(100cqw, calc((100cqh - 2rem) * ${activeFloor.widthPx / (activeFloor.heightPx || 1)}))` }}>
                  <FloorMap
                    floor={activeFloor}
                    rooms={matching}
                    desk={data.myDesk}
                    selected={selected}
                    onSelect={(room) => onSelectRoom(room.id === selected?.id ? null : room)}
                  />
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-rooms-light/30 p-8 text-center text-sm text-muted-foreground">
                  No floor plans for these rooms yet.
                </p>
              )}
            </div>
            {selected && <RoomCard className="shrink-0" room={selected} selected needed={needed} action={bookAction(selected)} />}
          </>
        )}

        {data && view === "rooms" && (
          <div className={cn("flex min-h-0 flex-1 flex-col transition-opacity", loading && "opacity-60")}>
            <RoomsTab
              data={data}
              meetings={meetings}
              meetingsScroller={meetingsScroller}
              selectedMeetingId={meeting?.id ?? null}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              freeOnly={filters.availableOnly}
              hovered={hoveredMeeting}
              onBook={onBookSlot}
            />
          </div>
        )}
        {/* Below the grid, so the rows stay level with the meeting cards. */}
        {view === "rooms" && <div className="flex shrink-0 flex-col gap-4 px-6 pb-4 empty:hidden">{messages}</div>}
      </div>
    </section>
  );
}
