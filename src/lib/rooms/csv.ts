import Papa from "papaparse";
import { completeFromName, type RoomInput } from "./catalog";
import { splitFeatures } from "./parse-room-name";

export interface CsvResult<T> {
  rows: T[];
  errors: string[];
}

function readCsv(text: string) {
  return Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ""),
    transform: (v) => v.trim(),
  });
}

/**
 * Columns (case-insensitive): email (required), name, building, floor, capacity, features.
 * `features` is separated by `;`, `,` or `|`. Missing building/floor/capacity/features
 * are parsed from `name` if it follows Google's "HQ-2-Oak (8) [TV]" format.
 */
export function parseRoomsCsv(text: string): CsvResult<RoomInput> {
  const parsed = readCsv(text);
  const errors = parsed.errors.map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`);
  const rows: RoomInput[] = [];

  parsed.data.forEach((row, i) => {
    const line = i + 2;
    const email = row.email || row.resourceemail;
    if (!email?.includes("@")) {
      errors.push(`Row ${line}: missing or invalid email`);
      return;
    }
    const capacity = row.capacity ? Number(row.capacity) : undefined;
    const room = completeFromName({
      resourceEmail: email,
      name: row.name,
      generatedName: row.generatedname || (row.name?.includes("-") ? row.name : undefined),
      building: row.building,
      floor: row.floor,
      capacity: Number.isFinite(capacity) ? capacity : undefined,
      features: splitFeatures(row.features),
      source: "csv",
    });
    if (!room) {
      errors.push(`Row ${line}: couldn't determine building and floor for ${email}`);
      return;
    }
    rows.push(room);
  });

  return { rows, errors };
}

export interface DeskAssignmentInput {
  email: string;
  name?: string;
  deskLabel: string;
  buildingName?: string;
  floorName?: string;
}

/** Columns: email, desk (or desklabel), optional name, building, floor. */
export function parseDesksCsv(text: string): CsvResult<DeskAssignmentInput> {
  const parsed = readCsv(text);
  const errors = parsed.errors.map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`);
  const rows: DeskAssignmentInput[] = [];

  parsed.data.forEach((row, i) => {
    const email = row.email?.toLowerCase();
    const deskLabel = row.desk || row.desklabel || row.deskid;
    if (!email?.includes("@") || !deskLabel) {
      errors.push(`Row ${i + 2}: needs email and desk`);
      return;
    }
    rows.push({
      email,
      name: row.name || undefined,
      deskLabel,
      buildingName: row.building || undefined,
      floorName: row.floor || undefined,
    });
  });

  return { rows, errors };
}
