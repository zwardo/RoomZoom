import type { DistanceMethod, Point } from "@/lib/rooms/types";

export interface GeoFloor {
  id: string;
  buildingId: string;
  level: number;
  feetPerPixel: number | null;
}

export interface GeoNode {
  id: string;
  floorId: string;
  x: number;
  y: number;
  connectorKey: string | null;
}

export interface GeoEdge {
  fromId: string;
  toId: string;
}

export interface Located {
  floorId: string;
  x: number;
  y: number;
}

export interface Measurement {
  distanceFt: number | null;
  distanceMethod: DistanceMethod | null;
  route?: { floorId: string; points: Point[] }[];
}

const NONE: Measurement = { distanceFt: null, distanceMethod: null };

export function centroid(points: Point[]): Point {
  const [sx, sy] = points.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
  return [sx / points.length, sy / points.length];
}

function project(p: Point, a: Point, b: Point) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  const q: Point = [a[0] + t * dx, a[1] + t * dy];
  return { q, t, d: Math.hypot(p[0] - q[0], p[1] - q[1]) };
}

interface Snap {
  edge: { a: GeoNode; b: GeoNode; length: number };
  q: Point;
  t: number;
  /** Feet from the point to the hallway. */
  offFt: number;
}

/**
 * Walking distance over a hallway graph. Stairs/elevator nodes that share a
 * `connectorKey` link floors, each floor change costing `floorChangePenaltyFt`.
 * Points (desks, doors) join the graph at the nearest point on a hallway.
 * Without a usable graph it falls back to straight-line distance on the same
 * floor, or straight line plus the floor penalty across floors ("estimate").
 */
