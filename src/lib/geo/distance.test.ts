import { describe, expect, it } from "vitest";
import { centroid, createDistanceMeasurer, type GeoFloor, type GeoNode } from "./distance";

const floors: GeoFloor[] = [
  { id: "f1", buildingId: "hq", level: 1, feetPerPixel: 1 },
  { id: "f2", buildingId: "hq", level: 2, feetPerPixel: 1 },
  { id: "f3", buildingId: "hq", level: 3, feetPerPixel: 1 },
  { id: "x1", buildingId: "annex", level: 1, feetPerPixel: 1 },
];

const node = (id: string, floorId: string, x: number, y: number, connectorKey: string | null = null): GeoNode => ({
  id,
  floorId,
  x,
  y,
  connectorKey,
});

//  f1:  A(0,0) --- B(100,0)          f2:  D(0,100) --- S2(100,100)
//                    |
//                  C(100,100) = stairs "a"
const nodes = [
  node("A", "f1", 0, 0),
  node("B", "f1", 100, 0),
  node("C", "f1", 100, 100, "stairs-a"),
  node("S2", "f2", 100, 100, "stairs-a"),
  node("D", "f2", 0, 100),
];
const edges = [
  { fromId: "A", toId: "B" },
  { fromId: "B", toId: "C" },
  { fromId: "S2", toId: "D" },
];

const measure = createDistanceMeasurer({
  from: { floorId: "f1", x: 10, y: 5 },
  floors,
  nodes,
  edges,
  floorChangePenaltyFt: 60,
});

describe("createDistanceMeasurer", () => {
  it("walks the hallway graph on the same floor", () => {
    const m = measure({ floorId: "f1", x: 105, y: 50 });
    expect(m.distanceMethod).toBe("walking");
    // 5 to hallway + 90 to B + 50 down BC + 5 to door
    expect(m.distanceFt).toBeCloseTo(150);
    expect(m.route?.[0].points).toEqual([
      [10, 5],
      [10, 0],
      [100, 0],
      [100, 50],
      [105, 50],
    ]);
  });

  it("walks directly when both points are on the same hallway segment", () => {
    const m = measure({ floorId: "f1", x: 50, y: -3 });
    expect(m.distanceFt).toBeCloseTo(5 + 40 + 3);
  });

  it("changes floors through matching connectors with a penalty", () => {
    const m = measure({ floorId: "f2", x: 0, y: 105 });
    expect(m.distanceMethod).toBe("walking");
    // 5 + 90 + 100 (to stairs) + 60 (one floor) + 100 + 5
    expect(m.distanceFt).toBeCloseTo(360);
    expect(m.route?.map((r) => r.floorId)).toEqual(["f1", "f2"]);
  });

  it("estimates when the target floor has no hallway graph", () => {
    const m = measure({ floorId: "f3", x: 10, y: 45 });
    expect(m.distanceMethod).toBe("estimate");
    expect(m.distanceFt).toBeCloseTo(40 + 2 * 60);
  });

  it("uses a straight line when no floor has a graph", () => {
    const straight = createDistanceMeasurer({
      from: { floorId: "f1", x: 0, y: 0 },
      floors,
      nodes: [],
      edges: [],
      floorChangePenaltyFt: 60,
    });
    expect(straight({ floorId: "f1", x: 30, y: 40 })).toEqual({ distanceFt: 50, distanceMethod: "straight" });
  });

  it("returns nothing for other buildings, missing points, or unscaled floors", () => {
    expect(measure({ floorId: "x1", x: 0, y: 0 }).distanceFt).toBeNull();
    expect(measure(null).distanceFt).toBeNull();
    const unscaled = createDistanceMeasurer({
      from: { floorId: "f1", x: 0, y: 0 },
      floors: [{ ...floors[0], feetPerPixel: null }],
      nodes: [],
      edges: [],
      floorChangePenaltyFt: 60,
    });
    expect(unscaled({ floorId: "f1", x: 3, y: 4 }).distanceFt).toBeNull();
  });
});

describe("stair flights", () => {
  // Each floor's flight leaves from "c-down" and lands on the floor below at "c-up".
  //   f3: P3 (0,0) --- c-down (100,0)
  //   f2: c-up (0,0) --- c-down (100,0)
  //   f1: c-up (0,0) --- Q1 (100,0)
  const flights = [
    node("P3", "f3", 0, 0),
    node("D3", "f3", 100, 0, "stairs-c-down"),
    node("U2", "f2", 0, 0, "stairs-c-up"),
    node("D2", "f2", 100, 0, "stairs-c-down"),
    node("U1", "f1", 0, 0, "stairs-c-up"),
    node("Q1", "f1", 100, 0),
  ];
  const flightEdges = [
    { fromId: "P3", toId: "D3" },
    { fromId: "U2", toId: "D2" },
    { fromId: "U1", toId: "Q1" },
  ];
  const from = (floorId: string) =>
    createDistanceMeasurer({ from: { floorId, x: 0, y: 0 }, floors, nodes: flights, edges: flightEdges, floorChangePenaltyFt: 60 });

  it("links a floor's top landing only to the bottom landing one level down", () => {
    // f3: walk 100 to the stair, one flight, f2: walk 100 to the next stair, one flight, f1: walk 100.
    const m = from("f3")({ floorId: "f1", x: 100, y: 0 });
    expect(m.distanceFt).toBeCloseTo(100 + 60 + 100 + 60 + 100);
    expect(m.route?.map((r) => r.floorId)).toEqual(["f3", "f2", "f1"]);
  });

  it("climbs the same flights in reverse", () => {
    // Starting on f1's bottom landing: one flight, f2: walk 100, one flight, f3: walk 100.
    expect(from("f1")({ floorId: "f3", x: 0, y: 0 }).distanceFt).toBeCloseTo(60 + 100 + 60 + 100);
  });

  it("doesn't skip floors or join landings that share a suffix", () => {
    const skip = createDistanceMeasurer({
      from: { floorId: "f3", x: 0, y: 0 },
      floors,
      nodes: [flights[0], flights[1], flights[4], flights[5]],
      edges: [flightEdges[0], flightEdges[2]],
      floorChangePenaltyFt: 60,
    });
    expect(skip({ floorId: "f1", x: 100, y: 0 }).distanceMethod).toBe("estimate");
  });
});

describe("centroid", () => {
  it("averages polygon vertices", () => {
    expect(
      centroid([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]),
    ).toEqual([5, 5]);
  });
});
