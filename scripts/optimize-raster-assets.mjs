import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const argument = process.argv.find((value) => value.startsWith("--source-dir="));
const sourceDirectory = argument?.slice("--source-dir=".length) || process.env.SHATTERED_CROWN_SOURCE_ASSETS;

if (!sourceDirectory) {
  throw new Error(
    "Missing generated source directory. Pass --source-dir=<path> or set SHATTERED_CROWN_SOURCE_ASSETS.",
  );
}

const resolvedSourceDirectory = path.resolve(sourceDirectory);
const outputRoot = path.resolve("public/assets/rebuild");

const sources = {
  menu: "exec-a81f6ed1-cfbf-4421-8f0b-9d655fc71d79.png",
  village: "exec-e904e1eb-6d98-429a-8c28-b8f9f73da6e4.png",
  headmanHouse: "exec-ef70147f-c8ad-4d17-8ce3-d2a1655a0eb8.png",
  mineOne: "exec-95d1bc98-0133-4edf-8866-9facf575a2ca.png",
  mineTwo: "exec-6b21fe01-439a-41a2-983a-264bfb229e1b.png",
  playerPortraits: "exec-153520db-f345-4d0b-b8bd-7922f3700c7f.png",
  npcPortraits: "exec-7e993e9c-c1ea-4d1a-b256-cb870c28a6d4.png",
};

for (const filename of Object.values(sources)) {
  const sourcePath = path.join(resolvedSourceDirectory, filename);
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing source image: ${sourcePath}`);
}

const atlasCell = (column, row, cellWidth, cellHeight, inset = 3) => ({
  left: column * cellWidth + inset,
  top: row * cellHeight + inset,
  width: cellWidth - inset * 2,
  height: cellHeight - inset * 2,
});

const backgroundAssets = [
  { name: "menu-cinematic", source: sources.menu },
  { name: "village-gate", source: sources.village, extract: atlasCell(0, 0, 512, 512) },
  { name: "arfelon-square", source: sources.village, extract: atlasCell(1, 0, 512, 512) },
  { name: "wet-raven-inn", source: sources.village, extract: atlasCell(2, 0, 512, 512) },
  { name: "smithy", source: sources.village, extract: atlasCell(0, 1, 512, 512) },
  { name: "healer-hut", source: sources.village, extract: atlasCell(1, 1, 512, 512) },
  { name: "headman-house", source: sources.headmanHouse },
  { name: "mine-entrance", source: sources.mineOne, extract: atlasCell(0, 0, 768, 512, 4) },
  { name: "main-tunnel", source: sources.mineOne, extract: atlasCell(1, 0, 768, 512, 4) },
  { name: "abandoned-tool-store", source: sources.mineOne, extract: atlasCell(0, 1, 768, 512, 4) },
  { name: "flooded-passage", source: sources.mineOne, extract: atlasCell(1, 1, 768, 512, 4) },
  { name: "pillar-hall", source: sources.mineTwo, extract: atlasCell(0, 0, 768, 512, 4) },
  { name: "hidden-chamber", source: sources.mineTwo, extract: atlasCell(1, 0, 768, 512, 4) },
  { name: "guardian-sanctum", source: sources.mineTwo, extract: atlasCell(0, 1, 768, 512, 4) },
  { name: "shard-sanctum", source: sources.mineTwo, extract: atlasCell(1, 1, 768, 512, 4) },
];

const racePortraits = [
  ["human", 0, 0],
  ["elf", 1, 0],
  ["dwarf", 2, 0],
  ["halfling", 0, 1],
  ["orc", 1, 1],
  ["dragonborn", 2, 1],
];

const npcPortraits = [
  ["elric", 0, 0],
  ["mira", 1, 0],
  ["thal", 2, 0],
  ["brom", 0, 1],
  ["danor", 1, 1],
  ["grey-woman", 2, 1],
];

const portraitVariants = [
  { suffix: "01", position: "centre", modulate: { brightness: 0.96, saturation: 0.94 } },
  { suffix: "02", position: "west", modulate: { brightness: 0.98, saturation: 0.86 } },
  { suffix: "03", position: "east", modulate: { brightness: 1.01, saturation: 1.05 } },
  { suffix: "04", position: "attention", modulate: { brightness: 0.95, saturation: 1.02, hue: 8 } },
];

function sourcePipeline(asset) {
  const pipeline = sharp(path.join(resolvedSourceDirectory, asset.source), { failOn: "error" });
  return asset.extract ? pipeline.extract(asset.extract) : pipeline;
}

async function renderBackground(asset, mobile) {
  const width = mobile ? 1152 : 1920;
  const height = mobile ? 1440 : 1080;
  const suffix = mobile ? "-mobile" : "";
  const outputPath = path.join(outputRoot, "backgrounds", `${asset.name}${suffix}.webp`);

  await sourcePipeline(asset)
    .resize(width, height, {
      fit: "cover",
      position: "attention",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .sharpen({ sigma: 0.55, m1: 0.9, m2: 2 })
    .webp({ quality: 86, effort: 6, smartSubsample: true })
    .toFile(outputPath);

  return outputPath;
}

async function renderPortrait({ name, source, extract, position = "attention", modulate }) {
  const outputPath = path.join(outputRoot, "portraits", `${name}.webp`);
  let pipeline = sourcePipeline({ source, extract }).resize(768, 960, {
    fit: "cover",
    position,
    kernel: sharp.kernel.lanczos3,
    withoutEnlargement: false,
  });

  if (modulate) pipeline = pipeline.modulate(modulate);

  await pipeline
    .sharpen({ sigma: 0.5, m1: 0.85, m2: 1.8 })
    .webp({ quality: 87, effort: 6, smartSubsample: true })
    .toFile(outputPath);

  return outputPath;
}

const outputs = [];

for (const asset of backgroundAssets) {
  outputs.push(await renderBackground(asset, false));
  outputs.push(await renderBackground(asset, true));
}

for (const [race, column, row] of racePortraits) {
  for (const variant of portraitVariants) {
    outputs.push(
      await renderPortrait({
        name: `portrait-${race}-${variant.suffix}`,
        source: sources.playerPortraits,
        extract: atlasCell(column, row, 512, 512),
        position: variant.position,
        modulate: variant.modulate,
      }),
    );
  }
}

for (const [npc, column, row] of npcPortraits) {
  outputs.push(
    await renderPortrait({
      name: `portrait-npc-${npc}`,
      source: sources.npcPortraits,
      extract: atlasCell(column, row, 512, 512),
    }),
  );
}

console.log(`Optimized ${outputs.length} Retina-ready raster assets.`);
for (const output of outputs) console.log(path.relative(process.cwd(), output));

