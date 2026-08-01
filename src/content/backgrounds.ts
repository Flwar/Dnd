import type { CharacterBackground } from "../types/game";

export const characterBackgrounds: CharacterBackground[] = [
  { id: "former-soldier", name: "חייל לשעבר", history: "עזבת את הדגל לאחר פקודה שלא יכולת לבצע, אך המשמעת עדיין טבועה בגופך.", dialogueOpportunity: "מזהה נהלים צבאיים ויכול לדרוש שיתוף פעולה מסמכות מקומית.", skillProficiency: "athletics", startingItemId: "soldier-rope", storyFlag: "background_soldier" },
  { id: "wandering-scholar", name: "מלומד נודד", history: "שנים עקבת אחר אזכורים סותרים לכתר הברית בספריות שאיש כמעט אינו מבקר בהן.", dialogueOpportunity: "מזהה כתבים עתיקים ויכול לשוחח עם חוקרים בשפתם.", skillProficiency: "arcana", startingItemId: "scholars-lens", storyFlag: "background_scholar" },
  { id: "border-hunter", name: "צייד מהספר", history: "גדלת בין חוות מבודדות ושבילים שנמחקים בכל חורף.", dialogueOpportunity: "מבין עקבות, חיות ושקריהם של מי שמעמידים פני ציידים.", skillProficiency: "survival", startingItemId: "hunting-trap", storyFlag: "background_hunter" },
  { id: "former-criminal", name: "פושע לשעבר", history: "החוב האחרון כבר שולם, אבל הידיים זוכרות מנעולים והעיניים מחפשות תמיד מוצא נוסף.", dialogueOpportunity: "מזהה שפת קודים, מחבואים ועסקאות מפוקפקות.", skillProficiency: "deception", startingItemId: "lockpick-set", storyFlag: "background_criminal" },
  { id: "fallen-noble", name: "בן אצולה שנפל", history: "שם משפחתך עדיין פותח דלתות אחדות, וסוגר אחרות בחוזקה.", dialogueOpportunity: "יודע לנהל משא ומתן רשמי ולזהות הסתרה פוליטית.", skillProficiency: "persuasion", startingItemId: "signet-ring", storyFlag: "background_noble" },
  { id: "temple-servant", name: "משרת מקדש", history: "לא נשבעת כנזיר, אך שנים של שירות לימדו אותך לטפל בפצועים ולשמוע פחד מאחורי תפילה.", dialogueOpportunity: "זוכה באמון אנשי דת ומזהה סימני חילול.", skillProficiency: "medicine", startingItemId: "temple-incense", storyFlag: "background_temple" },
  { id: "road-orphan", name: "יתום הדרכים", history: "הדרך גידלה אותך בין עגלות סוחרים, אבני דרך ונדיבותם הזהירה של זרים.", dialogueOpportunity: "משוחח בקלות עם פשוטי העם ומבחין בסכנות רחוב.", skillProficiency: "perception", startingItemId: "lucky-copper", storyFlag: "background_orphan" },
];

export const backgroundsById = Object.fromEntries(characterBackgrounds.map((entry) => [entry.id, entry])) as Record<CharacterBackground["id"], CharacterBackground>;
