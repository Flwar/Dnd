"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { abilitiesById } from "@/content/abilities";
import { openingScenesById } from "@/content/chapters/opening";
import { classesById } from "@/content/classes";
import { dialoguesById } from "@/content/dialogues";
import { encountersById, enemiesById } from "@/content/enemies";
import { itemsById } from "@/content/items";
import { locationsById } from "@/content/locations";
import { statusesById } from "@/content/statuses";
import { deriveStats } from "@/game/character";
import {
  chooseEnemyAction,
  createCombatantFromEnemy,
  createCombatState,
  scaleEnemy,
  submitCombatAction,
  type CombatRules,
} from "@/game/combat";
import { availableChoices } from "@/game/dialogue";
import { resolveSkillCheck } from "@/game/dice";
import { equipmentStatBonuses, useItem as applyInventoryItem } from "@/game/inventory";
import { validateAndMigrateSave } from "@/game/persistence";
import { unwrapCloudSaveEnvelope } from "@/lib/game/save-envelope";
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import type { Database, Json, PartySessionRow } from "@/types/database";
import type {
  Attributes,
  CharacterId,
  ClassId,
  CombatAction,
  CombatState,
  Combatant,
  Equipment,
  InventoryEntry,
} from "@/types/game";

export type PartyGameCommandType =
  | "SUBMIT_DIALOGUE_VOTE"
  | "RESOLVE_INTERACTION"
  | "RESOLVE_SKILL_CHECK"
  | "MOVE_TO_LOCATION"
  | "BEGIN_ENCOUNTER"
  | "SUBMIT_COMBAT_ACTION"
  | "USE_ITEM"
  | "CLAIM_LOOT"
  | "COMPLETE_SCENE";

export type PartyCombatAction = Exclude<CombatAction, { kind: "item" }>;

export type PartyGameCommandPayloadMap = {
  SUBMIT_DIALOGUE_VOTE: {
    sceneId: string;
    decisionId: string;
    choiceId: string;
  };
  RESOLVE_INTERACTION: { interactionId: string };
  RESOLVE_SKILL_CHECK: { interactionId: string };
  MOVE_TO_LOCATION: { locationId: string };
  BEGIN_ENCOUNTER: { encounterId: string };
  SUBMIT_COMBAT_ACTION: { action: PartyCombatAction };
  USE_ITEM: { inventoryEntryId: string; targetCharacterId?: string };
  CLAIM_LOOT: Record<string, never>;
  COMPLETE_SCENE: { sceneId: string; nextSceneId?: string };
};

export type PartyGameCommandInput<
  Type extends PartyGameCommandType = PartyGameCommandType,
> = {
  [Command in Type]: {
    commandId: string;
    sessionId: string;
    characterId: string;
    expectedVersion: number;
    type: Command;
    payload: PartyGameCommandPayloadMap[Command];
    timestamp: string;
  };
}[Type];

export type PartyGameErrorCode =
  | "INVALID_INPUT"
  | "AUTH_REQUIRED"
  | "CONFIGURATION_ERROR"
  | "CHARACTER_NOT_OWNED"
  | "SESSION_NOT_FOUND"
  | "NOT_A_PARTY_MEMBER"
  | "LEADER_REQUIRED"
  | "SESSION_CONFLICT"
  | "OUT_OF_TURN"
  | "INVALID_ACTION"
  | "CONTENT_NOT_FOUND"
  | "CONNECTION_FAILED"
  | "UNKNOWN";

export type ResolvedPartyVote = {
  choiceId: string;
  votes: number;
  leaderBrokeTie: boolean;
  submittedVotes: number;
  requiredVotes: number;
};

export type PartyGameActionResult =
  | {
      ok: true;
      data: {
        commandId: string;
        status: "accepted";
        sessionVersion: number;
        result: Json;
        resolvedVote?: ResolvedPartyVote;
      };
    }
  | {
      ok: false;
      code: PartyGameErrorCode;
      message: string;
      currentVersion?: number;
    };

type GameSupabaseClient = SupabaseClient<Database>;
type JsonObject = { [key: string]: Json | undefined };

type CommandReceipt = {
  commandId: string;
  status: "pending" | "accepted" | "rejected";
  duplicate: boolean;
  sessionVersion: number;
  result: Json;
  serverSeed?: number;
};

type ProvenContext = {
  ok: true;
  userClient: GameSupabaseClient;
  serviceClient: GameSupabaseClient;
  userId: string;
  session: PartySessionRow;
};

type ResolutionSuccess = {
  ok: true;
  result: JsonObject;
  statePatch: JsonObject;
  combatState?: CombatState;
};

type ResolutionFailure = {
  ok: false;
  code: PartyGameErrorCode;
  message: string;
};

type Resolution = ResolutionSuccess | ResolutionFailure;

const uuidSchema = z.string().uuid();
const contentIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(96)
  .regex(/^[a-z0-9][a-z0-9_-]+$/);

const abilityActionSchema = z.object({
  kind: z.literal("ability"),
  abilityId: contentIdSchema,
  targetIds: z.array(contentIdSchema).min(1).max(8),
});

const partyCombatActionSchema = z.discriminatedUnion("kind", [
  abilityActionSchema,
  z.object({ kind: z.literal("defend") }),
  z.object({ kind: z.literal("escape") }),
]);

const commandBaseSchema = z.object({
  commandId: uuidSchema,
  sessionId: uuidSchema,
  characterId: uuidSchema,
  expectedVersion: z.number().int().positive(),
  timestamp: z.string().datetime({ offset: true }),
});

const partyGameCommandSchema = z.discriminatedUnion("type", [
  commandBaseSchema.extend({
    type: z.literal("SUBMIT_DIALOGUE_VOTE"),
    payload: z.object({
      sceneId: contentIdSchema,
      decisionId: contentIdSchema,
      choiceId: contentIdSchema,
    }),
  }),
  commandBaseSchema.extend({
    type: z.literal("RESOLVE_INTERACTION"),
    payload: z.object({ interactionId: contentIdSchema }),
  }),
  commandBaseSchema.extend({
    type: z.literal("RESOLVE_SKILL_CHECK"),
    payload: z.object({ interactionId: contentIdSchema }),
  }),
  commandBaseSchema.extend({
    type: z.literal("MOVE_TO_LOCATION"),
    payload: z.object({ locationId: contentIdSchema }),
  }),
  commandBaseSchema.extend({
    type: z.literal("BEGIN_ENCOUNTER"),
    payload: z.object({ encounterId: contentIdSchema }),
  }),
  commandBaseSchema.extend({
    type: z.literal("SUBMIT_COMBAT_ACTION"),
    payload: z.object({ action: partyCombatActionSchema }),
  }),
  commandBaseSchema.extend({
    type: z.literal("USE_ITEM"),
    payload: z.object({
      inventoryEntryId: uuidSchema,
      targetCharacterId: uuidSchema.optional(),
    }),
  }),
  commandBaseSchema.extend({
    type: z.literal("CLAIM_LOOT"),
    // Entitlement is derived from the locked session, never nominated by a client.
    payload: z.object({}).strict(),
  }),
  commandBaseSchema.extend({
    type: z.literal("COMPLETE_SCENE"),
    payload: z.object({ sceneId: contentIdSchema, nextSceneId: contentIdSchema.optional() }),
  }),
]);

const combatAttributesSchema = z.object({
  strength: z.number().int(),
  dexterity: z.number().int(),
  constitution: z.number().int(),
  intelligence: z.number().int(),
  wisdom: z.number().int(),
  charisma: z.number().int(),
});

const combatantRuntimeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["player", "enemy"]),
  name: z.string().min(1),
  characterId: z.string().optional(),
  enemyId: z.string().optional(),
  level: z.number().int().positive(),
  attributes: combatAttributesSchema,
  maximumHealth: z.number().int().positive(),
  currentHealth: z.number().int().nonnegative(),
  armor: z.number().int(),
  accuracy: z.number().int(),
  initiativeBonus: z.number().int(),
  resourceType: z.enum(["stamina", "mana", "focus", "faith", "rage"]).optional(),
  maximumResource: z.number().int().nonnegative(),
  currentResource: z.number().int().nonnegative(),
  abilityIds: z.array(z.string().min(1)),
  cooldowns: z.record(z.string(), z.number().int().nonnegative()),
  statuses: z.array(z.object({
    statusId: z.string().min(1),
    remainingTurns: z.number().int().nonnegative(),
    stacks: z.number().int().positive(),
    sourceCombatantId: z.string().min(1),
  })),
  defeated: z.boolean(),
});

