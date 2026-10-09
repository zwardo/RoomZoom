import { z } from "zod";
import { type CalendarProvider, overlaps } from "@/lib/calendar/types";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import type { PersonalRooms } from "./personal";
import { type FloorSummary, type Point, ROOM_PRIORITIES, type RoomPriority, type RoomResult, type SearchResponse } from "./types";

/** A week of meetings for the Rooms tab grid, while keeping the query string well under header limits. */
const MAX_COVER = 60;

export const searchParamsSchema = z
  .object({
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
    dayStart: z.iso.datetime({ offset: true }).optional(),
    dayEnd: z.iso.datetime({ offset: true }).optional(),
    buildingId: z.string().optional(),
    floorId: z.string().optional(),
    minCapacity: z.coerce.number().int().min(0).optional(),
    features: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(",").filter(Boolean) : [])),
    availableOnly: z
      .string()
      .optional()
      .transform((v) => v === "1" || v === "true"),
    /** Room emails returned regardless of filters, e.g. the rooms already on the meeting. */
    include: z
      .string()
      .optional()
      .transform((v) => new Set(v ? v.split(",").filter(Boolean) : [])),
    /** Measure distances from this room instead of the desk. */
    fromRoomId: z.string().optional(),
    priority: z.enum(ROOM_PRIORITIES).optional(),
    /** Also return the user's favorite and recent rooms (the Rooms tab columns). */
    personal: z
      .string()
      .optional()
      .transform((v) => v === "1" || v === "true"),
    /** Meeting windows ("id~start~end", comma separated) to report each room's availability for. */
    cover: z
      .string()
      .optional()
      .transform((v, ctx) => {
        const windows = (v ? v.split(",").filter(Boolean) : []).map((w) => {
          const [id, start, end] = w.split("~");
          return { id, start, end };
        });
        if (windows.some((w) => !w.id || Number.isNaN(Date.parse(w.start)) || Number.isNaN(Date.parse(w.end)))) {
          ctx.addIssue({ code: "custom", message: "Invalid meeting windows" });
          return z.NEVER;
        }
        return windows.slice(0, MAX_COVER);
      }),
  })
  .refine((v) => Date.parse(v.end) > Date.parse(v.start), { message: "End must be after start", path: ["end"] })
  .refine((v) => Date.parse(v.end) - Date.parse(v.start) <= 12 * 3_600_000, {
    message: "Bookings are limited to 12 hours",
    path: ["end"],
  });

export type SearchParams = z.infer<typeof searchParamsSchema>;

export interface DistanceResolver {
  desk: SearchResponse["myDesk"];
  /** Set when distances start from another room (back-to-back meetings) instead of the desk. */
  fromRoom: SearchResponse["fromRoom"];
  measure(room: {
    floorId: string | null;
    buildingId: string;
    doors: Point[];
    polygon: Point[] | null;
  }): Pick<RoomResult, "distanceFt" | "distanceMethod" | "route">;
}

export function floorImageUrl(floor: { id: string; imagePath: string | null }) {
  return floor.imagePath ? `/api/floors/${floor.id}/image` : null;
}

