import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { applyFloorAnnotation } from "@/lib/floors/apply";
import { floorImageName, saveFloorImage } from "@/lib/floors/storage";
import { feetPerPixelFromScale, parseFloorSvg, stripAnnotations } from "@/lib/floors/svg-annotations";

const USAGE = `Usage: npm run import:floor -- --building HQ --floor 2 --svg path/to/floor.svg [options]

  --image <file>            Background image (JPG/PNG). Defaults to the SVG's embedded
                            <image>, or the SVG itself with annotation layers removed.
  --feet-per-pixel <n>      Override the scale.
  --scale <s> --dpi <n>     Scale from the drawing, e.g. --scale 1/8 (1/8" = 1'-0") or 1:100.
  --tolerance <px>          Snap distance for joining hallway lines (default 8).

Layer names: room-<name>, door-<name>, desk-<label>, hall, stairs-<key>,
elevator-<key>, scale-<n>ft. See README "Floor plans".`;

const { values } = parseArgs({
  options: {
    building: { type: "string" },
    floor: { type: "string" },
    svg: { type: "string" },
    image: { type: "string" },
    "feet-per-pixel": { type: "string" },
    scale: { type: "string" },
    dpi: { type: "string" },
    tolerance: { type: "string" },
  },
});

if (!values.building || !values.floor || !values.svg) {
  console.error(USAGE);
  process.exit(1);
}

const svgPath = path.resolve(values.svg);
const svgText = readFileSync(svgPath, "utf8");
const annotation = parseFloorSvg(svgText);
annotation.warnings.forEach((w) => console.warn(`  ! ${w}`));
if (!annotation.width || !annotation.height) {
  console.error("The SVG needs a viewBox (or width/height) matching the floor image size.");
  process.exit(1);
}

const name = (ext: string) => floorImageName(values.building!, values.floor!, ext);
let imagePath: string;
const href = annotation.background?.href;
if (values.image) {
  imagePath = await saveFloorImage(name(path.extname(values.image)), { file: path.resolve(values.image) });
} else if (href?.startsWith("data:image/")) {
  const [, mime, data] = href.match(/^data:image\/([\w+]+);base64,(.*)$/s) ?? [];
  if (!data) throw new Error("Embedded image isn't base64 encoded");
  const ext = mime === "jpeg" ? ".jpg" : `.${mime.replace("+xml", "")}`;
  imagePath = await saveFloorImage(name(ext), { bytes: Buffer.from(data, "base64") });
} else if (href && existsSync(path.resolve(path.dirname(svgPath), href))) {
  imagePath = await saveFloorImage(name(path.extname(href)), { file: path.resolve(path.dirname(svgPath), href) });
} else {
  imagePath = await saveFloorImage(name(".svg"), { bytes: stripAnnotations(svgText) });
  console.log("  i No background image found; using the SVG drawing itself (annotation layers removed).");
}

let feetPerPixel: number | null = null;
if (values["feet-per-pixel"]) feetPerPixel = Number(values["feet-per-pixel"]);
else if (values.scale) {
  feetPerPixel = feetPerPixelFromScale(values.scale, Number(values.dpi));
  if (!feetPerPixel) throw new Error(`Couldn't read --scale "${values.scale}" with --dpi ${values.dpi ?? "(missing)"}`);
}

const result = await applyFloorAnnotation({
  buildingName: values.building,
  floorName: values.floor,
  annotation,
  imagePath,
  feetPerPixel,
  navTolerancePx: values.tolerance ? Number(values.tolerance) : undefined,
});

console.log(`Floor ${values.building} ${values.floor}: ${annotation.width}×${annotation.height}px, image ${imagePath}`);
console.log(
  `  scale: ${result.feetPerPixel ? `${result.feetPerPixel.toFixed(4)} ft/px (${(annotation.width * result.feetPerPixel).toFixed(0)} ft wide)` : "none. Add a scale-<n>ft line or pass --feet-per-pixel"}`,
);
console.log(`  rooms mapped: ${result.roomsMapped.length}${result.roomsMapped.length ? ` (${result.roomsMapped.join(", ")})` : ""}`);
if (result.roomsUnmatched.length) console.warn(`  ! rooms not in the catalog: ${result.roomsUnmatched.join(", ")}`);
console.log(`  desks: ${result.desks}, hallway graph: ${result.navNodes} nodes / ${result.navEdges} edges`);
