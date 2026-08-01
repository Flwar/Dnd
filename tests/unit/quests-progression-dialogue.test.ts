import { describe, expect, it } from "vitest";
import { questsById } from "../../src/content";
import { applyStoryEffects } from "../../src/game/dialogue";
import { grantExperience, levelForExperience } from "../../src/game/progression";
import {
  claimQuestReward,
  createQuestState,
  normalizeQuestObjectives,
  objectiveIsVisible,
  revealObjectives,
  setObjectiveStatus,
} from "../../src/game/quests";
import type { StoryState } from "../../src/types/game";
import { makeCharacter, now } from "./fixtures";

describe("מערכת משימות", () => {
  it("מקדמת יעדים ומשלימה משימה כשכל יעדי החובה הושלמו", () => {
    const quest = questsById["the-wet-ravens-secret"];
    let state = createQuestState(quest, now);
    for (const objective of quest.objectives.filter((entry) => !entry.optional)) {
      state = setObjectiveStatus(state, quest, objective.id, "completed", now).state;
    }
    expect(state.status).toBe("completed");
    expect(state.completedAt).toBe(now);
  });

  it("אינו חושף יעד נסתר לפני שהדגל המתאים קיים", () => {
    const quest = questsById["shadows-beneath-village"];
    const state = createQuestState(quest, now);
    const objectiveId = "discover-secret-passage";
    expect(state.objectives[objectiveId]).toBe("hidden");
    expect(revealObjectives(state, quest, {}).objectives[objectiveId]).toBe("hidden");
    expect(revealObjectives(state, quest, { wall_knocks_heard: true }).objectives[objectiveId]).toBe("active");
  });

  it("משלים מפת יעדים חלקית מטעינת fallback ושומר יעדים נסתרים", () => {
    const quest = questsById["shadows-beneath-village"];
    const objectives = normalizeQuestObjectives(
      quest,
      { "speak-to-headman": "completed", "unknown-objective": "active" },
      {},
    );

    expect(Object.keys(objectives)).toHaveLength(quest.objectives.length);
    expect(objectives["speak-to-headman"]).toBe("completed");
    expect(objectives["reach-mine"]).toBe("active");
    expect(objectives["discover-secret-passage"]).toBe("hidden");
    expect(objectives["unknown-objective"]).toBeUndefined();
  });

  it("חושף בטעינת fallback רק יעד נסתר שהדגל שלו כבר נשמר", () => {
    const quest = questsById["shadows-beneath-village"];
    const objectives = normalizeQuestObjectives(quest, {}, { wall_knocks_heard: true });
    const state = { ...createQuestState(quest, now), objectives };
    const secret = quest.objectives.find((objective) => objective.id === "discover-secret-passage")!;
    const journal = quest.objectives.find((objective) => objective.id === "find-foreman-journal")!;

    expect(objectives[secret.id]).toBe("active");
    expect(objectiveIsVisible(secret, state)).toBe(true);
    expect(objectives[journal.id]).toBe("hidden");
    expect(objectiveIsVisible(journal, state)).toBe(false);
  });

  it("אינו מציג יעד שחסר ממצב ישן לפני שהטעינה נורמלה", () => {
    const quest = questsById["shadows-beneath-village"];
    const state = { ...createQuestState(quest, now), objectives: {} };
    expect(objectiveIsVisible(quest.objectives[0], state)).toBe(false);
  });

  it("מעניק פרס משימה פעם אחת בלבד", () => {
    const quest = questsById["the-wet-ravens-secret"];
    let state = createQuestState(quest, now);
    for (const objective of quest.objectives) {
      state = setObjectiveStatus(state, quest, objective.id, "completed", now).state;
    }
    const first = claimQuestReward(state);
    const second = claimQuestReward(first.state);
    expect(first.granted).toBe(true);
    expect(second.granted).toBe(false);
  });
});

describe("יחסים והשפעות סיפור", () => {
  it("מחיל שינויי יחסים ושומר אותם בטווח החוקי", () => {
    const story: StoryState = {
      flags: {},
      relationships: { elric: { npcId: "elric", trust: 98, respect: 0, fear: 0 } },
      reputation: 0,
      currentSceneId: "scene-arrival",
      currentLocationId: "village-gate",
      visitedLocationIds: ["village-gate"],
    };
    const result = applyStoryEffects(
      { character: makeCharacter(), story },
      [
        { kind: "relationship", npcId: "elric", field: "trust", amount: 10 },
        { kind: "set-flag", key: "promise_kept", value: true },
        { kind: "reputation", amount: 3 },
      ],
    );
    expect(result.story.relationships.elric.trust).toBe(100);
    expect(result.story.flags.promise_kept).toBe(true);
    expect(result.character.reputation).toBe(3);
  });
});

describe("ניסיון ועליית דרגה", () => {
  it("מחשב דרגה מסך הניסיון", () => {
    expect(levelForExperience(0)).toBe(1);
    expect(levelForExperience(499)).toBe(1);
    expect(levelForExperience(500)).toBe(2);
  });

  it("מעלה לדרגה 2 ומגדיל חיים ומשאב", () => {
    const character = makeCharacter({ experience: 450 });
    const result = grantExperience(character, 100, "first-boss", []);
    expect(result.character.level).toBe(2);
    expect(result.healthGained).toBeGreaterThan(0);
    expect(result.resourceGained).toBeGreaterThan(0);
  });

  it("מונע פרס ניסיון כפול לאחר רענון או ניסיון חוזר", () => {
    const character = makeCharacter();
    const first = grantExperience(character, 100, "encounter-one", []);
    const duplicate = grantExperience(first.character, 100, "encounter-one", first.rewardedEventIds);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.character.experience).toBe(100);
  });
});
