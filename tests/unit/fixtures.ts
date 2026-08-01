import type {
  Attributes,
  CharacterId,
  Combatant,
  PlayerCharacter,
  SaveDataV1,
  SessionId,
  UserId,
} from "../../src/types/game";

export const now = "2026-07-31T12:00:00.000Z";

export const baseAttributes: Attributes = {
  strength: 14,
  dexterity: 12,
  constitution: 13,
  intelligence: 10,
  wisdom: 11,
  charisma: 10,
};

export function makeCharacter(overrides: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    id: "character-one" as CharacterId,
    ownerId: "user-one" as UserId,
    name: "נעמה",
    description: "נוסעת עקשנית",
    formOfAddress: null,
    raceId: "human",
    classId: "fighter",
    backgroundId: "former-soldier",
    portraitKey: "portrait-human-01",
    level: 1,
    experience: 0,
    attributes: { ...baseAttributes },
    derivedStats: {
      maximumHealth: 30,
      armor: 12,
      accuracy: 4,
      initiative: 1,
      maximumPrimaryResource: 8,
      carryCapacity: 40,
    },
    currentHealth: 30,
    primaryResource: 8,
    gold: 10,
    reputation: 0,
    currentLocationId: "village-gate",
    chapterId: "chapter-one-shadows-under-arfelon",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    isActive: true,
    ...overrides,
  };
}

export function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "fighter-one",
    kind: "player",
    name: "נעמה",
    characterId: "character-one" as CharacterId,
    level: 1,
    attributes: { ...baseAttributes },
    maximumHealth: 30,
    currentHealth: 30,
    armor: 12,
    accuracy: 5,
    initiativeBonus: 1,
    resourceType: "stamina",
    maximumResource: 8,
    currentResource: 8,
    abilityIds: ["fighter-sword-strike", "fighter-shield-stance", "fighter-decisive-blow"],
    cooldowns: {},
    statuses: [],
    defeated: false,
    ...overrides,
  };
}

export function makeSaveV1(overrides: Partial<SaveDataV1> = {}): SaveDataV1 {
  return {
    saveVersion: 1,
    character: makeCharacter(),
    inventory: [
      {
        id: "entry-sword",
        itemId: "iron-longsword",
        quantity: 1,
        durability: 100,
        customData: {},
        acquiredAt: now,
      },
    ],
    equipment: { weapon: "entry-sword" },
    quests: [],
    story: {
      flags: {},
      relationships: {},
      reputation: 0,
      currentSceneId: "scene-arrival",
      currentLocationId: "village-gate",
      visitedLocationIds: ["village-gate"],
    },
    journal: [],
    playtimeSeconds: 120,
    rewardedEventIds: [],
    savedAt: now,
    ...overrides,
  };
}

export const sessionId = "session-one" as SessionId;
