import { describe, expect, it } from "vitest";
import {
  buildNavGraph,
  feetPerPixelFromScale,
  parseFloorSvg,
  parseTransform,
  pathPoints,
  stripAnnotations,
} from "./svg-annotations";

const SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 400 300">
  <image xlink:href="floor-2.jpg" width="400" height="300"/>
  <g transform="translate(10 20)">
    <rect id="room-Oak" x="0" y="0" width="100" height="50"/>
    <circle id="door_oak" cx="50" cy="50" r="3"/>
  </g>
  <g id="desk:2-114"><rect x="200" y="200" width="10" height="10"/></g>
  <path inkscape:label="hall" d="M0 100 H400"/>
  <path id="hall_2" d="M200 100 V300"/>
  <circle id="stairs-A" cx="390" cy="110" r="5"/>
  <line id="scale-40ft" x1="0" y1="290" x2="320" y2="290"/>
  <rect id="room" x="0" y="0" width="1" height="1"/>
  <text x="5" y="5">Oak</text>
</svg>`;

describe("parseFloorSvg", () => {
  const a = parseFloorSvg(SVG);

  it("reads size and background", () => {
    expect([a.width, a.height]).toEqual([400, 300]);
    expect(a.background).toEqual({ href: "floor-2.jpg" });
  });

  it("applies group transforms and pairs doors with rooms case-insensitively", () => {
    expect(a.rooms).toEqual([
      {
        key: "Oak",
        polygon: [
          [10, 20],
          [110, 20],
          [110, 70],
          [10, 70],
        ],
        door: [60, 70],
      },
    ]);
  });

  it("finds desks, halls, connectors and scale", () => {
    expect(a.desks).toEqual([{ label: "2-114", x: 205, y: 205 }]);
    expect(a.halls).toHaveLength(2);
    expect(a.connectors).toEqual([{ type: "stairs", key: "stairs-a", x: 390, y: 110 }]);
    expect(a.scale).toEqual({ feet: 40, lengthPx: 320 });
  });

  it("warns about unnamed annotations", () => {
    expect(a.warnings).toEqual([`"room" needs a name after "room"`]);
  });

  it("converts metric scale bars", () => {
    const m = parseFloorSvg(`<svg viewBox="0 0 10 10"><line id="scale 10m" x1="0" y1="0" x2="100" y2="0"/></svg>`);
    expect(m.scale?.feet).toBeCloseTo(32.8084);
  });
});

describe("buildNavGraph", () => {
  it("splits T-junctions and joins stairs to the nearest hallway", () => {
    const a = parseFloorSvg(SVG);
    const g = buildNavGraph(a.halls, a.connectors);
    // (0,100) (400,100) (200,100) (200,300) + stairs (390,110) + its join point (390,100)
    expect(g.nodes).toHaveLength(6);
    expect(g.nodes.find((n) => n.type === "stairs")?.connectorKey).toBe("stairs-a");
    const at = (x: number, y: number) => g.nodes.findIndex((n) => n.x === x && n.y === y);
    const connected = (p: number, q: number) => g.edges.some(([a, b]) => (a === p && b === q) || (a === q && b === p));
    expect(connected(at(0, 100), at(200, 100))).toBe(true);
    expect(connected(at(200, 100), at(200, 300))).toBe(true);
    expect(connected(at(0, 100), at(400, 100))).toBe(false);
    expect(connected(at(390, 110), at(390, 100))).toBe(true);
  });

  it("merges vertices within tolerance", () => {
    const g = buildNavGraph(
      [
        [
          [0, 0],
          [100, 0],
        ],
        [
          [103, 2],
          [103, 100],
        ],
      ],
      [],
    );
    expect(g.nodes).toHaveLength(3);
    expect(g.edges).toHaveLength(2);
  });
});

describe("helpers", () => {
  it("parses relative paths and curves to their end points", () => {
    expect(pathPoints("m10 10 h20 v20 c0 5 5 5 5 10 z M0 0 L1 1")).toEqual([
      [
        [10, 10],
        [30, 10],
        [30, 30],
        [35, 40],
        [10, 10],
      ],
      [
        [0, 0],
        [1, 1],
      ],
    ]);
  });

  it("composes transforms", () => {
    expect(parseTransform("translate(10,5) scale(2)")).toEqual([2, 0, 0, 2, 10, 5]);
  });

  it("computes feet per pixel from drawing scales", () => {
    // 1/8" = 1'-0" at 100 dpi: 12.5 px per foot
    expect(feetPerPixelFromScale(`1/8" = 1'-0"`, 100)).toBeCloseTo(0.08);
    expect(feetPerPixelFromScale("1/8", 100)).toBeCloseTo(0.08);
    // 1:96 is the same as 1/8" = 1'
    expect(feetPerPixelFromScale("1:96", 100)).toBeCloseTo(0.08);
    expect(feetPerPixelFromScale("oops", 100)).toBeNull();
    expect(feetPerPixelFromScale("1/8", 0)).toBeNull();
  });

  it("strips annotation layers but keeps the drawing", () => {
    const out = stripAnnotations(SVG);
    expect(out).toContain("<text");
    expect(out).not.toContain("room-Oak");
    expect(out).not.toContain("scale-40ft");
    expect(out).toContain("<image");
  });
});

describe("an SVG with an annotations layer", () => {
  // Figma names outlined text layers after their content.
  const SCOPED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <g id="plan"><path id="Room D" d="M0 0H5V5H0Z"/><path id="Elevator" d="M10 10H15"/></g>
    <g id="annotations">
      <rect id="room-oak" x="20" y="20" width="10" height="10"/>
      <circle id="door-oak" cx="25" cy="30" r="1"/>
    </g>
  </svg>`;

  it("reads only the layers inside it", () => {
    const a = parseFloorSvg(SCOPED);
    expect(a.rooms.map((r) => r.key)).toEqual(["oak"]);
    expect(a.connectors).toEqual([]);
    expect(a.warnings).toEqual([]);
  });

  it("keeps same-named drawing layers when stripping", () => {
    const out = stripAnnotations(SCOPED);
    expect(out).toContain(`id="Room D"`);
    expect(out).toContain(`id="Elevator"`);
    expect(out).not.toContain("room-oak");
  });
});
