export type ReleaseNote = {
  title: string;
  description: string;
  tone: "gold" | "magic" | "success";
};

export type GameRelease = {
  version: string;
  title: string;
  publishedLabel: string;
  summary: string;
  notes: ReleaseNote[];
};

export const currentRelease: GameRelease = {
  version: "1.2.0",
  title: "עדכון הכרוניקה החרוטה",
  publishedLabel: "7 באוגוסט 2026",
  summary: "הפרק הורחב, כל בחירה נרשמת כהשלכה מוחשית, והאמנות, הקרבות והקובייה נבנו מחדש.",
  notes: [
    {
      title: "פרק ארוך ומסועף יותר",
      description: "נוספו מגדל תצפית, מעגל אבני סף, חזרה מלאה לערפלון ושיחות תגובה לאחר החיזיון.",
      tone: "success",
    },
    {
      title: "בחירות שמשנות את המשחק",
      description: "החלטות משפיעות מיד על אויבים, ציוד, זהב, יחסים, נתיבים ומצב הכפר — ונשמרות בכרוניקה.",
      tone: "gold",
    },
    {
      title: "שומר האבן אוזן מחדש",
      description: "לבוס פחות חיים ושריון, מכת החורבן ניתנת לשרידה, וחקר העולם יוצר חולשות אמיתיות בקרב.",
      tone: "gold",
    },
    {
      title: "קרב של מסך אחד",
      description: "הזירה, התור, האויבים והפעולות נשארים יחד ללא גלילה אנכית, גם בטלפון קטן.",
      tone: "success",
    },
    {
      title: "קוביית d20 פיזית",
      description: "עשרים פאות ממוספרות, חומר אובסידיאן וארד, תאורת עולם קבועה וצל שנשאר על השולחן.",
      tone: "magic",
    },
    {
      title: "שפה אמנותית חדשה",
      description: "רקעים בגודל מלא, חיתוכי מובייל ודיוקנאות ייחודיים החליפו אטלסים מתוחים ותמונות חוזרות.",
      tone: "success",
    },
    {
      title: "סמלי מלך מקוריים",
      description: "שלושת מהלכי המלך והכתר קיבלו איורים עצמאיים; בדיקת הנכסים מונעת תמונות חסרות או זמניות.",
      tone: "gold",
    },
    {
      title: "HUD נייד מינימלי",
      description: "מגירת הפעולות מתקפלת, התמונה נשארת גלויה והניווט התחתון שומר על אזורי המגע הבטוחים.",
      tone: "magic",
    },
  ],
};

export const releaseVersionLabel = `גרסה ${currentRelease.version}`;
