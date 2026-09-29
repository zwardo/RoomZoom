import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const FLOORS_DIR = path.join(process.cwd(), "data", "floors");

/** Resolves a stored imagePath, refusing anything that escapes data/floors. */
export function floorImageFile(imagePath: string) {
  return path.join(FLOORS_DIR, path.basename(imagePath));
}

export function floorImageName(buildingName: string, floorName: string, ext: string) {
  const slug = `${buildingName}-${floorName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}${ext.toLowerCase()}`;
}

export async function saveFloorImage(name: string, source: { file: string } | { bytes: Uint8Array | string }) {
  await mkdir(FLOORS_DIR, { recursive: true });
  const dest = floorImageFile(name);
  if ("file" in source) await copyFile(source.file, dest);
  else await writeFile(dest, source.bytes);
  return path.basename(dest);
}
