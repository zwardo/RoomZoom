import { db } from "@/lib/db";
import type { DeskAssignmentInput } from "@/lib/rooms/csv";

/**
 * Upserts person-to-desk assignments. Labels that don't match any desk drawn
 * on a floor yet are still saved (they resolve once the floor is imported) and
 * reported back so typos are easy to spot.
 */
export async function upsertAssignments(rows: DeskAssignmentInput[]) {
  const known = new Set((await db.desk.findMany({ select: { label: true } })).map((d) => d.label));
  const unmatched: string[] = [];
  for (const row of rows) {
    const data = {
      name: row.name ?? null,
      deskLabel: row.deskLabel,
      buildingName: row.buildingName ?? null,
      floorName: row.floorName ?? null,
    };
    await db.person.upsert({ where: { email: row.email }, create: { email: row.email, ...data }, update: data });
    if (!known.has(row.deskLabel)) unmatched.push(`${row.email} → ${row.deskLabel}`);
  }
  return { saved: rows.length, unmatched };
}
