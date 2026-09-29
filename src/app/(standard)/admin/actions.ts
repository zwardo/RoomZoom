"use server";

import { revalidatePath } from "next/cache";
import { getCalendar } from "@/lib/calendar";
import { db } from "@/lib/db";
import { upsertAssignments } from "@/lib/desks/assignments";
import { completeFromName, type RoomInput, upsertRooms } from "@/lib/rooms/catalog";
import { parseDesksCsv, parseRoomsCsv } from "@/lib/rooms/csv";
import { getCurrentUser, isAdmin } from "@/lib/session";

export interface ActionResult {
  ok: boolean;
  message: string;
  details: string[];
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("Admin only");
  return user;
}

export async function importRoomsAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const { rows, errors } = parseRoomsCsv(String(form.get("csv") ?? ""));
  if (!rows.length) return { ok: false, message: "No valid rows found.", details: errors };
  const result = await upsertRooms(rows);
  revalidatePath("/admin");
  return { ok: true, message: `${result.created} rooms created, ${result.updated} updated.`, details: errors };
}

export async function importDesksAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const { rows, errors } = parseDesksCsv(String(form.get("csv") ?? ""));
  if (!rows.length) return { ok: false, message: "No valid rows found.", details: errors };
  const result = await upsertAssignments(rows);
  revalidatePath("/admin");
  return {
    ok: true,
    message: `${result.saved} desk assignments saved.`,
    details: [...errors, ...result.unmatched.map((u) => `No desk drawn with this label yet: ${u}`)],
  };
}

/** Adds rooms seen on the admin's own calendar events. Existing rooms are left untouched. */
export async function harvestRoomsAction(): Promise<ActionResult> {
  const user = await requireAdmin();
  const harvested = await (await getCalendar(user)).harvestRooms(180);
  const existing = new Set((await db.room.findMany({ select: { resourceEmail: true } })).map((r) => r.resourceEmail));
  const fresh: RoomInput[] = [];
  const skipped: string[] = [];
  for (const h of harvested) {
    if (existing.has(h.email)) continue;
    const room = completeFromName({ resourceEmail: h.email, name: h.displayName, generatedName: h.displayName, source: "harvest" });
    if (room) fresh.push(room);
    else skipped.push(`${h.displayName}: name doesn't follow Building-Floor-Name, add it by CSV`);
  }
  const result = await upsertRooms(fresh);
  revalidatePath("/admin");
  return {
    ok: true,
    message: `Found ${harvested.length} rooms on your calendar; ${result.created} were new.`,
    details: skipped,
  };
}
