import { type calendar_v3, google } from "googleapis";
import { getUserAuth } from "@/lib/google/user-auth";
import { HttpError } from "@/lib/session";
import { chunk } from "@/lib/utils";
import type {
  AddRoomInput,
  CalendarProvider,
  CreateMeetingInput,
  HarvestedRoom,
  Meeting,
  RoomAvailability,
} from "./types";

/** Google allows up to 50 calendars per freebusy request. */
const FREEBUSY_BATCH = 50;
const SKIPPED_EVENT_TYPES = new Set(["workingLocation", "outOfOffice", "focusTime"]);

export function toMeeting(event: calendar_v3.Schema$Event): Meeting {
  const attendees = event.attendees ?? [];
  const people = attendees.filter((a) => !a.resource);
  const isOrganizer = Boolean(event.organizer?.self) || attendees.length === 0;
  return {
    id: event.id ?? "",
    title: event.summary || "(No title)",
    start: event.start?.dateTime ?? event.start?.date ?? "",
    end: event.end?.dateTime ?? event.end?.date ?? "",
    allDay: !event.start?.dateTime,
    htmlLink: event.htmlLink ?? undefined,
    location: event.location ?? undefined,
    attendeeCount: Math.max(1, people.length),
    acceptedCount: people.length ? people.filter((a) => a.responseStatus === "accepted").length : 1,
    rooms: attendees
      .filter((a) => a.resource && a.email)
      .map((a) => ({ email: a.email!, name: a.displayName ?? a.email!, status: a.responseStatus ?? "needsAction" })),
    isOrganizer,
    canModify: isOrganizer || Boolean(event.guestsCanModify),
  };
}

function isRelevant(event: calendar_v3.Schema$Event) {
  if (event.status === "cancelled") return false;
  if (event.eventType && SKIPPED_EVENT_TYPES.has(event.eventType)) return false;
  const self = event.attendees?.find((a) => a.self);
  return self?.responseStatus !== "declined";
}

export class GoogleCalendarProvider implements CalendarProvider {
  private constructor(private cal: calendar_v3.Calendar) {}

  static async forUser(email: string) {
    const auth = await getUserAuth(email);
    return new GoogleCalendarProvider(google.calendar({ version: "v3", auth }));
  }

  async listUpcoming(days: number) {
    const now = new Date();
    return this.listBetween(now.toISOString(), new Date(now.getTime() + days * 86_400_000).toISOString());
  }

  async listBetween(timeMin: string, timeMax: string) {
    const res = await this.cal.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });
    return (res.data.items ?? []).filter(isRelevant).map(toMeeting);
  }

  async getMeeting(eventId: string) {
    try {
      const res = await this.cal.events.get({ calendarId: "primary", eventId });
      return toMeeting(res.data);
    } catch (err) {
      if ((err as { code?: number }).code === 404) return null;
      throw err;
    }
  }

  async freeBusy(roomEmails: string[], timeMin: string, timeMax: string) {
    const result: Record<string, RoomAvailability> = {};
    const batches = await Promise.all(
      chunk(roomEmails, FREEBUSY_BATCH).map((batch) =>
        this.cal.freebusy.query({
          requestBody: { timeMin, timeMax, items: batch.map((id) => ({ id })) },
        }),
      ),
    );
    for (const res of batches) {
      for (const [email, cal] of Object.entries(res.data.calendars ?? {})) {
        result[email.toLowerCase()] = {
          busy: (cal.busy ?? []).map((b) => ({ start: b.start!, end: b.end! })),
          error: cal.errors?.[0]?.reason ?? undefined,
        };
      }
    }
    return result;
  }

  async createMeeting(input: CreateMeetingInput) {
    const res = await this.cal.events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      requestBody: {
        summary: input.title,
        location: input.roomName,
        start: { dateTime: input.start },
        end: { dateTime: input.end },
        attendees: [
          { email: input.roomEmail, resource: true },
          ...(input.guests ?? []).map((email) => ({ email })),
        ],
      },
    });
    return toMeeting(res.data);
  }

  async addRoomToMeeting(input: AddRoomInput) {
    const { data: event } = await this.cal.events.get({ calendarId: "primary", eventId: input.eventId });
    const meeting = toMeeting(event);
    if (!meeting.canModify) {
      throw new HttpError(403, "Only the organizer can add a room to this meeting.");
    }
    const attendees = (event.attendees ?? []).filter(
      (a) => a.email?.toLowerCase() !== input.roomEmail && !(input.replaceExisting && a.resource),
    );
    attendees.push({ email: input.roomEmail, resource: true });
    const res = await this.cal.events.patch({
      calendarId: "primary",
      eventId: input.eventId,
      sendUpdates: "all",
      requestBody: {
        attendees,
        location: input.replaceExisting || !event.location ? input.roomName : event.location,
      },
    });
    return toMeeting(res.data);
  }

  async harvestRooms(daysBack: number) {
    const rooms = new Map<string, HarvestedRoom>();
    const now = Date.now();
    let pageToken: string | undefined;
    do {
      const res: { data: calendar_v3.Schema$Events } = await this.cal.events.list({
        calendarId: "primary",
        timeMin: new Date(now - daysBack * 86_400_000).toISOString(),
        timeMax: new Date(now + 30 * 86_400_000).toISOString(),
        singleEvents: true,
        maxResults: 2500,
        pageToken,
      });
      for (const event of res.data.items ?? []) {
        for (const a of event.attendees ?? []) {
          if (a.resource && a.email) {
            rooms.set(a.email.toLowerCase(), { email: a.email.toLowerCase(), displayName: a.displayName ?? a.email });
          }
        }
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
    return [...rooms.values()];
  }
}
