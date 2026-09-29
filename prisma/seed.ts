import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { upsertAssignments } from "@/lib/desks/assignments";
import { applyFloorAnnotation } from "@/lib/floors/apply";
import { floorImageName, saveFloorImage } from "@/lib/floors/storage";
import { parseFloorSvg } from "@/lib/floors/svg-annotations";
import { upsertRooms } from "@/lib/rooms/catalog";
import { parseDesksCsv, parseRoomsCsv } from "@/lib/rooms/csv";
import { demoAnnotation, demoDrawing, demoFloorNames } from "./demo-floors";

const samples = path.join(process.cwd(), "data", "samples");

const rooms = parseRoomsCsv(readFileSync(path.join(samples, "rooms.csv"), "utf8"));
const roomResult = await upsertRooms(rooms.rows.map((r) => ({ ...r, source: "seed" as const })));
console.log(`Rooms: ${roomResult.created} created, ${roomResult.updated} updated`);

for (const floor of demoFloorNames()) {
  const imagePath = await saveFloorImage(floorImageName("HQ", floor, ".svg"), { bytes: demoDrawing(floor) });
  const result = await applyFloorAnnotation({
    buildingName: "HQ",
    floorName: floor,
    annotation: parseFloorSvg(demoAnnotation(floor)),
    imagePath,
  });
  console.log(
    `Floor HQ ${floor}: ${result.roomsMapped.length} rooms, ${result.desks} desks, ${result.navNodes} hallway nodes, ${result.feetPerPixel} ft/px`,
  );
  if (result.roomsUnmatched.length) console.warn(`  ! unmatched rooms: ${result.roomsUnmatched.join(", ")}`);
}

const desks = parseDesksCsv(readFileSync(path.join(samples, "desks.csv"), "utf8"));
const deskResult = await upsertAssignments(desks.rows);
console.log(`Desk assignments: ${deskResult.saved} saved${deskResult.unmatched.length ? `, unmatched: ${deskResult.unmatched.join(", ")}` : ""}`);

await db.$disconnect();
