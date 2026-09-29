import { describe, expect, it } from "vitest";
import { parseFloorSvg } from "@/lib/floors/svg-annotations";
import { buildStarterSvg } from "./starter-svg";
import { imageSize } from "./vision";

describe("buildStarterSvg", () => {
  it("produces an SVG the floor importer understands", () => {
    const svg = buildStarterSvg({
      imageHref: "floor-2.jpg",
      width: 1000,
      height: 800,
      roomNames: ["Oak", "Board Room"],
      words: [
        { text: "2-114", x: 100, y: 100, width: 30, height: 10 },
        { text: "2-114", x: 500, y: 500, width: 30, height: 10 },
        { text: "OAK", x: 300, y: 200, width: 40, height: 12 },
        { text: "Kitchen", x: 600, y: 200, width: 60, height: 12 },
      ],
    });
    const a = parseFloorSvg(svg);
    expect([a.width, a.height]).toEqual([1000, 800]);
    expect(a.background?.href).toBe("floor-2.jpg");
    expect(a.desks).toEqual([{ label: "2-114", x: 115, y: 105 }]);
    expect(a.rooms.map((r) => r.key)).toEqual(["Oak"]);
    expect(a.scale?.feet).toBe(10);
    expect(a.warnings).toEqual([]);
  });
});

describe("imageSize", () => {
  it("reads PNG dimensions", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47]);
    new DataView(png.buffer).setUint32(16, 1200);
    new DataView(png.buffer).setUint32(20, 900);
    expect(imageSize(png)).toEqual({ width: 1200, height: 900 });
  });

  it("reads JPEG dimensions from the SOF marker", () => {
    const jpg = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0, length 4
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x84, 0x04, 0xb0, 0x03, // SOF0: 900 x 1200
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(imageSize(jpg)).toEqual({ width: 1200, height: 900 });
  });

  it("rejects other formats", () => {
    expect(imageSize(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });
});
