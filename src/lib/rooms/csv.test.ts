import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDesksCsv, parseRoomsCsv } from "./csv";

describe("parseRoomsCsv", () => {
  it("parses the sample file, mixing generated names and explicit columns", () => {
    const { rows, errors } = parseRoomsCsv(readFileSync("data/samples/rooms.csv", "utf8"));
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(10);
    expect(rows[0]).toMatchObject({ name: "Oak", building: "HQ", floor: "2", capacity: 8, features: ["TV", "Whiteboard"] });
    expect(rows[5]).toMatchObject({ name: "Maple", building: "HQ", floor: "3", capacity: 10 });
  });

  it("reports rows without building/floor", () => {
    const { rows, errors } = parseRoomsCsv("email,name\nx@resource.calendar.google.com,Boardroom");
    expect(rows).toEqual([]);
    expect(errors[0]).toMatch(/building and floor/);
  });
});

describe("parseDesksCsv", () => {
  it("accepts desk or deskLabel headers", () => {
    const { rows } = parseDesksCsv("Email,Desk Label,Floor\nA@x.com,2-014,2");
    expect(rows).toEqual([{ email: "a@x.com", deskLabel: "2-014", floorName: "2", buildingName: undefined, name: undefined }]);
  });
});
