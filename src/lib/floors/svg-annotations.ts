import { XMLBuilder, XMLParser } from "fast-xml-parser";
import type { Point } from "@/lib/rooms/types";

/**
 * Reads a floor plan SVG annotated by layer name (Figma layer names and
 * Inkscape labels both work). Coordinates come out in the SVG's viewBox space,
 * which must match the background image's pixel size.
 *
 *   room-<email | email name | room name>   rect/polygon/path: room outline
 *   door-<same key as the room>             any shape: door point (optional, else centroid)
 *   desk-<label>                            any shape: desk position, e.g. desk-2-114
 *   hall[-anything]                         line/polyline/path: hallway centerline
 *   stairs-<key> / elevator-<key>           any shape: same key on each floor links floors
 *   scale-<n>ft (or <n>m)                   line: drawn over a known real-world length
 *
 * The separator after the kind can be "-", "_", ":" or a space.
 *
 * If a layer named "annotations" exists, only layers inside it are read, so
 * drawing layers that happen to be named "Room D" or "Elevator" (Figma names
 * outlined text after its content) stay part of the drawing.
 */
export interface FloorAnnotation {
  width: number;
  height: number;
  background: { href: string } | null;
  rooms: { key: string; polygon: Point[] | null; door: Point | null }[];
  desks: { label: string; x: number; y: number }[];
  halls: Point[][];
  connectors: { type: "stairs" | "elevator"; key: string; x: number; y: number }[];
  scale: { feet: number; lengthPx: number } | null;
  warnings: string[];
}

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

type XmlNode = Record<string, unknown> & { ":@"?: Record<string, string> };

const KIND = /^(room|door|desk|hall|stairs|elevator|scale)(?:[\s:_-]+(.*))?$/i;
const SHAPES = new Set(["rect", "polygon", "polyline", "path", "line", "circle", "ellipse"]);

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function apply(m: Matrix, [x, y]: Point): Point {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function parseTransform(value: string | undefined): Matrix {
  let m = IDENTITY;
  if (!value) return m;
  for (const [, fn, args] of value.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const a = numbers(args);
    let t: Matrix = IDENTITY;
    if (fn === "matrix" && a.length === 6) t = a as Matrix;
    else if (fn === "translate") t = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
    else if (fn === "scale") t = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
    else if (fn === "rotate") {
      const r = ((a[0] ?? 0) * Math.PI) / 180;
      const [cx, cy] = [a[1] ?? 0, a[2] ?? 0];
      t = multiply(multiply([1, 0, 0, 1, cx, cy], [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]), [1, 0, 0, 1, -cx, -cy]);
    }
    m = multiply(m, t);
  }
  return m;
}

function numbers(text: string | undefined): number[] {
  return (text?.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number);
}

function pairs(values: number[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i + 1 < values.length; i += 2) out.push([values[i], values[i + 1]]);
  return out;
}

/** Vertices of each subpath. Curves are reduced to their end points, which is enough for outlines and centerlines. */
export function pathPoints(d: string): Point[][] {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  const arity: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  const subpaths: Point[][] = [];
  let current: Point[] = [];
  let [x, y] = [0, 0];
  let [sx, sy] = [0, 0];
  let cmd = "";
  let i = 0;
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) cmd = tokens[i++];
    const lower = cmd.toLowerCase();
    const rel = cmd === lower;
    if (lower === "z") {
      [x, y] = [sx, sy];
      const last = current.at(-1);
      if (last && current.length > 1 && (last[0] !== sx || last[1] !== sy)) current.push([sx, sy]);
      if (current.length) subpaths.push(current);
      current = [];
      cmd = "";
      continue;
    }
    const n = arity[lower];
    if (n == null) break;
    const args = tokens.slice(i, i + n).map(Number);
    if (args.length < n) break;
    i += n;
    if (lower === "h") x = rel ? x + args[0] : args[0];
    else if (lower === "v") y = rel ? y + args[0] : args[0];
    else [x, y] = rel ? [x + args[n - 2], y + args[n - 1]] : [args[n - 2], args[n - 1]];
    if (lower === "m") {
      if (current.length) subpaths.push(current);
      current = [];
      [sx, sy] = [x, y];
      cmd = rel ? "l" : "L";
    }
    current.push([x, y]);
  }
  if (current.length) subpaths.push(current);
  return subpaths;
}

