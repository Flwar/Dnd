import { assetManifestByKey } from "@/lib/assets/manifest";
import { parseCustomPortraitKey } from "@/lib/portrait-upload";

export const DEFAULT_PORTRAIT_KEY = "portrait-human-01";
export const CUSTOM_PORTRAIT_PREFIX = "custom:";

function isSafePortraitUrl(url: string): boolean {
  return url.startsWith("/") || url.startsWith("https://") || url.startsWith("blob:");
}

export function isCustomPortraitKey(portraitKey: string): boolean {
  return parseCustomPortraitKey(portraitKey) !== null;
}

export function isPresetPortraitKey(portraitKey: string): boolean {
  return assetManifestByKey[portraitKey]?.type === "portrait";
}

export function portraitAfterRaceChange(currentPortraitKey: string, nextRaceDefaultKey: string): string {
  return isCustomPortraitKey(currentPortraitKey) ? currentPortraitKey : nextRaceDefaultKey;
}

export function getPortraitSource(
  portraitKey: string,
  portraitUrl?: string | null,
): { kind: "preset" | "custom"; src: string } {
  if (portraitUrl && isSafePortraitUrl(portraitUrl)) {
    return { kind: "custom", src: portraitUrl };
  }
  if (isCustomPortraitKey(portraitKey)) {
    return {
      kind: "custom",
      src: `/api/character-portraits?portraitKey=${encodeURIComponent(portraitKey)}`,
    };
  }

  const preset = assetManifestByKey[portraitKey];
  if (preset?.type === "portrait") return { kind: "preset", src: preset.path };

  return {
    kind: "preset",
    src: assetManifestByKey[DEFAULT_PORTRAIT_KEY].path,
  };
}
