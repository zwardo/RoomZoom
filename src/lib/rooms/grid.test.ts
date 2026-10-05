import { describe, expect, it } from "vitest";
import { roomColumns, slotStatus } from "./grid";
import type { RoomResult } from "./types";

function room(name: string, over: Partial<RoomResult> = {}): RoomResult {
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
    freeFor: [],
    ...over,
  };
}

describe("slotStatus", () => {
  const covered = new Set(["standup", "review"]);
  const meeting = (id: string, rooms: { email: string; status: string }[] = []) => ({
    id,
    rooms: rooms.map((r) => ({ ...r, name: r.email })),
  });

  it("marks the room already on the meeting as booked, even though free/busy shows it taken", () => {
    const oak = room("Oak", { freeFor: [] });
    expect(slotStatus(oak, meeting("standup", [{ email: "OAK@rooms", status: "accepted" }]), covered)).toBe("booked");
  });

  it("ignores rooms that declined the meeting", () => {
    const oak = room("Oak", { freeFor: [] });
    expect(slotStatus(oak, meeting("standup", [{ email: "Oak@rooms", status: "declined" }]), covered)).toBe("busy");
  });

  it("reports free and busy for the meetings that were checked", () => {
    const oak = room("Oak", { freeFor: ["review"] });
    expect(slotStatus(oak, meeting("review"), covered)).toBe("available");
    expect(slotStatus(oak, meeting("standup"), covered)).toBe("busy");
  });

  it("is unknown when free/busy couldn't be read or the meeting wasn't checked", () => {
    expect(slotStatus(room("Oak", { freeFor: null }), meeting("review"), covered)).toBe("unknown");
    expect(slotStatus(room("Oak", { freeFor: ["later"] }), meeting("later"), covered)).toBe("unknown");
  });
});

describe("roomColumns", () => {
  const rooms = [
    room("Aspen", { freeFor: ["a"] }),
    room("Birch", { freeFor: ["a", "b", "c"] }),
    room("Cedar", { freeFor: ["a", "b"], available: false }),
    room("Dogwood", { freeFor: null }),
    room("Elm", { matches: false }),
  ];
  const data = { rooms, favoriteIds: ["Cedar"], recentIds: ["Elm"] };
  const favorites = new Set(["Cedar"]);
  const isFavorite = (r: RoomResult) => favorites.has(r.id);
  const names = (list: RoomResult[]) => list.map((r) => r.name);

  it("lists favorites, then recent rooms, then best matches by how many meetings they're free for", () => {
    expect(names(roomColumns(data, { isFavorite, freeOnly: false, meetingSelected: false }))).toEqual([
      "Cedar",
      "Elm",
      "Birch",
      "Aspen",
      "Dogwood",
    ]);
  });

  it("leads with the best matches in search order once a meeting is selected", () => {
    expect(names(roomColumns(data, { isFavorite, freeOnly: false, meetingSelected: true }))).toEqual([
      "Aspen",
      "Birch",
      "Dogwood",
      "Cedar",
      "Elm",
    ]);
  });

  it("drops busy favorites and recent rooms when only free rooms are wanted", () => {
    expect(names(roomColumns(data, { isFavorite, freeOnly: true, meetingSelected: true }))).toEqual([
      "Aspen",
      "Birch",
      "Dogwood",
      "Elm",
    ]);
  });
});
