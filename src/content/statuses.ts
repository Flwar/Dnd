import type { StatusDefinition } from "../types/game";

export const statuses: StatusDefinition[] = [
  { id: "defending", name: "מגננה", description: "השריון מתחזק עד התור הבא.", iconAssetKey: "status-defending", maxStacks: 1, armorModifier: 4 },
  { id: "guarded", name: "משמר יציב", description: "עמידה הגנתית מפחיתה את עוצמת הפגיעה.", iconAssetKey: "status-guarded", maxStacks: 1, armorModifier: 5, damageMultiplier: 0.85 },
  { id: "exposed-rune", name: "רונה חשופה", description: "סדק מאיר חושף נקודת תורפה בשריון האבן.", iconAssetKey: "status-exposed-rune", maxStacks: 1, armorModifier: -6 },
  { id: "burning", name: "בוער", description: "אש מכרסמת במטרה בכל תחילת תור.", iconAssetKey: "status-burning", maxStacks: 3, damagePerTurn: 2 },
  { id: "chilled", name: "קפוא", description: "הקור מכביד על התנועה ופוגע בדיוק.", iconAssetKey: "status-chilled", maxStacks: 2, accuracyModifier: -2 },
  { id: "marked", name: "מסומן כטרף", description: "הצייד מזהה כל תנועה ומגדיל את נזקו.", iconAssetKey: "status-marked", maxStacks: 1, armorModifier: -2 },
  { id: "hidden", name: "חבוי בצל", description: "הפגיעה הבאה נמסרת מעמדה עדיפה.", iconAssetKey: "status-hidden", maxStacks: 1, accuracyModifier: 4, damageMultiplier: 1.45 },
  { id: "faith-shield", name: "מגן אמונה", description: "אור עתיק מחזק את ההגנה.", iconAssetKey: "status-faith-shield", maxStacks: 1, armorModifier: 3, healingPerTurn: 1 },
  { id: "rage", name: "זעם", description: "הכאב הופך לעוצמה פראית.", iconAssetKey: "status-rage", maxStacks: 1, armorModifier: -1, damageMultiplier: 1.5 },
  { id: "frightened", name: "מבוהל", description: "הפחד מרעיד את היד ומחליש את הדיוק.", iconAssetKey: "status-frightened", maxStacks: 2, accuracyModifier: -3 },
  { id: "bleeding", name: "מדמם", description: "הפצע הפתוח ממשיך לגבות מחיר.", iconAssetKey: "status-bleeding", maxStacks: 3, damagePerTurn: 1 },
  { id: "corrupted", name: "שחיתות הערפל", description: "גביש שחור שואב כוח מן הגוף.", iconAssetKey: "status-corrupted", maxStacks: 3, damagePerTurn: 2, accuracyModifier: -1 },
  { id: "telegraphed", name: "מכה מתקרבת", description: "התקפה כבדה עומדת לנחות בתור הבא.", iconAssetKey: "status-telegraphed", maxStacks: 1 },
  { id: "stunned", name: "הלום", description: "המטרה מאבדת את התור הבא.", iconAssetKey: "status-stunned", maxStacks: 1, skipTurn: true },
  { id: "regenerating", name: "ברכת החלמה", description: "חיים שבים בהדרגה.", iconAssetKey: "status-regenerating", maxStacks: 2, healingPerTurn: 2 },
];

export const statusesById = Object.fromEntries(statuses.map((status) => [status.id, status])) as Record<string, StatusDefinition>;
