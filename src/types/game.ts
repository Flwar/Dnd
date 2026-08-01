export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type UserId = Brand<string, "UserId">;
export type CharacterId = Brand<string, "CharacterId">;
export type PartyId = Brand<string, "PartyId">;
export type SessionId = Brand<string, "SessionId">;
export type CommandId = Brand<string, "CommandId">;

export type AttributeKey =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

export type SkillKey =
  | "athletics"
  | "acrobatics"
  | "stealth"
  | "investigation"
  | "arcana"
  | "nature"
  | "medicine"
  | "perception"
  | "survival"
  | "insight"
  | "persuasion"
  | "deception"
  | "intimidation";

export type Attributes = Record<AttributeKey, number>;

export interface DerivedStats {
  maximumHealth: number;
  armor: number;
  accuracy: number;
  initiative: number;
  maximumPrimaryResource: number;
  carryCapacity: number;
}

export type ResourceType = "stamina" | "mana" | "focus" | "faith" | "rage" | "authority";
export type DamageType =
  | "physical"
  | "piercing"
  | "fire"
  | "cold"
  | "arcane"
  | "radiant"
  | "shadow"
  | "corruption";

export type RaceId = "human" | "elf" | "dwarf" | "halfling" | "orc" | "dragonborn";
export type ClassId = "fighter" | "mage" | "rogue" | "ranger" | "cleric" | "barbarian" | "king";
export type BackgroundId =
  | "former-soldier"
  | "wandering-scholar"
  | "border-hunter"
  | "former-criminal"
  | "fallen-noble"
  | "temple-servant"
  | "road-orphan";

export interface CharacterRace {
  id: RaceId;
  name: string;
  lore: string;
  passiveTrait: StatusDefinition;
  attributeEffects: Partial<Attributes>;
  recommendedClasses: ClassId[];
  portraitKeys: string[];
  gameplayEffect: string;
}

export interface CharacterClass {
  id: ClassId;
  name: string;
  role: string;
  difficulty: "easy" | "medium" | "hard";
  startingHealth: number;
  resourceType: ResourceType;
  startingResource: number;
  startingWeaponId: string;
  startingArmorId?: string;
  startingItemIds?: string[];
  startingAbilityIds: [string, string, string];
  strengths: string[];
  weaknesses: string[];
  recommendedAttributes: AttributeKey[];
  previewAssetKey: string;
}

export interface CharacterBackground {
  id: BackgroundId;
  name: string;
  history: string;
  dialogueOpportunity: string;
  skillProficiency: SkillKey;
  startingItemId: string;
  storyFlag: string;
}

export interface Profile {
  id: UserId;
  displayName: string;
  avatarKey: string | null;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  totalPlaytimeSeconds: number;
  highestCharacterLevel: number;
  completedChapterCount: number;
  accountRole: "player" | "administrator";
  accountTitle: string | null;
  isKing: boolean;
}

export interface PlayerCharacter {
  id: CharacterId;
  ownerId: UserId;
  name: string;
  description: string;
  formOfAddress: string | null;
  raceId: RaceId;
  classId: ClassId;
  backgroundId: BackgroundId;
  portraitKey: string;
  level: number;
  experience: number;
  attributes: Attributes;
  derivedStats: DerivedStats;
  currentHealth: number;
  primaryResource: number;
  gold: number;
  reputation: number;
  currentLocationId: string;
  chapterId: string;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt: string;
  isActive: boolean;
}

export type AbilityTarget = "self" | "ally" | "enemy" | "all-enemies";

export interface DamageFormula {
  diceCount: number;
  diceSides: number;
  flatBonus: number;
  attribute?: AttributeKey;
  damageType: DamageType;
}

export interface StatusApplication {
  statusId: string;
  duration: number;
  chance: number;
  stacks?: number;
}

