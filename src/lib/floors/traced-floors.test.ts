import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SHELLS } from "../../../scripts/floors/shells";
import { createDistanceMeasurer, type GeoEdge, type GeoFloor, type GeoNode } from "../geo/distance";
import { buildNavGraph, parseFloorSvg, parseTransform, pathPoints, stripAnnotations } from "./svg-annotations";

const dir = path.join(process.cwd(), "prisma", "floors");
const svg = readFileSync(path.join(dir, "building-2-4.svg"), "utf8");
/** Generated plans as [building number, floor]; Building 2 floor 4 is the Figma original. */
const tracedFloors = readdirSync(dir)
  .map((f) => f.match(/^building-(\d+)-(\d+)\.svg$/)?.slice(1, 3) as [string, string] | undefined)
  .filter((m): m is [string, string] => !!m && m.join("-") !== "2-4");

/** Floor 4's exterior wall, from the Figma export's wall mask. */
function floor4Outline() {
  const [, transform, d] = svg.match(/<mask id="mask_4">[\s\S]*?<g clip-path[^>]*>\s*<path fill="#fff" transform="([^"]+)" d="([^"]+)"/)!;
  const m = parseTransform(transform);
  const points = pathPoints(d)[0].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
  return points.slice(0, -1);
}

/** The building-outline layer's wall, as a polygon (generated) or path (Figma re-export), in canvas space. */
function outlinePoints(text: string) {
  const [, attrs, body] = text.match(/<g id="building-outline"([^>]*)>([\s\S]*?)<\/g>/)!;
  const m = parseTransform(attrs.match(/transform="([^"]+)"/)?.[1]);
  const polygon = body.match(/<polygon points="([^"]+)"/)?.[1];
  const points = polygon
    ? polygon.split(" ").map((p) => p.split(",").map(Number))
    : pathPoints(body.match(/<path [^>]*d="([^"]+)"/)![1])[0];
  const [first, last] = [points[0], points.at(-1)!];
  if (points.length > 1 && first[0] === last[0] && first[1] === last[1]) points.pop();
  return points.map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
}

function reachesEveryNode(g: ReturnType<typeof buildNavGraph>) {
  const adjacent = g.nodes.map(() => [] as number[]);
  for (const [p, q] of g.edges) {
    adjacent[p].push(q);
    adjacent[q].push(p);
  }
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    for (const n of adjacent[stack.pop()!]) {
      if (seen.has(n)) continue;
      seen.add(n);
      stack.push(n);
    }
  }
  return seen.size === g.nodes.length;
}

describe.each(tracedFloors)("Building %s floor %s plan", (building, floor) => {
  const text = readFileSync(path.join(dir, `building-${building}-${floor}.svg`), "utf8");
  const a = parseFloorSvg(text);

  const shell = SHELLS[`Building ${building}` as keyof typeof SHELLS];

  it("draws the building's shared exterior wall unchanged", () => {
    const outline = building === "2" ? floor4Outline() : shell.outline;
    // Canvas added above the shell (e.g. Building 2's pavilion) shifts the outline down.
    const dy = a.height - shell.height;
    const drawn = outlinePoints(text);
    expect(drawn).toHaveLength(outline.length);
    // Figma re-exports can nudge a vertex by a fraction of a pixel.
    drawn.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(outline[i][0], 0);
      expect(y).toBeCloseTo(outline[i][1] + dy, 0);
    });
  });

  it("shares the building's width and scale", () => {
    const { feet, from, to } = shell.scale;
    expect(a.width).toBe(shell.width);
    expect(a.scale).toEqual({ feet, lengthPx: Math.hypot(to[0] - from[0], to[1] - from[1]) });
    expect(a.warnings).toEqual([]);
  });

  it("has one uniquely numbered marker per desk", () => {
    const labels = a.desks.map((d) => d.label);
    expect(labels.length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.every((l) => new RegExp(`^${building}-${floor}\\d{3}$`).test(l))).toBe(true);
  });

  it("gives every room outline a door", () => {
    expect(a.rooms.length).toBeGreaterThan(0);
    for (const room of a.rooms) {
      expect(room.polygon!.length).toBeGreaterThanOrEqual(3);
      expect(room.doors.length).toBeGreaterThan(0);
    }
  });

  it("joins every hallway to the building's stairs and elevator", () => {
    const g = buildNavGraph(a.halls, a.connectors);
    expect(reachesEveryNode(g)).toBe(true);
    expect(g.nodes.filter((n) => n.connectorKey).map((n) => n.connectorKey).sort()).toEqual(expectedConnectors(Number(floor)));
  });
});

