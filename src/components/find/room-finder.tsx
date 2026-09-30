"use client";

import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppHeader, type HeaderUser } from "@/components/app-header";
import { MeetingsPanel } from "@/components/meetings/meetings-panel";
import { Alert } from "@/components/ui/alert";
import { estimateSteps, StepsChip } from "@/components/steps-chip";
import type { Meeting } from "@/lib/calendar/types";
import type { MeetingView } from "@/lib/meetings/load";
import { ROOM_PRIORITIES, type RoomPriority, type RoomResult } from "@/lib/rooms/types";
import { fromInputs, nextHalfHour, toDateInput, toTimeInput } from "@/lib/time";
import { BookDialog } from "./book-dialog";
import type { SlotForm } from "./filters-panel";
import { RoomsPanel, type RoomsView } from "./rooms-panel";
import { DEFAULT_FILTERS, type RoomFilters, useRoomSearch } from "./use-room-search";

const UPCOMING_DAYS = 7;
const subscribeNoop = () => () => {};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

const PRIORITY_KEY = "roomzoom.priority";
/** Meetings ending this close to the next one's start count as back-to-back. */
const BACK_TO_BACK_MS = 15 * 60_000;

function loadPriority(): RoomPriority {
  const saved = localStorage.getItem(PRIORITY_KEY);
  return ROOM_PRIORITIES.find((p) => p === saved) ?? DEFAULT_FILTERS.priority;
}

/** The latest booked meeting that ends shortly before `meeting` starts, if any. */
function backToBackBefore(meeting: Meeting, views: MeetingView[]) {
  const start = Date.parse(meeting.start);
  return (
    views
      .filter((v) => {
        const end = Date.parse(v.meeting.end);
        return v.meeting.id !== meeting.id && v.location && end <= start && start - end <= BACK_TO_BACK_MS;
      })
      .sort((a, b) => b.meeting.end.localeCompare(a.meeting.end))[0] ?? null
  );
}

function defaultSlotForm(): SlotForm {
  const start = nextHalfHour();
  return { date: toDateInput(start), time: toTimeInput(start), duration: 30 };
}

/**
 * The home screen: meetings on the left, rooms and the floor map on the right.
 * Day boundaries and times depend on the viewer's time zone, so it renders only
 * in the browser.
 */
export function RoomFinder(props: { user: HeaderUser; initialMeetingId: string | null }) {
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!isClient) {
    return (
      <>
        <AppHeader user={props.user} />
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Loading…
        </p>
      </>
    );
  }
  return <RoomFinderScreen {...props} />;
}

