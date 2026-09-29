import type { CalendarProvider } from "@/lib/calendar/types";
import { db } from "@/lib/db";

const RECENT_DAYS_BACK = 30;
const RECENT_DAYS_AHEAD = 7;
const RECENT_LIMIT = 8;

export interface PersonalRooms {
  /** Starred room ids, newest first. */
  favoriteIds: string[];
  /** Room emails from the user's meetings, most recently used first. */
  recentEmails: string[];
}

/**
 * Favorites from the database, and "recent" rooms read off the calendar: rooms
 * on the user's meetings over the last month (latest first), then the rooms
 * already booked for the coming week.
 */
export async function loadPersonalRooms(email: string, calendar: CalendarProvider): Promise<PersonalRooms> {
  const now = Date.now();
  const [favorites, meetings] = await Promise.all([
    db.favoriteRoom.findMany({ where: { userEmail: email.toLowerCase() }, orderBy: { createdAt: "desc" } }),
    calendar.listBetween(
      new Date(now - RECENT_DAYS_BACK * 86_400_000).toISOString(),
      new Date(now + RECENT_DAYS_AHEAD * 86_400_000).toISOString(),
    ),
  ]);
  const past = meetings.filter((m) => Date.parse(m.start) <= now).reverse();
  const upcoming = meetings.filter((m) => Date.parse(m.start) > now);
  const recentEmails = [
    ...new Set([...past, ...upcoming].flatMap((m) => m.rooms.filter((r) => r.status !== "declined").map((r) => r.email.toLowerCase()))),
  ];
  return { favoriteIds: favorites.map((f) => f.roomId), recentEmails: recentEmails.slice(0, RECENT_LIMIT) };
}
