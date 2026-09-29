import { db } from "@/lib/db";
import { floorLevel, parseRoomName } from "./parse-room-name";

export type RoomSource = "csv" | "directory" | "harvest" | "seed";

export interface RoomInput {
  resourceEmail: string;
  name: string;
  generatedName?: string | null;
  building: string;
  googleBuildingId?: string | null;
  floor: string;
  capacity?: number | null;
  features: string[];
  source: RoomSource;
}

/** Fills building/floor/capacity/features from Google's generated name when missing. */
export function completeFromName(input: Partial<RoomInput> & { resourceEmail: string }): RoomInput | null {
  const parsed = parseRoomName(input.generatedName ?? input.name ?? "");
  const building = input.building || parsed.building;
  const floor = input.floor || parsed.floor;
  if (!building || !floor) return null;
  return {
    resourceEmail: input.resourceEmail.toLowerCase(),
    name: input.name && input.name !== input.generatedName ? input.name : parsed.name,
    generatedName: input.generatedName ?? null,
    building,
    googleBuildingId: input.googleBuildingId ?? null,
    floor,
    capacity: input.capacity ?? parsed.capacity ?? null,
    features: input.features?.length ? input.features : parsed.features,
    source: input.source ?? "csv",
  };
}

export async function ensureFloor(buildingName: string, floorName: string, googleBuildingId?: string | null) {
  const building = await db.building.upsert({
    where: { name: buildingName },
    create: { name: buildingName, googleBuildingId: googleBuildingId ?? null },
    update: googleBuildingId ? { googleBuildingId } : {},
  });
  const floor = await db.floor.upsert({
    where: { buildingId_name: { buildingId: building.id, name: floorName } },
    create: { buildingId: building.id, name: floorName, level: floorLevel(floorName) },
    update: {},
  });
  return { building, floor };
}

/** Upserts rooms, preserving any map annotations (polygon/door) already drawn. */
export async function upsertRooms(rooms: RoomInput[]) {
  let created = 0;
  let updated = 0;
  for (const room of rooms) {
    const { building, floor } = await ensureFloor(room.building, room.floor, room.googleBuildingId);
    const data = {
      name: room.name,
      generatedName: room.generatedName ?? null,
      buildingId: building.id,
      floorId: floor.id,
      capacity: room.capacity ?? null,
      features: JSON.stringify(room.features),
      source: room.source,
    };
    const existing = await db.room.findUnique({ where: { resourceEmail: room.resourceEmail } });
    if (existing) {
      await db.room.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await db.room.create({ data: { ...data, resourceEmail: room.resourceEmail } });
      created++;
    }
  }
  return { created, updated };
}
