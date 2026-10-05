import type { BusyInterval } from "@/lib/calendar/types";

export type Point = [number, number];

export type DistanceMethod = "walking" | "straight" | "estimate";

/** How to order rooms after availability. */
export const ROOM_PRIORITIES = ["nearest", "smallest", "name"] as const;
export type RoomPriority = (typeof ROOM_PRIORITIES)[number];

export interface RoomResult {
  id: string;
  email: string;
  name: string;
  generatedName: string | null;
  buildingId: string;
  buildingName: string;
  floorId: string | null;
  floorName: string | null;
  capacity: number | null;
  features: string[];
  polygon: Point[] | null;
  door: Point | null;
  /** null when free/busy couldn't be read for this room. */
  available: boolean | null;
  availabilityError?: string;
  /** Busy blocks across the whole day of the requested window (for the timeline). */
  busy: BusyInterval[];
  distanceFt: number | null;
  distanceMethod: DistanceMethod | null;
  /** Walking route in floor pixel space, per floor, when computed on the nav graph. */
  route?: { floorId: string; points: Point[] }[];
  /** False for rooms returned only because they're favorites, recent, or on the meeting. */
  matches: boolean;
  /** Ids of the requested meeting windows this room is free for; null when not asked or unreadable. */
  freeFor: string[] | null;
}

/** Where a meeting's booked room is, relative to the viewer's desk. */
export interface RoomLocation {
  roomId: string;
  buildingName: string;
  floorId: string | null;
  floorName: string | null;
  capacity: number | null;
  distanceFt: number | null;
  distanceMethod: DistanceMethod | null;
}

/** How a floor's background image is drawn: "light" plans get inverted onto the dark map. */
export type FloorImageTheme = "light" | "dark";

export interface FloorSummary {
  id: string;
  name: string;
  level: number;
  buildingId: string;
  buildingName: string;
  imageUrl: string | null;
  imageTheme: FloorImageTheme;
  widthPx: number;
  heightPx: number;
}

export interface MyDesk {
  label: string;
  floorId: string;
  buildingId: string;
  x: number;
  y: number;
}

export interface SearchResponse {
  window: { start: string; end: string; dayStart: string; dayEnd: string };
  rooms: RoomResult[];
  floors: FloorSummary[];
  facets: {
    buildings: { id: string; name: string; floors: { id: string; name: string }[] }[];
    features: string[];
  };
  myDesk: MyDesk | null;
  /** The room distances were measured from, when not the desk. */
  fromRoom: { id: string; name: string } | null;
  /** The user's starred rooms and recently used rooms (ids, in display order); empty unless requested. */
  favoriteIds: string[];
  recentIds: string[];
  /** Meeting ids from the requested windows that `freeFor` was checked against (the list is capped). */
  coveredIds: string[];
}