const combatStateRuntimeSchema = z.object({
  encounterId: z.string().min(1),
  round: z.number().int().positive(),
  turnOrder: z.array(z.string().min(1)).min(1),
  activeTurnIndex: z.number().int().nonnegative(),
  combatants: z.record(z.string(), combatantRuntimeSchema),
  phase: z.enum(["initiative", "active", "victory", "defeat", "escaped"]),
  log: z.array(z.unknown()),
  seed: z.number().int().nonnegative(),
  nextEventSequence: z.number().int().positive(),
  processedCommandIds: z.array(z.string().min(1)),
});

const rules: CombatRules = { abilities: abilitiesById, statuses: statusesById };

const canonicalSceneAliases: Readonly<Record<string, string>> = {
  arrival: "scene-arrival",
};

const encounterDatabaseIds: Readonly<Record<string, string>> = {
  "tutorial-rat": "corrupted_cave_rat",
  "road-ambush": "mist_crawler_ambush",
  "flooded-passage-pack": "mist_crawler_ambush",
  "stone-guardian-boss": "ancient_stone_guardian",
};

const encountersAllowedByScene: Readonly<Record<string, readonly string[]>> = {
  "scene-road-to-mine": ["road-ambush"],
  "scene-mine-entrance": ["tutorial-rat"],
  "scene-tutorial-combat": ["tutorial-rat"],
  "scene-main-tunnel": ["flooded-passage-pack"],
  "scene-stone-guardian": ["stone-guardian-boss"],
};

const encounterInteractionById: Readonly<Record<string, string>> = {
  "tutorial-rat": "tutorial-combat",
  "road-ambush": "track-hooded-figures",
  "flooded-passage-pack": "cross-flood-safely",
  "stone-guardian-boss": "fight-stone-guardian",
};

const rewardForEncounter: Readonly<Record<string, string | undefined>> = {
  "tutorial-rat": "opening.tutorial_combat",
  "stone-guardian-boss": "opening.stone_guardian_victory",
};

const requiredVictoryByScene: Readonly<Record<string, string | undefined>> = {
  "scene-tutorial-combat": "tutorial-rat",
  "scene-stone-guardian": "stone-guardian-boss",
};

function asJsonObject(value: Json | null | undefined): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function canonicalSceneId(sceneId: string): string {
  return canonicalSceneAliases[sceneId] ?? sceneId;
}

function dialogueReachableFromRoots(nodeId: string, roots: readonly string[]): boolean {
  const pending = [...roots];
  const visited = new Set<string>();
  while (pending.length) {
    const candidateId = pending.pop();
    if (!candidateId || visited.has(candidateId)) continue;
    if (candidateId === nodeId) return true;
    visited.add(candidateId);
    const candidate = dialoguesById[candidateId];
    if (!candidate) continue;
    for (const choice of candidate.choices) {
      if (choice.nextNodeId) pending.push(choice.nextNodeId);
    }
  }
  return false;
}

function dialogueReachableFromLocation(nodeId: string, locationId: string): boolean {
  const roots = locationsById[locationId]?.interactions.flatMap((interaction) =>
    interaction.dialogueNodeId ? [interaction.dialogueNodeId] : [],
  ) ?? [];
  return dialogueReachableFromRoots(nodeId, roots);
}

function dialogueReachableFromScene(nodeId: string, sceneId: string): boolean {
  const scene = openingScenesById[canonicalSceneId(sceneId)];
  if (!scene) return false;
  const interactionIds = new Set(scene.interactionIds);
  const roots = Object.values(locationsById).flatMap((location) =>
    location.interactions.flatMap((interaction) =>
      interactionIds.has(interaction.id) && interaction.dialogueNodeId
        ? [interaction.dialogueNodeId]
        : [],
    ),
  );
  return dialogueReachableFromRoots(nodeId, roots);
}

function invalidInput(message = "הפעולה שנשלחה אינה תקינה. יש לרענן ולנסות שוב."): PartyGameActionResult {
  return { ok: false, code: "INVALID_INPUT", message };
}

function isResolutionFailure(
  value: PartySessionRow | ResolutionFailure,
): value is ResolutionFailure {
  return "ok" in value && value.ok === false;
}

function errorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  return [candidate.code, candidate.message, candidate.details, candidate.hint]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toUpperCase();
}

function currentVersionFromError(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const detail = (error as { details?: unknown }).details;
  if (typeof detail !== "string") return undefined;
  try {
    const parsed = JSON.parse(detail) as { current_version?: unknown };
    return typeof parsed.current_version === "number" ? parsed.current_version : undefined;
  } catch {
    const match = detail.match(/current_version[^0-9]*(\d+)/i);
    return match ? Number(match[1]) : undefined;
  }
}

function mapCommandError(error: unknown): Exclude<PartyGameActionResult, { ok: true }> {
  const searchable = errorText(error);
  if (searchable.includes("AUTHENTICATION_REQUIRED") || searchable.includes("JWT")) {
    return { ok: false, code: "AUTH_REQUIRED", message: "החיבור לחשבון פג. יש להתחבר מחדש." };
  }
  if (searchable.includes("CHARACTER_NOT_OWNED")) {
    return { ok: false, code: "CHARACTER_NOT_OWNED", message: "הדמות שנבחרה אינה שייכת לחשבון הזה." };
  }
  if (searchable.includes("SESSION_NOT_FOUND")) {
    return { ok: false, code: "SESSION_NOT_FOUND", message: "מפגש החבורה אינו זמין עוד." };
  }
  if (searchable.includes("NOT_A_PARTY_MEMBER") || searchable.includes("CHARACTER_NOT_IN_SESSION")) {
    return { ok: false, code: "NOT_A_PARTY_MEMBER", message: "הדמות אינה חברה פעילה במפגש הזה." };
  }
  if (searchable.includes("LEADER_REQUIRED")) {
    return { ok: false, code: "LEADER_REQUIRED", message: "רק מוביל החבורה יכול לבצע את הפעולה הזאת." };
  }
  if (searchable.includes("ACTION_OUT_OF_TURN") || searchable.includes("OUT_OF_TURN")) {
    return { ok: false, code: "OUT_OF_TURN", message: "אפשר לפעול רק בתורך." };
  }
  if (
    searchable.includes("SESSION_VERSION_CONFLICT") ||
    searchable.includes("SESSION_COMMAND_PENDING") ||
    searchable.includes("PENDING_COMMAND_MISMATCH")
  ) {
    return {
      ok: false,
      code: "SESSION_CONFLICT",
      message: "מצב החבורה השתנה. המצב ייטען מחדש לפני ניסיון נוסף.",
      currentVersion: currentVersionFromError(error),
    };
  }
  if (
    searchable.includes("INVALID_") ||
    searchable.includes("COMBAT_NOT_ACTIVE") ||
    searchable.includes("COMBAT_ALREADY_ACTIVE") ||
    searchable.includes("ITEM_NOT_AVAILABLE")
  ) {
    return { ok: false, code: "INVALID_ACTION", message: "הפעולה אינה אפשרית במצב המשחק הנוכחי." };
  }
  if (
    searchable.includes("FETCH") ||
    searchable.includes("NETWORK") ||
    searchable.includes("ECONN") ||
    searchable.includes("PGRST")
  ) {
    return { ok: false, code: "CONNECTION_FAILED", message: "לא הצלחנו להגיע לשרת המשחק. נסו שוב בעוד רגע." };
  }
  return { ok: false, code: "UNKNOWN", message: "לא הצלחנו לבצע את הפעולה. אפשר לנסות שוב." };
}

function parseReceipt(value: Json | null): CommandReceipt | null {
  const object = asJsonObject(value);
  if (!object) return null;
  const commandId = object.command_id;
  const status = object.status;
  const sessionVersion = object.session_version;
  if (
    typeof commandId !== "string" ||
    (status !== "pending" && status !== "accepted" && status !== "rejected") ||
    typeof sessionVersion !== "number"
  ) {
    return null;
  }
  return {
    commandId,
    status,
    duplicate: object.duplicate === true,
    sessionVersion,
    result: object.result ?? {},
    serverSeed:
      typeof object.server_seed === "number" && Number.isSafeInteger(object.server_seed)
        ? object.server_seed
        : undefined,
  };
}

