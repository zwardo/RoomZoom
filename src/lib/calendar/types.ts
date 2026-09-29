export interface MeetingRoom {
  email: string;
  name: string;
  /** Google attendee responseStatus: "accepted" | "declined" | "tentative" | "needsAction" */
  status: string;
}

export interface Meeting {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink?: string;
  location?: string;
  /** People invited, excluding rooms. At least 1 (the user). */
  attendeeCount: number;
  /** People (excluding rooms) who accepted the invite. */
  acceptedCount: number;
  /**
   * Accepted people whose working location puts them in the office that day.
   * Unset when the provider can't see invitees' working locations.
   */
  inOfficeCount?: number;
  rooms: MeetingRoom[];
  isOrganizer: boolean;
  /** Whether this user may change the guest list (organizer or guestsCanModify). */
  canModify: boolean;
}

export interface BusyInterval {
  start: string;
  end: string;
}

export interface RoomAvailability {
  busy: BusyInterval[];
  /** Set when Google couldn't return free/busy for the room (e.g. no access). */
  error?: string;
}

export interface CreateMeetingInput {
  title: string;
  start: string;
  end: string;
  roomEmail: string;
  roomName: string;
  guests?: string[];
}

export interface AddRoomInput {
  eventId: string;
  roomEmail: string;
  roomName: string;
  /** Remove rooms already on the event (swap instead of adding a second room). */
  replaceExisting?: boolean;
}

export interface HarvestedRoom {
  email: string;
  displayName: string;
}

export interface CalendarProvider {
  listUpcoming(days: number): Promise<Meeting[]>;
  /** Meetings overlapping [timeMin, timeMax), in start order. */
  listBetween(timeMin: string, timeMax: string): Promise<Meeting[]>;
  getMeeting(eventId: string): Promise<Meeting | null>;
  freeBusy(roomEmails: string[], timeMin: string, timeMax: string): Promise<Record<string, RoomAvailability>>;
  createMeeting(input: CreateMeetingInput): Promise<Meeting>;
  addRoomToMeeting(input: AddRoomInput): Promise<Meeting>;
  /** Rooms seen as attendees on the user's recent events (catalog fallback without admin access). */
  harvestRooms(daysBack: number): Promise<HarvestedRoom[]>;
}

export function overlaps(busy: BusyInterval[], start: string, end: string) {
  const s = Date.parse(start);
  const e = Date.parse(end);
  return busy.some((b) => Date.parse(b.start) < e && Date.parse(b.end) > s);
}
