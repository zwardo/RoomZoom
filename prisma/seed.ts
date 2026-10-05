import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { upsertAssignments } from "@/lib/desks/assignments";
import { applyFloorAnnotation } from "@/lib/floors/apply";
import { floorImageName, saveFloorImage } from "@/lib/floors/storage";
import { parseFloorSvg, stripAnnotations } from "@/lib/floors/svg-annotations";
import { upsertRooms } from "@/lib/rooms/catalog";
import { parseDesksCsv, parseRoomsCsv } from "@/lib/rooms/csv";
import type { FloorImageTheme } from "@/lib/rooms/types";
import { demoAnnotation, demoDrawing, demoFloorNames } from "./demo-floors";

const samples = path.join(process.cwd(), "data", "samples");

const rooms = parseRoomsCsv(readFileSync(path.join(samples, "rooms.csv"), "utf8"));
const roomResult = await upsertRooms(rooms.rows.map((r) => ({ ...r, source: "seed" as const })));
console.log(`Rooms: ${roomResult.created} created, ${roomResult.updated} updated`);

async function seedFloor(building: string, floor: string, drawing: string, annotation: string, imageTheme: FloorImageTheme) {
  const imagePath = await saveFloorImage(floorImageName(building, floor, ".svg"), { bytes: drawing });
  const result = await applyFloorAnnotation({
    buildingName: building,
    floorName: floor,
    annotation: parseFloorSvg(annotation),
    imagePath,
    imageTheme,
  });
  console.log(
    `Floor ${building} ${floor}: ${result.roomsMapped.length} rooms, ${result.desks} desks, ${result.navNodes} hallway nodes, ${result.feetPerPixel} ft/px`,
  );
  if (result.roomsUnmatched.length) console.warn(`  ! unmatched rooms: ${result.roomsUnmatched.join(", ")}`);
}

for (const floor of demoFloorNames()) {
  await seedFloor("HQ", floor, demoDrawing(floor), demoAnnotation(floor), "dark");
}

// Traced from the Figma plan, already drawn in the app's dark palette.
const building2 = readFileSync(path.join(process.cwd(), "prisma", "floors", "building-2-4.svg"), "utf8");
await seedFloor("Building 2", "4", stripAnnotations(building2), building2, "dark");

const desks = parseDesksCsv(readFileSync(path.join(samples, "desks.csv"), "utf8"));
const deskResult = await upsertAssignments(desks.rows);
console.log(`Desk assignments: ${deskResult.saved} saved${deskResult.unmatched.length ? `, unmatched: ${deskResult.unmatched.join(", ")}` : ""}`);

await db.$disconnect();
