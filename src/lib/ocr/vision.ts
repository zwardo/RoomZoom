import { env } from "@/lib/env";

export interface OcrWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VisionVertex {
  x?: number;
  y?: number;
}

interface VisionResponse {
  responses?: {
    error?: { message: string };
    textAnnotations?: { description: string; boundingPoly?: { vertices?: VisionVertex[] } }[];
  }[];
  error?: { message: string };
}

/** Vision rejects JSON requests over ~10 MB; base64 adds a third. */
export const MAX_OCR_BYTES = 7 * 1024 * 1024;

/** Words with bounding boxes via Cloud Vision DOCUMENT_TEXT_DETECTION (good with small drawing text). */
export async function detectWords(image: Uint8Array): Promise<OcrWord[]> {
  if (!env.visionApiKey) throw new Error("Set GOOGLE_VISION_API_KEY (see docs/google-setup.md).");
  if (image.byteLength > MAX_OCR_BYTES) {
    throw new Error(`Image is ${(image.byteLength / 1e6).toFixed(1)} MB; export it under 7 MB (e.g. JPG quality 80).`);
  }
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(env.visionApiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: Buffer.from(image).toString("base64") },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["en"] },
        },
      ],
    }),
  });
  const body = (await res.json()) as VisionResponse;
  const first = body.responses?.[0];
  const error = body.error?.message ?? first?.error?.message;
  if (!res.ok || error) throw new Error(`Cloud Vision: ${error ?? res.statusText}`);

  // The first annotation is the whole text block; the rest are individual words.
  return (first?.textAnnotations ?? []).slice(1).flatMap((a) => {
    const v = a.boundingPoly?.vertices ?? [];
    if (!v.length) return [];
    const xs = v.map((p) => p.x ?? 0);
    const ys = v.map((p) => p.y ?? 0);
    const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
    return [{ text: a.description, x: x0, y: y0, width: Math.max(...xs) - x0, height: Math.max(...ys) - y0 }];
  });
}

/** Pixel size of a PNG or JPEG without decoding it. */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return { width: view.getUint32(16), height: view.getUint32(20) };
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    const length = view.getUint16(i + 2);
    // SOF0-SOF15, excluding DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}
