import type { CharacterRace } from "../types/game";

export const characterRaces: CharacterRace[] = [
  {
    id: "human", name: "אדם", lore: "בני האדם של ואלדר הקימו ממלכות לאורך הדרכים הישנות, והסתגלותם היא נשקם החזק ביותר.",
    passiveTrait: { id: "human-versatility", name: "רב־גוניות", description: "תוסף קטן לכל בדיקה שאינה מיומנות מקצועית.", iconAssetKey: "trait-human", maxStacks: 1, accuracyModifier: 1 },
    attributeEffects: { charisma: 1, constitution: 1 }, recommendedClasses: ["fighter", "cleric", "rogue"], portraitKeys: ["portrait-human-01", "portrait-human-02", "portrait-human-03", "portrait-human-04", "portrait-human-05"], gameplayEffect: "מקבל תוסף 1 לבדיקות מיומנות ללא הכשרה."
  },
  {
    id: "elf", name: "אלף", lore: "האלפים זוכרים שירים מלפני שבירת הכתר, גם אם אינם מבינים עוד את משמעותם.",
    passiveTrait: { id: "elven-senses", name: "חושי הדמדומים", description: "ראייה חדה מעניקה יתרון בגילוי מלכודות וסודות.", iconAssetKey: "trait-elf", maxStacks: 1, accuracyModifier: 1 },
    attributeEffects: { dexterity: 2, wisdom: 1 }, recommendedClasses: ["ranger", "mage", "rogue"], portraitKeys: ["portrait-elf-01", "portrait-elf-02", "portrait-elf-03", "portrait-elf-04", "portrait-elf-05"], gameplayEffect: "זוכה ביתרון בבדיקת תפיסה הראשונה בכל מיקום אפל."
  },
  {
    id: "dwarf", name: "גמד", lore: "מצודות הגמדים נחצבו סביב עורקי אבן עתיקים; הם יודעים מתי סלע שותק ומתי הוא מאזין.",
    passiveTrait: { id: "dwarven-resilience", name: "חוסן ההר", description: "עמידות לשחיתות ולרעלים שמקורם במעמקים.", iconAssetKey: "trait-dwarf", maxStacks: 1, armorModifier: 1 },
    attributeEffects: { constitution: 2, strength: 1 }, recommendedClasses: ["fighter", "cleric", "barbarian"], portraitKeys: ["portrait-dwarf-01", "portrait-dwarf-02", "portrait-dwarf-03", "portrait-dwarf-04", "portrait-dwarf-05"], gameplayEffect: "נזק מתמשך משחיתות מופחת בנקודה אחת לכל ערימה."
  },
  {
    id: "halfling", name: "בן מחצית", lore: "בני המחצית חיים בצדי הדרכים שנשכחו, ושורדים בזכות מזל, זריזות וקהילות נאמנות.",
    passiveTrait: { id: "halfling-luck", name: "מזל עיקש", description: "פעם בסצנה אפשר להטיל מחדש תוצאה טבעית של 1.", iconAssetKey: "trait-halfling", maxStacks: 1 },
    attributeEffects: { dexterity: 2, charisma: 1 }, recommendedClasses: ["rogue", "ranger", "cleric"], portraitKeys: ["portrait-halfling-01", "portrait-halfling-02", "portrait-halfling-03", "portrait-halfling-04", "portrait-halfling-05"], gameplayEffect: "תוצאת 1 טבעית ראשונה בסצנה מוטלת מחדש באופן אוטומטי."
  },
  {
    id: "orc", name: "אורק", lore: "שבטי האורקים נשבעו לפני דורות לשמור על גבולות הערפל, אף שרוב הממלכות שכחו את השבועה.",
    passiveTrait: { id: "orc-endurance", name: "סירוב ליפול", description: "פעם בקרב נשאר בנקודת חיים אחת במקום ליפול.", iconAssetKey: "trait-orc", maxStacks: 1, damageMultiplier: 1.05 },
    attributeEffects: { strength: 2, constitution: 1 }, recommendedClasses: ["barbarian", "fighter", "ranger"], portraitKeys: ["portrait-orc-01", "portrait-orc-02", "portrait-orc-03", "portrait-orc-04", "portrait-orc-05"], gameplayEffect: "שורד מכה קטלנית אחת בכל קרב עם נקודת חיים אחת."
  },
  {
    id: "dragonborn", name: "בן דרקון", lore: "בני הדרקון נושאים דם של ברית עתיקה ואש שזוכרת את היום שבו השמים נסדקו.",
    passiveTrait: { id: "dragon-breath", name: "נשימת גחלת", description: "פעם בקרב אפשר לצרוב אויב בלהבת אבות.", iconAssetKey: "trait-dragonborn", maxStacks: 1, damageMultiplier: 1.1 },
    attributeEffects: { strength: 1, charisma: 2 }, recommendedClasses: ["fighter", "barbarian", "mage"], portraitKeys: ["portrait-dragonborn-01", "portrait-dragonborn-02", "portrait-dragonborn-03", "portrait-dragonborn-04", "portrait-dragonborn-05"], gameplayEffect: "מקבל פעולת נשימה חד־פעמית הגורמת נזק אש ומצב בערה."
  },
];

export const racesById = Object.fromEntries(characterRaces.map((entry) => [entry.id, entry])) as Record<CharacterRace["id"], CharacterRace>;
