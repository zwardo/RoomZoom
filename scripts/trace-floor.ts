import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderFloor, type FloorSpec } from "./floors/draw";

const USAGE = `Usage: npm run trace:floor -- <spec>...   e.g. building-2-1, or --all

Renders scripts/floors/specs/<spec>.ts to prisma/floors/<spec>.svg on the
building's shared outline. Import the result with --theme dark.`;

const specsDir = path.join(import.meta.dirname, "floors", "specs");
const args = process.argv.slice(2);
const names = args.includes("--all") ? readdirSync(specsDir).filter((f) => f.endsWith(".ts")).map((f) => f.slice(0, -3)) : args;
if (!names.length) {
  console.error(USAGE);
  process.exit(1);
}

for (const name of names) {
  const spec: FloorSpec = (await import(path.join(specsDir, `${name}.ts`))).default;
  const target = path.join(process.cwd(), "prisma", "floors", `${name}.svg`);
  writeFileSync(target, renderFloor(spec));
  console.log(`${spec.building} floor ${spec.floor} -> ${path.relative(process.cwd(), target)}`);
}
