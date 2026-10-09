import type { Meeting } from "@/lib/calendar/types";
import type { RoomResult, SearchResponse } from "./types";

/** What a room's cell in a meeting's row of the Rooms tab shows. */
export type SlotStatus = "booked" | "available" | "busy" | "unknown";

/** Booked when the room is already on the meeting; otherwise whether it's free for the meeting's time. */
export function slotStatus(room: RoomResult, meeting: Pick<Meeting, "id" | "rooms">, coveredIds: ReadonlySet<string>): SlotStatus {
  const email = room.email.toLowerCase();
  if (meeting.rooms.some((r) => r.status !== "declined" && r.email.toLowerCase() === email)) return "booked";
  if (!room.freeFor || !coveredIds.has(meeting.id)) return "unknown";
  return room.freeFor.includes(meeting.id) ? "available" : "busy";
}

/**
 * Rooms tab columns: favorites (just-starred first, minus any just un-starred),
 * then rooms from recent meetings, then the best matches for the filters, with
 * best matches ranked by how many of the listed meetings they're free for.
 * Each room appears once.
 *
 * With a meeting selected, the rooms booked on it lead (whatever the filters),
 * then the best matches for it in search order (free for that meeting first),
 * then favorites and recent rooms.
 */
export function roomColumns(
  data: Pick<SearchResponse, "rooms" | "favoriteIds" | "recentIds">,
  {
    isFavorite,
    freeOnly,
    meeting,
  }: { isFavorite: (room: RoomResult) => boolean; freeOnly: boolean; meeting: Pick<Meeting, "rooms"> | null },
): RoomResult[] {
  const byId = new Map(data.rooms.map((r) => [r.id, r]));
  const byEmail = new Map(data.rooms.map((r) => [r.email.toLowerCase(), r]));
  const shown = (r: RoomResult | undefined): r is RoomResult => r !== undefined && (!freeOnly || r.available === true);

  const booked = (meeting?.rooms ?? [])
    .filter((r) => r.status !== "declined")
    .map((r) => byEmail.get(r.email.toLowerCase()))
    .filter((r) => r !== undefined);
  const taken = new Set(booked.map((r) => r.id));
  const saved = data.favoriteIds.map((id) => byId.get(id)).filter((r) => r !== undefined);
  const starred = data.rooms.filter((r) => isFavorite(r) && !data.favoriteIds.includes(r.id));
  const allFavorites = [...starred, ...saved.filter(isFavorite)].filter((r) => !taken.has(r.id));
  allFavorites.forEach((r) => taken.add(r.id));
  const recent = data.recentIds.filter((id) => !taken.has(id)).map((id) => byId.get(id)).filter(shown);
  recent.forEach((r) => taken.add(r.id));
  const best = data.rooms.filter((r) => r.matches && !taken.has(r.id));
  const personal = [...allFavorites.filter(shown), ...recent];
  if (meeting) return [...booked, ...best, ...personal];

  best.sort((a, b) => (b.freeFor?.length ?? 0) - (a.freeFor?.length ?? 0));
  return [...personal, ...best];
}
