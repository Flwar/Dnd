import type { NPC } from "../types/game";

export const npcs: NPC[] = [
  {
    id: "elric", name: "אלריק", title: "ראש הכפר", description: "אדם רחב כתפיים ששערו האפיר מוקדם מדי. הוא מחזיק צרור מפתחות שאחד מהם אינו שייך לשום דלת בכפר.",
    personality: ["אחראי", "מאופק", "מסתיר מידע", "חרד לגורל הכורים"], portraitKey: "portrait-npc-elric",
    initialRelationship: { npcId: "elric", trust: 0, respect: 5, fear: 0 },
    journalEntry: "אלריק מנהל את ערפלון ביד יציבה, אך רעד קל עובר בו בכל פעם שמזכירים את המכרה. נדמה שהוא ידע שהרעידה תגיע.",
    reactiveLines: { miner_rescued: "החזרת לנו אדם חי. לא אשכח זאת.", miner_left: "דנור נשאר שם? לפעמים החלטה הגיונית עדיין כבדה מנשוא.", cult_exposed: "אם הסמל הזה שב לכאן, השערים שלנו כבר אינם מגינים על דבר." }
  },
  {
    id: "mira", name: "מירה", title: "הנפחית", description: "נפחית חסונה בעלת זרוע מכוסה כוויות ישנות ועיניים שבוחנות כל קסם כאילו הוא סדק בלהב.",
    personality: ["ישירה", "מעשית", "חשדנית כלפי קסם", "נאמנה לכפר"], portraitKey: "portrait-npc-mira",
    initialRelationship: { npcId: "mira", trust: -2, respect: 8, fear: 0 },
    journalEntry: "מירה מתקנת את כלי הכורים מאז שהייתה ילדה. היא שמעה מתכת שרה בלילה שלפני הרעידה ואינה מוכנה לקרוא לזה צירוף מקרים.",
    reactiveLines: { rune_hammer_found: "ידעתי שהפטיש עוד שם. אבא שלי נשבע שהרונות מפחדות מהנחושת שלו.", magic_used: "קסם הוא כלי. כלי שלא מכבדים מוריד אצבעות.", guardian_defeated: "אז אבן עתיקה יכולה להישבר. טוב לדעת." }
  },
  {
    id: "thal", name: "תאל", title: "המרפא", description: "אדם שקט בקול ירחוני. אצבעותיו מוכתמות ירוק מעשבי מרפא, וקו שחור חדש זוחל בציפורן אגודלו.",
    personality: ["רגוע", "קשוב", "מבין בשחיתות", "מסתיר את חשיפתו"], portraitKey: "portrait-npc-thal",
    initialRelationship: { npcId: "thal", trust: 5, respect: 0, fear: 2 },
    journalEntry: "תאל מטפל בפצועי הרעידה. הוא מזהה את השחיתות בגבישים השחורים, אולי משום שכבר נגע בה בעצמו.",
    reactiveLines: { miner_rescued: "דנור יחיה, אם הלילה יעבור בשקט.", black_crystal_found: "אל תעטוף אותו בעור. הוא לומד חום גוף.", shard_touched: "הקול ששמעת אינו זיכרון. זיכרונות אינם משיבים מבט." }
  },
  {
    id: "brom", name: "ברום", title: "בעל פונדק העורב הרטוב", description: "איש עגלגל שמנגב שוב ושוב אותה כוס. בדיחותיו מגיעות מהר מדי, כאילו השתיקה עלולה להסגיר אותו.",
    personality: ["פטפטן", "עצבני", "חביב", "אוסף שמועות"], portraitKey: "portrait-npc-brom",
    initialRelationship: { npcId: "brom", trust: 3, respect: -1, fear: 6 },
    journalEntry: "ברום שומע כל שמועה שעוברת בערפלון. הוא ראה דמויות בגלימות מגיעות לפני הרעידה, ושיקר כשאמר שאינו זוכר את פניהן.",
    reactiveLines: { cult_exposed: "אמרתי שאלה היו סוחרים. אני יודע. גם אני לא האמנתי לעצמי.", room_searched: "החדר ההוא היה נעול מסיבה טובה. לא טובה מספיק, כנראה.", chapter_complete: "משקה ראשון על חשבון הבית. השני במחיר כפול; גיבורים שותים מהר." }
  },
  {
    id: "danor", name: "דנור", title: "הכורה הלכוד", description: "כורה צעיר שאבק לבן דבוק לזקנו. רגלו לכודה מתחת לקורה, אך ידו עדיין אוחזת בפיסת מדליון שחורה.",
    personality: ["פצוע", "עקשן", "מבוהל", "ראה את אנשי הכת"], portraitKey: "portrait-npc-danor",
    initialRelationship: { npcId: "danor", trust: 0, respect: 0, fear: 20 },
    journalEntry: "דנור היה בין שלושת הכורים שנכנסו לאחר הרעידה. הוא ראה אנשי גלימות פותחים דלת אבן בעזרת מדליון בצורת עין.",
    reactiveLines: { rescued_by_strength: "חשבתי שהקורה תישבר לפני שאתה תצליח להרים אותה.", rescued_by_medicine: "הידיים שלך ידעו מה לעשות גם כשהעיניים שלי כבר ויתרו.", left_behind: "לך. רק… אל תגיד לאמא שלי ששמעתי אותם קוראים בשמי." }
  },
  {
    id: "grey-woman", name: "האישה באפור", title: "הזרה מן הערפל", description: "דמות עטופה בגלימה אפורה, נטולת עקבות גם בבוץ. רק אחת מעיניה נראית, ובה משתקפים שבעה אורות.",
    personality: ["מסתורית", "מדויקת", "יודעת על הרסיס", "נעלמת ללא הסבר"], portraitKey: "portrait-npc-grey-woman",
    initialRelationship: { npcId: "grey-woman", trust: -10, respect: 0, fear: 10 },
    journalEntry: "האישה באפור ידעה שהרסיס נמצא מתחת לערפלון. היא הזהירה שלא כל מי שכורע לפני הכתר מבקש לשרת אותו.",
    reactiveLines: { shard_touched: "הוא מצא אותך מפני שהבטת בחזרה.", miner_rescued: "חמלה משאירה עקבות. לפעמים זה הדבר היחיד שמוביל החוצה.", cult_exposed: "העין היא רק סמל. מה שמביט דרכה עתיק יותר מן הכת." }
  },
];

export const npcsById = Object.fromEntries(npcs.map((npc) => [npc.id, npc])) as Record<string, NPC>;