function isCombatState(value: Json | undefined): value is Json & CombatState {
  const parsed = combatStateRuntimeSchema.safeParse(value);
  if (!parsed.success) return false;
  const state = parsed.data;
  return (
    state.activeTurnIndex < state.turnOrder.length &&
    state.turnOrder.every((id) => state.combatants[id]?.id === id) &&
    Object.entries(state.combatants).every(([id, combatant]) =>
      combatant.id === id &&
      combatant.currentHealth <= combatant.maximumHealth &&
      combatant.currentResource <= combatant.maximumResource &&
      (combatant.kind === "player" ? typeof combatant.characterId === "string" : typeof combatant.enemyId === "string"),
    )
  );
}

function readCombatEnvelope(sessionState: Json): {
  active: boolean;
  encounterId: string;
  activeCharacterId: string | null;
  state: CombatState;
} | null {
  const combat = asJsonObject(asJsonObject(sessionState)?.combat);
  if (!combat || combat.active !== true || typeof combat.authored_encounter_id !== "string") return null;
  if (!isCombatState(combat.state)) return null;
  const activeCharacterId = combat.active_character_id;
  if (activeCharacterId !== null && typeof activeCharacterId !== "string") return null;
  return {
    active: true,
    encounterId: combat.authored_encounter_id,
    activeCharacterId,
    state: combat.state as unknown as CombatState,
  };
}

type CombatCheckpointVital = {
  currentHealth: number;
  currentResource: number;
};

type CombatCheckpoint = {
  encounterId: string;
  sceneId: string;
  players: Record<string, CombatCheckpointVital>;
};

function readCombatHistory(sessionState: Json): {
  encounterId: string;
  outcome: CombatState["phase"] | null;
} | null {
  const combat = asJsonObject(asJsonObject(sessionState)?.combat);
  if (!combat || typeof combat.authored_encounter_id !== "string") return null;
  const outcome = combat.outcome;
  return {
    encounterId: combat.authored_encounter_id,
    outcome:
      outcome === "initiative" ||
      outcome === "active" ||
      outcome === "victory" ||
      outcome === "defeat" ||
      outcome === "escaped"
        ? outcome
        : null,
  };
}

function readCombatCheckpoint(
  sessionState: Json,
  encounterId: string,
  sceneId: string,
): CombatCheckpoint | null {
  const checkpoint = asJsonObject(asJsonObject(sessionState)?.combat_checkpoint);
  const players = asJsonObject(checkpoint?.players);
  if (
    !checkpoint ||
    checkpoint.encounter_id !== encounterId ||
    checkpoint.scene_id !== sceneId ||
    !players
  ) {
    return null;
  }
  const parsedPlayers: Record<string, CombatCheckpointVital> = {};
  for (const [characterId, rawVital] of Object.entries(players)) {
    const vital = asJsonObject(rawVital);
    if (
      !uuidSchema.safeParse(characterId).success ||
      !vital ||
      typeof vital.current_health !== "number" ||
      !Number.isInteger(vital.current_health) ||
      vital.current_health <= 0 ||
      typeof vital.current_resource !== "number" ||
      !Number.isInteger(vital.current_resource) ||
      vital.current_resource < 0
    ) {
      return null;
    }
    parsedPlayers[characterId] = {
      currentHealth: vital.current_health,
      currentResource: vital.current_resource,
    };
  }
  return Object.keys(parsedPlayers).length
    ? { encounterId, sceneId, players: parsedPlayers }
    : null;
}

function serializeCombatCheckpoint(
  encounterId: string,
  sceneId: string,
  players: readonly Combatant[],
): JsonObject {
  return {
    encounter_id: encounterId,
    scene_id: sceneId,
    players: Object.fromEntries(
      players.flatMap((player) =>
        player.characterId
          ? [[player.characterId, {
              current_health: player.currentHealth,
              current_resource: player.currentResource,
            }]]
          : [],
      ),
    ) as JsonObject,
  };
}

function activeCharacterId(state: CombatState): string | null {
  if (state.phase !== "active") return null;
  const active = state.combatants[state.turnOrder[state.activeTurnIndex]];
  return active?.kind === "player" && typeof active.characterId === "string"
    ? active.characterId
    : null;
}

function runEnemyTurns(initialState: CombatState, commandId: string): ResolutionFailure | CombatState {
  let state = initialState;
  const maximumAutomaticTurns = Math.max(8, state.turnOrder.length * 4);
  for (let index = 0; index < maximumAutomaticTurns && state.phase === "active"; index += 1) {
    const actorId = state.turnOrder[state.activeTurnIndex];
    const actor = state.combatants[actorId];
    if (!actor || actor.kind === "player") return state;
    const action = chooseEnemyAction(state, actorId, rules) ?? { kind: "defend" as const };
    const result = submitCombatAction(state, actorId, action, `${commandId}-enemy-${index + 1}`, rules);
    if (!result.ok) {
      return { ok: false, code: "INVALID_ACTION", message: "לא הצלחנו להשלים את תור האויב באופן תקין." };
    }
    state = result.state;
  }
  if (state.phase === "active" && !activeCharacterId(state)) {
    return { ok: false, code: "INVALID_ACTION", message: "סדר התורות של הקרב אינו תקין." };
  }
  return state;
}

function combatPatch(encounterId: string, state: CombatState): JsonObject {
  return {
    phase: state.phase === "active" ? "combat" : "narrative",
    combat: {
      active: state.phase === "active",
      encounter_id: encounterDatabaseIds[encounterId] ?? encounterId,
      authored_encounter_id: encounterId,
      active_character_id: activeCharacterId(state),
      state: state as unknown as Json,
      outcome: state.phase === "active" ? null : state.phase,
      available_reward_key: state.phase === "victory" ? (rewardForEncounter[encounterId] ?? null) : null,
    },
  };
}

async function proveCommandContext(
  input: PartyGameCommandInput,
): Promise<ProvenContext | Exclude<PartyGameActionResult, { ok: true }>> {
  let userClient: GameSupabaseClient;
  try {
    userClient = await createServerSupabaseClient();
  } catch {
    return { ok: false, code: "CONFIGURATION_ERROR", message: "שירות המשחק אינו מוגדר במלואו בשרת." };
  }

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, code: "AUTH_REQUIRED", message: "החיבור לחשבון פג. יש להתחבר מחדש." };
  }

  const characterResult = await userClient
    .from("characters")
    .select("id,owner_id")
    .eq("id", input.characterId)
    .eq("owner_id", authData.user.id)
    .maybeSingle();
  if (characterResult.error) return mapCommandError(characterResult.error);
  if (!characterResult.data) {
    return { ok: false, code: "CHARACTER_NOT_OWNED", message: "הדמות שנבחרה אינה שייכת לחשבון הזה." };
  }

  const sessionResult = await userClient
    .from("party_sessions")
    .select("*")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (sessionResult.error) return mapCommandError(sessionResult.error);
  if (!sessionResult.data) {
    return { ok: false, code: "SESSION_NOT_FOUND", message: "מפגש החבורה אינו זמין עוד." };
  }

  const membershipResult = await userClient
    .from("party_members")
    .select("party_id,character_id")
    .eq("party_id", sessionResult.data.party_id)
    .eq("character_id", input.characterId)
    .is("left_at", null)
    .maybeSingle();
  if (membershipResult.error) return mapCommandError(membershipResult.error);
  if (!membershipResult.data) {
    return { ok: false, code: "NOT_A_PARTY_MEMBER", message: "הדמות אינה חברה פעילה במפגש הזה." };
  }

  let serviceClient: GameSupabaseClient;
  try {
    serviceClient = createServiceRoleSupabaseClient();
  } catch {
    return {
      ok: false,
      code: "CONFIGURATION_ERROR",
      message: "מפתח שרת מאובטח חסר. אי אפשר לעבד כעת פעולות משחק מקוונות.",
    };
  }

  return {
    ok: true,
    userClient,
    serviceClient,
    userId: authData.user.id,
    session: sessionResult.data,
  };
}

