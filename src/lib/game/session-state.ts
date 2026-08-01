import { addItem } from "@/game/inventory";
import { applyStoryEffects } from "@/game/dialogue";
import { createQuestState, revealObjectives, setObjectiveStatus } from "@/game/quests";
import { grantExperience } from "@/game/progression";
import { itemsById } from "@/content/items";
import { questsById } from "@/content/quests";
import { classesById } from "@/content/classes";
import type { Combatant, SaveData, StoryEffect } from "@/types/game";

export interface AppliedEffects {
  save: SaveData;
  acquiredItemIds: string[];
  questUpdated: boolean;
  experienceGranted: number;
  levelsGained: number;
}

function safeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `entry-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function applyEffectsToSave(
  save: SaveData,
  effects: readonly StoryEffect[],
  eventId: string,
  now = new Date().toISOString(),
): AppliedEffects {
  const effectState = applyStoryEffects({ character: save.character, story: save.story }, effects);
  let inventory = [...save.inventory];
  const acquiredItemIds: string[] = [];
  for (const grant of effectState.inventoryGrants) {
    const item = itemsById[grant.itemId];
    if (!item) continue;
    const result = addItem(inventory, item, grant.quantity, now, safeId);
    if (result.ok) {
      inventory = result.value;
      acquiredItemIds.push(item.id);
    }
  }

  let quests = [...save.quests];
  let questUpdated = false;
  for (const transition of effectState.questTransitions) {
    const definition = questsById[transition.questId];
    if (!definition) continue;
    let index = quests.findIndex((quest) => quest.questId === transition.questId);
    if (index < 0) {
      quests.push(createQuestState(definition, now));
      index = quests.length - 1;
      questUpdated = true;
    }
    if (transition.kind === "objective") {
      const changed = setObjectiveStatus(
        quests[index],
        definition,
        transition.objectiveId,
        transition.status as "hidden" | "active" | "completed" | "failed",
        now,
      );
      quests[index] = changed.state;
      questUpdated ||= changed.changed;
    }
  }

  quests = quests.map((quest) => {
    const definition = questsById[quest.questId];
    return definition ? revealObjectives(quest, definition, effectState.story.flags) : quest;
  });

  let questRewardExperience = 0;
  let questRewardGold = 0;
  let questRewardReputation = 0;
  quests = quests.map((quest) => {
    const definition = questsById[quest.questId];
    if (!definition || quest.status !== "completed" || quest.rewardClaimed) return quest;
    questRewardExperience += definition.rewards.experience;
    questRewardGold += definition.rewards.gold;
    questRewardReputation += definition.rewards.reputation;
    for (const itemId of definition.rewards.itemIds) {
      const item = itemsById[itemId];
      if (!item) continue;
      const result = addItem(inventory, item, 1, now, safeId);
      if (result.ok) {
        inventory = result.value;
        acquiredItemIds.push(item.id);
      }
    }
    questUpdated = true;
    return { ...quest, rewardClaimed: true };
  });

  const rewardedCharacter = {
    ...effectState.character,
    gold: effectState.character.gold + questRewardGold,
    reputation: effectState.character.reputation + questRewardReputation,
  };
  const rewardedStory = {
    ...effectState.story,
    reputation: effectState.story.reputation + questRewardReputation,
  };

  const totalExperience = effectState.experienceGranted + questRewardExperience;
  const progression = totalExperience > 0
    ? grantExperience(rewardedCharacter, totalExperience, eventId, save.rewardedEventIds)
    : {
        character: rewardedCharacter,
        levelsGained: 0,
        rewardedEventIds: save.rewardedEventIds,
      };

  return {
    save: {
      ...save,
      character: progression.character,
      inventory,
      quests,
      story: rewardedStory,
      rewardedEventIds: progression.rewardedEventIds,
      savedAt: now,
    },
    acquiredItemIds,
    questUpdated,
    experienceGranted: totalExperience,
    levelsGained: progression.levelsGained,
  };
}

export function travelToLocation(save: SaveData, locationId: string, now = new Date().toISOString()): SaveData {
  const visited = save.story.visitedLocationIds.includes(locationId)
    ? save.story.visitedLocationIds
    : [...save.story.visitedLocationIds, locationId];
  const discovered = save.discoveredLocationIds.includes(locationId)
    ? save.discoveredLocationIds
    : [...save.discoveredLocationIds, locationId];
  return {
    ...save,
    character: { ...save.character, currentLocationId: locationId, lastPlayedAt: now },
    story: { ...save.story, currentLocationId: locationId, visitedLocationIds: visited },
    discoveredLocationIds: discovered,
    savedAt: now,
  };
}

export function createPlayerCombatant(save: SaveData): Combatant {
  const character = save.character;
  const characterClass = classesById[character.classId];
  return {
    id: `player-${character.id}`,
    kind: "player",
    name: character.name,
    characterId: character.id,
    level: character.level,
    attributes: { ...character.attributes },
    maximumHealth: character.derivedStats.maximumHealth,
    currentHealth: character.currentHealth,
    armor: character.derivedStats.armor,
    accuracy: character.derivedStats.accuracy,
    initiativeBonus: character.derivedStats.initiative,
    resourceType: characterClass?.resourceType,
    maximumResource: character.derivedStats.maximumPrimaryResource,
    currentResource: character.primaryResource,
    abilityIds: [...(characterClass?.startingAbilityIds ?? [])],
    cooldowns: {},
    statuses: [],
    defeated: false,
  };
}
