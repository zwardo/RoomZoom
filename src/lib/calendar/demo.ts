import { db } from "@/lib/db";
import { HttpError } from "@/lib/session";
import {
  type AddRoomInput,
  type BusyInterval,
  type CalendarProvider,
  type CreateMeetingInput,
  type Meeting,
  overlaps,
  type RoomAvailability,
} from "./types";

/**
 * In-memory simulated calendar for DEMO_MODE. Room busy blocks are
 * deterministic per room and day, so availability is stable across reloads.
 */
interface DemoStore {
  meetings: Map<string, Meeting[]>;
  bookings: Map<string, BusyInterval[]>;
}

const globalForDemo = globalThis as unknown as { roomzoomDemo?: DemoStore };
const store: DemoStore = (globalForDemo.roomzoomDemo ??= { meetings: new Map(), bookings: new Map() });

const TEMPLATES = [
  { title: "Team standup", hour: 9.5, minutes: 15, attendees: 7, withRoom: true, organizer: true },
  { title: "Roadmap review", hour: 11, minutes: 60, attendees: 6, withRoom: false, organizer: true },
  { title: "1:1 with Jordan", hour: 13, minutes: 30, attendees: 2, withRoom: false, organizer: true },
  { title: "Design critique", hour: 14, minutes: 60, attendees: 9, withRoom: false, organizer: true },
  { title: "Quarterly all-hands prep", hour: 15.5, minutes: 45, attendees: 12, withRoom: false, organizer: false },
  { title: "Customer call prep", hour: 16, minutes: 30, attendees: 3, withRoom: true, organizer: true },
];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function atHour(day: Date, hour: number) {
  const d = new Date(day);
  d.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  return d;
}

function businessDays(from: Date, count: number) {
  const days: Date[] = [];
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  while (days.length < count) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** Simulated existing bookings for one room on one day (30-minute grid, 8:00-18:00). */
function simulatedBusy(roomEmail: string, day: Date): BusyInterval[] {
  const rand = mulberry32(hash(`${roomEmail}:${day.toDateString()}`));
  const busy: BusyInterval[] = [];
  let slot = 16;
  while (slot < 36) {
    if (rand() < 0.3) {
      const length = 1 + Math.floor(rand() * 3);
      busy.push({ start: atHour(day, slot / 2).toISOString(), end: atHour(day, Math.min(36, slot + length) / 2).toISOString() });
      slot += length + 1;
    } else {
      slot++;
    }
  }
  return busy;
}

function book(roomEmail: string, start: string, end: string) {
  const list = store.bookings.get(roomEmail) ?? [];
  list.push({ start, end });
  store.bookings.set(roomEmail, list);
}

export class DemoCalendarProvider implements CalendarProvider {
  constructor(private email: string) {}

  private async meetings() {
    let meetings = store.meetings.get(this.email);
    if (!meetings) {
      meetings = await this.generate();
      store.meetings.set(this.email, meetings);
    }
    return meetings;
  }

  private async generate(): Promise<Meeting[]> {
    const rooms = await db.room.findMany({ orderBy: { name: "asc" }, select: { resourceEmail: true, name: true } });
    const meetings: Meeting[] = [];
    businessDays(new Date(), 5).forEach((day, dayIndex) => {
      TEMPLATES.forEach((t, i) => {
        if ((i + dayIndex) % 3 === 2) return;
        const start = atHour(day, t.hour);
        const end = new Date(start.getTime() + t.minutes * 60_000);
        const room = t.withRoom && rooms.length ? rooms[(i + dayIndex) % rooms.length] : null;
        if (room) book(room.resourceEmail, start.toISOString(), end.toISOString());
        meetings.push({
          id: `demo-${dayIndex}-${i}`,
          title: t.title,
          start: start.toISOString(),
          end: end.toISOString(),
          allDay: false,
          location: room?.name,
          attendeeCount: t.attendees,
          acceptedCount: Math.max(1, t.attendees - ((i + dayIndex) % 3)),
          inOfficeCount: Math.max(1, Math.round((t.attendees - ((i + dayIndex) % 3)) * (0.5 + ((i + dayIndex) % 4) * 0.15))),
          rooms: room ? [{ email: room.resourceEmail, name: room.name, status: "accepted" }] : [],
          isOrganizer: t.organizer,
          canModify: t.organizer,
        });
      });
    });
    return meetings;
  }

  async listUpcoming(days: number) {
    const now = Date.now();
    return this.listBetween(new Date(now).toISOString(), new Date(now + days * 86_400_000).toISOString());
  }

  async listBetween(timeMin: string, timeMax: string) {
    const from = Date.parse(timeMin);
    const until = Date.parse(timeMax);
    return (await this.meetings())
      .filter((m) => Date.parse(m.end) > from && Date.parse(m.start) < until)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  async getMeeting(eventId: string) {
    return (await this.meetings()).find((m) => m.id === eventId) ?? null;
  }

  async freeBusy(roomEmails: string[], timeMin: string, timeMax: string) {
    await this.meetings();
    const result: Record<string, RoomAvailability> = {};
    const days = [];
    for (let d = new Date(timeMin); d.getTime() < Date.parse(timeMax); d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    for (const email of roomEmails) {
      const busy = [...days.flatMap((d) => simulatedBusy(email, d)), ...(store.bookings.get(email) ?? [])];
      result[email] = {
        busy: busy
          .filter((b) => overlaps([b], timeMin, timeMax))
          .sort((a, b) => a.start.localeCompare(b.start)),
      };
    }
    return result;
  }

  async createMeeting(input: CreateMeetingInput) {
    const meeting: Meeting = {
      id: `demo-new-${Date.now()}`,
      title: input.title,
      start: input.start,
      end: input.end,
      allDay: false,
      location: input.roomName,
      attendeeCount: 1 + (input.guests?.length ?? 0),
      acceptedCount: 1,
      rooms: [{ email: input.roomEmail, name: input.roomName, status: "accepted" }],
      isOrganizer: true,
      canModify: true,
    };
    book(input.roomEmail, input.start, input.end);
    (await this.meetings()).push(meeting);
    return meeting;
  }

  async addRoomToMeeting(input: AddRoomInput) {
    const meeting = await this.getMeeting(input.eventId);
    if (!meeting) throw new HttpError(404, "Meeting not found");
    if (!meeting.canModify) throw new HttpError(403, "Only the organizer can add a room to this meeting.");
    if (input.replaceExisting) meeting.rooms = [];
    meeting.rooms = meeting.rooms.filter((r) => r.email !== input.roomEmail);
    meeting.rooms.push({ email: input.roomEmail, name: input.roomName, status: "accepted" });
    meeting.location = input.roomName;
    book(input.roomEmail, meeting.start, meeting.end);
    return meeting;
  }

  async harvestRooms() {
    const seen = new Map<string, string>();
    for (const m of await this.meetings()) for (const r of m.rooms) seen.set(r.email, r.name);
    return [...seen].map(([email, displayName]) => ({ email, displayName }));
  }
}
