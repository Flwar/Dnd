import { stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { assetManifest } from "@/lib/assets/manifest";

function localAssetPath(publicPath: string): string {
  return path.join(process.cwd(), "public", publicPath.replace(/^\/+/, ""));
}

describe("חדות נכסי רסטר", () => {
  it("שומר את כל רקעי המשחק ברזולוציה המתאימה למסכי Retina", async () => {
    const backgrounds = assetManifest.filter(
      (asset) => asset.type === "background" && asset.path.endsWith(".webp"),
    );

    expect(backgrounds.length).toBeGreaterThanOrEqual(33);

    for (const asset of backgrounds) {
      const filename = path.basename(asset.path);
      const filePath = localAssetPath(asset.path);
      const [metadata, file] = await Promise.all([sharp(filePath).metadata(), stat(filePath)]);

      if (filename === "social-preview.webp") {
        expect(metadata.width, asset.key).toBeGreaterThanOrEqual(1200);
        expect(metadata.height, asset.key).toBeGreaterThanOrEqual(630);
      } else if (filename.endsWith("-mobile.webp")) {
        expect(metadata.width, asset.key).toBeGreaterThanOrEqual(1152);
        expect(metadata.height, asset.key).toBeGreaterThanOrEqual(1440);
      } else {
        expect(metadata.width, asset.key).toBeGreaterThanOrEqual(1920);
        expect(metadata.height, asset.key).toBeGreaterThanOrEqual(1080);
      }

      expect(file.size, asset.key).toBeLessThan(1_500_000);
    }
  });

  it("שומר את דיוקנאות השחקנים ודמויות העולם חדים גם ב־DPR גבוה", async () => {
    const portraits = assetManifest.filter(
      (asset) => asset.type === "portrait" && asset.path.endsWith(".webp"),
    );

    expect(portraits.length).toBeGreaterThanOrEqual(36);

    for (const asset of portraits) {
      const filePath = localAssetPath(asset.path);
      const [metadata, file] = await Promise.all([sharp(filePath).metadata(), stat(filePath)]);

      expect(metadata.width, asset.key).toBeGreaterThanOrEqual(768);
      expect(metadata.height, asset.key).toBeGreaterThanOrEqual(960);
      expect(file.size, asset.key).toBeLessThan(750_000);
    }
  });

  it("שומר איור מלא וחד לכל מקצוע במקום תמונת placeholder", async () => {
    const classPreviews = assetManifest.filter(
      (asset) => asset.key.startsWith("class-") && asset.key.endsWith("-preview"),
    );

    expect(classPreviews).toHaveLength(7);
    for (const asset of classPreviews) {
      const filePath = localAssetPath(asset.path);
      const [metadata, file] = await Promise.all([sharp(filePath).metadata(), stat(filePath)]);

      expect(metadata.width, asset.key).toBeGreaterThanOrEqual(1280);
      expect(metadata.height, asset.key).toBeGreaterThanOrEqual(720);
      expect(file.size, asset.key).toBeLessThan(750_000);
    }
  });

  it("שומר את סמלי המלך קריאים וחדים גם במסך Retina", async () => {
    const kingAssetKeys = new Set([
      "ability-crown-shard-strike",
      "ability-royal-decree",
      "ability-sovereign-aegis",
      "item-shattered-king-crown",
    ]);
    const kingAssets = assetManifest.filter((asset) => kingAssetKeys.has(asset.key));

    expect(kingAssets).toHaveLength(4);
    for (const asset of kingAssets) {
      const filePath = localAssetPath(asset.path);
      const metadata = await sharp(filePath).metadata();

      expect(metadata.width, asset.key).toBeGreaterThanOrEqual(384);
      expect(metadata.height, asset.key).toBeGreaterThanOrEqual(384);
    }
  });
});