async function validateDialogueVote(
  input: Extract<PartyGameCommandInput, { type: "SUBMIT_DIALOGUE_VOTE" }>,
  context: ProvenContext,
): Promise<ResolutionFailure | null> {
  if (canonicalSceneId(input.payload.sceneId) !== canonicalSceneId(context.session.current_scene_id)) {
    return { ok: false, code: "INVALID_ACTION", message: "ההצבעה שייכת לסצנה שכבר הסתיימה." };
  }
  const node = dialoguesById[input.payload.decisionId];
  const choice = node?.choices.find((candidate) => candidate.id === input.payload.choiceId);
  if (!node || !choice) {
    return { ok: false, code: "CONTENT_NOT_FOUND", message: "אפשרות הדיאלוג אינה קיימת בתוכן המאושר." };
  }
  const scene = openingScenesById[canonicalSceneId(context.session.current_scene_id)];
  const sessionState = asJsonObject(context.session.session_state);
  const locationId = typeof sessionState?.current_location_id === "string"
    ? sessionState.current_location_id
    : scene?.locationId;
  if (
    !locationId ||
    !dialogueReachableFromLocation(node.id, locationId) ||
    !dialogueReachableFromScene(node.id, context.session.current_scene_id)
  ) {
    return { ok: false, code: "INVALID_ACTION", message: "הדיאלוג אינו שייך למיקום ולסצנה הפעילים." };
  }
  if (!(choice.conditions?.length)) return null;

  const saveResult = await context.userClient.rpc("get_latest_character_save", {
    p_character_id: input.characterId,
  });
  if (saveResult.error) return mapCommandError(saveResult.error);
  const latest = saveResult.data?.[0];
  const save = latest
    ? validateAndMigrateSave(unwrapCloudSaveEnvelope(latest.snapshot))
    : null;
  if (!save?.ok) {
    return { ok: false, code: "INVALID_ACTION", message: "לא ניתן לאמת את תנאי הבחירה מול שמירת הדמות." };
  }
  const allowed = availableChoices(node.choices, {
    character: save.data.character,
    story: save.data.story,
    inventory: save.data.inventory,
    quests: save.data.quests,
  }).some((candidate) => candidate.id === choice.id);
  return allowed
    ? null
    : { ok: false, code: "INVALID_ACTION", message: "הדמות אינה עומדת בתנאים של אפשרות הדיאלוג הזאת." };
}

function databasePayload(input: PartyGameCommandInput, currentSceneId: string): JsonObject {
  switch (input.type) {
    case "SUBMIT_DIALOGUE_VOTE":
      return {
        scene_id: currentSceneId,
        decision_id: input.payload.decisionId,
        choice_id: input.payload.choiceId,
      };
    case "RESOLVE_SKILL_CHECK":
      return { interaction_id: input.payload.interactionId };
    case "RESOLVE_INTERACTION":
      return { interaction_id: input.payload.interactionId };
    case "MOVE_TO_LOCATION":
      return { location_id: input.payload.locationId };
    case "BEGIN_ENCOUNTER":
      return { encounter_id: encounterDatabaseIds[input.payload.encounterId] ?? input.payload.encounterId };
    case "SUBMIT_COMBAT_ACTION": {
      const actorId = `player-${input.characterId}`;
      const action = input.payload.action;
      return {
        ability_id: action.kind === "ability" ? action.abilityId : action.kind,
        target_id: action.kind === "ability" ? action.targetIds[0] : actorId,
        action: action as unknown as Json,
      };
    }
    case "USE_ITEM":
      return {
        inventory_entry_id: input.payload.inventoryEntryId,
        target_character_id: input.payload.targetCharacterId ?? input.characterId,
      };
    case "CLAIM_LOOT":
      return {};
    case "COMPLETE_SCENE":
      return { scene_id: currentSceneId, next_scene_id: input.payload.nextSceneId ?? null };
  }
}

async function resolveDialogueVote(
  input: Extract<PartyGameCommandInput, { type: "SUBMIT_DIALOGUE_VOTE" }>,
  context: ProvenContext,
  sessionVersion: number,
  commandResult: Json,
): Promise<PartyGameActionResult> {
  const [membersResult, votesResult] = await Promise.all([
    context.serviceClient
      .from("party_members")
      .select("character_id")
      .eq("party_id", context.session.party_id)
      .is("left_at", null),
    context.serviceClient
      .from("party_votes")
      .select("character_id,choice_id")
      .eq("session_id", input.sessionId)
      .eq("scene_id", context.session.current_scene_id)
      .eq("decision_id", input.payload.decisionId),
  ]);

  if (membersResult.error || votesResult.error) {
    return {
      ok: true,
      data: {
        commandId: input.commandId,
        status: "accepted",
        sessionVersion,
        result: commandResult,
      },
    };
  }

  const requiredVotes = membersResult.data?.length ?? 0;
  const submittedVotes = new Set((votesResult.data ?? []).map((vote) => vote.character_id)).size;
  if (!requiredVotes || submittedVotes < requiredVotes) {
    return {
      ok: true,
      data: {
        commandId: input.commandId,
        status: "accepted",
        sessionVersion,
        result: {
          vote_recorded: true,
          submitted_votes: submittedVotes,
          required_votes: requiredVotes,
        },
      },
    };
  }

  const resolvedResult = await context.serviceClient.rpc("resolve_party_vote", {
    p_session_id: input.sessionId,
    p_scene_id: context.session.current_scene_id,
    p_decision_id: input.payload.decisionId,
  });
  if (resolvedResult.error) return mapCommandError(resolvedResult.error);
  const resolved = asJsonObject(resolvedResult.data);
  const choiceId = resolved?.choice_id;
  const votes = resolved?.votes;
  if (typeof choiceId !== "string" || typeof votes !== "number" || !dialoguesById[input.payload.decisionId]?.choices.some((choice) => choice.id === choiceId)) {
    return { ok: false, code: "INVALID_ACTION", message: "תוצאת ההצבעה שהתקבלה מן השרת אינה תקינה." };
  }

  return {
    ok: true,
    data: {
      commandId: input.commandId,
      status: "accepted",
      sessionVersion,
      result: commandResult,
      resolvedVote: {
        choiceId,
        votes,
        leaderBrokeTie: resolved?.leader_broke_tie === true,
        submittedVotes,
        requiredVotes,
      },
    },
  };
}

