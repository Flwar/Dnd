import { describe, expect, it } from "vitest";
import {
  findResumablePartyDialogueNode,
  findUnappliedHistoricalPartyDialogueChoices,
} from "@/lib/party/dialogue-recovery";
import type { PartyGameDecisionState } from "@/lib/party/game-realtime";

function resolvedDecision(
  decisionId: string,
  resolvedChoiceId: string,
): PartyGameDecisionState {
  return {
    sceneId: "scene-village-leader",
    decisionId,
    totalVotes: 2,
    requiredVotes: 2,
    choiceCounts: { [resolvedChoiceId]: 2 },
    votes: [],
    resolvedChoiceId,
    leaderBrokeTie: false,
  };
}

describe("שחזור דיאלוג חבורה אחרי refresh", () => {
  it("פותח מחדש את הצומת שעדיין ממתין להצבעה", () => {
    expect(findResumablePartyDialogueNode("elric-introduction", [])).toBe(
      "elric-introduction",
    );
  });

  it("מדלג על בחירה שכבר הוכרעה ומשחזר את הצומת הבא", () => {
    expect(findResumablePartyDialogueNode("elric-introduction", [
      resolvedDecision("elric-introduction", "elric-kind"),
    ])).toBe("elric-quest");
  });

  it("לא פותח דיאלוג שכבר הסתיים בבחירת יציאה", () => {
    expect(findResumablePartyDialogueNode("elric-introduction", [
      resolvedDecision("elric-introduction", "elric-kind"),
      resolvedDecision("elric-quest", "elric-accept"),
    ])).toBeNull();
  });

  it("משלים בחירה מסצנה קודמת פעם אחת בלי להחזיר את הדיאלוג הישן למסך", () => {
    const pastDecision = {
      ...resolvedDecision("elric-introduction", "elric-kind"),
      sceneId: "scene-village-leader",
    };

    expect(findUnappliedHistoricalPartyDialogueChoices(
      "scene-road-to-mine",
      [pastDecision],
      {},
    )).toEqual([
      expect.objectContaining({
        sceneId: "scene-village-leader",
        node: expect.objectContaining({ id: "elric-introduction" }),
        choice: expect.objectContaining({ id: "elric-kind" }),
      }),
    ]);
    expect(findUnappliedHistoricalPartyDialogueChoices(
      "scene-road-to-mine",
      [pastDecision],
      { "dialogue_choice_elric-kind_selected": true },
    )).toEqual([]);
  });
});
