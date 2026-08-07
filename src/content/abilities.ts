import type { Ability } from "../types/game";

export const abilities: Ability[] = [
  {
    id: "fighter-sword-strike", classId: "fighter", name: "מכת חרב", description: "חיתוך מאוזן ואמין נגד אויב יחיד.", iconAssetKey: "ability-sword-strike", cost: 0, cooldown: 0, target: "enemy",
    formula: { diceCount: 1, diceSides: 8, flatBonus: 2, attribute: "strength", damageType: "physical" }, animationKey: "slash", soundKey: "sword-impact", statusEffects: [], availability: { kind: "always" }, logText: "{actor} מניף חרב לעבר {target}."
  },
  {
    id: "fighter-shield-stance", classId: "fighter", name: "עמידת מגן", description: "מעלה את השריון ומייצבת את העמידה לשני תורות.", iconAssetKey: "ability-shield-stance", cost: 2, cooldown: 3, target: "self",
    animationKey: "shield-rise", soundKey: "shield-block", statusEffects: [{ statusId: "guarded", duration: 2, chance: 1 }], availability: { kind: "self-status-absent", statusId: "guarded" }, logText: "{actor} ננעל מאחורי המגן."
  },
  {
    id: "fighter-decisive-blow", classId: "fighter", name: "מכה מכרעת", description: "מכה כבדה שמנצלת פרצה בהגנת האויב.", iconAssetKey: "ability-decisive-blow", cost: 4, cooldown: 2, target: "enemy",
    formula: { diceCount: 2, diceSides: 8, flatBonus: 2, attribute: "strength", damageType: "physical" }, animationKey: "heavy-cleave", soundKey: "critical-impact", statusEffects: [{ statusId: "stunned", duration: 1, chance: 0.2 }], availability: { kind: "always" }, logText: "{actor} מרכז את כל כוחו במכה אחת."
  },
  {
    id: "mage-magic-missile", classId: "mage", name: "קליע מאגי", description: "שני ניצוצות מכושפים ננעצים במטרה בדיוק גבוה.", iconAssetKey: "ability-magic-missile", cost: 2, cooldown: 0, target: "enemy",
    formula: { diceCount: 2, diceSides: 4, flatBonus: 2, attribute: "intelligence", damageType: "arcane" }, animationKey: "arcane-bolts", soundKey: "magic-cast", statusEffects: [], availability: { kind: "always" }, logText: "קליעים כחולים מזנקים מידי {actor}."
  },
  {
    id: "mage-frost-shield", classId: "mage", name: "מגן כפור", description: "מעטה קרח מגן על המטיל ומאט את התוקף הבא.", iconAssetKey: "ability-frost-shield", cost: 3, cooldown: 3, target: "self",
    animationKey: "frost-shell", soundKey: "ice-shield", statusEffects: [{ statusId: "guarded", duration: 2, chance: 1 }, { statusId: "regenerating", duration: 2, chance: 1 }], availability: { kind: "self-status-absent", statusId: "guarded" }, logText: "כפור מתגבש סביב {actor}."
  },
  {
    id: "mage-spark-flame", classId: "mage", name: "להבת ניצוץ", description: "להבה זריזה שעלולה להצית את המטרה לאורך זמן.", iconAssetKey: "ability-spark-flame", cost: 3, cooldown: 1, target: "enemy",
    formula: { diceCount: 1, diceSides: 10, flatBonus: 1, attribute: "intelligence", damageType: "fire" }, animationKey: "spark-flame", soundKey: "fire-cast", statusEffects: [{ statusId: "burning", duration: 3, chance: 0.75 }], availability: { kind: "always" }, logText: "להבת ניצוץ בוקעת מכף ידו של {actor}."
  },
  {
    id: "rogue-quick-stab", classId: "rogue", name: "דקירה מהירה", description: "התקפה קלה שאינה גוזלת תנופה.", iconAssetKey: "ability-quick-stab", cost: 0, cooldown: 0, target: "enemy",
    formula: { diceCount: 1, diceSides: 6, flatBonus: 2, attribute: "dexterity", damageType: "piercing" }, animationKey: "quick-stab", soundKey: "dagger-impact", statusEffects: [{ statusId: "bleeding", duration: 2, chance: 0.25 }], availability: { kind: "always" }, logText: "{actor} שולח להב מהיר אל {target}."
  },
  {
    id: "rogue-sneak-attack", classId: "rogue", name: "מכת פתע", description: "דקירה כבדה; סימון המטרה או יציאה מן הצל מעצימים אותה עוד יותר.", iconAssetKey: "ability-sneak-attack", cost: 3, cooldown: 2, target: "enemy",
    formula: { diceCount: 3, diceSides: 6, flatBonus: 0, attribute: "dexterity", damageType: "piercing" }, animationKey: "shadow-strike", soundKey: "critical-impact", statusEffects: [{ statusId: "bleeding", duration: 3, chance: 0.7 }], availability: { kind: "always" }, logText: "{actor} מופיע בנקודת התורפה של {target}."
  },
  {
    id: "rogue-vanish", classId: "rogue", name: "היעלמות בצל", description: "נבלע בחשכה וזוכה בדיוק ובעוצמה בפגיעה הבאה.", iconAssetKey: "ability-vanish", cost: 2, cooldown: 3, target: "self",
    animationKey: "shadow-fade", soundKey: "shadow-step", statusEffects: [{ statusId: "hidden", duration: 2, chance: 1 }], availability: { kind: "self-status-absent", statusId: "hidden" }, logText: "הצללים נסגרים סביב {actor}."
  },
  {
    id: "ranger-precise-shot", classId: "ranger", name: "ירייה מדויקת", description: "חץ מחושב המתעלם מחלק מהגנת המטרה.", iconAssetKey: "ability-precise-shot", cost: 1, cooldown: 0, target: "enemy",
    formula: { diceCount: 1, diceSides: 8, flatBonus: 3, attribute: "dexterity", damageType: "piercing" }, animationKey: "arrow-shot", soundKey: "bow-impact", statusEffects: [], availability: { kind: "always" }, logText: "{actor} עוצר נשימה ומשחרר חץ."
  },
  {
    id: "ranger-mark-prey", classId: "ranger", name: "סימון טרף", description: "מסמן חולשה ומקל על כל החבורה לפגוע.", iconAssetKey: "ability-mark-prey", cost: 2, cooldown: 2, target: "enemy",
    animationKey: "hunter-mark", soundKey: "mark-target", statusEffects: [{ statusId: "marked", duration: 3, chance: 1 }], availability: { kind: "always" }, logText: "{actor} מסמן את {target} כטרף."
  },
  {
    id: "ranger-hidden-step", classId: "ranger", name: "צעד נסתר", description: "תנועה שקטה שמעניקה יתרון התקפי קצר.", iconAssetKey: "ability-hidden-step", cost: 2, cooldown: 3, target: "self",
    animationKey: "leaf-step", soundKey: "soft-step", statusEffects: [{ statusId: "hidden", duration: 1, chance: 1 }], availability: { kind: "self-status-absent", statusId: "hidden" }, logText: "{actor} נעלם מאחורי אבק וצל."
  },
  {
    id: "cleric-light-strike", classId: "cleric", name: "מכת אור", description: "אור מקודש צורב יצורים מושחתים.", iconAssetKey: "ability-light-strike", cost: 1, cooldown: 0, target: "enemy",
    formula: { diceCount: 1, diceSides: 8, flatBonus: 2, attribute: "wisdom", damageType: "radiant" }, animationKey: "radiant-strike", soundKey: "holy-impact", statusEffects: [], availability: { kind: "always" }, logText: "אור חד יורד על {target}."
  },
  {
    id: "cleric-healing-prayer", classId: "cleric", name: "תפילת ריפוי", description: "תפילה קצרה המשיבה חיים לבעל ברית.", iconAssetKey: "ability-healing-prayer", cost: 3, cooldown: 2, target: "ally",
    healingFormula: { diceCount: 1, diceSides: 8, flatBonus: 4, attribute: "wisdom" }, animationKey: "healing-light", soundKey: "healing", statusEffects: [{ statusId: "regenerating", duration: 2, chance: 1 }], availability: { kind: "always" }, logText: "{actor} לוחש תפילה והפצעים נסגרים."
  },
  {
    id: "cleric-faith-shield", classId: "cleric", name: "מגן אמונה", description: "הילה מוזהבת מחזקת את בעל הברית.", iconAssetKey: "ability-faith-shield", cost: 2, cooldown: 3, target: "ally",
    animationKey: "faith-barrier", soundKey: "shield-blessing", statusEffects: [{ statusId: "faith-shield", duration: 3, chance: 1 }], availability: { kind: "always" }, logText: "הילה מגוננת מקיפה את {target}."
  },
  {
    id: "barbarian-axe-strike", classId: "barbarian", name: "מכת גרזן", description: "מכה פראית שמסבה נזק רב אך אינה מדויקת תמיד.", iconAssetKey: "ability-axe-strike", cost: 0, cooldown: 0, target: "enemy",
    formula: { diceCount: 1, diceSides: 12, flatBonus: 1, attribute: "strength", damageType: "physical" }, animationKey: "axe-cleave", soundKey: "axe-impact", statusEffects: [], availability: { kind: "always" }, logText: "הגרזן של {actor} קורע את האוויר."
  },
  {
    id: "barbarian-rage", classId: "barbarian", name: "זעם", description: "ממיר כאב בעוצמה ומגביר נזק במחיר הגנה.", iconAssetKey: "ability-rage", cost: 2, cooldown: 4, target: "self",
    animationKey: "rage-aura", soundKey: "rage-roar", statusEffects: [{ statusId: "rage", duration: 3, chance: 1 }], availability: { kind: "self-status-absent", statusId: "rage" }, logText: "זעקת זעם בוקעת מגרונו של {actor}."
  },
  {
    id: "barbarian-intimidating-roar", classId: "barbarian", name: "שאגת איום", description: "שאגה שמערערת את דיוקם של כל האויבים.", iconAssetKey: "ability-intimidating-roar", cost: 3, cooldown: 3, target: "all-enemies",
    animationKey: "fear-wave", soundKey: "intimidating-roar", statusEffects: [{ statusId: "frightened", duration: 2, chance: 0.85 }], availability: { kind: "always" }, logText: "שאגתו של {actor} מרעידה את האולם."
  },
  {
    id: "king-crown-shard-strike", classId: "king", name: "מכת רסיס הכתר", description: "הכתר משלח להב אור־ערפל שפוגע באויב ומסמן פרצה בהגנתו.", iconAssetKey: "ability-crown-shard-strike", cost: 0, cooldown: 0, target: "enemy",
    formula: { diceCount: 1, diceSides: 10, flatBonus: 3, attribute: "charisma", damageType: "arcane" }, animationKey: "crown-shard-lance", soundKey: "magic-cast", statusEffects: [{ statusId: "marked", duration: 2, chance: 0.5 }], availability: { kind: "always" }, logText: "רסיס מן הכתר בוער מעל {actor} וננעץ ב־{target}."
  },
  {
    id: "king-royal-decree", classId: "king", name: "צו מלכותי", description: "פקודה ריבונית מכבידה על לבם של כל האויבים ומחלישה את דיוקם.", iconAssetKey: "ability-royal-decree", cost: 3, cooldown: 3, target: "all-enemies",
    animationKey: "royal-command-wave", soundKey: "intimidating-roar", statusEffects: [{ statusId: "frightened", duration: 2, chance: 1 }], availability: { kind: "always" }, logText: "קולו של {actor} מהדהד כצו שאין להמרות."
  },
  {
    id: "king-sovereign-aegis", classId: "king", name: "חסות הריבון", description: "אור הכתר מרפא בעל ברית ומקים סביבו מגן מלכותי.", iconAssetKey: "ability-sovereign-aegis", cost: 4, cooldown: 3, target: "ally",
    healingFormula: { diceCount: 1, diceSides: 8, flatBonus: 5, attribute: "charisma" }, animationKey: "sovereign-aegis", soundKey: "healing", statusEffects: [{ statusId: "faith-shield", duration: 3, chance: 1 }], availability: { kind: "always" }, logText: "הכתר מאיר, ופצעיו של {target} נסגרים מאחורי מגן זהב."
  },
  {
    id: "enemy-corrupted-bite", classId: "rogue", name: "נשיכה מושחתת", description: "ניבים שחורים ננעצים בבשר ומותירים זיהום.", iconAssetKey: "ability-corrupted-bite", cost: 0, cooldown: 0, target: "enemy",
    formula: { diceCount: 1, diceSides: 6, flatBonus: 1, attribute: "dexterity", damageType: "piercing" }, animationKey: "creature-lunge", soundKey: "bite-impact", statusEffects: [{ statusId: "corrupted", duration: 2, chance: 0.3 }], availability: { kind: "always" }, logText: "היצור מזנק בנשיכה פראית."
  },
  {
    id: "enemy-fog-claw", classId: "rogue", name: "טופר ערפל", description: "טופר סמיך מערפל את חושי המטרה.", iconAssetKey: "ability-fog-claw", cost: 0, cooldown: 1, target: "enemy",
    formula: { diceCount: 1, diceSides: 8, flatBonus: 1, attribute: "dexterity", damageType: "shadow" }, animationKey: "fog-claw", soundKey: "shadow-impact", statusEffects: [{ statusId: "frightened", duration: 1, chance: 0.4 }], availability: { kind: "always" }, logText: "טופר כהה חותך מתוך הערפל."
  },
  {
    id: "boss-stone-slam", classId: "barbarian", name: "מכת אבן כבדה", description: "אגרוף סלע מטלטל את הקרקע ועלול להמם.", iconAssetKey: "ability-stone-slam", cost: 0, cooldown: 1, target: "enemy",
    formula: { diceCount: 1, diceSides: 6, flatBonus: 1, attribute: "strength", damageType: "physical" }, animationKey: "stone-slam", soundKey: "stone-impact", statusEffects: [{ statusId: "stunned", duration: 1, chance: 0.1 }], availability: { kind: "always" }, logText: "שומר האבן מנחית אגרוף כבד."
  },
  {
    id: "boss-defensive-stance", classId: "fighter", name: "עמידת הבזלת", description: "השומר סוגר את לוחות האבן ומחזק את השריון.", iconAssetKey: "ability-basalt-guard", cost: 0, cooldown: 3, target: "self",
    animationKey: "stone-guard", soundKey: "stone-lock", statusEffects: [{ statusId: "guarded", duration: 2, chance: 1 }], availability: { kind: "self-status-absent", statusId: "guarded" }, logText: "לוחות האבן ננעלים סביב הרונה."
  },
  {
    id: "boss-telegraph-crush", classId: "barbarian", name: "הנפת החורבן", description: "השומר מכין מכה קטלנית; זה הרגע להתגונן או לשבור את משמרו.", iconAssetKey: "ability-telegraph-crush", cost: 0, cooldown: 4, target: "self",
    animationKey: "boss-telegraph", soundKey: "boss-awakening", statusEffects: [{ statusId: "telegraphed", duration: 2, chance: 1 }], availability: { kind: "self-status-absent", statusId: "telegraphed" }, logText: "שומר האבן מרים את שתי ידיו; הרונות בוערות."
  },
  {
    id: "boss-rune-crush", classId: "barbarian", name: "ריסוק רוני", description: "מכה איומה המשתחררת לאחר אזהרה ברורה.", iconAssetKey: "ability-rune-crush", cost: 0, cooldown: 4, target: "enemy",
    formula: { diceCount: 2, diceSides: 8, flatBonus: 2, attribute: "strength", damageType: "arcane" }, animationKey: "rune-crush", soundKey: "critical-impact", statusEffects: [], availability: { kind: "self-status-absent", statusId: "guarded" }, logText: "הכוח שנאגר ברונות מתרסק על {target}."
  },
];

export const abilitiesById = Object.fromEntries(abilities.map((ability) => [ability.id, ability])) as Record<string, Ability>;