async function loadTrustedSession(
  serviceClient: GameSupabaseClient,
  sessionId: string,
): Promise<PartySessionRow | ResolutionFailure> {
  const result = await serviceClient
    .from("party_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (result.error) return mapCommandError(result.error);
  if (!result.data) return { ok: false, code: "SESSION_NOT_FOUND", message: "מפגש החבורה אינו זמין עוד." };
  return result.data;
}

async function createPartyCombatants(
  serviceClient: GameSupabaseClient,
  partyId: string,
  checkpointVitals?: Readonly<Record<string, CombatCheckpointVital>>,
): Promise<Combatant[] | ResolutionFailure> {
  const membersResult = await serviceClient
    .from("party_members")
    .select("character_id")
    .eq("party_id", partyId)
    .is("left_at", null)
    .order("joined_at", { ascending: true });
  if (membersResult.error) return mapCommandError(membersResult.error);
  const characterIds = (membersResult.data ?? []).map((member) => member.character_id);
  if (!characterIds.length) return { ok: false, code: "NOT_A_PARTY_MEMBER", message: "לא נמצאו דמויות פעילות בחבורה." };

  const [charactersResult, attributesResult, inventoryResult, equipmentResult] = await Promise.all([
    serviceClient
      .from("characters")
      .select("id,name,class_id,level,current_health,maximum_health,primary_resource,maximum_primary_resource")
      .in("id", characterIds),
    serviceClient
      .from("character_attributes")
      .select("*")
      .in("character_id", characterIds),
    serviceClient
      .from("character_inventory")
      .select("id,character_id,item_id,quantity,durability,custom_data,acquired_at")
      .in("character_id", characterIds),
    serviceClient
      .from("character_equipment")
      .select("character_id,slot,inventory_entry_id")
      .in("character_id", characterIds),
  ]);
  if (charactersResult.error) return mapCommandError(charactersResult.error);
  if (attributesResult.error) return mapCommandError(attributesResult.error);
  if (inventoryResult.error) return mapCommandError(inventoryResult.error);
  if (equipmentResult.error) return mapCommandError(equipmentResult.error);

  const attributesByCharacter = new Map((attributesResult.data ?? []).map((row) => [row.character_id, row]));
  const characterById = new Map((charactersResult.data ?? []).map((row) => [row.id, row]));
  const inventoryByCharacter = new Map<string, InventoryEntry[]>();
  for (const row of inventoryResult.data ?? []) {
    const entries = inventoryByCharacter.get(row.character_id) ?? [];
    entries.push({
      id: row.id,
      itemId: row.item_id,
      quantity: row.quantity,
      durability: row.durability,
      customData: {},
      acquiredAt: row.acquired_at,
    });
    inventoryByCharacter.set(row.character_id, entries);
  }
  const equipmentByCharacter = new Map<string, Equipment>();
  for (const row of equipmentResult.data ?? []) {
    const equipment = equipmentByCharacter.get(row.character_id) ?? {};
    const slot = row.slot === "off_hand" ? "offhand" : row.slot;
    if (slot === "weapon" || slot === "offhand" || slot === "armor" || slot === "helmet" || slot === "gloves" || slot === "boots" || slot === "ring" || slot === "amulet") {
      equipment[slot] = row.inventory_entry_id;
    }
    equipmentByCharacter.set(row.character_id, equipment);
  }
  const combatants: Combatant[] = [];
  for (const characterId of characterIds) {
    const character = characterById.get(characterId);
    const attributeRow = attributesByCharacter.get(characterId);
    if (checkpointVitals && !checkpointVitals[characterId]) {
      return { ok: false, code: "INVALID_ACTION", message: "נקודת הביקורת אינה תואמת עוד להרכב החבורה." };
    }
    if (!character || !attributeRow || !(character.class_id in classesById)) {
      return { ok: false, code: "INVALID_ACTION", message: "נתוני אחת מדמויות החבורה אינם שלמים." };
    }
    const attributes: Attributes = {
      strength: attributeRow.strength,
      dexterity: attributeRow.dexterity,
      constitution: attributeRow.constitution,
      intelligence: attributeRow.intelligence,
      wisdom: attributeRow.wisdom,
      charisma: attributeRow.charisma,
    };
    const characterClass = classesById[character.class_id as ClassId];
    const bonuses = equipmentStatBonuses(
      equipmentByCharacter.get(character.id) ?? {},
      inventoryByCharacter.get(character.id) ?? [],
      itemsById,
    );
    const equippedAttributes = Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => [key, value + (bonuses[key] ?? 0)]),
    ) as Attributes;
    const baseDerived = deriveStats(equippedAttributes, characterClass, character.level);
    const derived = {
      ...baseDerived,
      armor: baseDerived.armor + (bonuses.armor ?? 0),
      accuracy: baseDerived.accuracy + (bonuses.accuracy ?? 0),
      initiative: baseDerived.initiative + (bonuses.initiative ?? 0),
    };
    const checkpointVital = checkpointVitals?.[character.id];
    const restoredHealth = checkpointVital
      ? Math.min(character.maximum_health, checkpointVital.currentHealth)
      : Math.min(character.maximum_health, character.current_health);
    const restoredResource = checkpointVital
      ? Math.min(character.maximum_primary_resource, checkpointVital.currentResource)
      : Math.min(character.maximum_primary_resource, character.primary_resource);
    combatants.push({
      id: `player-${character.id}`,
      kind: "player",
      name: character.name,
      characterId: character.id as CharacterId,
      level: character.level,
      attributes,
      maximumHealth: character.maximum_health,
      currentHealth: restoredHealth,
      armor: derived.armor,
      accuracy: derived.accuracy,
      initiativeBonus: derived.initiative,
      resourceType: characterClass.resourceType,
      maximumResource: character.maximum_primary_resource,
      currentResource: restoredResource,
      abilityIds: [...characterClass.startingAbilityIds],
      cooldowns: {},
      statuses: [],
      defeated: restoredHealth <= 0,
    });
  }
  if (!combatants.some((combatant) => !combatant.defeated)) {
    return { ok: false, code: "INVALID_ACTION", message: "כל חברי החבורה מחוסרי הכרה. יש לשוב לנקודת השמירה." };
  }
  return combatants;
}

async function resolveInteractionCommand(
  input: Extract<PartyGameCommandInput, { type: "RESOLVE_INTERACTION" }>,
  session: PartySessionRow,
): Promise<Resolution> {
  if (readCombatEnvelope(session.session_state)) {
    return { ok: false, code: "INVALID_ACTION", message: "אי אפשר להשלים חקירה בזמן קרב פעיל." };
  }
  const sessionState = asJsonObject(session.session_state) ?? {};
  const scene = openingScenesById[canonicalSceneId(session.current_scene_id)];
  const locationId = typeof sessionState.current_location_id === "string"
    ? sessionState.current_location_id
    : scene?.locationId;
  const interaction = locationId
    ? locationsById[locationId]?.interactions.find((candidate) => candidate.id === input.payload.interactionId)
    : undefined;
  if (!scene || !interaction || !scene.interactionIds.includes(interaction.id)) {
    return { ok: false, code: "CONTENT_NOT_FOUND", message: "הפעולה אינה קיימת בסצנה ובמקום הנוכחיים." };
  }
  if (interaction.skillCheck) {
    return { ok: false, code: "INVALID_ACTION", message: "יש לפתור את בדיקת המיומנות של הפעולה דרך מנגנון הקובייה." };
  }
  const resolvedInteractions = asJsonObject(sessionState.resolved_interactions) ?? {};
  if (interaction.oneTime && resolvedInteractions[interaction.id] !== undefined) {
    return { ok: false, code: "INVALID_ACTION", message: "הפעולה הזאת כבר הושלמה עבור החבורה." };
  }
  const resolution: JsonObject = {
    interaction_id: interaction.id,
    character_id: input.characterId,
    command_id: input.commandId,
  };
  return {
    ok: true,
    result: resolution,
    statePatch: {
      resolved_interactions: {
        ...resolvedInteractions,
        [interaction.id]: resolution,
      },
    },
  };
}

async function resolveSkillCheckCommand(
  input: Extract<PartyGameCommandInput, { type: "RESOLVE_SKILL_CHECK" }>,
  session: PartySessionRow,
  serviceClient: GameSupabaseClient,
  serverSeed: number,
): Promise<Resolution> {
  if (readCombatEnvelope(session.session_state)) {
    return { ok: false, code: "INVALID_ACTION", message: "אי אפשר לבצע בדיקת מיומנות בזמן קרב פעיל." };
  }
  const sessionState = asJsonObject(session.session_state) ?? {};
  const completedChecks = asJsonObject(sessionState.skill_checks) ?? {};
  if (completedChecks[input.payload.interactionId] !== undefined) {
    return { ok: false, code: "INVALID_ACTION", message: "בדיקת המיומנות הזאת כבר הוכרעה עבור החבורה." };
  }

  const scene = openingScenesById[canonicalSceneId(session.current_scene_id)];
  const locationId = typeof sessionState.current_location_id === "string"
    ? sessionState.current_location_id
    : scene?.locationId;
  const interaction = locationId
    ? locationsById[locationId]?.interactions.find((candidate) => candidate.id === input.payload.interactionId)
    : undefined;
  const dialogueNode = Object.values(dialoguesById)
    .find((node) => node.choices.some((choice) => choice.id === input.payload.interactionId));
  const dialogueChoice = dialogueNode && locationId &&
    dialogueReachableFromLocation(dialogueNode.id, locationId) &&
    dialogueReachableFromScene(dialogueNode.id, session.current_scene_id)
    ? dialogueNode.choices.find((choice) => choice.id === input.payload.interactionId)
    : undefined;
  const skillCheck = interaction?.skillCheck ?? dialogueChoice?.skillCheck;
  if (!skillCheck) {
    return { ok: false, code: "CONTENT_NOT_FOUND", message: "בדיקת המיומנות אינה קיימת במקום הנוכחי." };
  }

  const [characterResult, attributesResult] = await Promise.all([
    serviceClient.from("characters").select("level").eq("id", input.characterId).single(),
    serviceClient.from("character_attributes").select("strength,dexterity,constitution,intelligence,wisdom,charisma").eq("character_id", input.characterId).single(),
  ]);
  if (characterResult.error) return mapCommandError(characterResult.error);
  if (attributesResult.error) return mapCommandError(attributesResult.error);

  const attributes: Attributes = {
    strength: attributesResult.data.strength,
    dexterity: attributesResult.data.dexterity,
    constitution: attributesResult.data.constitution,
    intelligence: attributesResult.data.intelligence,
    wisdom: attributesResult.data.wisdom,
    charisma: attributesResult.data.charisma,
  };
  const proficiencyBonus = 2 + Math.floor((characterResult.data.level - 1) / 4);
  const diceResult = resolveSkillCheck(
    serverSeed,
    skillCheck,
    attributes,
    proficiencyBonus,
  );
  const persistedResult: JsonObject = {
    interaction_id: input.payload.interactionId,
    character_id: input.characterId,
    command_id: input.commandId,
    rolls: diceResult.rolls,
    selected_roll: diceResult.selectedRoll,
    modifier: diceResult.modifier,
    final_result: diceResult.finalResult,
    difficulty: diceResult.difficulty,
    mode: diceResult.mode,
    outcome: diceResult.outcome,
    seed: diceResult.seed,
  };

  return {
    ok: true,
    result: persistedResult,
    statePatch: {
      skill_checks: {
        ...completedChecks,
        [input.payload.interactionId]: persistedResult,
      },
    },
  };
}

