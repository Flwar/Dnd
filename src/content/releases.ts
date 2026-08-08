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
  version: "1.5.0",
  title: "האטלס מתעורר",
  publishedLabel: "8 באוגוסט 2026",
  summary: "מפת ערפלון נבנתה מחדש כאטלס חי: הדרכים נחרטות, הערפל נסוג לפי הגילויים והבחירות שלך משאירות סימן שנראה בעולם — במחשב ובטלפון.",
  notes: [
    {
      title: "אטלס קולנועי מקורי",
      description: "גלריית המיקומים הוחלפה במפה מאוירת אחת וחדה שמחברת בין ערפלון, הגבעות, המגדל, אבני הסף ומערכת המכרה כעולם רציף.",
      tone: "gold",
    },
    {
      title: "הערפל זוכר את הדרך",
      description: "מקומות, מסלולים ומעברים סודיים נשארים מכוסים עד שגילית אותם באמת. גם האטלס אינו מגלה מראש יעד נסתר או פתרון שעדיין לא מצאת.",
      tone: "magic",
    },
    {
      title: "שתי שכבות של עולם",
      description: "אפשר לעבור בין פני השטח למעמקי המכרה, לראות נתיבי כניסה ויציאה ולקרוא רשומה מפורטת על כל מקום שנחשף.",
      tone: "success",
    },
    {
      title: "הבחירות נראות על המפה",
      description: "חילוץ דנור, כיבוי אות הכת, שיקום אבני הסף, פתיחת נתיב סודי והכרעות נוספות מוסיפים סימנים רוניים והסבר קבוע באטלס.",
      tone: "magic",
    },
    {
      title: "מפה שנבנתה לטלפון",
      description: "המיקום הנוכחי ממורכז אוטומטית, אפשר לגרור ולהגדיל בתוך מסגרת בטוחה, וכל יעד מגע גדול מספיק בלי ליצור גלישה אופקית בעמוד.",
      tone: "success",
    },
    {
      title: "הקובייה מפנה מקום לסיפור",
      description: "גלגול ה־d20 מקבל במובייל במת אנימציה נפרדת מן ההסבר והתוצאה, כך שהקובייה והאפקטים אינם יכולים להסתיר טקסט חשוב.",
      tone: "gold",
    },
  ],
};

export const releaseVersionLabel = `גרסה ${currentRelease.version}`;
