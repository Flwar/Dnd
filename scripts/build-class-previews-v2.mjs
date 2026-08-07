import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = path.resolve("assets/art-v2/class-sources");
const outputDirectory = path.resolve("public/assets/art-v2/classes");

await fs.mkdir(outputDirectory, { recursive: true });
const sourceNames = (await fs.readdir(sourceDirectory))
  .filter((name) => /^class-.+-preview-v2\.png$/.test(name))
  .sort();

if (sourceNames.length === 0) throw new Error(`No class preview sources found in ${sourceDirectory}`);

for (const sourceName of sourceNames) {
  const assetName = sourceName.replace(/-v2\.png$/, "");
  await sharp(path.join(sourceDirectory, sourceName), { failOn: "error" })
    .resize({ width: 1280, height: 720, fit: "cover", position: "attention", kernel: sharp.kernel.lanczos3 })
    .modulate({ saturation: 0.9 })
    .sharpen({ sigma: 0.44, m1: 0.88, m2: 1.58 })
    .webp({ quality: 92, effort: 6, smartSubsample: false })
    .toFile(path.join(outputDirectory, `${assetName}.webp`));
}

console.log(`Built ${sourceNames.length} authored class previews at 1280x720.`);
