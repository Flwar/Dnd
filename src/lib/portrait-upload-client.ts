import {
  MAX_CHARACTER_PORTRAIT_BYTES,
  MAX_PORTRAIT_EDGE_PIXELS,
  MAX_PORTRAIT_SOURCE_BYTES,
  TARGET_OPTIMIZED_PORTRAIT_BYTES,
} from "@/lib/portrait-upload";
import { isCustomPortraitKey } from "@/lib/portraits";

const ALLOWED_PORTRAIT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const QUALITY_STEPS = [0.92, 0.86, 0.8, 0.74, 0.68] as const;
const MAX_RESIZE_PASSES = 4;

export type PortraitUploadResult = {
  portraitKey: string;
  portraitUrl: string;
  originalBytes: number;
  storedBytes: number;
  optimized: boolean;
};

type DecodedPortrait = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

export class PortraitPreparationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortraitPreparationError";
  }
}

export function validatePortraitSource(file: File): string | null {
  if (!ALLOWED_PORTRAIT_TYPES.has(file.type.toLowerCase())) {
    return "אפשר להעלות תמונת JPG, PNG או WebP בלבד.";
  }
  if (!file.size) return "קובץ התמונה ריק. יש לבחור תמונה אחרת.";
  if (file.size > MAX_PORTRAIT_SOURCE_BYTES) {
    return "התמונה גדולה מ־12 מגה־בייט. יש לבחור קובץ קטן יותר.";
  }
  return null;
}

export function fitPortraitDimensions(
  width: number,
  height: number,
  maximumEdge = MAX_PORTRAIT_EDGE_PIXELS,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new PortraitPreparationError("לא הצלחנו לקרוא את ממדי התמונה.");
  }
  const scale = Math.min(1, maximumEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodePortrait(file: File): Promise<DecodedPortrait> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Some older Safari releases expose createImageBitmap but cannot decode every JPEG.
    }
  }

  if (typeof document === "undefined") {
    throw new PortraitPreparationError("הדפדפן אינו תומך בעיבוד התמונה הזאת.");
  }

  const objectUrl = URL.createObjectURL(file);
  const image = document.createElement("img");
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
      image.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new PortraitPreparationError("לא הצלחנו לקרוא את התמונה. נסו לשמור אותה כ־JPG או WebP ולהעלות שוב.");
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: "image/webp" | "image/jpeg", quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encodePortrait(canvas: HTMLCanvasElement): Promise<Blob | null> {
  for (const quality of QUALITY_STEPS) {
    const webp = await canvasToBlob(canvas, "image/webp", quality);
    if (webp?.type === "image/webp" && webp.size <= TARGET_OPTIMIZED_PORTRAIT_BYTES) return webp;
  }

  for (const quality of QUALITY_STEPS) {
    const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
    if (jpeg?.type === "image/jpeg" && jpeg.size <= TARGET_OPTIMIZED_PORTRAIT_BYTES) return jpeg;
  }
  return null;
}

export async function preparePortraitForUpload(file: File): Promise<File> {
  const validationError = validatePortraitSource(file);
  if (validationError) throw new PortraitPreparationError(validationError);

  if (file.size <= TARGET_OPTIMIZED_PORTRAIT_BYTES) return file;

  const decoded = await decodePortrait(file);
  try {
    let dimensions = fitPortraitDimensions(decoded.width, decoded.height);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new PortraitPreparationError("הדפדפן אינו תומך בעיבוד התמונה הזאת.");

    for (let pass = 0; pass < MAX_RESIZE_PASSES; pass += 1) {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

      const encoded = await encodePortrait(canvas);
      if (encoded && encoded.size <= MAX_CHARACTER_PORTRAIT_BYTES) {
        const extension = encoded.type === "image/jpeg" ? "jpg" : "webp";
        const baseName = file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "portrait";
        return new File([encoded], `${baseName}.${extension}`, {
          type: encoded.type,
          lastModified: Date.now(),
        });
      }

      dimensions = {
        width: Math.max(1, Math.round(dimensions.width * 0.82)),
        height: Math.max(1, Math.round(dimensions.height * 0.82)),
      };
    }
  } finally {
    decoded.dispose();
  }

  throw new PortraitPreparationError("לא הצלחנו לכווץ את התמונה בלי לפגוע באיכות. נסו תמונה אחרת.");
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null) as { message?: unknown; error?: unknown } | null;
  if (typeof body?.message === "string") return body.message;
  if (typeof body?.error === "string") return body.error;
  return fallback;
}

export async function uploadPortrait(file: File): Promise<PortraitUploadResult> {
  const prepared = await preparePortraitForUpload(file);
  const formData = new FormData();
  formData.set("file", prepared);
  const response = await fetch("/api/character-portraits", { method: "POST", body: formData });
  if (!response.ok) {
    throw new PortraitPreparationError(await responseMessage(
      response,
      "לא הצלחנו להעלות את התמונה. אפשר לנסות שוב.",
    ));
  }

  const body = await response.json() as { portraitKey?: unknown; portraitUrl?: unknown };
  if (
    typeof body.portraitKey !== "string"
    || !isCustomPortraitKey(body.portraitKey)
    || typeof body.portraitUrl !== "string"
  ) {
    throw new PortraitPreparationError("שרת התמונות החזיר תשובה לא תקינה. אפשר לנסות שוב.");
  }

  return {
    portraitKey: body.portraitKey,
    portraitUrl: body.portraitUrl,
    originalBytes: file.size,
    storedBytes: prepared.size,
    optimized: prepared !== file,
  };
}

export async function deletePortrait(portraitKey: string): Promise<void> {
  const response = await fetch("/api/character-portraits", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ portraitKey }),
  });
  if (!response.ok) {
    throw new PortraitPreparationError(await responseMessage(
      response,
      "לא הצלחנו להסיר את התמונה. אפשר לנסות שוב.",
    ));
  }
}
