import { readFileSync } from "node:fs";
import { upsertAssignments } from "@/lib/desks/assignments";
import { parseDesksCsv } from "@/lib/rooms/csv";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run import:desks -- path/to/desks.csv   (columns: email, desk, [name], [building], [floor])");
  process.exit(1);
}

const { rows, errors } = parseDesksCsv(readFileSync(file, "utf8"));
errors.forEach((e) => console.warn(`  ! ${e}`));
const result = await upsertAssignments(rows);
result.unmatched.forEach((u) => console.warn(`  ? No desk drawn with this label yet: ${u}`));
console.log(`Desk assignments: ${result.saved} saved, ${errors.length} skipped, ${result.unmatched.length} not on a map yet.`);
