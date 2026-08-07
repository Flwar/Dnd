import type { CharacterClass } from "../types/game";

export const characterClasses: CharacterClass[] = [
  { id: "fighter", name: "לוחם", role: "מגן קדמי ושובר משמר", difficulty: "easy", startingHealth: 30, resourceType: "stamina", startingResource: 8, startingWeaponId: "iron-longsword", startingArmorId: "chain-shirt", startingAbilityIds: ["fighter-sword-strike", "fighter-shield-stance", "fighter-decisive-blow"], strengths: ["עמידות גבוהה", "שליטה במשמר", "נזק יציב"], weaknesses: ["טווח קצר", "מעט פתרונות קסומים"], recommendedAttributes: ["strength", "constitution"], previewAssetKey: "class-fighter-preview" },
  { id: "mage", name: "קוסם", role: "נזק מאגי ושליטה", difficulty: "hard", startingHealth: 19, resourceType: "mana", startingResource: 12, startingWeaponId: "ashwood-staff", startingArmorId: "traveler-robes", startingAbilityIds: ["mage-magic-missile", "mage-frost-shield", "mage-spark-flame"], strengths: ["נזק יסוד רב", "הגנה מאגית", "פגיעה מרחוק"], weaknesses: ["מעט חיים", "תלות במאנה"], recommendedAttributes: ["intelligence", "dexterity"], previewAssetKey: "class-mage-preview" },
  { id: "rogue", name: "נוכל", role: "פגיעות פתע ותמרון", difficulty: "hard", startingHealth: 22, resourceType: "focus", startingResource: 9, startingWeaponId: "balanced-dagger", startingArmorId: "dark-leather", startingAbilityIds: ["rogue-quick-stab", "rogue-sneak-attack", "rogue-vanish"], strengths: ["נזק מתפרץ", "זריזות", "גישה למסלולים נסתרים"], weaknesses: ["זקוק להכנה", "שריון קל"], recommendedAttributes: ["dexterity", "charisma"], previewAssetKey: "class-rogue-preview" },
  { id: "ranger", name: "סייר", role: "צייד מרחוק ועוקב", difficulty: "medium", startingHealth: 24, resourceType: "focus", startingResource: 10, startingWeaponId: "yew-bow", startingArmorId: "ranger-leathers", startingAbilityIds: ["ranger-precise-shot", "ranger-mark-prey", "ranger-hidden-step"], strengths: ["טווח", "סימון מטרות", "הישרדות"], weaknesses: ["פגיע מקרוב", "דורש בחירת מטרה"], recommendedAttributes: ["dexterity", "wisdom"], previewAssetKey: "class-ranger-preview" },
  { id: "cleric", name: "כוהן", role: "ריפוי והגנה מקודשת", difficulty: "medium", startingHealth: 25, resourceType: "faith", startingResource: 11, startingWeaponId: "temple-mace", startingArmorId: "temple-mail", startingAbilityIds: ["cleric-light-strike", "cleric-healing-prayer", "cleric-faith-shield"], strengths: ["ריפוי", "עמידות", "אור נגד שחיתות"], weaknesses: ["נזק מתון", "ניהול אמונה"], recommendedAttributes: ["wisdom", "constitution"], previewAssetKey: "class-cleric-preview" },
  { id: "barbarian", name: "ברברי", role: "נזק פראי והפחדה", difficulty: "medium", startingHealth: 34, resourceType: "rage", startingResource: 7, startingWeaponId: "two-handed-axe", startingArmorId: "hide-armor", startingAbilityIds: ["barbarian-axe-strike", "barbarian-rage", "barbarian-intimidating-roar"], strengths: ["מאגר חיים גדול", "נזק כבד", "החלשת אויבים"], weaknesses: ["שריון נמוך", "דיוק משתנה"], recommendedAttributes: ["strength", "constitution"], previewAssetKey: "class-barbarian-preview" },
  {
    id: "king",
    name: "מלך",
    role: "מנהיג שדה, מגן החבורה ונושא כוח הכתר",
    difficulty: "medium",
    startingHealth: 32,
    resourceType: "authority",
    startingResource: 10,
    startingWeaponId: "iron-longsword",
    startingArmorId: "chain-shirt",
    startingItemIds: ["crown-of-the-shattered-king"],
    startingAbilityIds: ["king-crown-shard-strike", "king-royal-decree", "king-sovereign-aegis"],
    strengths: ["שליטה בכל האויבים", "הגנת בעלי ברית", "כריזמה ועוצמה מאגית"],
    weaknesses: ["כוחות הכתר דורשים סמכות", "ניהול תזמון בין התקפה להגנה"],
    recommendedAttributes: ["charisma", "constitution"],
    previewAssetKey: "class-king-preview",
  },
];

export const classesById = Object.fromEntries(characterClasses.map((entry) => [entry.id, entry])) as Record<CharacterClass["id"], CharacterClass>;
