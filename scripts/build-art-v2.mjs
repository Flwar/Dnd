import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = path.resolve("assets/art-v2/sources");
const outputDirectory = path.resolve("public/assets/art-v2/backgrounds");

const focusByAsset = {
  "menu-cinematic": "centre",
  "village-gate": "centre",
  "arfelon-square": "centre",
  "wet-raven-inn": "centre",
  smithy: "attention",
  "healer-hut": "attention",
  "headman-house": "attention",
  "old-watchtower": "attention",
  "standing-stones": "centre",
  "mine-entrance": "centre",
  "main-tunnel": "attention",
  "abandoned-tool-store": "attention",
  "flooded-passage": "attention",
  "pillar-hall": "centre",
  "hidden-chamber": "centre",
  "guardian-sanctum": "centre",
  "shard-sanctum": "centre",
};

function grainBuffer(width, height, seed) {
  const bytes = Buffer.alloc(width * height * 4);
  let state = seed >>> 0;
  for (let index = 0; index < width * height; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const value = 104 + (state >>> 24) % 49;
    const offset = index * 4;
    bytes[offset] = value;
    bytes[offset + 1] = value;
    bytes[offset + 2] = value;
    bytes[offset + 3] = 18;
  }
  return { input: bytes, raw: { width, height, channels: 4 }, blend: "soft-light" };
}

function vignette(width, height) {
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="v" cx="50%" cy="43%" r="73%">
          <stop offset="54%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity=".32"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#v)"/>
    </svg>
  `);
}

async function renderVariant(sourcePath, outputPath, width, height, position, seed) {
  await sharp(sourcePath, { failOn: "error" })
    .resize({ width, height, fit: "cover", position, kernel: sharp.kernel.lanczos3, withoutEnlargement: false })
    .modulate({ brightness: 0.985, saturation: 0.86 })
    .sharpen({ sigma: 0.48, m1: 0.9, m2: 1.7 })
    .composite([
      grainBuffer(width, height, seed),
      { input: vignette(width, height), blend: "over" },
    ])
    .webp({ quality: 91, alphaQuality: 100, effort: 6, smartSubsample: false })
    .toFile(outputPath);
}

await fs.mkdir(outputDirectory, { recursive: true });
const sourceNames = (await fs.readdir(sourceDirectory))
  .filter((name) => name.endsWith("-v2.png"))
  .sort();

if (sourceNames.length === 0) throw new Error(`No *-v2.png sources found in ${sourceDirectory}`);

const built = [];
for (const sourceName of sourceNames) {
  const assetName = sourceName.replace(/-v2\.png$/, "");
  const sourcePath = path.join(sourceDirectory, sourceName);
  const position = focusByAsset[assetName] ?? "attention";
  const seed = [...assetName].reduce((sum, character) => (sum * 33 + character.charCodeAt(0)) >>> 0, 5381);
  const desktopPath = path.join(outputDirectory, `${assetName}.webp`);
  const mobilePath = path.join(outputDirectory, `${assetName}-mobile.webp`);
  await renderVariant(sourcePath, desktopPath, 1920, 1080, position, seed);
  await renderVariant(sourcePath, mobilePath, 1440, 1800, position, seed ^ 0x9e3779b9);
  built.push(desktopPath, mobilePath);
}

console.log(`Built ${built.length} art-directed background variants from ${sourceNames.length} native scene sources.`);
