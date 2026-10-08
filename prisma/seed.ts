import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { upsertAssignments } from "@/lib/desks/assignments";
import { applyFloorAnnotation } from "@/lib/floors/apply";
import { floorImageName, saveFloorImage } from "@/lib/floors/storage";
import { parseFloorSvg, stripAnnotations } from "@/lib/floors/svg-annotations";
import { upsertRooms } from "@/lib/rooms/catalog";
import { parseDesksCsv, parseRoomsCsv } from "@/lib/rooms/csv";
import type { FloorImageTheme } from "@/lib/rooms/types";

const samples = path.join(process.cwd(), "data", "samples");
const floors = path.join(process.cwd(), "prisma", "floors");

// Earlier seeds created a generated "HQ" demo building; the real floors replace it.
const retired = await db.building.deleteMany({ where: { name: "HQ" } });
if (retired.count) console.log("Removed the HQ demo building");

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

// building-<n>-<floor>.svg, already drawn in the app's dark palette.
for (const file of readdirSync(floors).sort()) {
  const [, building, floor] = file.match(/^building-(\d+)-(\d+)\.svg$/) ?? [];
  if (!building) continue;
  const svg = readFileSync(path.join(floors, file), "utf8");
  await seedFloor(`Building ${building}`, floor, stripAnnotations(svg), svg, "dark");
}

const desks = parseDesksCsv(readFileSync(path.join(samples, "desks.csv"), "utf8"));
const deskResult = await upsertAssignments(desks.rows);
console.log(`Desk assignments: ${deskResult.saved} saved${deskResult.unmatched.length ? `, unmatched: ${deskResult.unmatched.join(", ")}` : ""}`);

// Real seating charts hold employee names and emails, so they live in the gitignored data/private/.
const privateDesks = path.join(process.cwd(), "data", "private", "desks.csv");
if (existsSync(privateDesks)) {
  const real = parseDesksCsv(readFileSync(privateDesks, "utf8"));
  const realResult = await upsertAssignments(real.rows);
  console.log(
    `Desk assignments from data/private: ${realResult.saved} saved, ${real.errors.length} warnings, ${realResult.unmatched.length} not on a map`,
  );
}

await db.$disconnect();
