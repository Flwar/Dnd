import type { Encounter, Enemy } from "../types/game";

const baseAttributes = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 6,
  wisdom: 8,
  charisma: 4,
};

export const enemies: Enemy[] = [
  {
    id: "corrupted-cave-rat",
    name: "עכברוש מערות מושחת",
    description: "יצור נפוח בגודל כלב קטן, ועורקי גביש שחור זורחים מתחת לפרוותו הרטובה.",
    portraitAssetKey: "enemy-corrupted-rat",
    level: 1,
    attributes: { ...baseAttributes, dexterity: 14, constitution: 12 },
    maximumHealth: 18,
    armor: 11,
    accuracy: 3,
    initiativeBonus: 2,
    abilityIds: ["enemy-corrupted-bite"],
    experienceReward: 70,
    lootTable: [
      { itemId: "black-crystal", chance: 0.35, minimumQuantity: 1, maximumQuantity: 1 },
      { itemId: "minor-healing-potion", chance: 0.12, minimumQuantity: 1, maximumQuantity: 1 },
    ],
    intentLabels: { "enemy-corrupted-bite": "מתכונן לזנק ולנשוך" },
  },
  {
    id: "fog-crawler",
    name: "זוחל ערפל",
    description: "גוף חיוור בעל שש גפיים שמטשטש בכל פעם שהעין מנסה להתמקד בו.",
    portraitAssetKey: "enemy-fog-crawler",
    level: 1,
    attributes: { ...baseAttributes, dexterity: 15, wisdom: 11 },
    maximumHealth: 24,
    armor: 12,
    accuracy: 4,
    initiativeBonus: 3,
    abilityIds: ["enemy-fog-claw", "enemy-corrupted-bite"],
    experienceReward: 90,
    lootTable: [{ itemId: "black-crystal", chance: 0.5, minimumQuantity: 1, maximumQuantity: 1 }],
    intentLabels: {
      "enemy-fog-claw": "טופריו נעלמים בתוך ערפל סמיך",
      "enemy-corrupted-bite": "מתכווץ לקראת זינוק",
    },
  },
  {
    id: "corrupted-mine-vermin",
    name: "שרץ מכרה מושחת",
    description: "טורף מערות קטן שעיניו נאטמו בגביש, אך הוא עוקב אחרי פעימות לב.",
    portraitAssetKey: "enemy-mine-vermin",
    level: 1,
    attributes: { ...baseAttributes, dexterity: 13, constitution: 9 },
    maximumHealth: 12,
    armor: 10,
    accuracy: 3,
    initiativeBonus: 1,
    abilityIds: ["enemy-corrupted-bite"],
    experienceReward: 40,
    lootTable: [],
    intentLabels: { "enemy-corrupted-bite": "מרחרח את הדם באוויר" },
  },
  {
    id: "ancient-stone-guardian",
    name: "שומר האבן העתיק",
    description: "פסל בזלת בגובה שלושה אנשים, לבו רונה כחולה וסביב מפרקיו כבולות שרשראות טקס שנקרעו.",
    portraitAssetKey: "enemy-stone-guardian",
    level: 2,
    attributes: { ...baseAttributes, strength: 18, constitution: 18, intelligence: 8, wisdom: 12 },
    maximumHealth: 82,
    armor: 18,
    accuracy: 5,
    initiativeBonus: -2,
    abilityIds: ["boss-defensive-stance", "boss-stone-slam", "boss-telegraph-crush", "boss-rune-crush"],
    experienceReward: 260,
    lootTable: [
      { itemId: "guardian-core", chance: 1, minimumQuantity: 1, maximumQuantity: 1 },
      { itemId: "fogglass-ring", chance: 0.35, minimumQuantity: 1, maximumQuantity: 1 },
    ],
    intentLabels: {
      "boss-defensive-stance": "לוחות הבזלת מתחילים להיסגר",
      "boss-stone-slam": "מגביה אגרוף סלע",
      "boss-telegraph-crush": "שתי ידיו עולות והרונות צורחות",
      "boss-rune-crush": "עוצמה מאגית עומדת להתרסק",
    },
    boss: {
      guardPoints: 3,
      exposedRuneStatusId: "exposed-rune",
      heavyAttackAbilityId: "boss-rune-crush",
      telegraphStatusId: "telegraphed",
      investigationAdvantageFlag: "guardian_rune_understood",
    },
  },
];

export const enemiesById = Object.fromEntries(enemies.map((enemy) => [enemy.id, enemy])) as Record<string, Enemy>;

export const encounters: Encounter[] = [
  {
    id: "tutorial-rat",
    name: "הרעב שמתחת לאבן",
    enemyIds: ["corrupted-cave-rat"],
    objective: "הבס את היצור המושחת ולמד להשתמש ביכולת, בהתגוננות ובשיקוי.",
    escapeDifficulty: 10,
    tutorialSteps: [
      "בחר יכולת ובחר את היצור כמטרה.",
      "שים לב למשאב ולזמן ההמתנה של כל יכולת.",
      "כאשר האויב מכין זינוק, אפשר להתגונן כדי לחזק את השריון.",
      "אם נפצעת, אפשר לפתוח את התיק ולהשתמש בשיקוי.",
    ],
    checkpointId: "checkpoint-mine-entrance",
  },
  {
    id: "road-ambush",
    name: "מארב בערפל",
    enemyIds: ["fog-crawler", "corrupted-mine-vermin"],
    objective: "שרדו את המארב בדרך למכרה.",
    escapeDifficulty: 13,
    checkpointId: "checkpoint-mine-road",
  },
  {
    id: "flooded-passage-pack",
    name: "ציידים במים",
    enemyIds: ["corrupted-mine-vermin", "corrupted-mine-vermin"],
    objective: "פנו את המעבר המוצף מבלי לאבד את ציוד האור.",
    escapeDifficulty: 12,
    checkpointId: "checkpoint-main-tunnel",
  },
  {
    id: "stone-guardian-boss",
    name: "המשמר האחרון",
    enemyIds: ["ancient-stone-guardian"],
    objective: "שברו את משמר האבן, חשפו את הרונה והביסו את השומר.",
    escapeDifficulty: 17,
    checkpointId: "checkpoint-guardian-hall",
  },
];

export const encountersById = Object.fromEntries(encounters.map((encounter) => [encounter.id, encounter])) as Record<string, Encounter>;