function num(attrs: Record<string, string>, key: string, fallback = 0) {
  const v = parseFloat(attrs[key] ?? "");
  return Number.isFinite(v) ? v : fallback;
}

/** Point lists for one shape element, in its own coordinate space. */
function shapePoints(tag: string, a: Record<string, string>): Point[][] {
  switch (tag) {
    case "rect": {
      const [x, y, w, h] = [num(a, "x"), num(a, "y"), num(a, "width"), num(a, "height")];
      return [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]];
    }
    case "polygon":
    case "polyline":
      return [pairs(numbers(a.points))];
    case "path":
      return pathPoints(a.d ?? "");
    case "line":
      return [[[num(a, "x1"), num(a, "y1")], [num(a, "x2"), num(a, "y2")]]];
    case "circle":
    case "ellipse":
      return [[[num(a, "cx"), num(a, "cy")]]];
    default:
      return [];
  }
}

function tagOf(node: XmlNode) {
  return Object.keys(node).find((k) => k !== ":@") ?? "";
}

function childrenOf(node: XmlNode): XmlNode[] {
  const value = node[tagOf(node)];
  return Array.isArray(value) ? (value as XmlNode[]) : [];
}

function labelOf(a: Record<string, string>) {
  return (a["inkscape:label"] ?? a["data-name"] ?? a.id ?? "").trim();
}

const ANNOTATIONS = /^annotations$/i;

function hasAnnotationsLayer(nodes: XmlNode[]): boolean {
  return nodes.some((n) => ANNOTATIONS.test(labelOf(n[":@"] ?? {})) || hasAnnotationsLayer(childrenOf(n)));
}

