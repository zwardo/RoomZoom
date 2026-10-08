import type { Point } from "@/lib/rooms/types";
import { SHELLS, type BuildingName } from "./shells";

/**
 * A floor traced from a scan. Every coordinate is in scan pixels; `fit` maps
 * them onto the building's shared outline, so only the interior is traced.
 */
export interface FloorSpec {
  building: BuildingName;
  floor: string;
  /** Scan the coordinates were read from, for reference. */
  source: string;
  /** Three scan points (outer wall corners) and where they sit on the shared outline. */
  fit: [scan: Point, outline: Point][];
  /** Canvas added above the shared outline, for wings north of the typical floor. */
  offsetY?: number;
  deskPrefix: string;
  /** Exterior walls outside the shared outline, e.g. a connector to another building. */
  extraShell?: Point[][];
  /** Gaps in the shared outline wall, as scan-pixel boxes. */
  openings?: [Point, Point][];
  rooms?: Room[];
  walls?: { points: Point[]; closed?: boolean; width?: number }[];
  labels?: { at: Point; text: string[]; title?: boolean }[];
  stairs?: { from: Point; to: Point; treads: number; label?: string }[];
  shafts?: { from: Point; to: Point }[];
  doors?: { hinge: Point; toward: [1 | -1, 1 | -1]; radius?: number }[];
  pods?: Pod[];
  /** Desks that sit outside any pod. */
  looseDesks?: { n: number; at: Point }[];
  halls: Point[][];
}

export type Room = ({ rect: [Point, Point] } | { points: Point[] }) & {
  kind?: "room" | "service";
  label?: string[];
  labelAt?: Point;
  /** Bookable: bold label plus room-/door- annotations. `key` matches the room catalog. */
  book?: { key: string; door: Point };
};

/**
 * Desk pod: a spine with dividers at `ticks`; labels run top to bottom on each
 * side. Numbers are desks; text (e.g. "LAB") is drawn without a desk marker.
 */
export interface Pod {
  spine: number;
  ticks: number[];
  left: (number | string)[];
  right: (number | string)[];
  half?: number;
}

const C = { bg: "#09080e", wall: "#39395b", label: "#9186b2", title: "#edeaff", tint: "#4737b2", note: "#8af0cb" };
const FONT = `font-family="Roboto Mono, ui-monospace, Menlo, monospace"`;

/** Inclusive run of desk numbers, counting down when `from > to`. */
export const seq = (from: number, to: number) =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => (from <= to ? from + i : from - i));

