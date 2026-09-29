import { describe, expect, it } from "vitest";
import { floorLevel, parseRoomName } from "./parse-room-name";

describe("parseRoomName", () => {
  it("parses the full Google format", () => {
    expect(parseRoomName("HQ-2-Oak (8) [TV, Whiteboard]")).toEqual({
      building: "HQ",
      floor: "2",
      name: "Oak",
      capacity: 8,
      features: ["TV", "Whiteboard"],
    });
  });

  it("detects a section when there are four parts", () => {
    expect(parseRoomName("HQ-3-East-Maple (12)")).toMatchObject({
      building: "HQ",
      floor: "3",
      section: "East",
      name: "Maple",
      capacity: 12,
    });
  });

  it("falls back to the raw name when the format is unknown", () => {
    expect(parseRoomName("Big Boardroom")).toEqual({ name: "Big Boardroom", features: [] });
  });
});

describe("floorLevel", () => {
  it.each([
    ["2", 2],
    ["L3", 3],
    ["Floor 4", 4],
    ["G", 0],
    ["B1", -1],
  ])("%s -> %d", (name, level) => expect(floorLevel(name)).toBe(level));
});