function bboxCenter(points: Point[]): Point {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

const round = ([x, y]: Point): Point => [Math.round(x * 10) / 10, Math.round(y * 10) / 10];

export function parseFloorSvg(svgText: string): FloorAnnotation {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", preserveOrder: true });
  const doc = parser.parse(svgText) as XmlNode[];
  const root = doc.find((n) => tagOf(n) === "svg");
  if (!root) throw new Error("Not an SVG file");

  const rootAttrs = root[":@"] ?? {};
  const viewBox = numbers(rootAttrs.viewBox);
  const width = viewBox.length === 4 ? viewBox[2] : num(rootAttrs, "width");
  const height = viewBox.length === 4 ? viewBox[3] : num(rootAttrs, "height");
  // The viewBox origin maps to image pixel (0, 0).
  const origin: Matrix = viewBox.length === 4 ? [1, 0, 0, 1, -viewBox[0], -viewBox[1]] : IDENTITY;

  const result: FloorAnnotation = {
    width,
    height,
    background: null,
    rooms: [],
    desks: [],
    halls: [],
    connectors: [],
    scale: null,
    warnings: [],
  };
  const rooms = new Map<string, { key: string; polygon: Point[] | null; door: Point | null }>();
  const room = (key: string) => rooms.get(key.toLowerCase()) ?? rooms.set(key.toLowerCase(), { key, polygon: null, door: null }).get(key.toLowerCase())!;

  /** All shapes under an element, transformed into viewBox space. */
  function collect(node: XmlNode, m: Matrix): Point[][] {
    const tag = tagOf(node);
    const a = node[":@"] ?? {};
    const local = multiply(m, parseTransform(a.transform));
    if (SHAPES.has(tag)) return shapePoints(tag, a).map((pts) => pts.map((p) => apply(local, p)));
    return childrenOf(node).flatMap((c) => collect(c, local));
  }

  function visit(node: XmlNode, m: Matrix, inScope: boolean) {
    const tag = tagOf(node);
    const a = node[":@"] ?? {};
    const local = multiply(m, parseTransform(a.transform));
    const scoped = inScope || ANNOTATIONS.test(labelOf(a));

    if (tag === "image" && !result.background) {
      const href = a.href ?? a["xlink:href"];
      if (href) result.background = { href };
    }

    const match = scoped ? labelOf(a).match(KIND) : null;
    if (!match || tag === "svg") {
      childrenOf(node).forEach((c) => visit(c, local, scoped));
      return;
    }

    const kind = match[1].toLowerCase();
    const key = (match[2] ?? "").trim();
    const shapes = collect(node, m).filter((s) => s.length);
    const all = shapes.flat();
    if (!all.length) {
      result.warnings.push(`"${labelOf(a)}" has no geometry`);
      return;
    }
    const center = round(bboxCenter(all));

    if (kind === "hall") {
      shapes.filter((s) => s.length > 1).forEach((s) => result.halls.push(s.map(round)));
      return;
    }
    if (!key) {
      result.warnings.push(`"${labelOf(a)}" needs a name after "${kind}"`);
      return;
    }
    if (kind === "room") {
      const outline = shapes.find((s) => s.length >= 3)?.map(round);
      const [first, last] = [outline?.[0], outline?.at(-1)];
      if (outline && first && last && outline.length > 3 && first[0] === last[0] && first[1] === last[1]) outline.pop();
      if (outline) room(key).polygon = outline;
      else room(key).door ??= center;
    } else if (kind === "door") {
      room(key).door = center;
    } else if (kind === "desk") {
      result.desks.push({ label: key, x: center[0], y: center[1] });
    } else if (kind === "stairs" || kind === "elevator") {
      result.connectors.push({ type: kind, key: `${kind}-${key}`.toLowerCase(), x: center[0], y: center[1] });
    } else if (kind === "scale") {
      const [amount, unit] = [parseFloat(key), /m(?:eters?)?$/i.test(key) && !/ft|feet|'/i.test(key) ? "m" : "ft"];
      const [p, q] = [all[0], all[all.length - 1]];
      const lengthPx = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (Number.isFinite(amount) && amount > 0 && lengthPx > 0) {
        result.scale = { feet: unit === "m" ? amount * 3.28084 : amount, lengthPx };
      } else {
        result.warnings.push(`Couldn't read scale from "${labelOf(a)}" (expected e.g. scale-30ft on a line)`);
      }
    }
  }

  visit(root, origin, !hasAnnotationsLayer([root]));
  result.rooms = [...rooms.values()];
  return result;
}

/** The SVG without annotation layers (or scripts), for use as the map background. */
export function stripAnnotations(svgText: string): string {
  const options = { ignoreAttributes: false, attributeNamePrefix: "", preserveOrder: true } as const;
  const doc = new XMLParser(options).parse(svgText) as XmlNode[];
  const keep = (node: XmlNode, inScope: boolean): XmlNode | null => {
    const tag = tagOf(node);
    const label = labelOf(node[":@"] ?? {});
    const scoped = inScope || ANNOTATIONS.test(label);
    if (tag === "script" || tag === "foreignObject" || (scoped && KIND.test(label))) return null;
    const kids = node[tag];
    if (!Array.isArray(kids)) return node;
    return { ...node, [tag]: (kids as XmlNode[]).map((c) => keep(c, scoped)).filter(Boolean) };
  };
  const everywhere = !hasAnnotationsLayer(doc);
  return new XMLBuilder({ ...options, suppressEmptyNode: true }).build(doc.map((n) => keep(n, everywhere)).filter(Boolean));
}

export interface NavGraph {
  nodes: { x: number; y: number; type: "hall" | "stairs" | "elevator"; connectorKey: string | null }[];
  edges: [number, number][];
}

/**
 * Turns hallway polylines into a graph. Vertices closer than `tolerance`
 * merge, a line ending on another line's middle splits it (a T-junction),
 * and stairs/elevators join their nearest hallway point.
 */
export function buildNavGraph(
  halls: Point[][],
  connectors: FloorAnnotation["connectors"],
  tolerance = 8,
): NavGraph {
  const nodes: NavGraph["nodes"] = [];
  const nodeAt = (p: Point) => {
    const found = nodes.findIndex((n) => Math.hypot(n.x - p[0], n.y - p[1]) <= tolerance);
    if (found >= 0) return found;
    nodes.push({ x: p[0], y: p[1], type: "hall", connectorKey: null });
    return nodes.length - 1;
  };

  let segments: [number, number][] = [];
  for (const line of halls) {
    for (let i = 0; i + 1 < line.length; i++) {
      const [a, b] = [nodeAt(line[i]), nodeAt(line[i + 1])];
      if (a !== b) segments.push([a, b]);
    }
  }

  const splitAt = (index: number) => {
    const p: Point = [nodes[index].x, nodes[index].y];
    const next: [number, number][] = [];
    for (const [a, b] of segments) {
      if (a === index || b === index) {
        next.push([a, b]);
        continue;
      }
      const hit = closestOnSegment(p, [nodes[a].x, nodes[a].y], [nodes[b].x, nodes[b].y]);
      if (hit.d <= tolerance && hit.t > 0 && hit.t < 1) next.push([a, index], [index, b]);
      else next.push([a, b]);
    }
    segments = next;
  };
  for (let i = 0; i < nodes.length; i++) splitAt(i);

  for (const c of connectors) {
    const p: Point = [c.x, c.y];
    let best: { seg: [number, number]; q: Point; t: number; d: number } | null = null;
    for (const seg of segments) {
      const hit = closestOnSegment(p, [nodes[seg[0]].x, nodes[seg[0]].y], [nodes[seg[1]].x, nodes[seg[1]].y]);
      if (!best || hit.d < best.d) best = { seg, ...hit };
    }
    nodes.push({ x: c.x, y: c.y, type: c.type, connectorKey: c.key });
    const connector = nodes.length - 1;
    if (!best) continue;
    const [a, b] = best.seg;
    let join: number;
    if (best.t <= 0) join = a;
    else if (best.t >= 1) join = b;
    else {
      nodes.push({ x: best.q[0], y: best.q[1], type: "hall", connectorKey: null });
      join = nodes.length - 1;
      segments = segments.filter((s) => s !== best.seg);
      segments.push([a, join], [join, b]);
    }
    segments.push([connector, join]);
  }

  const seen = new Set<string>();
  const edges = segments.filter(([a, b]) => {
    const k = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { nodes, edges };
}

function closestOnSegment(p: Point, a: Point, b: Point) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
  const c = Math.max(0, Math.min(1, t));
  const q: Point = [a[0] + c * dx, a[1] + c * dy];
  return { q, t, d: Math.hypot(p[0] - q[0], p[1] - q[1]) };
}

/**
 * Feet per image pixel from a drawing scale and scan resolution, e.g.
 * `1/8` (inch per foot, i.e. 1/8" = 1'-0") or `1:100` (ratio) at 150 dpi.
 */
export function feetPerPixelFromScale(scale: string, dpi: number): number | null {
  if (!(dpi > 0)) return null;
  const ratio = scale.match(/^\s*1\s*:\s*(\d+(?:\.\d+)?)\s*$/);
  if (ratio) return Number(ratio[1]) / dpi / 12;
  const frac = scale.match(/^\s*(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?\s*(?:in|"|″)?\s*(?:=\s*1\s*(?:ft|'|′)(?:\s*-?\s*0\s*(?:"|in)?)?)?\s*$/i);
  if (!frac) return null;
  const inchesPerFoot = frac[2] ? Number(frac[1]) / Number(frac[2]) : Number(frac[1]);
  return inchesPerFoot > 0 ? 1 / (inchesPerFoot * dpi) : null;
}