export interface Ability {
  id: string;
  classId: ClassId;
  name: string;
  description: string;
  iconAssetKey: string;
  cost: number;
  cooldown: number;
  target: AbilityTarget;
  formula?: DamageFormula;
  healingFormula?: Omit<DamageFormula, "damageType">;
  animationKey: string;
  soundKey: string;
  statusEffects: StatusApplication[];
  availability: AbilityAvailability;
  logText: string;
}

export type AbilityAvailability =
  | { kind: "always" }
  | { kind: "health-below"; percentage: number }
  | { kind: "target-status"; statusId: string }
  | { kind: "self-status-absent"; statusId: string };

export type ItemCategory =
  | "weapon"
  | "armor"
  | "potion"
  | "tool"
  | "quest"
  | "material"
  | "treasure";
export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
export type EquipmentSlot =
  | "weapon"
  | "offhand"
  | "armor"
  | "helmet"
  | "gloves"
  | "boots"
  | "ring"
  | "amulet";

export interface ItemStatModifier {
  stat: keyof DerivedStats | AttributeKey;
  amount: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  iconAssetKey: string;
  weight: number;
  value: number;
  stackLimit: number;
  questItem: boolean;
  unique: boolean;
  usable: boolean;
  consumable: boolean;
  equipmentSlot?: EquipmentSlot;
  twoHanded?: boolean;
  armorValue?: number;
  damageFormula?: DamageFormula;
  healAmount?: number;
  resourceAmount?: number;
  allowedClasses?: ClassId[];
  allowedRaces?: RaceId[];
  minimumLevel?: number;
  statModifiers?: ItemStatModifier[];
}

export interface InventoryEntry {
  id: string;
  itemId: string;
  quantity: number;
  durability: number | null;
  customData: Record<string, string | number | boolean | null>;
  acquiredAt: string;
}

export type Equipment = Partial<Record<EquipmentSlot, string>>;

export type QuestStatus = "hidden" | "available" | "active" | "completed" | "failed";
export type ObjectiveStatus = "hidden" | "active" | "completed" | "failed";

export interface QuestObjective {
  id: string;
  text: string;
  optional: boolean;
  hiddenUntilFlag?: string;
  status: ObjectiveStatus;
}

export interface QuestReward {
  experience: number;
  gold: number;
  itemIds: string[];
  reputation: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: "main" | "optional";
  objectives: QuestObjective[];
  rewards: QuestReward;
}

export interface CharacterQuestState {
  questId: string;
  status: QuestStatus;
  objectives: Record<string, ObjectiveStatus>;
  startedAt: string | null;
  completedAt: string | null;
  rewardClaimed: boolean;
}

export type ComparisonOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
export type StoryCondition =
  | { kind: "flag"; key: string; value: boolean | string | number }
  | { kind: "item"; itemId: string; minimumQuantity: number }
  | { kind: "race"; raceId: RaceId }
  | { kind: "class"; classId: ClassId }
  | { kind: "background"; backgroundId: BackgroundId }
  | { kind: "relationship"; npcId: string; field: keyof Relationship; operator: ComparisonOperator; value: number }
  | { kind: "quest"; questId: string; status: QuestStatus };

export type StoryEffect =
  | { kind: "set-flag"; key: string; value: boolean | string | number }
  | { kind: "relationship"; npcId: string; field: keyof Omit<Relationship, "npcId">; amount: number }
  | { kind: "reputation"; amount: number }
  | { kind: "grant-item"; itemId: string; quantity: number }
  | { kind: "quest-start"; questId: string }
  | { kind: "quest-objective"; questId: string; objectiveId: string; status: ObjectiveStatus }
  | { kind: "experience"; amount: number }
  | { kind: "heal"; amount: number };

export type DialogueApproach =
  | "kind"
  | "direct"
  | "curious"
  | "deceptive"
  | "threatening"
  | "humorous"
  | "class-specific"
  | "race-specific"
  | "background-specific";