function useMeetings(date: Date | null, reloadKey: number) {
  const [views, setViews] = useState<MeetingView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState<string | null>(null);

  const from = startOfDay(date ?? new Date());
  const to = addDays(from, date ? 1 : UPCOMING_DAYS);
  const key = `${from.toISOString()}|${to.toISOString()}|${reloadKey}`;

  useEffect(() => {
    const [fromIso, toIso] = key.split("|");
    const controller = new AbortController();
    fetch(`/api/meetings?${new URLSearchParams({ from: fromIso, to: toIso })}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't load your calendar.");
        setViews(body.meetings as MeetingView[]);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Couldn't load your calendar.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettled(key);
      });
    return () => controller.abort();
  }, [key]);

  const days = Array.from({ length: date ? 1 : UPCOMING_DAYS }, (_, i) => addDays(from, i));
  return { views, error, loading: settled !== key, days };
}

function RoomFinderScreen({ user, initialMeetingId }: { user: HeaderUser; initialMeetingId: string | null }) {
  const [date, setDate] = useState<Date | null>(null);
  const [meetingsReload, setMeetingsReload] = useState(0);
  const meetings = useMeetings(date, meetingsReload);

  const [meetingId, setMeetingId] = useState<string | null>(initialMeetingId);
  const [view, setView] = useState<RoomsView>("map");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [mapFloorId, setMapFloorId] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState<SlotForm>(defaultSlotForm);
  const [filters, setFilters] = useState<RoomFilters>(() => ({ ...DEFAULT_FILTERS, priority: loadPriority() }));
  /** A room to book, for `meeting` (a Rooms tab cell) or else the selected meeting or time slot. */
  const [booking, setBooking] = useState<{ room: RoomResult; meeting?: Meeting } | null>(null);
  const [hoveredMeetingId, setHoveredMeetingId] = useState<string | null>(null);
  const [meetingsScroller, setMeetingsScroller] = useState<HTMLDivElement | null>(null);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const [searchReload, setSearchReload] = useState(0);

  const [openedAt] = useState(() => Date.now());
  const visible = meetings.views?.filter((v) => date || Date.parse(v.meeting.end) > openedAt) ?? null;
  const selectedView = meetings.views?.find((v) => v.meeting.id === meetingId) ?? null;
  const meeting = selectedView?.meeting ?? null;

  const slot = useMemo(
    () => {
      if (meeting) return { start: new Date(meeting.start), end: new Date(meeting.end) };
      const start = fromInputs(slotForm.date, slotForm.time);
      return { start, end: new Date(start.getTime() + slotForm.duration * 60_000) };
    },
    [meeting, slotForm],
  );

  const previous = meeting ? backToBackBefore(meeting, meetings.views ?? []) : null;
  const listed = visible?.map((v) => v.meeting) ?? [];
  const search = useRoomSearch(
    slot,
    filters,
    {
      include: meeting?.rooms.map((r) => r.email) ?? [],
      fromRoomId: previous?.location?.roomId ?? null,
      personal: view === "rooms",
      cover: view === "rooms" ? listed.map((m) => ({ id: m.id, start: m.start, end: m.end })) : [],
    },
    searchReload,
  );

  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const isFavorite = (room: RoomResult) => favoriteOverrides[room.id] ?? Boolean(search.data?.favoriteIds.includes(room.id));
  const toggleFavorite = (room: RoomResult) => {
    const on = !isFavorite(room);
    setFavoriteOverrides((o) => ({ ...o, [room.id]: on }));
    fetch(`/api/rooms/${encodeURIComponent(room.id)}/favorite`, { method: on ? "PUT" : "DELETE" })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Couldn't update favorites");
      })
      .catch((err) => {
        setFavoriteOverrides((o) => ({ ...o, [room.id]: !on }));
        setNotice({ message: err instanceof Error ? err.message : "Couldn't update favorites", error: true });
      });
  };
  const selectedRoom = search.data?.rooms.find((r) => r.id === roomId) ?? null;
  const bookingMeeting = booking ? (booking.meeting ?? meeting) : null;

  const today = new Date(openedAt).toDateString();
  const showsToday = !date || date.toDateString() === today;
  const todays = meetings.views?.filter((v) => new Date(v.meeting.start).toDateString() === today) ?? [];
  const steps = showsToday && meetings.views ? estimateSteps(todays) : 0;

  useEffect(() => {
    localStorage.setItem(PRIORITY_KEY, filters.priority);
  }, [filters.priority]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (meetingId) url.searchParams.set("meeting", meetingId);
    else url.searchParams.delete("meeting");
    url.searchParams.delete("eventId");
    window.history.replaceState(null, "", url);
  }, [meetingId]);

  const selectMeeting = useCallback((v: MeetingView | null, opts: { focusRoom?: boolean } = {}) => {
    setNotice(null);
    if (!v) {
      setMeetingId(null);
      setRoomId(null);
      setFilters((f) => ({ ...f, minCapacity: DEFAULT_FILTERS.minCapacity }));
      return;
    }
    setMeetingId(v.meeting.id);
    setFilters((f) => ({ ...f, minCapacity: v.meeting.attendeeCount }));
    setRoomId(v.location?.roomId ?? null);
    if (v.location?.floorId) setMapFloorId(v.location.floorId);
    if (opts.focusRoom) setView("map");
  }, []);

  // Apply a deep-linked meeting once its data arrives.
  const [appliedInitial, setAppliedInitial] = useState(false);
  if (!appliedInitial && selectedView) {
    setAppliedInitial(true);
    setFilters((f) => ({ ...f, minCapacity: selectedView.meeting.attendeeCount }));
    setRoomId(selectedView.location?.roomId ?? null);
    if (selectedView.location?.floorId) setMapFloorId(selectedView.location.floorId);
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-2rem)]">
      <AppHeader user={user} extra={steps > 0 && <StepsChip steps={steps} />} />
      <main className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[28rem_minmax(0,1fr)]">
        <MeetingsPanel
          days={meetings.days}
          views={visible}
          loading={meetings.loading}
          error={meetings.error}
          selectedId={meetingId}
          highlightedId={view === "rooms" ? hoveredMeetingId : null}
          scrollRef={setMeetingsScroller}
          onSelect={(v) => selectMeeting(v.meeting.id === meetingId ? null : v)}
          onDirections={(v) => selectMeeting(v, { focusRoom: true })}
          date={date}
          onDateChange={(d) => {
            setDate(d);
            if (!d) return;
            setSlotForm((s) => ({ ...s, date: toDateInput(d) }));
            if (meeting && new Date(meeting.start).toDateString() !== d.toDateString()) selectMeeting(null);
          }}
        />
        <RoomsPanel
          view={view}
          onViewChange={(v) => {
            setView(v);
            setHoveredMeetingId(null);
          }}
          meeting={meeting}
          previousMeeting={search.data?.fromRoom && previous ? previous.meeting : null}
          onClearMeeting={() => selectMeeting(null)}
          slot={slot}
          slotForm={slotForm}
          onSlotFormChange={(s) => {
            setNotice(null);
            setSlotForm(s);
          }}
          filters={filters}
          onFiltersChange={setFilters}
          defaultMinCapacity={meeting?.attendeeCount ?? DEFAULT_FILTERS.minCapacity}
          data={search.data}
          loading={search.loading}
          error={search.error}
          selected={selectedRoom}
          onSelectRoom={(room) => {
            setRoomId(room?.id ?? null);
            if (room?.floorId) setMapFloorId(room.floorId);
          }}
          mapFloorId={mapFloorId}
          onMapFloorChange={setMapFloorId}
          onBook={(room) => {
            setNotice(null);
            setBooking({ room });
          }}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          meetings={listed}
          meetingsScroller={meetingsScroller}
          onHoverMeeting={setHoveredMeetingId}
          onBookSlot={(room, m) => {
            setNotice(null);
            setBooking({ room, meeting: m });
          }}
          notice={notice && <Alert variant={notice.error ? "error" : undefined}>{notice.message}</Alert>}
        />
      </main>
      <BookDialog
        room={booking?.room ?? null}
        start={bookingMeeting?.start ?? slot.start.toISOString()}
        end={bookingMeeting?.end ?? slot.end.toISOString()}
        meeting={bookingMeeting}
        replaceExisting={Boolean(bookingMeeting?.rooms.length)}
        onClose={() => setBooking(null)}
        onBooked={(result) => {
          setBooking(null);
          setNotice(result);
          setSearchReload((k) => k + 1);
          setMeetingsReload((k) => k + 1);
          if (!bookingMeeting) setMeetingId(result.meeting.id);
        }}
      />
    </div>
  );
}