async function resolveMove(
  input: Extract<PartyGameCommandInput, { type: "MOVE_TO_LOCATION" }>,
  session: PartySessionRow,
): Promise<Resolution> {
  const destination = locationsById[input.payload.locationId];
  if (!destination) return { ok: false, code: "CONTENT_NOT_FOUND", message: "המקום המבוקש אינו קיים בפרק הזה." };
  const state = asJsonObject(session.session_state);
  const scene = openingScenesById[canonicalSceneId(session.current_scene_id)];
  const currentLocationId = typeof state?.current_location_id === "string" ? state.current_location_id : scene?.locationId;
  const currentLocation = currentLocationId ? locationsById[currentLocationId] : undefined;
  if (!currentLocation || !currentLocation.exits.some((exit) => exit.destinationId === destination.id)) {
    return { ok: false, code: "INVALID_ACTION", message: "אין מעבר פתוח אל המקום שנבחר מן המיקום הנוכחי." };
  }
  if (readCombatEnvelope(session.session_state)) {
    return { ok: false, code: "INVALID_ACTION", message: "אי אפשר לעבור מקום בזמן קרב פעיל." };
  }
  return {
    ok: true,
    result: { location_id: destination.id, location_name: destination.name },
    statePatch: {
      current_location_id: destination.id,
      phase: "narrative",
      last_location_command_id: input.commandId,
    },
  };
}

async function resolveBeginEncounter(
  input: Extract<PartyGameCommandInput, { type: "BEGIN_ENCOUNTER" }>,
  session: PartySessionRow,
  serviceClient: GameSupabaseClient,
  serverSeed: number,
): Promise<Resolution> {
  const encounter = encountersById[input.payload.encounterId];
  if (!encounter || !encounterDatabaseIds[encounter.id]) {
    return { ok: false, code: "CONTENT_NOT_FOUND", message: "המפגש המבוקש אינו קיים בתוכן המאושר." };
  }
  if (readCombatEnvelope(session.session_state)) {
    return { ok: false, code: "INVALID_ACTION", message: "כבר מתנהל קרב בחבורה הזאת." };
  }
  const sceneId = canonicalSceneId(session.current_scene_id);
  if (!(encountersAllowedByScene[sceneId] ?? []).includes(encounter.id)) {
    return { ok: false, code: "INVALID_ACTION", message: "אי אפשר להתחיל את המפגש הזה בסצנה הנוכחית." };
  }
  const sessionState = asJsonObject(session.session_state) ?? {};
  const resolvedInteractions = asJsonObject(sessionState.resolved_interactions) ?? {};
  const completedChecks = asJsonObject(sessionState.skill_checks) ?? {};
  const requiredInteractionId = encounterInteractionById[encounter.id];
  if (
    requiredInteractionId &&
    resolvedInteractions[requiredInteractionId] === undefined &&
    completedChecks[requiredInteractionId] === undefined
  ) {
    return { ok: false, code: "INVALID_ACTION", message: "יש להשלים את פעולת הסצנה שמפעילה את העימות לפני פתיחת הקרב." };
  }

  const history = readCombatHistory(session.session_state);
  if (history?.encounterId === encounter.id && history.outcome === "victory") {
    return { ok: false, code: "INVALID_ACTION", message: "העימות הזה כבר הושלם ואי אפשר להפעיל את פרסיו מחדש." };
  }
  if (history?.outcome === "defeat" && history.encounterId !== encounter.id) {
    return { ok: false, code: "INVALID_ACTION", message: "אפשר לשחזר רק את העימות האחרון מנקודת הביקורת שלו." };
  }
  const checkpoint = history?.outcome === "defeat"
    ? readCombatCheckpoint(session.session_state, encounter.id, sceneId)
    : null;
  if (history?.outcome === "defeat" && !checkpoint) {
    return { ok: false, code: "INVALID_ACTION", message: "נקודת הביקורת של העימות אינה תקינה. יש לטעון שמירה בטוחה." };
  }

  const players = await createPartyCombatants(
    serviceClient,
    session.party_id,
    checkpoint?.players,
  );
  if (!Array.isArray(players)) return players;
  const averageLevel = players.reduce((sum, player) => sum + player.level, 0) / players.length;
  const enemies: Combatant[] = [];
  for (const [index, enemyId] of encounter.enemyIds.entries()) {
    const authoredEnemy = enemiesById[enemyId];
    if (!authoredEnemy) return { ok: false, code: "CONTENT_NOT_FOUND", message: "נתוני אחד האויבים חסרים." };
    const scaled = scaleEnemy(authoredEnemy, players.length, averageLevel);
    const combatant = createCombatantFromEnemy(scaled, `enemy-${enemyId}-${index + 1}`);
    if (authoredEnemy.boss) {
      combatant.statuses.push({
        statusId: "guarded",
        remainingTurns: 99,
        stacks: 1,
        sourceCombatantId: combatant.id,
      });
    }
    enemies.push(combatant);
  }

  const initial = createCombatState(encounter.id, [...players, ...enemies], serverSeed);
  const advanced = runEnemyTurns(initial, input.commandId);
  if (!("phase" in advanced)) return advanced;
  return {
    ok: true,
    result: {
      encounter_id: encounter.id,
      encounter_name: encounter.name,
      objective: encounter.objective,
      active_character_id: activeCharacterId(advanced),
    },
    statePatch: {
      ...combatPatch(encounter.id, advanced),
      combat_checkpoint: serializeCombatCheckpoint(encounter.id, sceneId, players),
      current_turn: session.current_turn + 1,
    },
    combatState: advanced,
  };
}

async function resolveCombatCommand(
  input: Extract<PartyGameCommandInput, { type: "SUBMIT_COMBAT_ACTION" }>,
  session: PartySessionRow,
): Promise<Resolution> {
  const envelope = readCombatEnvelope(session.session_state);
  if (!envelope) return { ok: false, code: "INVALID_ACTION", message: "אין קרב פעיל במפגש הזה." };
  if (envelope.activeCharacterId !== input.characterId) {
    return { ok: false, code: "OUT_OF_TURN", message: "אפשר לפעול רק בתורך." };
  }
  const result = submitCombatAction(
    envelope.state,
    `player-${input.characterId}`,
    input.payload.action,
    input.commandId,
    rules,
  );
  if (!result.ok) {
    return {
      ok: false,
      code: result.code === "OUT_OF_TURN" ? "OUT_OF_TURN" : "INVALID_ACTION",
      message: result.message,
    };
  }
  const advanced = runEnemyTurns(result.state, input.commandId);
  if (!("phase" in advanced)) return advanced;
  return {
    ok: true,
    result: {
      combat_phase: advanced.phase,
      round: advanced.round,
      active_character_id: activeCharacterId(advanced),
      reward_key: advanced.phase === "victory" ? (rewardForEncounter[envelope.encounterId] ?? null) : null,
    },
    statePatch: {
      ...combatPatch(envelope.encounterId, advanced),
      current_turn: session.current_turn + 1,
    },
    combatState: advanced,
  };
}

