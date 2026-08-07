import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = path.resolve("assets/art-v2/icon-sources");
const outputDirectory = path.resolve("public/assets/art-v2/icons");

await fs.mkdir(outputDirectory, { recursive: true });
const sourceNames = (await fs.readdir(sourceDirectory))
  .filter((name) => /-v2\.png$/.test(name))
  .sort();

if (sourceNames.length === 0) throw new Error(`No icon *-v2.png sources found in ${sourceDirectory}`);

for (const sourceName of sourceNames) {
  const assetName = sourceName.replace(/-v2\.png$/, "");
  await sharp(path.join(sourceDirectory, sourceName), { failOn: "error" })
    .resize({ width: 384, height: 384, fit: "cover", position: "attention", kernel: sharp.kernel.lanczos3 })
    .modulate({ saturation: 0.92 })
    .sharpen({ sigma: 0.46, m1: 0.92, m2: 1.65 })
    .webp({ quality: 94, effort: 6, smartSubsample: false })
    .toFile(path.join(outputDirectory, `${assetName}.webp`));
}

console.log(`Built ${sourceNames.length} authored icon variants at 384x384.`);
