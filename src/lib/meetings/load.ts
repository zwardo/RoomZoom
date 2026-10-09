import type { CalendarProvider, Meeting } from "@/lib/calendar/types";
import { db } from "@/lib/db";
import type { DistanceResolver } from "@/lib/rooms/search";
import type { Point, RoomLocation } from "@/lib/rooms/types";
import { parseJsonArray } from "@/lib/utils";

export interface MeetingView {
  meeting: Meeting;
  /** The first booked room we know about, with distance from the viewer's desk. */
  location: RoomLocation | null;
}

/** Timed meetings in the window, each paired with where its booked room is. */
export async function loadMeetings(
  calendar: CalendarProvider,
  distance: DistanceResolver | null,
  timeMin: string,
  timeMax: string,
): Promise<MeetingView[]> {
  const meetings = (await calendar.listBetween(timeMin, timeMax)).filter((m) => !m.allDay);
  const emails = [...new Set(meetings.flatMap((m) => m.rooms.map((r) => r.email.toLowerCase())))];
  const rooms = emails.length
    ? await db.room.findMany({ where: { resourceEmail: { in: emails } }, include: { building: true, floor: true } })
    : [];

  const locations = new Map<string, RoomLocation>();
  for (const r of rooms) {
    const polygon = r.polygon ? parseJsonArray<Point>(r.polygon) : null;
    const doors = r.doors ? parseJsonArray<Point>(r.doors) : [];
    const measured = distance?.measure({ floorId: r.floorId, buildingId: r.buildingId, doors, polygon });
    locations.set(r.resourceEmail.toLowerCase(), {
      roomId: r.id,
      email: r.resourceEmail.toLowerCase(),
      buildingName: r.building.name,
      floorId: r.floorId,
      floorName: r.floor?.name ?? null,
      capacity: r.capacity,
      distanceFt: measured?.distanceFt ?? null,
      distanceMethod: measured?.distanceMethod ?? null,
    });
  }

  return meetings.map((meeting) => ({
    meeting,
    location: meeting.rooms.map((r) => locations.get(r.email.toLowerCase())).find(Boolean) ?? null,
  }));
}
