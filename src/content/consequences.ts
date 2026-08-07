import type { StoryEffect } from "@/types/game";

export type ConsequenceTone = "benefit" | "danger" | "knowledge" | "world";

export interface VisibleConsequence {
  key: string;
  title: string;
  detail: string;
  tone: ConsequenceTone;
  locations?: readonly string[];
  priority: number;
}

const flagConsequences: Record<string, Omit<VisibleConsequence, "key">> = {
  strange_tracks_found: {
    title: "עקבות זרים נחשפו",
    detail: "האבק הוחמץ, אך נמצאו עקבים שאינם שייכים לאיש מן הכפר ונרשמו ביומן.",
    tone: "knowledge",
    locations: ["village-gate", "mine-road"],
    priority: 24,
  },
  blue_dust_found: {
    title: "אבק מן המעמקים",
    detail: "האבקה זהה לזוהר הרונות במכרה; בדיקות מאגיה במערכה יכירו את הסימן.",
    tone: "knowledge",
    locations: ["village-gate", "mine-entrance", "pillar-hall"],
    priority: 32,
  },
  quake_was_directed: {
    title: "הרעידה כוונה אל המכרה",
    detail: "הסדקים נעצרים לפני בתי הכפר. זו הייתה פתיחה מכוונת, לא אסון טבע.",
    tone: "knowledge",
    locations: ["village-gate", "headman-house"],
    priority: 35,
  },
  quake_uncertain: {
    title: "מקור הרעידה לא פוענח",
    detail: "הסדקים לא סיפקו הוכחה; הרמז על פתיחה מכוונת נשאר נעול במסלול הזה.",
    tone: "world",
    locations: ["village-gate", "headman-house"],
    priority: 22,
  },
  villagers_share_nightmare: {
    title: "הסיוט משותף",
    detail: "שלושה תושבים תיארו את אותה עין מאחורי הערפל; תאל יגיב למידע הזה.",
    tone: "knowledge",
    locations: ["arfelon-square", "healer-hut"],
    priority: 28,
  },
  villagers_suspicious: {
    title: "הכפר חושד בזר",
    detail: "הלחישות השתתקו סביבך. שכנוע תושבים יהיה קשה יותר עד שתוכיח את עצמך.",
    tone: "danger",
    locations: ["arfelon-square", "wet-raven-inn"],
    priority: 45,
  },
  brom_room_key: {
    title: "מפתח חדר האורח",
    detail: "ברום מסר את המפתח; החדר הנעול בפונדק פתוח כעת לחיפוש.",
    tone: "world",
    locations: ["wet-raven-inn", "arfelon-square"],
    priority: 44,
  },
  cult_symbol_seen: {
    title: "סמל העין השבורה תועד",
    detail: "הסמל מן הפונדק תואם לחריטה בכניסת המכרה ופותח דרך לזהות את הפולשים.",
    tone: "knowledge",
    locations: ["wet-raven-inn", "mine-entrance", "pillar-hall"],
    priority: 50,
  },
  old_map_secret_route: {
    title: "מעגל האבנים סומן במפה",
    detail: "דרך צדדית אל אבני הסף נפתחה מן הדרך למכרה.",
    tone: "world",
    locations: ["headman-house", "mine-road", "standing-stones"],
    priority: 60,
  },
  bonus_reward_negotiated: {
    title: "מקדמה מן הכפר",
    detail: "אלריק העביר 25 מטבעות מיד, לפני היציאה למכרה.",
    tone: "benefit",
    locations: ["headman-house", "arfelon-square"],
    priority: 58,
  },
  standard_reward_only: {
    title: "המשא ומתן נכשל",
    detail: "לא התקבלה מקדמה; רק פרס המשימה המקורי יישאר בתוקף.",
    tone: "danger",
    locations: ["headman-house", "arfelon-square"],
    priority: 58,
  },
  free_village_services: {
    title: "סיוע הכפר הובטח",
    detail: "שיקוי ולפיד נוספו לתיק ללא תשלום לאחר ההצלחה המכרעת.",
    tone: "benefit",
    locations: ["arfelon-square", "healer-hut", "smithy"],
    priority: 64,
  },
  road_ambush_avoided: {
    title: "המארב נחשף",
    detail: "העקבות הובילו סביב נקודת החסימה; היצורים לא יקבלו הזדמנות להפתיע.",
    tone: "benefit",
    locations: ["mine-road", "old-watchtower", "mine-entrance"],
    priority: 72,
  },
  combat_advantage_road: {
    title: "עמדת פתיחה טובה",
    detail: "המסלול הגבוה זוהה בזמן; הקרב בדרך יתחיל כשדמותך חבויה ומדויקת יותר.",
    tone: "benefit",
    locations: ["mine-road", "old-watchtower"],
    priority: 78,
  },
  surprised_on_road: {
    title: "החבורה נחשפה",
    detail: "רעש על השביל הסגיר את מיקומך; האויבים יפתחו ביתרון.",
    tone: "danger",
    locations: ["mine-road"],
    priority: 76,
  },
  tower_beacon_disabled: {
    title: "אות הכת כובה",
    detail: "עשן המגדל חדל להוביל יצורים אל הדרך; המארב הצפוי נחלש.",
    tone: "benefit",
    locations: ["old-watchtower", "mine-road"],
    priority: 82,
  },
  tower_beacon_burning: {
    title: "אות הערפל בוער",
    detail: "הלהבה השחורה ממשיכה לקרוא לטורפים; בדרך חזרה צפויה התנגדות.",
    tone: "danger",
    locations: ["old-watchtower", "mine-road"],
    priority: 82,
  },
  waystone_ward_restored: {
    title: "ברית אבני הסף חודשה",
    detail: "הרונה העתיקה מחלישה יצורי כתר; שומר האבן יאבד חיים ודיוק בתחילת הקרב.",
    tone: "benefit",
    locations: ["standing-stones", "guardian-sanctum"],
    priority: 90,
  },
  waystone_echo_awakened: {
    title: "האבנים השיבו בלחש",
    detail: "מגע הערפל דבק בדמותך ויופיע כשחיתות קצרה בעימות הבא.",
    tone: "danger",
    locations: ["standing-stones", "mine-entrance", "guardian-sanctum"],
    priority: 86,
  },
  miners_fought_outward: {
    title: "הכורים ניסו לברוח",
    detail: "כיוון הדם מוכיח שהסכנה הגיעה מתוך המכרה; דנור אינו המלכודת.",
    tone: "knowledge",
    locations: ["mine-entrance", "main-tunnel"],
    priority: 48,
  },
  stone_magic_suspected: {
    title: "סגסוגת השומר זוהתה",
    detail: "בדיקת הכלים גילתה נקודת כשל; שריון שומר האבן יופחת בפועל.",
    tone: "benefit",
    locations: ["smithy", "guardian-sanctum"],
    priority: 70,
  },
  cult_symbol_understood: {
    title: "טקס פתיחת שער",
    detail: "העין השבורה אינה חתימה אלא הוראה: הרונה מזינה מנגנון עמוק יותר.",
    tone: "knowledge",
    locations: ["mine-entrance", "pillar-hall", "guardian-sanctum"],
    priority: 68,
  },
  temporary_corruption: {
    title: "שחיתות זמנית",
    detail: "הגביש חדר דרך העור; העימות הבא יתחיל עם נזק מתמשך עד שההשפעה תדעך.",
    tone: "danger",
    locations: ["mine-entrance", "main-tunnel"],
    priority: 80,
  },
  heard_danor: {
    title: "מקור הקריאה אותר",
    detail: "מחסן הכלים הנטוש נפתח כעת כנתיב מן המנהרה הראשית.",
    tone: "world",
    locations: ["main-tunnel", "abandoned-tool-store"],
    priority: 76,
  },
  flood_crossed_quietly: {
    title: "עמדת פתיחה שקטה",
    detail: "היצורים במים לא הבחינו בך; הקרב יתחיל מתוך הסתרה.",
    tone: "benefit",
    locations: ["flooded-passage"],
    priority: 84,
  },
  flood_pack_triggered: {
    title: "הלהקה כולה התעוררה",
    detail: "הרעש במים משך יצור נוסף אל הקרב הקרוב.",
    tone: "danger",
    locations: ["flooded-passage"],
    priority: 86,
  },
  made_noise_in_flood: {
    title: "השרשרת התריעה",
    detail: "משיכת התרמיל הסגירה את מיקומך ותחזק את להקת היצורים.",
    tone: "danger",
    locations: ["flooded-passage"],
    priority: 87,
  },
  flood_pack_defeated: {
    title: "המעבר המוצף בטוח",
    detail: "היצורים שמתחת למים חוסלו; הדרך אל אולם העמודים נפתחה.",
    tone: "benefit",
    locations: ["flooded-passage", "main-tunnel", "pillar-hall"],
    priority: 84,
  },
  danor_rescued: {
    title: "דנור חולץ",
    detail: "הכורה מסוגל לשוב לערפלון; אלריק ותושבי הכפר יגיבו להצלתו.",
    tone: "benefit",
    locations: ["abandoned-tool-store", "arfelon-square", "headman-house"],
    priority: 96,
  },
  danor_left_behind: {
    title: "דנור נותר מתחת לקורה",
    detail: "הכורה עדיין בחיים, אך מצבו מידרדר; הדיווח לאלריק ישתנה בהתאם.",
    tone: "danger",
    locations: ["abandoned-tool-store", "arfelon-square", "headman-house"],
    priority: 98,
  },
  rune_hammer_found: {
    title: "פטיש שובר־רונות",
    detail: "הכלי מפצח חיבורי אבן מאגיים; שריון שומר האבן יהיה נמוך יותר.",
    tone: "benefit",
    locations: ["abandoned-tool-store", "guardian-sanctum"],
    priority: 88,
  },
  cabinet_jammed: {
    title: "ארון המנהל ננעל",
    detail: "פטיש שובר־הרונות נשאר בפנים; הבוס לא יאבד את בונוס השריון ממנו.",
    tone: "danger",
    locations: ["abandoned-tool-store", "guardian-sanctum"],
    priority: 70,
  },
  seven_three_rhythm_known: {
    title: "מקצב הרונה נשמר",
    detail: "שלוש ושבע יחשפו את רונת השומר לסיבוב הראשון של הקרב.",
    tone: "benefit",
    locations: ["standing-stones", "guardian-sanctum"],
    priority: 84,
  },
  guardian_rune_understood: {
    title: "חולשת השומר פוענחה",
    detail: "הרונה בחזהו תתחיל חשופה, ותוריד את השריון בשלושת הסיבובים הראשונים.",
    tone: "benefit",
    locations: ["hidden-chamber", "guardian-sanctum"],
    priority: 92,
  },
  guardian_awakened_early: {
    title: "השומר הוזהר",
    detail: "הטקס השגוי העיר אותו מוכן לקרב; הוא יתחיל בעמידת בזלת.",
    tone: "danger",
    locations: ["pillar-hall", "guardian-sanctum"],
    priority: 92,
  },
  hidden_chamber_open: {
    title: "החדר הנסתר נפתח",
    detail: "מפת שבעת הרסיסים ותיבת הקדמונים זמינות מעבר לקיר.",
    tone: "world",
    locations: ["pillar-hall", "hidden-chamber"],
    priority: 74,
  },
  map_remembered: {
    title: "מפת העוגנים נחרתה בזיכרון",
    detail: "לא כל הסימנים פוענחו, אך מיקום העוגנים יוריד את דיוק השומר בנקודה אחת.",
    tone: "benefit",
    locations: ["hidden-chamber", "guardian-sanctum"],
    priority: 78,
  },
  vision_seen: {
    title: "הרסיס מצא אותך",
    detail: "החזון הסתיים, אך הפרק עדיין לא: יש לשוב לערפלון ולבחור איזו אמת לחשוף.",
    tone: "world",
    locations: ["guardian-sanctum", "arfelon-square", "headman-house"],
    priority: 100,
  },
  village_warned: {
    title: "ערפלון נערכה למצור",
    detail: "אלריק הציב משמרות, מירה חילקה נשק ותאל הכין את בקתת המרפא.",
    tone: "benefit",
    locations: ["arfelon-square", "headman-house"],
    priority: 100,
  },
  shard_secret_kept: {
    title: "הרסיס נשאר סוד",
    detail: "אנשי הכפר מכירים את איום הכת, אך רק דמותך יודעת שהכתר כבר התעורר.",
    tone: "world",
    locations: ["arfelon-square", "headman-house"],
    priority: 100,
  },
};