export interface SkillCheckDefinition {
  skill: SkillKey;
  attribute: AttributeKey;
  difficulty: number;
  proficiency: boolean;
  situationalBonus?: number;
  mode?: DiceMode;
  successEffects?: StoryEffect[];
  failureEffects?: StoryEffect[];
  criticalSuccessEffects?: StoryEffect[];
  criticalFailureEffects?: StoryEffect[];
}

export interface DialogueChoice {
  id: string;
  text: string;
  approach: DialogueApproach;
  conditions?: StoryCondition[];
  skillCheck?: SkillCheckDefinition;
  effects?: StoryEffect[];
  nextNodeId?: string;
  exitAction?: "close" | "travel" | "begin-combat" | "open-shop";
}

export interface DialogueNode {
  id: string;
  npcId: string;
  portraitKey: string;
  text: string;
  emotionalState: string;
  choices: DialogueChoice[];
  conditions?: StoryCondition[];
  onEnterEffects?: StoryEffect[];
  oneTime?: boolean;
}

export interface Relationship {
  npcId: string;
  trust: number;
  respect: number;
  fear: number;
}

export interface NPC {
  id: string;
  name: string;
  title: string;
  description: string;
  personality: string[];
  portraitKey: string;
  initialRelationship: Relationship;
  journalEntry: string;
  reactiveLines: Record<string, string>;
}

export interface LocationInteraction {
  id: string;
  label: string;
  description: string;
  conditions?: StoryCondition[];
  effects?: StoryEffect[];
  dialogueNodeId?: string;
  skillCheck?: SkillCheckDefinition;
  encounterId?: string;
  oneTime?: boolean;
}

export interface LocationExit {
  destinationId: string;
  label: string;
  conditions?: StoryCondition[];
}

export interface Location {
  id: string;
  name: string;
  description: string;
  backgroundAssetKey: string;
  ambienceSoundKey: string;
  interactions: LocationInteraction[];
  exits: LocationExit[];
  npcIds: string[];
  lootItemIds: string[];
  secretIds: string[];
}

export type DiceMode = "normal" | "advantage" | "disadvantage";

export interface DiceResult {
  rolls: number[];
  selectedRoll: number;
  modifier: number;
  finalResult: number;
  difficulty: number;
  mode: DiceMode;
  outcome: "critical-success" | "success" | "failure" | "critical-failure";
  seed: number;
}

export interface StatusDefinition {
  id: string;
  name: string;
  description: string;
  iconAssetKey: string;
  maxStacks: number;
  armorModifier?: number;
  accuracyModifier?: number;
  damageMultiplier?: number;
  damagePerTurn?: number;
  healingPerTurn?: number;
  skipTurn?: boolean;
}

export interface ActiveStatus {
  statusId: string;
  remainingTurns: number;
  stacks: number;
  sourceCombatantId: string;
}

export interface Combatant {
  id: string;
  kind: "player" | "enemy";
  name: string;
  characterId?: CharacterId;
  enemyId?: string;
  level: number;
  attributes: Attributes;
  maximumHealth: number;
  currentHealth: number;
  armor: number;
  accuracy: number;
  initiativeBonus: number;
  resourceType?: ResourceType;
  maximumResource: number;
  currentResource: number;
  abilityIds: string[];
  cooldowns: Record<string, number>;
  statuses: ActiveStatus[];
  defeated: boolean;
}

export interface Enemy {
  id: string;
  name: string;
  description: string;
  portraitAssetKey: string;
  level: number;
  attributes: Attributes;
  maximumHealth: number;
  armor: number;
  accuracy: number;
  initiativeBonus: number;
  abilityIds: string[];
  experienceReward: number;
  lootTable: LootTableEntry[];
  intentLabels: Record<string, string>;
  boss?: BossMechanics;
}

export interface BossMechanics {
  guardPoints: number;
  exposedRuneStatusId: string;
  heavyAttackAbilityId: string;
  telegraphStatusId: string;
  investigationAdvantageFlag: string;
}