async function resolveItemUse(
  input: Extract<PartyGameCommandInput, { type: "USE_ITEM" }>,
  session: PartySessionRow,
  serviceClient: GameSupabaseClient,
): Promise<Resolution> {
  const targetCharacterId = input.payload.targetCharacterId ?? input.characterId;
  const targetMembership = await serviceClient
    .from("party_members")
    .select("character_id")
    .eq("party_id", session.party_id)
    .eq("character_id", targetCharacterId)
    .is("left_at", null)
    .maybeSingle();
  if (targetMembership.error) return mapCommandError(targetMembership.error);
  if (!targetMembership.data) return { ok: false, code: "NOT_A_PARTY_MEMBER", message: "מטרת החפץ אינה חברה פעילה בחבורה." };

  const envelope = readCombatEnvelope(session.session_state);
  if (envelope) {
    if (envelope.activeCharacterId !== input.characterId) {
      return { ok: false, code: "OUT_OF_TURN", message: "אפשר להשתמש בחפץ בקרב רק בתורך." };
    }
    const actor = envelope.state.combatants[`player-${input.characterId}`];
    const target = envelope.state.combatants[`player-${targetCharacterId}`];
    if (!actor || actor.defeated || !target || target.defeated) {
      return { ok: false, code: "INVALID_ACTION", message: "מטרת החפץ אינה חוקית בקרב הנוכחי." };
    }
  }

  const [inventoryResult, targetResult] = await Promise.all([
    serviceClient
      .from("character_inventory")
      .select("*")
      .eq("id", input.payload.inventoryEntryId)
      .eq("character_id", input.characterId)
      .maybeSingle(),
    serviceClient
      .from("characters")
      .select("id,current_health,maximum_health,primary_resource,maximum_primary_resource")
      .eq("id", targetCharacterId)
      .maybeSingle(),
  ]);
  if (inventoryResult.error) return mapCommandError(inventoryResult.error);
  if (targetResult.error) return mapCommandError(targetResult.error);
  if (!inventoryResult.data) return { ok: false, code: "INVALID_ACTION", message: "החפץ אינו נמצא בתיק." };
  if (!targetResult.data) return { ok: false, code: "INVALID_ACTION", message: "דמות המטרה אינה זמינה." };
  const item = itemsById[inventoryResult.data.item_id];
  if (!item) return { ok: false, code: "CONTENT_NOT_FOUND", message: "הגדרת החפץ אינה קיימת." };

  const inventoryEntry: InventoryEntry = {
    id: inventoryResult.data.id,
    itemId: inventoryResult.data.item_id,
    quantity: inventoryResult.data.quantity,
    durability: inventoryResult.data.durability,
    customData: {},
    acquiredAt: inventoryResult.data.acquired_at,
  };
  const used = applyInventoryItem(
    {
      inventory: [inventoryEntry],
      currentHealth: targetResult.data.current_health,
      maximumHealth: targetResult.data.maximum_health,
      currentResource: targetResult.data.primary_resource,
      maximumResource: targetResult.data.maximum_primary_resource,
    },
    inventoryEntry.id,
    item,
  );
  if (!used.ok) return { ok: false, code: "INVALID_ACTION", message: used.message };
  const healthAfter = used.value.currentHealth;
  const resourceAfter = used.value.currentResource;
  const healthRestored = used.value.healthRestored;
  const resourceRestored = used.value.resourceRestored;
  const quantityAfter = item.consumable
    ? inventoryResult.data.quantity - 1
    : inventoryResult.data.quantity;
  const authoritativeItemUse: JsonObject = {
    inventory_entry_id: inventoryResult.data.id,
    owner_character_id: input.characterId,
    target_character_id: targetCharacterId,
    quantity_before: inventoryResult.data.quantity,
    quantity_after: quantityAfter,
    health_before: targetResult.data.current_health,
    health_after: healthAfter,
    resource_before: targetResult.data.primary_resource,
    resource_after: resourceAfter,
  };

  let nextCombat: CombatState | undefined;
  if (envelope) {
    const actorId = `player-${input.characterId}`;
    const targetId = `player-${targetCharacterId}`;
    const target = envelope.state.combatants[targetId];
    const prepared: CombatState = {
      ...envelope.state,
      combatants: {
        ...envelope.state.combatants,
        [targetId]: {
          ...target,
          currentHealth: Math.min(target.maximumHealth, target.currentHealth + healthRestored),
          currentResource: Math.min(target.maximumResource, target.currentResource + resourceRestored),
        },
      },
    };
    const passedTurn = submitCombatAction(prepared, actorId, { kind: "defend" }, input.commandId, rules);
    if (!passedTurn.ok) return { ok: false, code: passedTurn.code === "OUT_OF_TURN" ? "OUT_OF_TURN" : "INVALID_ACTION", message: passedTurn.message };
    const withoutDefending: CombatState = {
      ...passedTurn.state,
      combatants: {
        ...passedTurn.state.combatants,
        [actorId]: {
          ...passedTurn.state.combatants[actorId],
          statuses: passedTurn.state.combatants[actorId].statuses.filter((status) => status.statusId !== "defending"),
        },
      },
    };
    const advanced = runEnemyTurns(withoutDefending, input.commandId);
    if (!("phase" in advanced)) return advanced;
    nextCombat = advanced;
  }

  return {
    ok: true,
    result: {
      inventory_entry_id: input.payload.inventoryEntryId,
      item_id: item.id,
      item_name: item.name,
      target_character_id: targetCharacterId,
      health_restored: healthRestored,
      resource_restored: resourceRestored,
    },
    statePatch: nextCombat
      ? {
          ...combatPatch(envelope?.encounterId ?? nextCombat.encounterId, nextCombat),
          current_turn: session.current_turn + 1,
          authoritative_item_use: authoritativeItemUse,
        }
      : {
          last_item_use: {
            command_id: input.commandId,
            item_id: item.id,
            target_character_id: targetCharacterId,
          },
          authoritative_item_use: authoritativeItemUse,
        },
    combatState: nextCombat,
  };
}

async function resolveSceneCompletion(
  input: Extract<PartyGameCommandInput, { type: "COMPLETE_SCENE" }>,
  session: PartySessionRow,
): Promise<Resolution> {
  const currentSceneId = canonicalSceneId(session.current_scene_id);
  if (canonicalSceneId(input.payload.sceneId) !== currentSceneId) {
    return { ok: false, code: "INVALID_ACTION", message: "הסצנה כבר השתנתה עבור חברי החבורה." };
  }
  const scene = openingScenesById[currentSceneId];
  if (!scene) return { ok: false, code: "CONTENT_NOT_FOUND", message: "הסצנה הנוכחית אינה קיימת בתוכן המאושר." };
  if (readCombatEnvelope(session.session_state)) {
    return { ok: false, code: "INVALID_ACTION", message: "יש לסיים את הקרב לפני התקדמות בסיפור." };
  }
  const requiredVictory = requiredVictoryByScene[currentSceneId];
  const combatHistory = readCombatHistory(session.session_state);
  if (
    requiredVictory &&
    (combatHistory?.encounterId !== requiredVictory || combatHistory.outcome !== "victory")
  ) {
    return { ok: false, code: "INVALID_ACTION", message: "יש לנצח בעימות הסצנה לפני שאפשר להתקדם." };
  }
  const requestedNext = input.payload.nextSceneId;
  const nextSceneId = requestedNext ?? scene.nextSceneIds[0] ?? null;
  if (nextSceneId && (!openingScenesById[nextSceneId] || !scene.nextSceneIds.includes(nextSceneId))) {
    return { ok: false, code: "INVALID_ACTION", message: "הסצנה הבאה אינה המשך חוקי של הסצנה הנוכחית." };
  }
  const completed = !nextSceneId;
  const nextScene = nextSceneId ? openingScenesById[nextSceneId] : null;
  return {
    ok: true,
    result: {
      completed_scene_id: currentSceneId,
      next_scene_id: nextSceneId,
      chapter_completed: completed,
    },
    statePatch: {
      current_scene_id: nextSceneId ?? currentSceneId,
      current_location_id: nextScene?.locationId ?? scene.locationId,
      session_status: completed ? "completed" : "active",
      phase: completed ? "completed" : "narrative",
      combat: { active: false },
      narrative: {
        decision_state: "idle",
        completed_scene_id: currentSceneId,
      },
    },
  };
}

