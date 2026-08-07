import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  abilitiesById,
  assetManifest,
  assetManifestByKey,
  backgroundsById,
  characterBackgrounds,
  characterClasses,
  characterRaces,
  dialogues,
  dialoguesById,
  encountersById,
  itemsById,
  locations,
  locationsById,
  npcs,
  openingChapter,
  openingScenes,
  questsById,
} from "../../src/content";
import { he } from "../../src/lib/i18n";

describe("שלמות תוכן הפרק", () => {
  it("כולל את כל הגזעים, המקצועות והרקעים הנדרשים", () => {
    expect(characterRaces.map((entry) => entry.name)).toEqual([
      "אדם", "אלף", "גמד", "בן מחצית", "אורק", "בן דרקון",
    ]);
    expect(characterClasses.map((entry) => entry.name)).toEqual([
      "לוחם", "קוסם", "נוכל", "סייר", "כוהן", "ברברי", "מלך",
    ]);
    expect(characterBackgrounds).toHaveLength(7);
    expect(Object.keys(backgroundsById)).toHaveLength(7);
  });

  it("נותן לכל מקצוע שלוש יכולות פתיחה קיימות ושונות", () => {
    for (const characterClass of characterClasses) {
      expect(characterClass.startingAbilityIds).toHaveLength(3);
      expect(new Set(characterClass.startingAbilityIds).size).toBe(3);
      for (const abilityId of characterClass.startingAbilityIds) {
        expect(abilitiesById[abilityId]?.classId).toBe(characterClass.id);
      }
    }
  });

  it("כולל שישה־עשר מיקומים עם אמנות, אווירה ויציאות חוקיות", () => {
    const requiredNames = [
      "שער הכפר", "כיכר ערפלון", "פונדק העורב הרטוב", "הנפחייה", "בקתת המרפא", "בית ראש הכפר",
      "הדרך למכרה", "מגדל התצפית החרב", "מעגל אבני הסף", "כניסת המכרה", "המנהרה הראשית", "מחסן הכלים הנטוש", "המעבר המוצף", "אולם העמודים",
      "החדר הנסתר", "היכל השומר",
    ];
    expect(locations.map((location) => location.name)).toEqual(requiredNames);
    expect(new Set(locations.map((location) => location.backgroundAssetKey)).size).toBe(16);
    for (const location of locations) {
      expect(location.backgroundAssetKey).toBeTruthy();
      expect(location.ambienceSoundKey).toBeTruthy();
      for (const exit of location.exits) expect(locationsById[exit.destinationId]).toBeDefined();
      for (const interaction of location.interactions) {
        if (interaction.dialogueNodeId) expect(dialoguesById[interaction.dialogueNodeId]).toBeDefined();
        if (interaction.encounterId) expect(encountersById[interaction.encounterId]).toBeDefined();
      }
    }
  });

  it("כולל את כל הדמויות המרכזיות עם קול תגובתי ויומן", () => {
    expect(npcs.map((npc) => npc.name)).toEqual(["אלריק", "מירה", "תאל", "ברום", "דנור", "האישה באפור"]);
    for (const npc of npcs) {
      expect(npc.journalEntry.length).toBeGreaterThan(30);
      expect(Object.keys(npc.reactiveLines).length).toBeGreaterThanOrEqual(3);
      expect(dialogues.some((dialogue) => dialogue.npcId === npc.id)).toBe(true);
    }
  });

  it("מחבר כל מעבר שיחה לצומת קיים", () => {
    for (const node of dialogues) {
      for (const choice of node.choices) {
        if (choice.nextNodeId) expect(dialoguesById[choice.nextNodeId]).toBeDefined();
      }
    }
  });

  it("מכיל את כל יעדי המשימה הראשית, כולל יעדים נסתרים", () => {
    const quest = questsById["shadows-beneath-village"];
    expect(quest.objectives.filter((objective) => !objective.optional)).toHaveLength(10);
    expect(quest.objectives.filter((objective) => objective.optional)).toHaveLength(8);
    expect(quest.objectives.filter((objective) => objective.hiddenUntilFlag).length).toBeGreaterThanOrEqual(6);
    expect(itemsById["first-crown-shard"].name).toBe("רסיס הכתר הראשון");
  });

  it("משאיר מסלול התקדמות גם בכישלון בבדיקות הסיפור החד־פעמיות", () => {
    const interactions = locations.flatMap((location) => location.interactions);
    const minerSign = interactions.find((interaction) => interaction.id === "inspect-blood-tools")!;
    const cultRemains = interactions.find((interaction) => interaction.id === "study-cult-remains")!;

    for (const effects of [minerSign.skillCheck?.successEffects, minerSign.skillCheck?.failureEffects]) {
      expect(effects).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "quest-objective", objectiveId: "find-miner-sign", status: "completed" }),
      ]));
    }

    for (const effects of [cultRemains.skillCheck?.successEffects, cultRemains.skillCheck?.failureEffects]) {
      expect(effects).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "set-flag", key: "cult_opened_guardian_hall", value: true }),
        expect.objectContaining({ kind: "quest-objective", objectiveId: "discover-prior-intruders", status: "completed" }),
      ]));
    }

    expect(cultRemains.skillCheck?.failureEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "set-flag", key: "guardian_awakened_early", value: true }),
    ]));
  });

  it("מכיל שלוש־עשרה סצנות מלאות, חזרה לכפר וחזון סיום", () => {
    expect(openingChapter.estimatedMinutes).toEqual([70, 120]);
    expect(openingScenes).toHaveLength(13);
    expect(openingScenes.map((scene) => scene.number)).toEqual(Array.from({ length: 13 }, (_, index) => index + 1));
    expect(dialoguesById["grey-woman-vision"].text).toContain("מצאתי אותך");
  });

  it("מכסה במניפסט את האמנות, האייקונים והדיוקנאות שבהם התוכן משתמש", () => {
    for (const location of locations) expect(assetManifestByKey[location.backgroundAssetKey]).toBeDefined();
    for (const npc of npcs) expect(assetManifestByKey[npc.portraitKey]).toBeDefined();
    for (const characterClass of characterClasses) expect(assetManifestByKey[characterClass.previewAssetKey]).toBeDefined();
    for (const ability of Object.values(abilitiesById)) expect(assetManifestByKey[ability.iconAssetKey]).toBeDefined();
    for (const item of Object.values(itemsById)) expect(assetManifestByKey[item.iconAssetKey]).toBeDefined();
  });

  it("משתמש במניפסט נכסים קנוני ללא מפתחות כפולים או קבצים מדומים", () => {
    expect(new Set(assetManifest.map((entry) => entry.key)).size).toBe(assetManifest.length);
    for (const entry of assetManifest) {
      expect(entry.path).toMatch(/^\/assets\/(?:rebuild|art-v2)\//);
      expect(existsSync(join(process.cwd(), "public", entry.path))).toBe(true);
    }
  });

  it("אוסר נכסי placeholder, זמניים או צלליות ריקות במניפסט הייצור", () => {
    const forbiddenAssetTerms = /(?:placeholder|dummy|temporary|temp-|silhouette|image-placeholder|coming-soon)/i;

    for (const entry of assetManifest) {
      expect(`${entry.key} ${entry.path}`).not.toMatch(forbiddenAssetTerms);
      expect(entry.source).toMatch(/^(?:generated|original|licensed)$/);
    }

    const kingClass = characterClasses.find((entry) => entry.id === "king")!;
    expect(kingClass.previewAssetKey).toBe("class-king-preview");
    for (const abilityId of kingClass.startingAbilityIds) {
      const ability = abilitiesById[abilityId];
      expect(assetManifestByKey[ability.iconAssetKey]?.path).toMatch(/^\/assets\/art-v2\/icons\/.+\.webp$/);
    }
  });

  it("אינו מאפשר לדלג על החקירה, החילוץ ושני הקרבות הרגילים", () => {
    const roadExit = locationsById["mine-road"].exits.find((exit) => exit.destinationId === "mine-entrance");
    const minerExit = locationsById["main-tunnel"].exits.find((exit) => exit.destinationId === "abandoned-tool-store");
    const floodedExit = locationsById["flooded-passage"].exits.find((exit) => exit.destinationId === "pillar-hall");
    const directTunnelExit = locationsById["main-tunnel"].exits.find((exit) => exit.destinationId === "pillar-hall");

    expect(roadExit?.conditions).toContainEqual({ kind: "flag", key: "interaction_track-hooded-figures_completed", value: true });
    expect(minerExit?.conditions).toContainEqual({ kind: "flag", key: "heard_danor", value: true });
    expect(floodedExit?.conditions).toEqual(expect.arrayContaining([
      { kind: "flag", key: "flood_pack_defeated", value: true },
      { kind: "flag", key: "danor_resolved", value: true },
    ]));
    expect(directTunnelExit).toBeUndefined();
  });

  it("אינו חושף מונחי ממשק אנגליים במילון העברי", () => {
    const collectValues = (value: unknown): string[] =>
      typeof value === "string"
        ? [value]
        : value && typeof value === "object"
          ? Object.values(value).flatMap(collectValues)
          : [];
    const visibleDictionary = collectValues(he).join(" ");
    expect(visibleDictionary).not.toMatch(/\b(?:Submit|Loading|Continue|Settings|Inventory|Username|Error|Level)\b/i);
  });
});
