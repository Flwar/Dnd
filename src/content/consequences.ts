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
  danor_rescued_after_return: {
    title: "צוות החילוץ החזיר את דנור",
    detail: "הסימונים שהשארת הובילו את המתנדבים בזמן. דנור חי, והעיד שאיש כת אחד נמלט צפונה.",
    tone: "benefit",
    locations: ["arfelon-square", "bell-tower-roof"],
    priority: 110,
  },
  cult_survivor_bears_seventh_rune: {
    title: "הנמלט נושא את הרונה השביעית",
    detail: "עדותו של דנור קשרה את שבר מסכת העצם לשבועה שנמחקה מתחת לבאר.",
    tone: "knowledge",
    locations: ["arfelon-square", "moonwell-undercrypt"],
    priority: 123,
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
  midnight_bell_heard: {
    title: "פעמון חצות קרא לכפר",
    detail: "הצלצול הופיע ללא ענבל ושבע רונות נחרטו על הדלתות. הלילה הראשון הפך למשימה פעילה.",
    tone: "world",
    locations: ["arfelon-square", "bell-tower-roof"],
    priority: 104,
  },
  bell_watch_mustered: {
    title: "משמר זוגות הוצב בשערים",
    detail: "איש מאנשי ערפלון לא ירדוף לבדו אחרי קול מן הערפל; אלריק מחזיק עתודה בכיכר.",
    tone: "benefit",
    locations: ["arfelon-square", "bell-tower-roof"],
    priority: 108,
  },
  families_sheltered: {
    title: "הפצועים והילדים הוסתרו",
    detail: "החדר האחורי בפונדק נעשה מקלט. ההגנה על הכפר כבר שינתה את מי שיוכל לשרוד מתקפה.",
    tone: "benefit",
    locations: ["arfelon-square", "wet-raven-inn"],
    priority: 108,
  },
  ward_bell_linked: {
    title: "הפעמון נקשר לאבני הסף",
    detail: "כל מעבר של ערפל זר דרך טבעת האבנים יפעיל אזהרה ברחבי הכפר ויפתח אפשרות להסתירו מאוחר יותר.",
    tone: "benefit",
    locations: ["arfelon-square", "standing-stones", "bell-tower-roof"],
    priority: 112,
  },
  village_patrols_split: {
    title: "הכפר שומר על שני מוקדים",
    detail: "המתנדבים חולקו בין הבתים לבאר. ההגנה פחות חזקה בכל נקודה, אך אין נתיב לא־שמור.",
    tone: "world",
    locations: ["arfelon-square", "bell-tower-roof"],
    priority: 106,
  },
  royal_night_watch: {
    title: "משמר הכתר ניצב בערפלון",
    detail: "פקודת המלך איחדה את המתנדבים. תושבי הכפר מתייחסים מעתה להגנת הלילה כברית רשמית.",
    tone: "benefit",
    locations: ["arfelon-square", "bell-tower-roof"],
    priority: 116,
  },
  bell_runes_decoded: {
    title: "נתיב הרונות פוענח",
    detail: "צל הרסיס חשף שהפעמון מצביע אל חורבה צפונית ואל חבל הנמשך מתחת לבאר.",
    tone: "knowledge",
    locations: ["bell-tower-roof", "moonwell-undercrypt"],
    priority: 114,
  },
  bell_warning_misread: {
    title: "הרונות צרבו סימן שגוי",
    detail: "המסלול לא פוענח והקול שמע את הניסיון. הדרך נותרה פתוחה, אך נושא הרסיס סומן.",
    tone: "danger",
    locations: ["bell-tower-roof", "moonwell-undercrypt"],
    priority: 114,
  },
  bell_signal_traced: {
    title: "מקור הצלצול נמצא",
    detail: "חבל נסתר מוביל מן הפעמון אל קמרון עתיק מתחת לבאר. הכניסה החדשה פתוחה כעת.",
    tone: "world",
    locations: ["bell-tower-roof", "moonwell-undercrypt"],
    priority: 118,
  },
  elric_lineage_proven: {
    title: "שבועת משפחת אלריק נחשפה",
    detail: "חותם משפחתו מופיע על השבועה השביעית: אבותיו לא רק שמרו על המכרה, אלא היו משומרי הכתר.",
    tone: "knowledge",
    locations: ["moonwell-undercrypt", "headman-house"],
    priority: 120,
  },
  keepers_betrayal_discovered: {
    title: "אחד השומרים בגד בברית",
    detail: "השבועה השביעית נמחקה מבפנים. מישהו משומרי הכתר חיפש את הרסיס השני עוד לפני שהכת הגיעה.",
    tone: "knowledge",
    locations: ["moonwell-undercrypt"],
    priority: 122,
  },
  fog_voice_traced: {
    title: "הד הקול הוביל צפונה",
    detail: "הקול לא הגיע מכל מקום: מקורו בחורבה צפונית שנמחקה מן המפות לאחר נפילת שומרי הכתר.",
    tone: "knowledge",
    locations: ["moonwell-undercrypt"],
    priority: 124,
  },
  fog_voice_marked_bearer: {
    title: "הקול סימן את נושא הרסיס",
    detail: "הניסיון לעקוב אחר ההד נכשל. עין דקה נותרה על פני המים, והאויב יידע באיזו דרך בחרת.",
    tone: "danger",
    locations: ["bell-tower-roof", "moonwell-undercrypt"],
    priority: 124,
  },
  shard_echo_sealed: {
    title: "הד הרסיס נאטם",
    detail: "הקשר הפתוח מן ההיכל נסגר. גופך התאושש והכפר לא ישמע הלילה את אותו סיוט.",
    tone: "benefit",
    locations: ["moonwell-undercrypt", "arfelon-square"],
    priority: 126,
  },
  nightmare_followed_village: {
    title: "הסיוט עבר אל הכפר",
    detail: "דלת ההד נשארה פתוחה. עם רדת הלילה תושבי ערפלון יחלקו את החלום שראה נושא הרסיס.",
    tone: "danger",
    locations: ["moonwell-undercrypt", "arfelon-square"],
    priority: 126,
  },
  second_shard_region_known: {
    title: "אזור הרסיס השני זוהה",
    detail: "הכוכב החסר בחזון מתאים לחורבות הצפון. הפרט שנשמר הפך ליעד ממשי לפרק הבא.",
    tone: "knowledge",
    locations: ["moonwell-undercrypt"],
    priority: 128,
  },
  grey_woman_named_namar: {
    title: "האישה באפור חשפה שם",
    detail: "היא נקראה בעבר נאמאר, שומרת השבועה השביעית. עזרתה אינה מקרית, אך בגידתה עדיין אינה מוכחת.",
    tone: "knowledge",
    locations: ["moonwell-undercrypt"],
    priority: 128,
  },
  path_north_chosen: {
    title: "הדרך הצפונית נבחרה",
    detail: "עם הזריחה יישא נושא הרסיס את החיפוש אל החורבה שנמחקה מן המפות.",
    tone: "world",
    locations: ["moonwell-undercrypt", "arfelon-square"],
    priority: 132,
  },
  cult_false_trail_planted: {
    title: "הכת קיבלה נתיב כוזב",
    detail: "עגלונים נושאים מערבה שמועה מכוונת בעוד הדרך האמיתית נפתחת צפונה.",
    tone: "benefit",
    locations: ["moonwell-undercrypt", "wet-raven-inn"],
    priority: 132,
  },
  arfelon_hidden_by_ward: {
    title: "ערפלון הוסתרה מאחורי הברית",
    detail: "אבני הסף והפעמון מטשטשים את הכפר מפני חיפוש מאגי. המחסה הוא תוצאה ישירה של חקירתך המוקדמת.",
    tone: "benefit",
    locations: ["moonwell-undercrypt", "standing-stones", "arfelon-square"],
    priority: 134,
  },
  royal_covenant_forged: {
    title: "ברית מלכותית נכרתה בערפלון",
    detail: "הכפר נעשה משמר הכתר הראשון. אלריק ואנשיו יעמדו ככוח מאורגן בפרקים הבאים.",
    tone: "benefit",
    locations: ["moonwell-undercrypt", "arfelon-square"],
    priority: 136,
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
