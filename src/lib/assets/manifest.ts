import type { AssetManifestEntry } from "@/types/game";

const GENERATED_LICENSE = "נכס מקורי שנוצר במיוחד עבור הכתר המנופץ באמצעות OpenAI image generation; ללא hotlink וללא רכיבי צד שלישי.";
const ROOT = "/assets/rebuild";

const backgroundNames = [
  "menu-cinematic",
  "village-gate",
  "arfelon-square",
  "wet-raven-inn",
  "smithy",
  "healer-hut",
  "headman-house",
  "mine-road",
  "mine-entrance",
  "main-tunnel",
  "abandoned-tool-store",
  "flooded-passage",
  "pillar-hall",
  "hidden-chamber",
  "guardian-sanctum",
  "shard-sanctum",
] as const;

export const racePortraitKeys = [
  "portrait-human-01", "portrait-human-02", "portrait-human-03", "portrait-human-04", "portrait-human-05",
  "portrait-elf-01", "portrait-elf-02", "portrait-elf-03", "portrait-elf-04", "portrait-elf-05",
  "portrait-dwarf-01", "portrait-dwarf-02", "portrait-dwarf-03", "portrait-dwarf-04", "portrait-dwarf-05",
  "portrait-halfling-01", "portrait-halfling-02", "portrait-halfling-03", "portrait-halfling-04", "portrait-halfling-05",
  "portrait-orc-01", "portrait-orc-02", "portrait-orc-03", "portrait-orc-04", "portrait-orc-05",
  "portrait-dragonborn-01", "portrait-dragonborn-02", "portrait-dragonborn-03", "portrait-dragonborn-04", "portrait-dragonborn-05",
] as const;

const npcPortraitKeys = [
  "portrait-npc-elric",
  "portrait-npc-mira",
  "portrait-npc-thal",
  "portrait-npc-brom",
  "portrait-npc-danor",
  "portrait-npc-grey-woman",
] as const;

const abilityKeys = [
  "ability-sword-strike", "ability-shield-stance", "ability-decisive-blow",
  "ability-magic-missile", "ability-frost-shield", "ability-spark-flame",
  "ability-quick-stab", "ability-sneak-attack", "ability-vanish",
  "ability-precise-shot", "ability-mark-prey", "ability-hidden-step",
  "ability-light-strike", "ability-healing-prayer", "ability-faith-shield",
  "ability-axe-strike", "ability-rage", "ability-intimidating-roar",
  "ability-corrupted-bite", "ability-fog-claw", "ability-stone-slam",
  "ability-basalt-guard", "ability-telegraph-crush", "ability-rune-crush",
] as const;

const itemKeys = [
  "item-iron-longsword", "item-chain-shirt", "item-ashwood-staff", "item-traveler-robes",
  "item-balanced-dagger", "item-dark-leather", "item-yew-bow", "item-ranger-leathers",
  "item-temple-mace", "item-temple-mail", "item-two-handed-axe", "item-hide-armor",
  "item-soldier-rope", "item-scholars-lens", "item-hunting-trap", "item-lockpick-set",
  "item-signet-ring", "item-temple-incense", "item-lucky-copper", "item-village-torch",
  "item-healing-potion", "item-healers-salve", "item-miners-pick", "item-foreman-journal",
  "item-rune-hammer", "item-black-crystal", "item-cult-medallion", "item-fogglass-ring",
  "item-first-crown-shard", "item-guardian-core",
] as const;

const generated = (
  key: string,
  path: string,
  type: AssetManifestEntry["type"],
): AssetManifestEntry => ({ key, path, type, source: "generated", license: GENERATED_LICENSE });

export const assetManifest: AssetManifestEntry[] = [
  generated("background-social-preview", `${ROOT}/backgrounds/social-preview.webp`, "background"),
  ...backgroundNames.flatMap((name) => [
    generated(`background-${name}`, `${ROOT}/backgrounds/${name}.webp`, "background"),
    generated(`background-${name}-mobile`, `${ROOT}/backgrounds/${name}-mobile.webp`, "background"),
  ]),
  ...racePortraitKeys.map((key) => generated(key, `${ROOT}/portraits/${key}.webp`, "portrait")),
  ...npcPortraitKeys.map((key) => generated(key, `${ROOT}/portraits/${key}.webp`, "portrait")),
  ...abilityKeys.map((key) => generated(key, `${ROOT}/icons/abilities/${key}.webp`, "ability")),
  ...itemKeys.map((key) => generated(key, `${ROOT}/icons/items/${key}.webp`, "item")),
  generated("ability-crown-shard-strike", `${ROOT}/icons/abilities/ability-crown-shard-strike.svg`, "ability"),
  generated("ability-royal-decree", `${ROOT}/icons/abilities/ability-royal-decree.svg`, "ability"),
  generated("ability-sovereign-aegis", `${ROOT}/icons/abilities/ability-sovereign-aegis.svg`, "ability"),
  generated("item-shattered-king-crown", `${ROOT}/icons/items/item-shattered-king-crown.svg`, "item"),
];

export const assetManifestByKey = Object.fromEntries(
  assetManifest.map((entry) => [entry.key, entry]),
) as Record<string, AssetManifestEntry>;

export function getAssetPath(key: string): string {
  const entry = assetManifestByKey[key];
  if (!entry) {
    throw new Error(`Unknown asset key: ${key}`);
  }
  return entry.path;
}
