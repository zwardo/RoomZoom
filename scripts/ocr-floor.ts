import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { db } from "@/lib/db";
import { buildStarterSvg, DEFAULT_DESK_PATTERN } from "@/lib/ocr/starter-svg";
import { detectWords, imageSize } from "@/lib/ocr/vision";

const USAGE = `Usage: npm run ocr:floor -- path/to/floor-2.jpg [--building HQ] [--desk-pattern "^2-\\d{3}$"]

Writes next to the image:
  floor-2.ocr.json       every word Cloud Vision found, with pixel boxes
  floor-2.starter.svg    the scan plus pre-placed desks and room placeholders to finish
                         in Inkscape/Figma, then import with npm run import:floor`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { building: { type: "string" }, "desk-pattern": { type: "string" } },
});
const file = positionals[0];
if (!file) {
  console.error(USAGE);
  process.exit(1);
}

const bytes = readFileSync(file);
const size = imageSize(bytes);
if (!size) throw new Error("Only JPG and PNG floor images are supported.");

console.log(`Reading text from ${path.basename(file)} (${size.width}×${size.height})…`);
const words = await detectWords(bytes);
const roomNames = values.building
  ? (await db.room.findMany({ where: { building: { name: values.building } }, select: { name: true } })).map((r) => r.name)
  : [];
const deskPattern = values["desk-pattern"] ? new RegExp(values["desk-pattern"], "i") : DEFAULT_DESK_PATTERN;

const base = file.replace(/\.[^.]+$/, "");
writeFileSync(`${base}.ocr.json`, JSON.stringify({ ...size, words }, null, 2));
writeFileSync(
  `${base}.starter.svg`,
  buildStarterSvg({ imageHref: path.basename(file), ...size, words, deskPattern, roomNames }),
);

const desks = new Set(words.filter((w) => deskPattern.test(w.text)).map((w) => w.text));
console.log(`  ${words.length} words, ${desks.size} look like desk labels (pattern ${deskPattern}).`);
if (values.building) console.log(`  matched ${roomNames.length ? "room names from the catalog" : "no catalog rooms (import rooms first)"}.`);
console.log(`  wrote ${base}.ocr.json and ${base}.starter.svg`);
