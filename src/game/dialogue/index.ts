import type {
  CharacterQuestState,
  DialogueChoice,
  InventoryEntry,
  PlayerCharacter,
  QuestStatus,
  Relationship,
  StoryCondition,
  StoryEffect,
  StoryState,
} from "../../types/game";

export interface ConditionContext {
  character: PlayerCharacter;
  story: StoryState;
  inventory: readonly InventoryEntry[];
  quests: readonly CharacterQuestState[];
}

function compare(left: number, operator: string, right: number): boolean {
  switch (operator) {
    case "eq": return left === right;
    case "neq": return left !== right;
    case "gt": return left > right;
    case "gte": return left >= right;
    case "lt": return left < right;
    case "lte": return left <= right;
    default: return false;
  }
}

export function evaluateCondition(condition: StoryCondition, context: ConditionContext): boolean {
  switch (condition.kind) {
    case "flag":
      return context.story.flags[condition.key] === condition.value;
    case "item":
      return context.inventory
        .filter((entry) => entry.itemId === condition.itemId)
        .reduce((sum, entry) => sum + entry.quantity, 0) >= condition.minimumQuantity;
    case "race":
      return context.character.raceId === condition.raceId;
    case "class":
      return context.character.classId === condition.classId;
    case "background":
      return context.character.backgroundId === condition.backgroundId;
    case "relationship": {
      const relationship = context.story.relationships[condition.npcId];
      const value = relationship?.[condition.field];
      return typeof value === "number" && compare(value, condition.operator, condition.value);
    }
    case "quest":
      return context.quests.some((quest) => quest.questId === condition.questId && quest.status === condition.status);
  }
}

export function availableChoices(choices: readonly DialogueChoice[], context: ConditionContext): DialogueChoice[] {
  return choices.filter((choice) => (choice.conditions ?? []).every((condition) => evaluateCondition(condition, context)));
}

export interface EffectState {
  character: PlayerCharacter;
  story: StoryState;
  inventoryGrants: Array<{ itemId: string; quantity: number }>;
  questTransitions: Array<
    | { kind: "start"; questId: string }
    | { kind: "objective"; questId: string; objectiveId: string; status: string }
  >;
  experienceGranted: number;
}

function clampRelationship(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

export function applyStoryEffects(
  initial: Pick<EffectState, "character" | "story">,
  effects: readonly StoryEffect[],
): EffectState {
  let state: EffectState = {
    ...initial,
    inventoryGrants: [],
    questTransitions: [],
    experienceGranted: 0,
  };
  for (const effect of effects) {
    switch (effect.kind) {
      case "set-flag":
        state = { ...state, story: { ...state.story, flags: { ...state.story.flags, [effect.key]: effect.value } } };
        break;
      case "relationship": {
        const current: Relationship = state.story.relationships[effect.npcId] ?? {
          npcId: effect.npcId,
          trust: 0,
          respect: 0,
          fear: 0,
        };
        const next = { ...current, [effect.field]: clampRelationship(current[effect.field] + effect.amount) };
        state = {
          ...state,
          story: { ...state.story, relationships: { ...state.story.relationships, [effect.npcId]: next } },
        };
        break;
      }
      case "reputation":
        state = {
          ...state,
          character: { ...state.character, reputation: state.character.reputation + effect.amount },
          story: { ...state.story, reputation: state.story.reputation + effect.amount },
        };
        break;
      case "grant-item":
        state = { ...state, inventoryGrants: [...state.inventoryGrants, { itemId: effect.itemId, quantity: effect.quantity }] };
        break;
      case "quest-start":
        state = { ...state, questTransitions: [...state.questTransitions, { kind: "start", questId: effect.questId }] };
        break;
      case "quest-objective":
        state = {
          ...state,
          questTransitions: [
            ...state.questTransitions,
            { kind: "objective", questId: effect.questId, objectiveId: effect.objectiveId, status: effect.status },
          ],
        };
        break;
      case "experience":
        state = { ...state, experienceGranted: state.experienceGranted + effect.amount };
        break;
      case "gold":
        state = {
          ...state,
          character: { ...state.character, gold: Math.max(0, state.character.gold + effect.amount) },
        };
        break;
      case "heal":
        state = {
          ...state,
          character: {
            ...state.character,
            currentHealth: Math.min(
              state.character.derivedStats.maximumHealth,
              state.character.currentHealth + effect.amount,
            ),
          },
        };
        break;
    }
  }
  return state;
}

export function questStatus(context: ConditionContext, questId: string): QuestStatus | undefined {
  return context.quests.find((quest) => quest.questId === questId)?.status;
}