export function createDistanceMeasurer(opts: {
  from: Located;
  floors: GeoFloor[];
  nodes: GeoNode[];
  edges: GeoEdge[];
  floorChangePenaltyFt: number;
}) {
  const floors = new Map(opts.floors.map((f) => [f.id, f]));
  const nodes = new Map(opts.nodes.map((n) => [n.id, n]));
  const origin = floors.get(opts.from.floorId);

  const adjacency = new Map<string, { to: string; cost: number }[]>();
  const link = (a: string, b: string, cost: number) => {
    adjacency.set(a, [...(adjacency.get(a) ?? []), { to: b, cost }]);
    adjacency.set(b, [...(adjacency.get(b) ?? []), { to: a, cost }]);
  };
  const floorEdges = new Map<string, Snap["edge"][]>();
  const levelPenalty = (a: GeoFloor, b: GeoFloor) => Math.max(1, Math.abs(a.level - b.level)) * opts.floorChangePenaltyFt;

  for (const e of opts.edges) {
    const a = nodes.get(e.fromId);
    const b = nodes.get(e.toId);
    const fa = a && floors.get(a.floorId);
    const fb = b && floors.get(b.floorId);
    if (!a || !b || !fa || !fb) continue;
    if (a.floorId !== b.floorId) {
      link(a.id, b.id, levelPenalty(fa, fb));
      continue;
    }
    if (!fa.feetPerPixel) continue;
    const length = Math.hypot(a.x - b.x, a.y - b.y) * fa.feetPerPixel;
    link(a.id, b.id, length);
    floorEdges.set(a.floorId, [...(floorEdges.get(a.floorId) ?? []), { a, b, length }]);
  }

  const connectors = new Map<string, GeoNode[]>();
  for (const n of opts.nodes) {
    if (n.connectorKey) connectors.set(n.connectorKey, [...(connectors.get(n.connectorKey) ?? []), n]);
  }
  for (const group of connectors.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const fa = floors.get(group[i].floorId);
        const fb = floors.get(group[j].floorId);
        if (fa && fb && fa.id !== fb.id && fa.buildingId === fb.buildingId) link(group[i].id, group[j].id, levelPenalty(fa, fb));
      }
    }
  }

  function snap(p: Located): Snap | null {
    const fpp = floors.get(p.floorId)?.feetPerPixel;
    if (!fpp) return null;
    let best: Snap | null = null;
    for (const edge of floorEdges.get(p.floorId) ?? []) {
      const { q, t, d } = project([p.x, p.y], [edge.a.x, edge.a.y], [edge.b.x, edge.b.y]);
      if (!best || d * fpp < best.offFt) best = { edge, q, t, offFt: d * fpp };
    }
    return best;
  }

  // Single-source shortest paths from the desk, computed once per search.
  const start = snap(opts.from);
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  if (start) {
    const queue = new Map<string, number>([
      [start.edge.a.id, start.offFt + start.t * start.edge.length],
      [start.edge.b.id, start.offFt + (1 - start.t) * start.edge.length],
    ]);
    for (const [id, d] of queue) dist.set(id, d);
    const done = new Set<string>();
    while (queue.size) {
      let current = "";
      let currentDist = Infinity;
      for (const [id, d] of queue) if (d < currentDist) [current, currentDist] = [id, d];
      queue.delete(current);
      done.add(current);
      for (const { to, cost } of adjacency.get(current) ?? []) {
        if (done.has(to)) continue;
        const next = currentDist + cost;
        if (next < (dist.get(to) ?? Infinity)) {
          dist.set(to, next);
          prev.set(to, current);
          queue.set(to, next);
        }
      }
    }
  }

  function pathTo(nodeId: string) {
    const ids = [nodeId];
    while (prev.has(ids[0])) ids.unshift(prev.get(ids[0])!);
    return ids.map((id) => nodes.get(id)!);
  }

  function toRoute(from: Located, via: GeoNode[], to: Located, startQ: Point, endQ: Point) {
    const route: { floorId: string; points: Point[] }[] = [];
    const push = (floorId: string, p: Point) => {
      const last = route.at(-1);
      if (last?.floorId === floorId) last.points.push(p);
      else route.push({ floorId, points: [p] });
    };
    push(from.floorId, [from.x, from.y]);
    push(from.floorId, startQ);
    via.forEach((n) => push(n.floorId, [n.x, n.y]));
    push(to.floorId, endQ);
    push(to.floorId, [to.x, to.y]);
    return route;
  }

  function walking(to: Located): Measurement | null {
    if (!start) return null;
    const end = snap(to);
    if (!end) return null;
    let best: { ft: number; via: GeoNode[] } | null = null;

    // Both points on the same hallway segment: walk along it directly.
    if (end.edge === start.edge) {
      best = { ft: start.offFt + Math.abs(end.t - start.t) * start.edge.length + end.offFt, via: [] };
    }
    for (const [node, along] of [
      [end.edge.a, end.t * end.edge.length],
      [end.edge.b, (1 - end.t) * end.edge.length],
    ] as const) {
      const d = dist.get(node.id);
      if (d == null) continue;
      const ft = d + along + end.offFt;
      if (!best || ft < best.ft) best = { ft, via: pathTo(node.id) };
    }
    if (!best) return null;
    return { distanceFt: best.ft, distanceMethod: "walking", route: toRoute(opts.from, best.via, to, start.q, end.q) };
  }

  return function measure(to: Located | null): Measurement {
    const target = to && floors.get(to.floorId);
    if (!origin || !target || !to || target.buildingId !== origin.buildingId) return NONE;

    const walked = walking(to);
    if (walked) return walked;

    // Floors of one building are assumed to share a coordinate system (same drawing extent).
    const fpp = origin.feetPerPixel && target.feetPerPixel ? (origin.feetPerPixel + target.feetPerPixel) / 2 : null;
    if (!fpp) return NONE;
    const straight = Math.hypot(to.x - opts.from.x, to.y - opts.from.y) * fpp;
    if (to.floorId === opts.from.floorId) return { distanceFt: straight, distanceMethod: "straight" };
    return { distanceFt: straight + levelPenalty(origin, target), distanceMethod: "estimate" };
  };
}
