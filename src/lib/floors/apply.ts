import { db } from "@/lib/db";
import { ensureFloor } from "@/lib/rooms/catalog";
import type { FloorImageTheme } from "@/lib/rooms/types";
import { buildNavGraph, type FloorAnnotation } from "./svg-annotations";

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface ApplyFloorResult {
  floorId: string;
  feetPerPixel: number | null;
  roomsMapped: string[];
  roomsUnmatched: string[];
  desks: number;
  navNodes: number;
  navEdges: number;
}

/**
 * Replaces everything drawn on one floor (room outlines, desks, hallway graph)
 * with the contents of an annotated SVG. Rooms are matched within the building
 * by email, email name, room name, or Google's generated name.
 */
export async function applyFloorAnnotation(opts: {
  buildingName: string;
  floorName: string;
  annotation: FloorAnnotation;
  imagePath: string | null;
  /** Defaults to "light" whenever a new image is given. */
  imageTheme?: FloorImageTheme;
  feetPerPixel?: number | null;
  navTolerancePx?: number;
}): Promise<ApplyFloorResult> {
  const { annotation: a } = opts;
  const { building, floor } = await ensureFloor(opts.buildingName, opts.floorName);
  const feetPerPixel = opts.feetPerPixel ?? (a.scale ? a.scale.feet / a.scale.lengthPx : floor.feetPerPixel);

  await db.floor.update({
    where: { id: floor.id },
    data: {
      widthPx: Math.round(a.width),
      heightPx: Math.round(a.height),
      feetPerPixel: feetPerPixel ?? null,
      ...(opts.imagePath ? { imagePath: opts.imagePath, imageTheme: opts.imageTheme ?? "light" } : {}),
    },
  });

  const rooms = await db.room.findMany({ where: { buildingId: building.id } });
  const byKey = new Map<string, (typeof rooms)[number]>();
  for (const r of rooms) {
    for (const k of [r.resourceEmail, r.resourceEmail.split("@")[0], r.name, r.generatedName ?? ""]) {
      if (k && !byKey.has(normalize(k))) byKey.set(normalize(k), r);
    }
  }
  // Mountain rooms may be drawn without their title, e.g. room-whitney for "Mt. Whitney".
  for (const r of rooms) {
    const short = normalize(r.name.replace(/^(mt\.?|mount)\s+/i, ""));
    if (short && !byKey.has(short)) byKey.set(short, r);
  }

  const mapped = new Set<string>();
  const roomsMapped: string[] = [];
  const roomsUnmatched: string[] = [];
  for (const drawn of a.rooms) {
    const room = byKey.get(normalize(drawn.key));
    if (!room) {
      roomsUnmatched.push(drawn.key);
      continue;
    }
    mapped.add(room.id);
    roomsMapped.push(room.name);
    await db.room.update({
      where: { id: room.id },
      data: {
        floorId: floor.id,
        polygon: drawn.polygon ? JSON.stringify(drawn.polygon) : null,
        doors: drawn.doors.length ? JSON.stringify(drawn.doors) : null,
      },
    });
  }
  // Rooms removed from the drawing lose their outline but stay bookable.
  await db.room.updateMany({
    where: { floorId: floor.id, id: { notIn: [...mapped] } },
    data: { polygon: null, doors: null },
  });

  await db.desk.deleteMany({ where: { floorId: floor.id } });
  const uniqueDesks = [...new Map(a.desks.map((d) => [d.label, d])).values()];
  if (uniqueDesks.length) {
    await db.desk.createMany({ data: uniqueDesks.map((d) => ({ floorId: floor.id, label: d.label, x: d.x, y: d.y })) });
  }

  await db.navNode.deleteMany({ where: { floorId: floor.id } });
  const graph = buildNavGraph(a.halls, a.connectors, opts.navTolerancePx);
  const ids: string[] = [];
  for (const n of graph.nodes) {
    const created = await db.navNode.create({ data: { floorId: floor.id, ...n } });
    ids.push(created.id);
  }
  if (graph.edges.length) {
    await db.navEdge.createMany({ data: graph.edges.map(([from, to]) => ({ fromId: ids[from], toId: ids[to] })) });
  }

  return {
    floorId: floor.id,
    feetPerPixel: feetPerPixel ?? null,
    roomsMapped,
    roomsUnmatched,
    desks: uniqueDesks.length,
    navNodes: graph.nodes.length,
    navEdges: graph.edges.length,
  };
}
