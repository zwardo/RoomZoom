import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { floorImageFile } from "@/lib/floors/storage";
import { apiHandler, HttpError } from "@/lib/session";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export const GET = apiHandler<{ params: Promise<{ id: string }> }>(async (_req, _user, { params }) => {
  const { id } = await params;
  const floor = await db.floor.findUnique({ where: { id }, select: { imagePath: true } });
  if (!floor?.imagePath) throw new HttpError(404, "No image for this floor");

  const file = floorImageFile(floor.imagePath);
  const type = CONTENT_TYPES[path.extname(file).toLowerCase()];
  if (!type) throw new HttpError(415, "Unsupported floor image type");

  try {
    const bytes = await readFile(file);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=300",
        // Floor SVGs are rendered as images, but never let one run scripts if opened directly.
        "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
      },
    });
  } catch {
    throw new HttpError(404, "Floor image file is missing. Re-run the floor import.");
  }
});