export async function searchRooms(
  params: SearchParams,
  calendar: CalendarProvider,
  distance: DistanceResolver | null,
  personal: PersonalRooms | null = null,
): Promise<SearchResponse> {
  const allRooms = await db.room.findMany({
    include: { building: true, floor: true },
    orderBy: [{ building: { name: "asc" } }, { name: "asc" }],
  });

  const facetsBuildings = new Map<string, { id: string; name: string; floors: Map<string, string> }>();
  const facetsFeatures = new Set<string>();
  for (const r of allRooms) {
    const b = facetsBuildings.get(r.buildingId) ?? { id: r.buildingId, name: r.building.name, floors: new Map() };
    if (r.floor) b.floors.set(r.floor.id, r.floor.name);
    facetsBuildings.set(r.buildingId, b);
    parseJsonArray<string>(r.features).forEach((f) => facetsFeatures.add(f));
  }

  const favoriteIds = new Set(personal?.favoriteIds);
  const pinned = new Set([...params.include, ...(personal?.recentEmails ?? [])]);
  const matchesFilters = (r: (typeof allRooms)[number]) => {
    if (params.buildingId && r.buildingId !== params.buildingId) return false;
    if (params.floorId && r.floorId !== params.floorId) return false;
    // Unknown capacity isn't "too small": those rooms stay listed and sort after rooms known to fit.
    if (params.minCapacity && r.capacity != null && r.capacity < params.minCapacity) return false;
    const features = parseJsonArray<string>(r.features);
    return params.features.every((f) => features.includes(f));
  };
  const candidates = allRooms.filter((r) => pinned.has(r.resourceEmail) || favoriteIds.has(r.id) || matchesFilters(r));

  const dayStart = params.dayStart ?? new Date(Date.parse(params.start) - 4 * 3_600_000).toISOString();
  const dayEnd = params.dayEnd ?? new Date(Date.parse(params.end) + 4 * 3_600_000).toISOString();
  const times = [dayStart, params.start, dayEnd, params.end, ...params.cover.flatMap((w) => [w.start, w.end])].map(Date.parse);
  const freeBusy = candidates.length
    ? await calendar.freeBusy(
        candidates.map((r) => r.resourceEmail),
        new Date(Math.min(...times)).toISOString(),
        new Date(Math.max(...times)).toISOString(),
      )
    : {};

  let rooms: RoomResult[] = candidates.map((r) => {
    const fb = freeBusy[r.resourceEmail];
    const polygon = r.polygon ? parseJsonArray<Point>(r.polygon) : null;
    const doors = r.doors ? parseJsonArray<Point>(r.doors) : [];
    const available = !fb || fb.error ? null : !overlaps(fb.busy, params.start, params.end);
    const measured = distance?.measure({ floorId: r.floorId, buildingId: r.buildingId, doors, polygon });
    const readable = fb && !fb.error;
    return {
      matches: matchesFilters(r) && (!params.availableOnly || available === true),
      freeFor: params.cover.length && readable ? params.cover.filter((w) => !overlaps(fb.busy, w.start, w.end)).map((w) => w.id) : null,
      id: r.id,
      email: r.resourceEmail,
      name: r.name,
      generatedName: r.generatedName,
      buildingId: r.buildingId,
      buildingName: r.building.name,
      floorId: r.floorId,
      floorName: r.floor?.name ?? null,
      capacity: r.capacity,
      features: parseJsonArray<string>(r.features),
      polygon: polygon?.length ? polygon : null,
      doors,
      available,
      availabilityError: fb?.error ?? (fb ? undefined : "No free/busy data"),
      busy: (fb?.busy ?? []).filter((b) => overlaps([b], dayStart, dayEnd)),
      distanceFt: measured?.distanceFt ?? null,
      distanceMethod: measured?.distanceMethod ?? null,
      route: measured?.route,
    };
  });

  if (params.availableOnly) {
    rooms = rooms.filter((r) => r.available === true || pinned.has(r.email) || favoriteIds.has(r.id));
  }
  rooms.sort(compareRooms(params.minCapacity, params.priority));
  const idByEmail = new Map(rooms.map((r) => [r.email, r.id]));

  const floorIds = new Set(rooms.map((r) => r.floorId).filter((id): id is string => Boolean(id)));
  if (distance?.desk) floorIds.add(distance.desk.floorId);
  const floors = await db.floor.findMany({
    where: { id: { in: [...floorIds] } },
    include: { building: true },
    orderBy: [{ building: { name: "asc" } }, { level: "asc" }],
  });

  return {
    window: { start: params.start, end: params.end, dayStart, dayEnd },
    rooms,
    floors: floors.map(
      (f): FloorSummary => ({
        id: f.id,
        name: f.name,
        level: f.level,
        buildingId: f.buildingId,
        buildingName: f.building.name,
        imageUrl: floorImageUrl(f),
        imageTheme: f.imageTheme === "dark" ? "dark" : "light",
        widthPx: f.widthPx,
        heightPx: f.heightPx,
      }),
    ),
    facets: {
      buildings: [...facetsBuildings.values()].map((b) => ({
        id: b.id,
        name: b.name,
        floors: [...b.floors].map(([id, name]) => ({ id, name })).sort((a, z) => a.name.localeCompare(z.name, undefined, { numeric: true })),
      })),
      features: [...facetsFeatures].sort(),
    },
    myDesk: distance?.desk ?? null,
    fromRoom: distance?.fromRoom ?? null,
    favoriteIds: personal?.favoriteIds.filter((id) => rooms.some((r) => r.id === id)) ?? [],
    recentIds: personal?.recentEmails.map((e) => idByEmail.get(e)).filter((id): id is string => Boolean(id)) ?? [],
    coveredIds: params.cover.map((w) => w.id),
  };
}

/**
 * Available rooms first, then by the user's priority: nearest (ties go to the
 * smallest room that fits, so a 2-person meeting doesn't take the boardroom),
 * smallest that fits (ties go to the nearest), or name.
 */
export function compareRooms(minCapacity?: number, priority: RoomPriority = "nearest") {
  const rank = (a: boolean | null) => (a === true ? 0 : a === null ? 1 : 2);
  const distance = (a: RoomResult, b: RoomResult) => (a.distanceFt ?? Infinity) - (b.distanceFt ?? Infinity);
  const size = (a: RoomResult, b: RoomResult) =>
    priority === "smallest" || minCapacity ? (a.capacity ?? Infinity) - (b.capacity ?? Infinity) : 0;
  const order = priority === "smallest" ? [size, distance] : priority === "name" ? [] : [distance, size];
  return (a: RoomResult, b: RoomResult) =>
    rank(a.available) - rank(b.available) || order.reduce((d, cmp) => d || cmp(a, b), 0) || a.name.localeCompare(b.name);
}
