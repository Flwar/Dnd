import { assetManifestByKey } from "@/lib/assets/manifest";

const FALLBACK_PORTRAIT = "/assets/rebuild/portraits/portrait-human-01.webp";

export function getPartyPortraitPath(portraitKey: string): string {
  return assetManifestByKey[portraitKey]?.path ?? FALLBACK_PORTRAIT;
}
