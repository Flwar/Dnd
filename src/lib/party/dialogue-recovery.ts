import { dialoguesById } from "@/content/dialogues";
import type { PartyGameDecisionState } from "@/lib/party/game-realtime";
import type { DialogueChoice, DialogueNode } from "@/types/game";

export type HistoricalPartyDialogueChoice = {
  sceneId: string;
  node: DialogueNode;
  choice: DialogueChoice;
};

/**
 * Returns authoritative choices from scenes the party already left whose
 * effects are still missing from this character's cloud save. The caller can
 * replay their data effects without reopening dialogue or moving the session.
 */
export function findUnappliedHistoricalPartyDialogueChoices(
  currentSceneId: string,
  decisions: readonly PartyGameDecisionState[],
  storyFlags: Readonly<Record<string, unknown>>,
): HistoricalPartyDialogueChoice[] {
  return decisions.flatMap((decision) => {
    if (decision.sceneId === currentSceneId || !decision.resolvedChoiceId) return [];
    const node = dialoguesById[decision.decisionId];
    const choice = node?.choices.find(
      (candidate) => candidate.id === decision.resolvedChoiceId,
    );
    if (!node || !choice || storyFlags[`dialogue_choice_${choice.id}_selected`]) return [];
    return [{ sceneId: decision.sceneId, node, choice }];
  });
}

/**
 * Reconstructs the first dialogue node that still needs a party vote.
 * Dialogue panel state is intentionally local UI state, while votes live in
 * Supabase; this bridge makes a refresh/reconnect resume the same branch.
 */
export function findResumablePartyDialogueNode(
  rootNodeId: string,
  decisions: readonly PartyGameDecisionState[],
): string | null {
  const visited = new Set<string>();
  let nodeId: string | null = rootNodeId;

  while (nodeId && !visited.has(nodeId)) {
    visited.add(nodeId);
    const node: DialogueNode | undefined = dialoguesById[nodeId];
    if (!node) return null;
    const decision = decisions.find((candidate) => candidate.decisionId === nodeId);
    if (!decision?.resolvedChoiceId) return nodeId;
    const choice: DialogueChoice | undefined = node.choices.find(
      (candidate) => candidate.id === decision.resolvedChoiceId,
    );
    if (!choice?.nextNodeId) return null;
    nodeId = choice.nextNodeId;
  }

  return null;
}
