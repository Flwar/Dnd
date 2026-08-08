import { describe, expect, it } from "vitest";
import {
  buildPublicPortraitUrl,
  detectCharacterPortraitFile,
  makeCustomPortraitKey,
  MAX_CHARACTER_PORTRAIT_BYTES,
  MAX_PORTRAIT_SOURCE_BYTES,
  TARGET_OPTIMIZED_PORTRAIT_BYTES,
  normalizeDeclaredPortraitMime,
  parseCustomPortraitKey,
} from "@/lib/portrait-upload";
import {
  fitPortraitDimensions,
  preparePortraitForUpload,
  validatePortraitSource,
} from "@/lib/portrait-upload-client";
import { characterDraftSchema } from "@/lib/validation/character";

const ownerId = "10000000-0000-4000-8000-000000000001";
const objectId = "20000000-0000-4000-8000-000000000002";

describe("character portrait validation", () => {
  it("detects JPEG, PNG, and WebP from their bytes", () => {
    expect(detectCharacterPortraitFile(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9])))
      .toEqual({ extension: "jpg", mimeType: "image/jpeg" });
    expect(detectCharacterPortraitFile(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
      .toEqual({ extension: "png", mimeType: "image/png" });
    expect(detectCharacterPortraitFile(new TextEncoder().encode("RIFF0000WEBP")))
      .toEqual({ extension: "webp", mimeType: "image/webp" });
  });

  it("rejects SVG and misleading image-like data", () => {
    expect(detectCharacterPortraitFile(new TextEncoder().encode("<svg><script /></svg>"))).toBeNull();
    expect(detectCharacterPortraitFile(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBeNull();
    expect(normalizeDeclaredPortraitMime("image/svg+xml")).toBeNull();
  });

  it("normalizes the only accepted declared MIME types", () => {
    expect(normalizeDeclaredPortraitMime("image/jpg")).toBe("image/jpeg");
    expect(normalizeDeclaredPortraitMime(" IMAGE/PNG ")).toBe("image/png");
    expect(normalizeDeclaredPortraitMime("image/webp")).toBe("image/webp");
    expect(normalizeDeclaredPortraitMime("text/html")).toBeNull();
  });

  it("round-trips strict owner-scoped custom keys", () => {
    const portraitKey = makeCustomPortraitKey(ownerId, objectId, "webp");
    expect(parseCustomPortraitKey(portraitKey)).toEqual({
      extension: "webp",
      mimeType: "image/webp",
      objectId,
      ownerId,
      portraitKey,
      storagePath: `${ownerId}/${objectId}.webp`,
    });
  });

  it("allows a validated custom key through the character draft boundary", () => {
    const result = characterDraftSchema.safeParse({
      name: "נריה",
      description: "",
      formOfAddress: "",
      raceId: "human",
      classId: "fighter",
      backgroundId: "former-soldier",
      portraitKey: makeCustomPortraitKey(ownerId, objectId, "png"),
      attributes: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects traversal, SVG, malformed UUIDs, and extra path segments", () => {
    expect(parseCustomPortraitKey(`custom:${ownerId}/../${objectId}.png`)).toBeNull();
    expect(parseCustomPortraitKey(`custom:${ownerId}/${objectId}.svg`)).toBeNull();
    expect(parseCustomPortraitKey(`custom:not-a-user/${objectId}.jpg`)).toBeNull();
    expect(parseCustomPortraitKey(`custom:${ownerId}/folder/${objectId}.jpg`)).toBeNull();
  });

  it("builds a stable public Storage URL without accepting path syntax from callers", () => {
    expect(buildPublicPortraitUrl(
      "https://example.supabase.co/",
      `${ownerId}/${objectId}.png`,
    )).toBe(
      `https://example.supabase.co/storage/v1/object/public/character-portraits/${ownerId}/${objectId}.png`,
    );
    expect(MAX_CHARACTER_PORTRAIT_BYTES).toBe(2_097_152);
  });

  it("accepts large camera sources up to 12 MB while preserving a sub-2 MB stored target", async () => {
    const source = { name: "camera.jpg", size: 9 * 1024 * 1024, type: "image/jpeg" } as File;
    const tooLarge = { ...source, size: MAX_PORTRAIT_SOURCE_BYTES + 1 } as File;
    const alreadyOptimized = { ...source, size: TARGET_OPTIMIZED_PORTRAIT_BYTES } as File;

    expect(validatePortraitSource(source)).toBeNull();
    expect(validatePortraitSource(tooLarge)).toContain("12 מגה־בייט");
    await expect(preparePortraitForUpload(alreadyOptimized)).resolves.toBe(alreadyOptimized);
    expect(TARGET_OPTIMIZED_PORTRAIT_BYTES).toBeLessThan(MAX_CHARACTER_PORTRAIT_BYTES);
  });

  it("fits large images inside 2048 pixels without distorting their aspect ratio", () => {
    expect(fitPortraitDimensions(4_032, 3_024)).toEqual({ width: 2_048, height: 1_536 });
    expect(fitPortraitDimensions(900, 1_600)).toEqual({ width: 900, height: 1_600 });
  });
});
