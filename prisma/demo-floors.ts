/**
 * Generates two demo floor plans for building "HQ" (1200×800 px at 1/8 ft per
 * px, i.e. 150×100 ft). Each floor produces a drawing (the map background) and
 * an annotation SVG in the same layer-name format real floors use.
 */

export const DEMO_WIDTH = 1200;
export const DEMO_HEIGHT = 800;

interface DemoRoom {
  name: string;
  capacity: number;
  width: number;
}

const FLOORS: Record<string, DemoRoom[]> = {
  "2": [
    { name: "Cedar", capacity: 12, width: 260 },
    { name: "Oak", capacity: 8, width: 200 },
    { name: "Willow", capacity: 6, width: 180 },
    { name: "Birch", capacity: 4, width: 140 },
    { name: "Pine", capacity: 2, width: 110 },
  ],
  "3": [
    { name: "Spruce", capacity: 20, width: 320 },
    { name: "Maple", capacity: 10, width: 220 },
    { name: "Hazel", capacity: 6, width: 180 },
    { name: "Aspen", capacity: 4, width: 140 },
    { name: "Elm", capacity: 2, width: 110 },
  ],
};

const DESK_COLS = [130, 190, 290, 350, 450, 510];
const DESK_ROWS = [330, 400, 470, 540, 610, 680];
const HALL_Y = 260;
const BOTTOM_Y = 740;

function layout(floor: string) {
  let x = 40;
  const rooms = FLOORS[floor].map((r) => {
    const rect = { ...r, x, y: 40, h: 180 };
    x += r.width;
    return rect;
  });
  const kitchen = { x, y: 40, w: 1160 - x, h: 180 };
  const desks: { label: string; x: number; y: number }[] = [];
  let n = 101;
  for (const offset of [0, 540]) {
    for (const y of DESK_ROWS) for (const dx of DESK_COLS) desks.push({ label: `${floor}-${n++}`, x: dx + offset, y });
  }
  return { rooms, kitchen, desks };
}

export function demoFloorNames() {
  return Object.keys(FLOORS);
}

export function demoDrawing(floor: string) {
  const { rooms, kitchen, desks } = layout(floor);
  const text = (x: number, y: number, s: string, size = 14, weight = 400) =>
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" fill="#334155">${s}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DEMO_WIDTH} ${DEMO_HEIGHT}" width="${DEMO_WIDTH}" height="${DEMO_HEIGHT}">
  <rect width="${DEMO_WIDTH}" height="${DEMO_HEIGHT}" fill="#ffffff"/>
  <rect x="20" y="20" width="1160" height="760" fill="#f8fafc" stroke="#334155" stroke-width="6"/>
  <g fill="#e2e8f0">
    <rect x="40" y="${HALL_Y - 20}" width="1120" height="40"/>
    <rect x="40" y="${HALL_Y}" width="40" height="${BOTTOM_Y - HALL_Y + 20}"/>
    <rect x="1120" y="${HALL_Y}" width="40" height="${BOTTOM_Y - HALL_Y + 20}"/>
    <rect x="580" y="${HALL_Y}" width="40" height="${BOTTOM_Y - HALL_Y}"/>
    <rect x="40" y="${BOTTOM_Y - 20}" width="1120" height="40"/>
  </g>
  <g fill="#ffffff" stroke="#334155" stroke-width="3">
${rooms.map((r) => `    <rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.h}"/>`).join("\n")}
    <rect x="${kitchen.x}" y="${kitchen.y}" width="${kitchen.w}" height="${kitchen.h}" fill="#f1f5f9"/>
  </g>
  <g stroke="#f8fafc" stroke-width="6">
${rooms.map((r) => `    <line x1="${r.x + r.width / 2 - 18}" y1="220" x2="${r.x + r.width / 2 + 18}" y2="220"/>`).join("\n")}
  </g>
${rooms.map((r) => `  ${text(r.x + r.width / 2, 125, r.name.toUpperCase(), 18, 700)}\n  ${text(r.x + r.width / 2, 148, `${r.capacity} seats`, 13)}`).join("\n")}
  ${text(kitchen.x + kitchen.w / 2, 135, "KITCHEN", 16, 700)}
  <g fill="#ffffff" stroke="#94a3b8" stroke-width="1.5">
${desks.map((d) => `    <rect x="${d.x - 25}" y="${d.y - 20}" width="50" height="40" rx="3"/>`).join("\n")}
  </g>
${desks.map((d) => `  ${text(d.x, d.y + 4, d.label, 11)}`).join("\n")}
  <rect x="24" y="690" width="72" height="86" fill="#fde68a" stroke="#334155" stroke-width="2"/>
  ${text(60, 740, "STAIRS", 11, 700)}
  <rect x="1104" y="690" width="72" height="86" fill="#bfdbfe" stroke="#334155" stroke-width="2"/>
  ${text(1140, 740, "ELEV", 11, 700)}
  ${text(600, 790, `HQ · FLOOR ${floor}`, 12, 700)}
  <line x1="840" y1="784" x2="1080" y2="784" stroke="#334155" stroke-width="2"/>
  ${text(960, 778, "30 ft", 11)}
</svg>
`;
}

export function demoAnnotation(floor: string) {
  const { rooms, desks } = layout(floor);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DEMO_WIDTH} ${DEMO_HEIGHT}">
${rooms.map((r) => `  <rect id="room-${r.name}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.h}"/>\n  <circle id="door-${r.name}" cx="${r.x + r.width / 2}" cy="220" r="4"/>`).join("\n")}
${desks.map((d) => `  <circle id="desk-${d.label}" cx="${d.x}" cy="${d.y}" r="4"/>`).join("\n")}
  <path id="hall" d="M60 ${HALL_Y} H1140 V${BOTTOM_Y} H60 Z"/>
  <path id="hall_2" d="M600 ${HALL_Y} V${BOTTOM_Y}"/>
  <path id="hall_3" d="M240 ${HALL_Y} V${BOTTOM_Y} M400 ${HALL_Y} V${BOTTOM_Y} M780 ${HALL_Y} V${BOTTOM_Y} M940 ${HALL_Y} V${BOTTOM_Y}"/>
  <circle id="stairs-main" cx="60" cy="760" r="6"/>
  <circle id="elevator-main" cx="1140" cy="760" r="6"/>
  <line id="scale-30ft" x1="840" y1="784" x2="1080" y2="784"/>
</svg>
`;
}
