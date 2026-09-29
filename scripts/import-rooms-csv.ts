import { readFileSync } from "node:fs";
import { upsertRooms } from "@/lib/rooms/catalog";
import { parseRoomsCsv } from "@/lib/rooms/csv";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run import:rooms -- path/to/rooms.csv");
  process.exit(1);
}

const { rows, errors } = parseRoomsCsv(readFileSync(file, "utf8"));
errors.forEach((e) => console.warn(`  ! ${e}`));
const result = await upsertRooms(rows);
console.log(`Rooms imported: ${result.created} created, ${result.updated} updated, ${errors.length} skipped.`);
