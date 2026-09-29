import type { OcrWord } from "./vision";

export const DEFAULT_DESK_PATTERN = /^[A-Z]{0,2}\d{1,2}[-.]?\d{2,3}[A-Z]?$/i;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const idSafe = (s: string) => s.replace(/[^\w.@-]+/g, "_");
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * A starting point for annotating a floor: the scan as background, every OCR'd
 * word as a faint reference label, desks pre-placed where their labels are,
 * and placeholder room outlines around labels that match known room names.
 * Open it in Inkscape or Figma, fix outlines, draw halls, then import it.
 */
export function buildStarterSvg(opts: {
  imageHref: string;
  width: number;
  height: number;
  words: OcrWord[];
  deskPattern?: RegExp;
  roomNames?: string[];
}) {
  const { width: w, height: h, words } = opts;
  const deskPattern = opts.deskPattern ?? DEFAULT_DESK_PATTERN;
  const unit = Math.max(w, h) / 200;
  const rooms = new Map((opts.roomNames ?? []).map((n) => [norm(n), n]));

  const desks: string[] = [];
  const roomRects: string[] = [];
  const seenDesks = new Set<string>();
  const seenRooms = new Set<string>();
  for (const word of words) {
    const cx = word.x + word.width / 2;
    const cy = word.y + word.height / 2;
    if (deskPattern.test(word.text) && !seenDesks.has(word.text)) {
      seenDesks.add(word.text);
      desks.push(`    <circle id="desk-${esc(idSafe(word.text))}" cx="${cx}" cy="${cy}" r="${unit * 1.5}" fill="#f97316" fill-opacity="0.7"/>`);
    }
    const room = rooms.get(norm(word.text));
    if (room && !seenRooms.has(room)) {
      seenRooms.add(room);
      const pad = unit * 6;
      roomRects.push(
        `    <rect id="room-${esc(idSafe(room))}" x="${word.x - pad}" y="${word.y - pad}" width="${word.width + pad * 2}" height="${word.height + pad * 2}" fill="#22c55e" fill-opacity="0.25" stroke="#16a34a"/>`,
      );
    }
  }

  const labels = words.map(
    (word) =>
      `    <text x="${word.x}" y="${word.y + word.height}" font-size="${Math.max(word.height, 1)}" fill="#dc2626" fill-opacity="0.6">${esc(word.text)}</text>`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  RoomZoom starter annotation. Next steps:
  1. Resize each room-* rectangle to the room outline (or redraw as a polygon, keeping the name).
  2. Check the desk-* circles; delete false matches, add missed desks.
  3. Draw hallway centerlines as lines/paths named "hall" (ends of connecting lines should touch).
  4. Mark stairs-<key> / elevator-<key> with the same key on every floor.
  5. Move scale-10ft over a known dimension and rename it to the real length (e.g. scale-24ft).
  6. Delete the "ocr-text" group if you like, then run npm run import:floor.
-->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <image xlink:href="${esc(opts.imageHref)}" href="${esc(opts.imageHref)}" x="0" y="0" width="${w}" height="${h}"/>
  <g id="ocr-text">
${labels.join("\n")}
  </g>
  <g id="rooms-todo">
${roomRects.join("\n")}
  </g>
  <g id="desks">
${desks.join("\n")}
  </g>
  <g id="halls-todo"/>
  <line id="scale-10ft" x1="${unit * 5}" y1="${h - unit * 5}" x2="${unit * 45}" y2="${h - unit * 5}" stroke="#2563eb" stroke-width="${unit / 2}"/>
</svg>
`;
}
