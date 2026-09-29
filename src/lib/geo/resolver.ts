import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { DistanceResolver } from "@/lib/rooms/search";
import type { MyDesk, Point } from "@/lib/rooms/types";
import { parseJsonArray } from "@/lib/utils";
import { centroid, createDistanceMeasurer } from "./distance";

/** The user's assigned desk, resolved by label (plus optional building/floor hints). */
export async function findMyDesk(email: string): Promise<MyDesk | null> {
  const person = await db.person.findUnique({ where: { email: email.toLowerCase() } });
  if (!person) return null;
  const desks = await db.desk.findMany({
    where: { label: person.deskLabel },
    include: { floor: { include: { building: true } } },
  });
  const desk =
    desks.find(
      (d) =>
        (!person.buildingName || d.floor.building.name === person.buildingName) &&
        (!person.floorName || d.floor.name === person.floorName),
    ) ?? null;
  if (!desk) return null;
  return { label: desk.label, floorId: desk.floorId, buildingId: desk.floor.buildingId, x: desk.x, y: desk.y };
}

/** Where a room's walking distance is measured from: its door, else the middle of its outline. */
function roomPoint(room: { doorX: number | null; doorY: number | null; polygon: string | null }): Point | null {
  if (room.doorX != null && room.doorY != null) return [room.doorX, room.doorY];
  const polygon = room.polygon ? parseJsonArray<Point>(room.polygon) : [];
  return polygon.length ? centroid(polygon) : null;
}

/**
 * Measures distances from the user's desk, or from `fromRoomId` when the user
 * is coming straight from another meeting (falls back to the desk if that room
 * isn't on a mapped floor).
 */
export async function getDistanceResolver(email: string, opts: { fromRoomId?: string } = {}): Promise<DistanceResolver | null> {
  const desk = await findMyDesk(email);
  const fromRoom = opts.fromRoomId
    ? await db.room.findUnique({ where: { id: opts.fromRoomId }, include: { floor: true } })
    : null;
  const fromPoint = fromRoom?.floor ? roomPoint(fromRoom) : null;
  const origin =
    fromRoom?.floor && fromPoint
      ? { floorId: fromRoom.floor.id, buildingId: fromRoom.buildingId, x: fromPoint[0], y: fromPoint[1] }
      : desk;
  if (!origin) return null;

  const floors = await db.floor.findMany({
    where: { buildingId: origin.buildingId },
    select: { id: true, buildingId: true, level: true, feetPerPixel: true },
  });
  const nodes = await db.navNode.findMany({
    where: { floorId: { in: floors.map((f) => f.id) } },
    select: { id: true, floorId: true, x: true, y: true, connectorKey: true },
  });
  const edges = await db.navEdge.findMany({
    where: { fromId: { in: nodes.map((n) => n.id) } },
    select: { fromId: true, toId: true },
  });

  const measure = createDistanceMeasurer({
    from: origin,
    floors,
    nodes,
    edges,
    floorChangePenaltyFt: env.floorChangePenaltyFt,
  });

  return {
    desk,
    fromRoom: origin === desk || !fromRoom ? null : { id: fromRoom.id, name: fromRoom.name },
    measure(room) {
      if (!room.floorId) return { distanceFt: null, distanceMethod: null };
      const point = room.door ?? (room.polygon?.length ? centroid(room.polygon) : null);
      return measure(point ? { floorId: room.floorId, x: point[0], y: point[1] } : null);
    },
  };
}