/**
 * Every floor but the top has the center stair's landing from above ("-up"), and every floor
 * but floor 1 its own flight down ("-down"). Floor 1's east and west stairs open on the other
 * side, so they're left unlinked and routes to floor 1 take the elevator or center stair.
 */
function expectedConnectors(floor: number) {
  return [
    "elevator-main",
    ...(floor > 1 ? ["stairs-center-down"] : []),
    ...(floor < 4 ? ["stairs-center-up"] : []),
    ...(floor === 1 ? ["stairs-east-unlinked", "stairs-west-unlinked"] : ["stairs-east", "stairs-west"]),
  ];
}

describe.each(["1", "2"])("Building %s floors", (building) => {
  const plans = [1, 2, 3, 4].map((level) => {
    const a = parseFloorSvg(readFileSync(path.join(dir, `building-${building}-${level}.svg`), "utf8"));
    return { level, a, graph: buildNavGraph(a.halls, a.connectors) };
  });
  const geoFloors: GeoFloor[] = plans.map(({ level }) => ({ id: `f${level}`, buildingId: building, level, feetPerPixel: 1 }));

  /** Walking route from the top floor's first desk to a desk on `level`, without some connectors. */
  function route(level: number, without: RegExp | null) {
    const nodes: GeoNode[] = [];
    const edges: GeoEdge[] = [];
    for (const p of plans) {
      const id = (i: number) => `f${p.level}:${i}`;
      const dropped = new Set(p.graph.nodes.flatMap((n, i) => (without && n.connectorKey && without.test(n.connectorKey) ? [i] : [])));
      p.graph.nodes.forEach((n, i) => !dropped.has(i) && nodes.push({ id: id(i), floorId: `f${p.level}`, x: n.x, y: n.y, connectorKey: n.connectorKey }));
      p.graph.edges.forEach(([s, t]) => !dropped.has(s) && !dropped.has(t) && edges.push({ fromId: id(s), toId: id(t) }));
    }
    const [start] = plans[3].a.desks;
    const [end] = plans[level - 1].a.desks;
    const measure = createDistanceMeasurer({ from: { floorId: "f4", ...start }, floors: geoFloors, nodes, edges, floorChangePenaltyFt: 60 });
    return measure({ floorId: `f${level}`, ...end });
  }

  it("reaches floor 1 by the center stair alone, one floor at a time", () => {
    const m = route(1, /^elevator|^stairs-(east|west)/);
    expect(m.distanceMethod).toBe("walking");
    expect(m.route?.map((r) => r.floorId)).toEqual(["f4", "f3", "f2", "f1"]);
  });

  it("never reaches floor 1 by the east or west stairs", () => {
    expect(route(1, /^elevator|^stairs-center/).distanceMethod).toBe("estimate");
    expect(route(2, /^elevator|^stairs-center/).distanceMethod).toBe("walking");
  });
});

describe("Building 2 floor 4 plan", () => {
  const a = parseFloorSvg(svg);

  it("matches the Figma frame and the 240 ft floor width", () => {
    expect([a.width, a.height]).toEqual([4688, 2076]);
    expect(a.scale!.feet / a.scale!.lengthPx).toBeCloseTo(240 / 4688);
    expect(a.warnings).toEqual([]);
  });

  it("outlines every bookable room with a door", () => {
    expect(a.rooms.map((r) => r.key).sort()).toEqual(
      ["bear-canyon", "chautauqua", "crown-rock", "dry-creek", "flagstaff", "gregory-canyon", "library", "red-rocks"],
    );
    for (const room of a.rooms) {
      expect(room.polygon).toHaveLength(4);
      expect(room.doors.length).toBeGreaterThan(0);
    }
  });

  it("has one uniquely numbered marker per desk", () => {
    const labels = a.desks.map((d) => d.label);
    expect(labels).toHaveLength(196);
    expect(new Set(labels).size).toBe(196);
    expect(labels.every((l) => /^2-4\d{3}$/.test(l))).toBe(true);
  });

  it("joins every hallway, stair, and elevator into one graph", () => {
    const g = buildNavGraph(a.halls, a.connectors);
    expect(reachesEveryNode(g)).toBe(true);
    expect(g.nodes.filter((n) => n.connectorKey).map((n) => n.connectorKey).sort()).toEqual(expectedConnectors(4));
  });

  it("keeps the drawing visible once annotations are stripped", () => {
    const background = stripAnnotations(svg);
    expect(background).not.toMatch(/id="(room|desk|door|hall|scale)-/);
    // SVG masks are luminance-based; unpainted (black) mask shapes would hide the whole plan.
    expect(background.match(/<mask\b[\s\S]*?<\/mask>/g)?.every((m) => !/<path(?![^>]*fill="#fff")/.test(m))).toBe(true);
  });
});
