import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildNavGraph, parseFloorSvg, stripAnnotations } from "./svg-annotations";

const svg = readFileSync(path.join(process.cwd(), "prisma", "floors", "building-2-4.svg"), "utf8");

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
      expect(room.door).not.toBeNull();
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
    expect(seen.size).toBe(g.nodes.length);
    expect(g.nodes.filter((n) => n.connectorKey).map((n) => n.connectorKey)).toEqual(["stairs-west", "stairs-east", "elevator-main"]);
  });

  it("keeps the drawing visible once annotations are stripped", () => {
    const background = stripAnnotations(svg);
    expect(background).not.toMatch(/id="(room|desk|door|hall|scale)-/);
    // SVG masks are luminance-based; unpainted (black) mask shapes would hide the whole plan.
    expect(background.match(/<mask\b[\s\S]*?<\/mask>/g)?.every((m) => !/<path(?![^>]*fill="#fff")/.test(m))).toBe(true);
  });
});
