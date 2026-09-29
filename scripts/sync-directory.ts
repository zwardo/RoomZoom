import { fetchDirectoryRooms } from "@/lib/google/directory";
import { upsertRooms } from "@/lib/rooms/catalog";

const { rooms, skipped } = await fetchDirectoryRooms();
skipped.forEach((name) => console.warn(`  ! No building/floor for ${name}, skipped`));
const result = await upsertRooms(rooms);
console.log(`Directory sync: ${result.created} created, ${result.updated} updated, ${skipped.length} skipped.`);
