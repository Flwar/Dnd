import type {
  CharacterQuestState,
  ObjectiveStatus,
  Quest,
  QuestObjective,
  QuestStatus,
} from "../../types/game";

export interface QuestTransition {
  state: CharacterQuestState;
  changed: boolean;
  completedNow: boolean;
}

const objectiveStatuses = new Set<ObjectiveStatus>(["hidden", "active", "completed", "failed"]);

/**
 * Rebuilds a complete objective map from authored quest content. Database fallback
 * rows from older saves may contain only objectives that changed; absent entries
 * must inherit their authored visibility instead of being treated as visible by UI.
 */
export function normalizeQuestObjectives(
  quest: Quest,
  storedObjectives: Readonly<Record<string, unknown>>,
  flags: Readonly<Record<string, boolean | string | number>>,
): Record<string, ObjectiveStatus> {
  return Object.fromEntries(
    quest.objectives.map((objective) => {
      const stored = storedObjectives[objective.id];
      let status: ObjectiveStatus = objectiveStatuses.has(stored as ObjectiveStatus)
        ? (stored as ObjectiveStatus)
        : objective.hiddenUntilFlag || objective.status === "hidden"
          ? "hidden"
          : objective.status;

      if (status === "hidden" && objective.hiddenUntilFlag && Boolean(flags[objective.hiddenUntilFlag])) {
        status = "active";
      }

      return [objective.id, status];
    }),
  );
}

export function createQuestState(quest: Quest, now: string, visible = true): CharacterQuestState {
  return {
    questId: quest.id,
    status: visible ? "active" : "hidden",
    objectives: Object.fromEntries(
      quest.objectives.map((objective) => [
        objective.id,
        objective.hiddenUntilFlag || objective.status === "hidden" ? "hidden" : objective.status,
      ]),
    ),
    startedAt: visible ? now : null,
    completedAt: null,
    rewardClaimed: false,
  };
}

function canCompleteQuest(quest: Quest, objectives: Record<string, ObjectiveStatus>): boolean {
  return quest.objectives
    .filter((objective) => !objective.optional)
    .every((objective) => objectives[objective.id] === "completed");
}

export function setObjectiveStatus(
  state: CharacterQuestState,
  quest: Quest,
  objectiveId: string,
  status: ObjectiveStatus,
  now: string,
): QuestTransition {
  const definition = quest.objectives.find((objective) => objective.id === objectiveId);
  if (!definition || state.status === "completed" || state.status === "failed") {
    return { state, changed: false, completedNow: false };
  }
  const current = state.objectives[objectiveId];
  if (current === status) return { state, changed: false, completedNow: false };
  const objectives = { ...state.objectives, [objectiveId]: status };
  const completedNow = canCompleteQuest(quest, objectives);
  return {
    state: {
      ...state,
      objectives,
      status: completedNow ? "completed" : state.status === "hidden" ? "active" : state.status,
      startedAt: state.startedAt ?? now,
      completedAt: completedNow ? now : state.completedAt,
    },
    changed: true,
    completedNow,
  };
}

export function revealObjectives(
  state: CharacterQuestState,
  quest: Quest,
  flags: Readonly<Record<string, boolean | string | number>>,
): CharacterQuestState {
  const objectives = { ...state.objectives };
  for (const objective of quest.objectives) {
    if (
      objectives[objective.id] === "hidden" &&
      objective.hiddenUntilFlag &&
      Boolean(flags[objective.hiddenUntilFlag])
    ) {
      objectives[objective.id] = "active";
    }
  }
  return { ...state, objectives };
}

export function failQuest(state: CharacterQuestState, now: string): CharacterQuestState {
  if (state.status === "completed") return state;
  return { ...state, status: "failed", completedAt: now };
}

export function claimQuestReward(state: CharacterQuestState): { state: CharacterQuestState; granted: boolean } {
  if (state.status !== "completed" || state.rewardClaimed) return { state, granted: false };
  return { state: { ...state, rewardClaimed: true }, granted: true };
}

export function objectiveIsVisible(
  objective: QuestObjective,
  state: CharacterQuestState,
): boolean {
  const status = state.objectives[objective.id];
  return status !== undefined && status !== "hidden";
}

export function questProgress(quest: Quest, state: CharacterQuestState): { completed: number; total: number } {
  const visibleRequired = quest.objectives.filter(
    (objective) => !objective.optional && objectiveIsVisible(objective, state),
  );
  return {
    completed: visibleRequired.filter((objective) => state.objectives[objective.id] === "completed").length,
    total: visibleRequired.length,
  };
}

export function isTerminalQuestStatus(status: QuestStatus): boolean {
  return status === "completed" || status === "failed";
}
