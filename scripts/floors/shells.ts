import type { Point } from "@/lib/rooms/types";

/** What every floor of a building shares. Coordinates are typical-floor pixels. */
export interface BuildingShell {
  width: number;
  height: number;
  /** Outside face of the exterior wall; the wall is drawn `wallWidth` thick inside it. */
  outline: Point[];
  wallWidth: number;
  connectors: { type: "stairs" | "elevator"; key: string; at: Point }[];
  scale: { feet: number; from: Point; to: Point };
}

export const SHELLS = {
  // Outline is the B2F4 Figma frame's wall path (#mask_4 in building-2-4.svg), in the same order.
  "Building 2": {
    width: 4688,
    height: 2076,
    outline: [
      [4670.5, 2059.5], [4670.5, 1262.5], [4587, 1262.5], [4587, 825], [4670.5, 825],
      [4670.5, 16], [2548, 16], [2548, 84], [2148, 84], [2148, 16],
      [15.5, 16], [15.5, 824], [87.5, 824], [87.5, 1263], [15.5, 1263],
      [15.5, 2059.5], [2143.5, 2059.5], [2143.5, 1972], [2551, 1972], [2551, 2059.5],
    ],
    wallWidth: 16,
    connectors: [
      { type: "stairs", key: "west", at: [660, 795] },
      { type: "stairs", key: "east", at: [4022, 800] },
      { type: "elevator", key: "main", at: [2140, 1020] },
    ],
    scale: { feet: 240, from: [0, 2068], to: [4688, 2068] },
  },
  // Traced from B1F4.jpg. No CAD source; the scan gets Building 2's vertical correction and
  // the north bay sits above. The 270 ft scale spans the exterior wall's inside faces.
  "Building 1": {
    width: 4688,
    height: 2079,
    outline: [
      [4670.5, 2062.5], [4670.5, 1255], [4600.5, 1255], [4600.5, 887], [4670.5, 887],
      [4670.5, 84], [2588.5, 84], [2588.5, 175], [2542, 175], [2542, 16], [2287, 16], [2264, 175],
      [2115.5, 175], [2115.5, 84], [15.5, 84], [15.5, 887], [85, 887], [85, 1255], [15.5, 1255],
      [15.5, 2062.5], [2111, 2062.5], [2111, 1976.5], [2584, 1976.5], [2584, 2062.5],
    ],
    wallWidth: 16,
    connectors: [
      { type: "stairs", key: "west", at: [646, 845] },
      { type: "stairs", key: "east", at: [4040, 845] },
      { type: "elevator", key: "main", at: [2140, 1096] },
    ],
    scale: { feet: 270, from: [32, 2071], to: [4654, 2071] },
  },
} satisfies Record<string, BuildingShell>;

export type BuildingName = keyof typeof SHELLS;
