export interface ParsedRoomName {
  building?: string;
  floor?: string;
  section?: string;
  name: string;
  capacity?: number;
  features: string[];
}

/**
 * Parses Google's generated resource name format:
 *   `Building-Floor[-Section]-Name (Capacity) [Feature, Feature]`
 * e.g. "HQ-2-Oak (8) [TV, Whiteboard]" or "HQ-3-East-Maple (12)".
 *
 * With four or more dash-separated parts the third is treated as the section,
 * so room names that themselves contain dashes need a CSV `name` column.
 */
export function parseRoomName(raw: string): ParsedRoomName {
  let text = raw.trim();
  const features: string[] = [];
  let capacity: number | undefined;

  const featureMatch = text.match(/\[([^\]]*)\]\s*$/);
  if (featureMatch) {
    features.push(...splitFeatures(featureMatch[1]));
    text = text.slice(0, featureMatch.index).trim();
  }

  const capacityMatch = text.match(/\((\d+)\)\s*$/);
  if (capacityMatch) {
    capacity = Number(capacityMatch[1]);
    text = text.slice(0, capacityMatch.index).trim();
  }

  const parts = text.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return { name: text, capacity, features };

  const [building, floor, ...rest] = parts;
  if (rest.length >= 2) {
    const [section, ...nameParts] = rest;
    return { building, floor, section, name: nameParts.join("-"), capacity, features };
  }
  return { building, floor, name: rest[0], capacity, features };
}

export function splitFeatures(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(/[,;|]/)
    .map((f) => f.trim())
    .filter(Boolean);
}

/** "2" -> 2, "L3" -> 3, "Floor 4" -> 4, "G"/"Ground"/"Lobby" -> 0, "B1" -> -1. */
export function floorLevel(floorName: string): number {
  const name = floorName.trim().toLowerCase();
  const basement = name.match(/^(?:b|basement\s*)(\d+)$/);
  if (basement) return -Number(basement[1]);
  if (/^(g|ground|lobby|main)$/.test(name)) return 0;
  const digits = name.match(/-?\d+/);
  return digits ? Number(digits[0]) : 0;
}