/** Affine map through three point pairs (scan -> plan). */
export function affineFrom(pairs: [Point, Point][]): (p: Point) => Point {
  if (pairs.length !== 3) throw new Error("fit needs exactly three point pairs");
  const [[a, A], [b, B], [c, Cc]] = pairs;
  const det = a[0] * (b[1] - c[1]) - a[1] * (b[0] - c[0]) + (b[0] * c[1] - c[0] * b[1]);
  if (Math.abs(det) < 1e-9) throw new Error("fit points are collinear");
  const solve = (u: number, v: number, w: number) => [
    (u * (b[1] - c[1]) - a[1] * (v - w) + (v * c[1] - w * b[1])) / det,
    (a[0] * (v - w) - u * (b[0] - c[0]) + (b[0] * w - c[0] * v)) / det,
    (a[0] * (b[1] * w - c[1] * v) - a[1] * (b[0] * w - c[0] * v) + u * (b[0] * c[1] - c[0] * b[1])) / det,
  ];
  const [p, q, r] = solve(A[0], B[0], Cc[0]);
  const [s, t, u] = solve(A[1], B[1], Cc[1]);
  return ([x, y]) => [p * x + q * y + r, s * x + t * y + u];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderFloor(spec: FloorSpec): string {
  const shell = SHELLS[spec.building];
  const dy = spec.offsetY ?? 0;
  const fit = affineFrom(spec.fit);
  const T = (p: Point): Point => {
    const [x, y] = fit(p);
    return [r1(x), r1(y + dy)];
  };
  const pts = (list: Point[]) => list.map((p) => T(p).join(",")).join(" ");
  const W = shell.width;
  const H = shell.height + dy;
  const out: string[] = [];

  const line = (a: Point, b: Point, width = 4) => {
    const [[x1, y1], [x2, y2]] = [T(a), T(b)];
    out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.wall}" stroke-width="${width}"/>`);
  };
  const outlineOf = (r: Room): Point[] => {
    if ("points" in r) return r.points;
    const [[x1, y1], [x2, y2]] = r.rect;
    return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
  };
  const center = (list: Point[]): Point => {
    const xs = list.map((p) => p[0]);
    const ys = list.map((p) => p[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  };
  const text = (at: Point, lines: string[], kind: "label" | "title" = "label") => {
    const [size, fill, weight] = kind === "title" ? [30, C.title, 600] : [22, C.label, 400];
    const lh = size * 1.35;
    const [x, y] = T(at);
    lines.forEach((t, i) =>
      out.push(
        `<text x="${x}" y="${r1(y - ((lines.length - 1) * lh) / 2 + i * lh)}" ${FONT} font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" dominant-baseline="central">${esc(t)}</text>`,
      ),
    );
  };

  // Shared outline: an inside stroke, drawn the way the Figma export draws floor 4.
  out.push(
    `<g id="building-outline" transform="translate(0,${dy})">`,
    `<clipPath id="outline-clip"><polygon points="${shell.outline.map((p) => p.join(",")).join(" ")}"/></clipPath>`,
    `<polygon points="${shell.outline.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${C.wall}" stroke-width="${shell.wallWidth * 2}" clip-path="url(#outline-clip)"/>`,
    `</g>`,
  );
  for (const [a, b] of spec.openings ?? []) {
    const [[x1, y1], [x2, y2]] = [T(a), T(b)];
    out.push(`<rect x="${Math.min(x1, x2)}" y="${Math.min(y1, y2)}" width="${r1(Math.abs(x2 - x1))}" height="${r1(Math.abs(y2 - y1))}" fill="${C.bg}"/>`);
  }
  for (const wall of spec.extraShell ?? []) {
    out.push(`<polyline points="${pts(wall)}" fill="none" stroke="${C.wall}" stroke-width="${shell.wallWidth}" stroke-linejoin="miter"/>`);
  }

  for (const room of spec.rooms ?? []) {
    const outline = outlineOf(room);
    const p = pts(outline);
    if (room.kind === "service") {
      out.push(`<polygon points="${p}" fill="${C.tint}" fill-opacity=".2" stroke="${C.tint}" stroke-width="4"/>`);
    } else {
      out.push(`<polygon points="${p}" fill="none" stroke="${C.wall}" stroke-width="4"/>`);
    }
    if (room.label) text(room.labelAt ?? center(outline), room.label, room.book ? "title" : "label");
  }
  for (const w of spec.walls ?? []) {
    out.push(`<${w.closed ? "polygon" : "polyline"} points="${pts(w.points)}" fill="none" stroke="${C.wall}" stroke-width="${w.width ?? 4}"/>`);
  }
  for (const { from, to } of spec.shafts ?? []) {
    out.push(`<polygon points="${pts([from, [to[0], from[1]], to, [from[0], to[1]]])}" fill="none" stroke="${C.wall}" stroke-width="4"/>`);
    line(from, to, 3);
    line([to[0], from[1]], [from[0], to[1]], 3);
  }
  for (const { from, to, treads, label } of spec.stairs ?? []) {
    out.push(`<polygon points="${pts([from, [to[0], from[1]], to, [from[0], to[1]]])}" fill="none" stroke="${C.wall}" stroke-width="4"/>`);
    const end = label ? to[1] - (to[1] - from[1]) * 0.25 : to[1];
    for (let i = 1; i <= treads; i++) {
      const y = from[1] + ((end - from[1]) * i) / treads;
      line([from[0], y], [to[0], y], 3);
    }
    if (label) {
      const mid = (from[0] + to[0]) / 2;
      line([mid, from[1]], [mid, end], 3);
      text([mid, (end + to[1]) / 2], [label]);
    }
  }
  for (const { hinge, toward: [sx, sy], radius = 60 } of spec.doors ?? []) {
    const [hx, hy] = T(hinge);
    out.push(
      `<path d="M${r1(hx + sx * radius)} ${hy} A${radius} ${radius} 0 0 ${sx * sy > 0 ? 1 : 0} ${hx} ${r1(hy + sy * radius)}" fill="none" stroke="${C.wall}" stroke-width="3" opacity=".6"/>`,
    );
  }
  for (const l of spec.labels ?? []) text(l.at, l.text, l.title ? "title" : "label");

  const desks: [string, Point][] = [];
  for (const { spine, ticks, left, right, half = 24 } of spec.pods ?? []) {
    line([spine, ticks[0]], [spine, ticks.at(-1)!]);
    for (const t of ticks) line([left.length ? spine - half : spine, t], [right.length ? spine + half : spine, t]);
    const place = (labels: (number | string)[], x: number) =>
      labels.forEach((n, i) => {
        const at: Point = [x, (ticks[i] + ticks[i + 1]) / 2];
        if (typeof n === "string") return text(at, [n]);
        const label = `${spec.deskPrefix}${n}`;
        text(at, [label]);
        desks.push([label, T(at)]);
      });
    place(left, spine - half * 0.55);
    place(right, spine + half * 0.55);
  }
  for (const { n, at } of spec.looseDesks ?? []) {
    const label = `${spec.deskPrefix}${n}`;
    text(at, [label]);
    desks.push([label, T(at)]);
  }

  const ann: string[] = [];
  for (const room of spec.rooms ?? []) {
    if (!room.book) continue;
    const [doorX, doorY] = T(room.book.door);
    ann.push(`    <polygon id="room-${room.book.key}" points="${pts(outlineOf(room))}"/>`);
    ann.push(`    <circle id="door-${room.book.key}" cx="${doorX}" cy="${doorY}" r="10"/>`);
  }
  const hall = spec.halls.map((h) => h.map((p, i) => `${i ? "L" : "M"}${T(p).join(" ")}`).join(" ")).join(" ");
  const { from, to, feet } = shell.scale;

  return `<!-- ${esc(spec.building)}, floor ${esc(spec.floor)}. Generated by scripts/trace-floor.ts from ${esc(spec.source)}; import with the dark theme.
     The outline is shared by every floor of the building; room numbers shown as ?? were unreadable on the scan. -->
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<g id="plan">
${out.join("\n")}
</g>
<g id="annotations" fill="none" stroke="${C.note}" stroke-width="4" opacity="0.8">
  <g id="rooms">
${ann.join("\n")}
  </g>
  <g id="desks">
${desks.map(([l, [x, y]]) => `    <circle id="desk-${l}" cx="${x}" cy="${y}" r="8"/>`).join("\n")}
  </g>
  <path id="hall" d="${hall}"/>
${shell.connectors.map((c) => `  <circle id="${c.type}-${c.key}" cx="${c.at[0]}" cy="${c.at[1] + dy}" r="14"/>`).join("\n")}
  <line id="scale-${feet}ft" x1="${from[0]}" y1="${from[1] + dy}" x2="${to[0]}" y2="${to[1] + dy}"/>
</g>
</svg>
`;
}
