import type { PlayerCharacter } from "../../types/game";

export const LEVEL_CAP = 10;
export const EXPERIENCE_THRESHOLDS = [0, 0, 500, 1_300, 2_600, 4_500, 7_000, 10_200, 14_200, 19_000, 25_000] as const;

export interface ProgressionResult {
  character: PlayerCharacter;
  levelsGained: number;
  healthGained: number;
  resourceGained: number;
  duplicate: boolean;
  rewardedEventIds: string[];
}

export function levelForExperience(experience: number): number {
  let level = 1;
  for (let candidate = 2; candidate <= LEVEL_CAP; candidate += 1) {
    if (experience >= EXPERIENCE_THRESHOLDS[candidate]) level = candidate;
  }
  return level;
}

export function grantExperience(
  character: PlayerCharacter,
  amount: number,
  eventId: string,
  rewardedEventIds: readonly string[],
): ProgressionResult {
  if (rewardedEventIds.includes(eventId)) {
    return {
      character,
      levelsGained: 0,
      healthGained: 0,
      resourceGained: 0,
      duplicate: true,
      rewardedEventIds: [...rewardedEventIds],
    };
  }
  const experience = Math.max(0, character.experience + Math.max(0, Math.trunc(amount)));
  const level = levelForExperience(experience);
  const levelsGained = Math.max(0, level - character.level);
  const healthGained = levelsGained * 6;
  const resourceGained = levelsGained * 2;
  const derivedStats = {
    ...character.derivedStats,
    maximumHealth: character.derivedStats.maximumHealth + healthGained,
    maximumPrimaryResource: character.derivedStats.maximumPrimaryResource + resourceGained,
  };
  return {
    character: {
      ...character,
      experience,
      level,
      derivedStats,
      currentHealth: character.currentHealth + healthGained,
      primaryResource: character.primaryResource + resourceGained,
    },
    levelsGained,
    healthGained,
    resourceGained,
    duplicate: false,
    rewardedEventIds: [...rewardedEventIds, eventId],
  };
}

export function experienceUntilNextLevel(experience: number): number | null {
  const currentLevel = levelForExperience(experience);
  if (currentLevel >= LEVEL_CAP) return null;
  return Math.max(0, EXPERIENCE_THRESHOLDS[currentLevel + 1] - experience);
}