async function resolvePendingCommand(
  input: PartyGameCommandInput,
  session: PartySessionRow,
  serviceClient: GameSupabaseClient,
  serverSeed: number,
): Promise<Resolution> {
  switch (input.type) {
    case "RESOLVE_INTERACTION":
      return resolveInteractionCommand(input, session);
    case "RESOLVE_SKILL_CHECK":
      return resolveSkillCheckCommand(input, session, serviceClient, serverSeed);
    case "MOVE_TO_LOCATION":
      return resolveMove(input, session);
    case "BEGIN_ENCOUNTER":
      return resolveBeginEncounter(input, session, serviceClient, serverSeed);
    case "SUBMIT_COMBAT_ACTION":
      return resolveCombatCommand(input, session);
    case "USE_ITEM":
      return resolveItemUse(input, session, serviceClient);
    case "CLAIM_LOOT":
      return { ok: false, code: "INVALID_ACTION", message: "שלל משותף נפתר בעסקה הסמכותית הייעודית." };
    case "COMPLETE_SCENE":
      return resolveSceneCompletion(input, session);
    case "SUBMIT_DIALOGUE_VOTE":
      return { ok: false, code: "INVALID_ACTION", message: "הצבעות דיאלוג נפתרות במסלול הייעודי שלהן." };
  }
}

async function applyResolution(
  serviceClient: GameSupabaseClient,
  commandId: string,
  sessionId: string,
  expectedVersion: number,
  success: boolean,
  result: JsonObject,
  statePatch: JsonObject,
): Promise<{ receipt: CommandReceipt | null; error: unknown | null }> {
  let version = expectedVersion;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const applied = await serviceClient.rpc("apply_party_command_result", {
      p_command_id: commandId,
      p_expected_session_version: version,
      p_success: success,
      p_result: result,
      p_state_patch: statePatch,
    });
    if (!applied.error) {
      const receipt = parseReceipt(applied.data);
      if (receipt) return { receipt, error: null };
      const object = asJsonObject(applied.data);
      const status = object?.status;
      const returnedCommandId = object?.command_id;
      if (
        typeof returnedCommandId === "string" &&
        (status === "accepted" || status === "rejected")
      ) {
        const latest = await loadTrustedSession(serviceClient, sessionId);
        if (isResolutionFailure(latest)) return { receipt: null, error: latest };
        return {
          receipt: {
            commandId: returnedCommandId,
            status,
            duplicate: object?.duplicate === true,
            sessionVersion: latest.version,
            result: object?.result ?? {},
          },
          error: null,
        };
      }
      return { receipt: null, error: "INVALID_COMMAND_RESULT" };
    }
    if (!errorText(applied.error).includes("SESSION_VERSION_CONFLICT") || attempt === 1) {
      return { receipt: null, error: applied.error };
    }
    const latest = await loadTrustedSession(serviceClient, sessionId);
    if (isResolutionFailure(latest)) return { receipt: null, error: latest };
    const pendingId = asJsonObject(latest.session_state)?.pending_command_id;
    if (pendingId !== commandId) return { receipt: null, error: "PENDING_COMMAND_MISMATCH" };
    version = latest.version;
  }
  return { receipt: null, error: "SESSION_VERSION_CONFLICT" };
}

async function finalizeAcceptedDuplicate(
  _input: PartyGameCommandInput,
  _context: ProvenContext,
  receipt: CommandReceipt,
): Promise<PartyGameActionResult> {
  return {
    ok: true,
    data: {
      commandId: receipt.commandId,
      status: "accepted",
      sessionVersion: receipt.sessionVersion,
      result: receipt.result,
    },
  };
}

async function resolveAtomicLootClaim(
  input: Extract<PartyGameCommandInput, { type: "CLAIM_LOOT" }>,
  context: ProvenContext,
  expectedVersion: number,
): Promise<PartyGameActionResult> {
  const resolved = await context.serviceClient.rpc("resolve_party_loot_claim", {
    p_command_id: input.commandId,
    p_expected_session_version: expectedVersion,
  });
  if (resolved.error) return mapCommandError(resolved.error);
  const receipt = parseReceipt(resolved.data);
  if (!receipt || receipt.status !== "accepted") {
    return { ok: false, code: "UNKNOWN", message: "תוצאת בחירת השלל לא נשמרה באופן תקין." };
  }
  return {
    ok: true,
    data: {
      commandId: receipt.commandId,
      status: "accepted",
      sessionVersion: receipt.sessionVersion,
      result: receipt.result,
    },
  };
}

export async function submitPartyGameCommandAction<Type extends PartyGameCommandType>(
  rawInput: PartyGameCommandInput<Type>,
): Promise<PartyGameActionResult> {
  const parsed = partyGameCommandSchema.safeParse(rawInput);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message);
  const input = parsed.data as PartyGameCommandInput;
  const context = await proveCommandContext(input);
  if (!context.ok) return context;
  if (context.session.status !== "active") {
    return { ok: false, code: "INVALID_ACTION", message: "מפגש החבורה אינו פעיל." };
  }

  if (input.type === "SUBMIT_DIALOGUE_VOTE") {
    const validation = await validateDialogueVote(input, context);
    if (validation) return validation;
  }

  const submitted = await context.userClient.rpc("submit_party_command", {
    p_command_id: input.commandId,
    p_session_id: input.sessionId,
    p_character_id: input.characterId,
    p_expected_session_version: input.expectedVersion,
    p_command_type: input.type,
    p_payload: databasePayload(input, context.session.current_scene_id),
  });
  if (submitted.error) return mapCommandError(submitted.error);
  const receipt = parseReceipt(submitted.data);
  if (!receipt) return { ok: false, code: "UNKNOWN", message: "שרת המשחק החזיר תשובה שאינה תקינה." };

  if (input.type === "SUBMIT_DIALOGUE_VOTE") {
    if (receipt.status !== "accepted") {
      return { ok: false, code: "INVALID_ACTION", message: "ההצבעה לא התקבלה." };
    }
    return resolveDialogueVote(input, context, receipt.sessionVersion, receipt.result);
  }
  if (receipt.status === "rejected") {
    return { ok: false, code: "INVALID_ACTION", message: "הפקודה כבר נדחתה על ידי שרת המשחק." };
  }
  if (receipt.status === "accepted") {
    return finalizeAcceptedDuplicate(input, context, receipt);
  }

  if (input.type === "CLAIM_LOOT") {
    return resolveAtomicLootClaim(input, context, receipt.sessionVersion);
  }

  const trustedSession = await loadTrustedSession(context.serviceClient, input.sessionId);
  if (isResolutionFailure(trustedSession)) return trustedSession;
  if (
    receipt.serverSeed === undefined ||
    receipt.serverSeed < 1 ||
    receipt.serverSeed > 0xffff_ffff
  ) {
    const rejected = await applyResolution(
      context.serviceClient,
      input.commandId,
      input.sessionId,
      trustedSession.version,
      false,
      { code: "INVALID_SERVER_SEED" },
      {},
    );
    if (rejected.error) return mapCommandError(rejected.error);
    return { ok: false, code: "CONFIGURATION_ERROR", message: "שרת המשחק לא הפיק מקור אקראיות תקין לפעולה." };
  }
  const resolution = await resolvePendingCommand(
    input,
    trustedSession,
    context.serviceClient,
    receipt.serverSeed,
  );
  if (!resolution.ok) {
    const rejected = await applyResolution(
      context.serviceClient,
      input.commandId,
      input.sessionId,
      trustedSession.version,
      false,
      { code: resolution.code, message: resolution.message },
      {},
    );
    if (rejected.error) return mapCommandError(rejected.error);
    return resolution;
  }

  const applied = await applyResolution(
    context.serviceClient,
    input.commandId,
    input.sessionId,
    trustedSession.version,
    true,
    resolution.result,
    resolution.statePatch,
  );
  if (applied.error) return mapCommandError(applied.error);
  const appliedReceipt = applied.receipt;
  if (!appliedReceipt || appliedReceipt.status !== "accepted") {
    return { ok: false, code: "UNKNOWN", message: "תוצאת הפקודה לא נשמרה באופן תקין." };
  }

  return {
    ok: true,
    data: {
      commandId: input.commandId,
      status: "accepted",
      sessionVersion: appliedReceipt.sessionVersion,
      result: resolution.result,
    },
  };
}