export interface LootTableEntry {
  itemId: string;
  chance: number;
  minimumQuantity: number;
  maximumQuantity: number;
}

export interface Encounter {
  id: string;
  name: string;
  enemyIds: string[];
  objective: string;
  escapeDifficulty: number;
  tutorialSteps?: string[];
  checkpointId: string;
}

export interface CombatState {
  encounterId: string;
  round: number;
  turnOrder: string[];
  activeTurnIndex: number;
  combatants: Record<string, Combatant>;
  phase: "initiative" | "active" | "victory" | "defeat" | "escaped";
  log: CombatEvent[];
  seed: number;
  nextEventSequence: number;
  processedCommandIds: string[];
}

export type CombatAction =
  | { kind: "ability"; abilityId: string; targetIds: string[] }
  | { kind: "item"; inventoryEntryId: string; targetId: string }
  | { kind: "defend" }
  | { kind: "escape" };

export type CombatEvent =
  | { sequence: number; kind: "turn-started"; combatantId: string; text: string }
  | { sequence: number; kind: "damage"; sourceId: string; targetId: string; amount: number; critical: boolean; text: string }
  | { sequence: number; kind: "healing"; sourceId: string; targetId: string; amount: number; text: string }
  | { sequence: number; kind: "status-applied"; sourceId: string; targetId: string; statusId: string; text: string }
  | { sequence: number; kind: "miss"; sourceId: string; targetId: string; text: string }
  | { sequence: number; kind: "defeated"; combatantId: string; text: string }
  | { sequence: number; kind: "combat-ended"; result: "victory" | "defeat" | "escaped"; text: string };

export interface SceneDefinition {
  id: string;
  number: number;
  title: string;
  locationId: string;
  description: string;
  entryNarration: string;
  interactionIds: string[];
  requiredFlags: string[];
  completionConditions: StoryCondition[];
  nextSceneIds: string[];
  skippableCinematic?: boolean;
}

export interface ChapterDefinition {
  id: string;
  name: string;
  estimatedMinutes: [number, number];
  openingNarration: string[];
  sceneIds: string[];
  mainQuestId: string;
  finalReward: QuestReward;
  nextChapterHook: string;
}

export interface StoryState {
  flags: Record<string, boolean | string | number>;
  relationships: Record<string, Relationship>;
  reputation: number;
  currentSceneId: string;
  currentLocationId: string;
  visitedLocationIds: string[];
}

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  discoveredAt: string;
}

export interface SaveDataV1 {
  saveVersion: 1;
  character: PlayerCharacter;
  inventory: InventoryEntry[];
  equipment: Equipment;
  quests: CharacterQuestState[];
  story: StoryState;
  journal: JournalEntry[];
  playtimeSeconds: number;
  rewardedEventIds: string[];
  savedAt: string;
}

export interface SaveDataV2 extends Omit<SaveDataV1, "saveVersion"> {
  saveVersion: 2;
  discoveredLocationIds: string[];
  activeCheckpointId: string;
}

export type SaveData = SaveDataV2;

export interface Party {
  id: PartyId;
  leaderCharacterId: CharacterId;
  roomCode: string;
  name: string;
  status: "lobby" | "active" | "closed";
  maximumMembers: number;
  version: number;
}

export interface PartyMember {
  characterId: CharacterId;
  userId: UserId;
  displayName: string;
  role: "leader" | "member";
  ready: boolean;
  connected: boolean;
  joinedAt: string;
}

export interface PartySession {
  id: SessionId;
  partyId: PartyId;
  chapterId: string;
  currentSceneId: string;
  currentTurnCharacterId: CharacterId | null;
  status: "lobby" | "narrative" | "combat" | "completed" | "closed";
  version: number;
  lastSequenceNumber: number;
  processedCommandIds: string[];
}

