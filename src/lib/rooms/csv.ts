import Papa from "papaparse";
import { completeFromName, type RoomInput } from "./catalog";
import { splitFeatures } from "./parse-room-name";

export interface CsvResult<T> {
  rows: T[];
  errors: string[];
}

const headerKey = (h: string) => h.trim().toLowerCase().replace(/[\s_-]+/g, "");

function readCsv(text: string) {
  return Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: headerKey,
    transform: (v) => v.trim(),
  });
}

/**
 * Like `readCsv`, but for spreadsheet exports: the header is the first row that
 * passes `isHeader` (title rows above it are ignored), a repeated column name
 * keeps its first column, and `line` is the spreadsheet row number.
 */
function readSheet(text: string, isHeader: (keys: string[]) => boolean) {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const errors = parsed.errors.map((e) => `Row ${(e.row ?? 0) + 1}: ${e.message}`);
  const start = parsed.data.findIndex((cells) => isHeader(cells.map(headerKey)));
  if (start < 0) return { rows: [], errors };
  const columns = new Map<string, number>();
  parsed.data[start].forEach((h, i) => {
    const key = headerKey(h);
    if (key && !columns.has(key)) columns.set(key, i);
  });
  const rows = parsed.data
    .map((cells, i) => ({
      line: i + 1,
      row: Object.fromEntries([...columns].map(([key, i]) => [key, cells[i]?.trim() ?? ""])) as Record<string, string>,
    }))
    .slice(start + 1)
    .filter(({ row }) => Object.values(row).some(Boolean));
  return { rows, errors };
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

const DESK_COLUMNS = ["desk", "desklabel", "deskid"];
/** Seating-chart entries that mark a desk as unassigned rather than naming a person. */
const UNASSIGNED = /^(vacant|no cube|hot desk|split desk)?$/i;

/** "Aro Buckstein Intern" -> "Aro Buckstein", "Split Desk Matt Lee RDP" -> "Matt Lee". */
function cleanPersonName(name: string) {
  return name
    .replace(/^split desk\b/i, "")
    .replace(/\(?\b(intern|rdp)\b\)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when part of the name ("Curtis Warner") shows up in the address ("curtis_warner@"). */
function nameFitsEmail(name: string, email: string) {
  const local = email.split("@")[0].replace(/[^a-z]/g, "");
  return name
    .toLowerCase()
    .split(/[^a-z]+/)
    .some((token) => token.length >= 3 && local.includes(token));
}

/**
 * Columns: email (or employee email), desk (or desklabel), optional name, building,
 * floor, and location ("B1L2" = Building 1, floor 2). Title rows above the header
 * are skipped, so a seating-chart export can be pasted as is. Desks marked
 * vacant/no cube/hot desk are skipped. An email listed at several desks keeps the
 * desk whose row names that person; an email shared by different people (e.g. a
 * "reserved@" placeholder) is skipped.
 */
export function parseDesksCsv(text: string): CsvResult<DeskAssignmentInput> {
  const sheet = readSheet(text, (keys) => DESK_COLUMNS.some((k) => keys.includes(k)));
  const errors = [...sheet.errors];
  const byEmail = new Map<string, DeskAssignmentInput[]>();

  for (const { line, row } of sheet.rows) {
    const deskLabel = row.desk || row.desklabel || row.deskid;
    const rawName = row.name || row.employeename || "";
    const email = (row.email || row.employeeemail || "").toLowerCase();
    if (deskLabel && UNASSIGNED.test(rawName) && (rawName || !email)) continue;
    if (!email.includes("@") || !deskLabel) {
      errors.push(`Row ${line}: needs email and desk${rawName ? ` (${rawName}${deskLabel ? ` at ${deskLabel}` : ""})` : ""}`);
      continue;
    }
    const location = row.location?.match(/^B(\d+)\s*L(\d+)$/i);
    const entry = {
      email,
      name: cleanPersonName(rawName) || undefined,
      deskLabel,
      buildingName: row.building || (location ? `Building ${location[1]}` : undefined),
      floorName: row.floor || location?.[2] || undefined,
    };
    byEmail.set(email, [...(byEmail.get(email) ?? []), entry]);
  }

  const rows: DeskAssignmentInput[] = [];
  for (const [email, entries] of byEmail) {
    const desks = entries.map((e) => e.deskLabel).join(", ");
    const named = entries.filter((e) => e.name && nameFitsEmail(e.name, email));
    const samePerson = new Set(entries.map((e) => e.name)).size === 1;
    const chosen = named[0] ?? (samePerson ? entries[0] : undefined);
    if (!chosen) {
      errors.push(`${email} is listed for ${entries.length} different people (${desks}); skipped`);
      continue;
    }
    if (entries.length > 1) errors.push(`${email} is listed at ${entries.length} desks (${desks}); using ${chosen.deskLabel}`);
    rows.push(chosen);
  }

  return { rows, errors };
}