export function getFlagConsequence(key: string): VisibleConsequence | null {
  const consequence = flagConsequences[key];
  return consequence ? { key, ...consequence } : null;
}

export function getVisibleConsequences(
  flags: Readonly<Record<string, boolean | string | number>>,
  locationId: string,
  maximum = 2,
): VisibleConsequence[] {
  return getAllVisibleConsequences(flags, Number.MAX_SAFE_INTEGER)
    .filter((entry) => !entry.locations || entry.locations.includes(locationId))
    .slice(0, maximum);
}

export function getAllVisibleConsequences(
  flags: Readonly<Record<string, boolean | string | number>>,
  maximum = 32,
): VisibleConsequence[] {
  return Object.entries(flags)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => getFlagConsequence(key))
    .filter((entry): entry is VisibleConsequence => Boolean(entry))
    .sort((left, right) => right.priority - left.priority)
    .slice(0, maximum);
}

export function consequenceEffects(effects: readonly StoryEffect[]): VisibleConsequence[] {
  const seen = new Set<string>();
  const consequences: VisibleConsequence[] = [];
  for (const effect of effects) {
    if (effect.kind !== "set-flag" || !effect.value || seen.has(effect.key)) continue;
    const consequence = getFlagConsequence(effect.key);
    if (!consequence) continue;
    seen.add(effect.key);
    consequences.push(consequence);
  }
  return consequences.sort((left, right) => right.priority - left.priority);
}
