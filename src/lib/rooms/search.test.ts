import { describe, expect, it, vi } from "vitest";
import type { RoomResult } from "./types";

vi.mock("@/lib/db", () => ({ db: {} }));
const { compareRooms } = await import("./search");

function room(name: string, over: Partial<RoomResult>): RoomResult {
  return {
    id: name,
    email: `${name}@rooms`,
    name,
    generatedName: null,
    buildingId: "b",
    buildingName: "HQ",
    floorId: "f",
    floorName: "2",
    capacity: 4,
    features: [],
    polygon: null,
    door: null,
    available: true,
    busy: [],
    distanceFt: 100,
    distanceMethod: "walking",
    matches: true,
    freeFor: null,
    ...over,
  };
}

const order = (rooms: RoomResult[], ...args: Parameters<typeof compareRooms>) =>
  [...rooms].sort(compareRooms(...args)).map((r) => r.name);

describe("compareRooms", () => {
  const rooms = [
    room("Cedar", { capacity: 12, distanceFt: 40 }),
    room("Birch", { capacity: 4, distanceFt: 90 }),
    room("Oak", { capacity: 8, distanceFt: 60, available: false }),
    room("Aspen", { capacity: 4, distanceFt: 40, available: null }),
  ];

  it("puts free rooms first, then the nearest", () => {
    expect(order(rooms, 4)).toEqual(["Cedar", "Birch", "Aspen", "Oak"]);
  });

  it("can prioritize the smallest room that fits", () => {
    expect(order(rooms, 4, "smallest")).toEqual(["Birch", "Cedar", "Aspen", "Oak"]);
  });

  it("can order by name within each availability group", () => {
    expect(order(rooms, 4, "name")).toEqual(["Birch", "Cedar", "Aspen", "Oak"]);
  });
});
