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
  version: "1.1.0",
  title: "עדכון המלך והקרב",
  publishedLabel: "1 באוגוסט 2026",
  summary: "עדכון יסודי לחוויית המשחק המקוונת, לקרבות, לדמויות ולתצוגה בטלפון.",
  notes: [
    {
      title: "הרשמה פתוחה לשחקנים חדשים",
      description: "תוקנה חסימת ההרשמה שמנעה מחברים ליצור חשבון ולהיכנס למשחק.",
      tone: "success",
    },
    {
      title: "מקצוע המלך",
      description: "נוספו כתר מיתי, משאב סמכות ושלוש יכולות מלכותיות לחשבון המורשה בלבד.",
      tone: "gold",
    },
    {
      title: "קרב במסך מלא",
      description: "כניסה לקרב נועלת את מסך החקירה ומציגה מיד את הזירה ואת הפעולות, גם בטלפון.",
      tone: "gold",
    },
    {
      title: "שחקנים מחוברים",
      description: "התפריט מציג מי נמצא כעת במשחק ומודיע כאשר שחקן נכנס, יוצא או מתחבר מחדש.",
      tone: "magic",
    },
    {
      title: "יותר אפשרויות לדמות",
      description: "נוספו דיוקנאות חדשים ואפשרות מאובטחת להעלות תמונה אישית לדמות.",
      tone: "magic",
    },
    {
      title: "תמונה חדה יותר",
      description: "רקעי המשחק ודיוקנאות הדמויות הותאמו למסכי Retina ולתצוגת מובייל חדה.",
      tone: "success",
    },
    {
      title: "קוביית d20 תלת־ממדית",
      description: "גלגולי מיומנות קיבלו קובייה רב־פאות, נחיתה, חלקיקים ואפקטים מיוחדים לתוצאות מכריעות.",
      tone: "gold",
    },
    {
      title: "פסקול וקולות לדמויות",
      description: "המוזיקה משתנה לפי הסצנה, ולכל דמות ניתן להשמיע קול עברי אופציונלי הזמין במכשיר.",
      tone: "magic",
    },
  ],
};

export const releaseVersionLabel = `גרסה ${currentRelease.version}`;
