import type { Quest } from "../types/game";

export const quests: Quest[] = [
  {
    id: "shadows-beneath-village",
    name: "הצללים שמתחת לכפר",
    description: "שלושה כורים נעלמו במכרה שנפתח מחדש לאחר רעידת האדמה. אלריק מבקש לגלות מה אירע להם ומה העיר את המעמקים.",
    type: "main",
    objectives: [
      { id: "speak-to-headman", text: "דבר עם ראש הכפר.", optional: false, status: "active" },
      { id: "prepare-for-mine", text: "התכונן למסע אל המכרה.", optional: false, status: "active" },
      { id: "reach-mine", text: "הגע לכניסת המכרה.", optional: false, status: "active" },
      { id: "investigate-main-tunnel", text: "חקור את המנהרה הראשית.", optional: false, status: "active" },
      { id: "find-miner-sign", text: "מצא סימן לכורים הנעדרים.", optional: false, status: "active" },
      { id: "discover-prior-intruders", text: "גלה מי נכנס למכרה לפניך.", optional: false, status: "active" },
      { id: "defeat-guardian", text: "הבס את שומר האבן.", optional: false, status: "active" },
      { id: "inspect-shard", text: "בדוק את הרסיס המסתורי.", optional: false, status: "active" },
      { id: "return-to-village", text: "שוב לערפלון לאחר החיזיון.", optional: false, hiddenUntilFlag: "vision_seen", status: "hidden" },
      { id: "decide-shard-truth", text: "החלט איזו אמת לחשוף בפני הכפר.", optional: false, hiddenUntilFlag: "vision_seen", status: "hidden" },
      { id: "ask-mira-earthquake", text: "דבר עם הנפחית על רעידת האדמה.", optional: true, hiddenUntilFlag: "met_elric", status: "hidden" },
      { id: "obtain-light", text: "השג מקור אור.", optional: true, hiddenUntilFlag: "quest_accepted", status: "hidden" },
      { id: "find-trapped-miner", text: "מצא את הכורה הלכוד.", optional: true, hiddenUntilFlag: "heard_danor", status: "hidden" },
      { id: "investigate-cult-symbol", text: "חקור את סמל הכת.", optional: true, hiddenUntilFlag: "cult_symbol_seen", status: "hidden" },
      { id: "discover-secret-passage", text: "גלה את המעבר הנסתר.", optional: true, hiddenUntilFlag: "wall_knocks_heard", status: "hidden" },
      { id: "find-foreman-journal", text: "מצא את יומן מנהל המכרה.", optional: true, hiddenUntilFlag: "tool_store_found", status: "hidden" },
      { id: "silence-watchtower", text: "כבה את אות הערפל במגדל התצפית.", optional: true, hiddenUntilFlag: "quest_accepted", status: "hidden" },
      { id: "restore-waystones", text: "שחזר את שבועת אבני הסף.", optional: true, hiddenUntilFlag: "old_map_secret_route", status: "hidden" },
    ],
    rewards: { experience: 420, gold: 65, itemIds: ["first-crown-shard", "guardian-core"], reputation: 8 },
  },
  {
    id: "the-wet-ravens-secret",
    name: "האורח שלא שילם",
    description: "ברום טוען שאורח בגלימה עזב בלי לשלם. החדר שבו לן עדיין נעול.",
    type: "optional",
    objectives: [
      { id: "question-brom", text: "שאל את ברום על האורח בגלימה.", optional: false, status: "active" },
      { id: "search-guest-room", text: "חפש בחדר האורח.", optional: false, status: "active" },
      { id: "return-medallion-clue", text: "הראה לאלריק את הסימן שמצאת.", optional: false, status: "active" },
    ],
    rewards: { experience: 100, gold: 18, itemIds: ["minor-healing-potion"], reputation: 2 },
  },
];

export const questsById = Object.fromEntries(quests.map((quest) => [quest.id, quest])) as Record<string, Quest>;
