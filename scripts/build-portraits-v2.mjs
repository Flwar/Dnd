import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = path.resolve("assets/art-v2/portrait-sources");
const outputDirectory = path.resolve("public/assets/art-v2/portraits");

await fs.mkdir(outputDirectory, { recursive: true });
const sourceNames = (await fs.readdir(sourceDirectory))
  .filter((name) => /^portrait-.+-v2\.png$/.test(name))
  .sort();

if (sourceNames.length === 0) throw new Error(`No portrait *-v2.png sources found in ${sourceDirectory}`);

for (const sourceName of sourceNames) {
  const assetName = sourceName.replace(/-v2\.png$/, "");
  await sharp(path.join(sourceDirectory, sourceName), { failOn: "error" })
    .resize({ width: 960, height: 1200, fit: "cover", position: "attention", kernel: sharp.kernel.lanczos3 })
    .modulate({ brightness: 0.995, saturation: 0.9 })
    .sharpen({ sigma: 0.42, m1: 0.82, m2: 1.55 })
    .webp({ quality: 93, alphaQuality: 100, effort: 6, smartSubsample: false })
    .toFile(path.join(outputDirectory, `${assetName}.webp`));
}

console.log(`Built ${sourceNames.length} full-source portrait variants at 960x1200.`);
