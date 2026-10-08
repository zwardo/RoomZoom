import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDesksCsv, parseRoomsCsv } from "./csv";

describe("parseRoomsCsv", () => {
  it("parses the sample file", () => {
    const { rows, errors } = parseRoomsCsv(readFileSync("data/samples/rooms.csv", "utf8"));
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(80);
    expect(rows[0]).toMatchObject({ name: "Dry Creek", building: "Building 2", floor: "4", capacity: 4, features: [] });
    expect(rows.find((r) => r.name === "Adam's Peak")).toMatchObject({ building: "Building 1", floor: "2", capacity: 11, features: ["Video conferencing", "TV"] });
    expect(rows.find((r) => r.name === "Mt. Hood")).toMatchObject({ capacity: null });
  });

  it("fills building, floor, capacity, and features from Google's generated names", () => {
    const { rows, errors } = parseRoomsCsv(
      "email,name,building,floor,capacity,features\n" +
        "c_hq2_oak@resource.calendar.google.com,HQ-2-Oak (8) [TV; Whiteboard],,,,\n" +
        "c_hq3_maple@resource.calendar.google.com,Maple,HQ,3,10,TV;Video conferencing",
    );
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ name: "Oak", building: "HQ", floor: "2", capacity: 8, features: ["TV", "Whiteboard"] });
    expect(rows[1]).toMatchObject({ name: "Maple", building: "HQ", floor: "3", capacity: 10 });
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

  it("reads a seating-chart export with title rows, locations, and placeholder desks", () => {
    const csv = [
      '"Seating Assignments\nWestminster Office",,,,,,',
      ",,,,,,",
      ",,,,,Building 2,",
      "Desk,Location,Employee Name,Employee Email,,Location,Vacant Desks",
      "1-1000,B1L1,Hunter Howard,hunter_howard@x.com,,L1,30",
      "1-1003,B1L1,Vacant,,,L2,31",
      "1-1004,B1L1,Aro Buckstein Intern,Aro_Buckstein@x.com,,,",
      "1-2000,B1L2,No Cube,,,,",
      "1-2052,B1L2,Vacant,reserved@x.com,,,",
      "1-2011,B1L2,Isa Fox,,,,",
      "1-1011,B1L1,(RDP),reserved@x.com,,,",
      "2-1006,B2L1,KPMG Consultant,reserved@x.com,,,",
      "1-3062,B1L3,CCFS LAB,curtis_warner@x.com,,,",
      "1-3084,B1L3,Curtis Warner,curtis_warner@x.com,,,",
    ].join("\n");
    const { rows, errors } = parseDesksCsv(csv);
    expect(rows).toEqual([
      { email: "hunter_howard@x.com", name: "Hunter Howard", deskLabel: "1-1000", buildingName: "Building 1", floorName: "1" },
      { email: "aro_buckstein@x.com", name: "Aro Buckstein", deskLabel: "1-1004", buildingName: "Building 1", floorName: "1" },
      { email: "curtis_warner@x.com", name: "Curtis Warner", deskLabel: "1-3084", buildingName: "Building 1", floorName: "3" },
    ]);
    expect(errors).toEqual([
      "Row 10: needs email and desk (Isa Fox at 1-2011)",
      "reserved@x.com is listed for 2 different people (1-1011, 2-1006); skipped",
      "curtis_warner@x.com is listed at 2 desks (1-3062, 1-3084); using 1-3084",
    ]);
  });
});
