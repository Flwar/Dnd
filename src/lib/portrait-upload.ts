export const CHARACTER_PORTRAIT_BUCKET = "character-portraits";
export const MAX_CHARACTER_PORTRAIT_BYTES = 2 * 1024 * 1024;

export type CharacterPortraitExtension = "jpg" | "png" | "webp";
export type CharacterPortraitMime = "image/jpeg" | "image/png" | "image/webp";

export type DetectedPortraitFile = {
  extension: CharacterPortraitExtension;
  mimeType: CharacterPortraitMime;
};

export type ParsedCustomPortraitKey = DetectedPortraitFile & {
  ownerId: string;
  objectId: string;
  portraitKey: string;
  storagePath: string;
};

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const customPortraitKeyPattern = new RegExp(
  `^custom:(${UUID_PATTERN})/(${UUID_PATTERN})\\.(jpg|png|webp)$`,
);

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function asciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  return [...text].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}

export function detectCharacterPortraitFile(bytes: Uint8Array): DetectedPortraitFile | null {
  if (
    bytes.length >= 4 &&
    startsWithBytes(bytes, [0xff, 0xd8, 0xff]) &&
    bytes.at(-2) === 0xff &&
    bytes.at(-1) === 0xd9
  ) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }

  if (
    bytes.length >= 8 &&
    startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return { extension: "png", mimeType: "image/png" };
  }

  if (
    bytes.length >= 12 &&
    asciiAt(bytes, 0, "RIFF") &&
    asciiAt(bytes, 8, "WEBP")
  ) {
    return { extension: "webp", mimeType: "image/webp" };
  }

  return null;
}

export function normalizeDeclaredPortraitMime(value: string): CharacterPortraitMime | null {
  const mimeType = value.trim().toLowerCase();
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "image/jpeg";
  if (mimeType === "image/png") return "image/png";
  if (mimeType === "image/webp") return "image/webp";
  return null;
}

export function makeCustomPortraitKey(
  ownerId: string,
  objectId: string,
  extension: CharacterPortraitExtension,
): string {
  return `custom:${ownerId}/${objectId}.${extension}`;
}

export function parseCustomPortraitKey(value: unknown): ParsedCustomPortraitKey | null {
  if (typeof value !== "string") return null;
  const match = customPortraitKeyPattern.exec(value);
  if (!match) return null;
  const [, ownerId, objectId, extensionValue] = match;
  const extension = extensionValue as CharacterPortraitExtension;
  const mimeType: CharacterPortraitMime = extension === "jpg"
    ? "image/jpeg"
    : `image/${extension}` as CharacterPortraitMime;
  return {
    extension,
    mimeType,
    objectId,
    ownerId,
    portraitKey: value,
    storagePath: `${ownerId}/${objectId}.${extension}`,
  };
}

export function buildPublicPortraitUrl(supabaseUrl: string, storagePath: string): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${CHARACTER_PORTRAIT_BUCKET}/${encodedPath}`;
}