export type PartyCommandPayloadMap = {
  JOIN_PARTY: { roomCode: string };
  LEAVE_PARTY: Record<string, never>;
  SET_READY: { ready: boolean };
  START_SESSION: { chapterId: string };
  SUBMIT_DIALOGUE_VOTE: { nodeId: string; choiceId: string };
  RESOLVE_INTERACTION: { interactionId: string };
  RESOLVE_SKILL_CHECK: { interactionId: string };
  MOVE_TO_LOCATION: { locationId: string };
  BEGIN_ENCOUNTER: { encounterId: string };
  SUBMIT_COMBAT_ACTION: { action: CombatAction };
  USE_ITEM: { inventoryEntryId: string; targetCharacterId: CharacterId };
  CLAIM_LOOT: Record<string, never>;
  COMPLETE_SCENE: { sceneId: string };
};

export type PartyCommandType = keyof PartyCommandPayloadMap;

export type PartyCommand<T extends PartyCommandType = PartyCommandType> = {
  [K in T]: {
    commandId: CommandId;
    type: K;
    sessionId: SessionId;
    characterId: CharacterId;
    expectedVersion: number;
    payload: PartyCommandPayloadMap[K];
    timestamp: string;
  };
}[T];

export type PartyEvent = {
  id: string;
  sessionId: SessionId;
  sequenceNumber: number;
  createdByCharacterId: CharacterId;
  createdAt: string;
} & (
  | { type: "member-ready"; payload: { ready: boolean } }
  | { type: "scene-changed"; payload: { sceneId: string } }
  | { type: "dialogue-vote"; payload: { nodeId: string; choiceId: string } }
  | { type: "combat-action"; payload: { action: CombatAction } }
  | { type: "loot-claimed"; payload: { lootId: string } }
);

export type CommandValidationErrorCode =
  | "SESSION_NOT_FOUND"
  | "NOT_A_MEMBER"
  | "NOT_OWNER"
  | "NOT_LEADER"
  | "VERSION_CONFLICT"
  | "DUPLICATE_COMMAND"
  | "OUT_OF_TURN"
  | "INVALID_PHASE"
  | "INVALID_PAYLOAD"
  | "PRECONDITION_FAILED";

export type CommandValidationResult =
  | { ok: true }
  | { ok: false; code: CommandValidationErrorCode; message: string };

export interface Notification {
  id: string;
  type: "item" | "quest" | "experience" | "level" | "reputation" | "discovery" | "save" | "error" | "connection" | "party";
  title: string;
  message: string;
  createdAt: string;
  deduplicationKey?: string;
}

export interface GameSettings {
  musicVolume: number;
  effectsVolume: number;
  muted: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  textScale: number;
}

export interface AssetManifestEntry {
  key: string;
  path: string;
  type: "background" | "portrait" | "item" | "ability" | "audio" | "texture" | "ui";
  source: "licensed" | "original" | "generated";
  license?: string;
}

export interface SceneInput {
  chapterId: string;
  sceneId: string;
  character: PlayerCharacter;
  story: StoryState;
}

export interface SceneOutput {
  scene: SceneDefinition;
  availableInteractions: LocationInteraction[];
}

export interface DialogueInput {
  nodeId: string;
  character: PlayerCharacter;
  story: StoryState;
}

export interface DialogueOutput {
  node: DialogueNode;
  availableChoices: DialogueChoice[];
}

export interface EncounterInput {
  encounterId: string;
  partySize: number;
  averageLevel: number;
  story: StoryState;
}

export interface EncounterOutput {
  encounter: Encounter;
  combatants: Combatant[];
}

export interface NarrativeProvider {
  getScene(input: SceneInput): Promise<SceneOutput>;
  resolveDialogue(input: DialogueInput): Promise<DialogueOutput>;
  generateEncounter(input: EncounterInput): Promise<EncounterOutput>;
}
