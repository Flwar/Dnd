import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { migrateSave } from "@/game/persistence";
import { createCloudSaveEnvelope } from "@/lib/game/save-envelope";
import type { Database, Json, PartySessionRow } from "@/types/database";
import { makeSaveV1 } from "../unit/fixtures";

const mockedSupabase = vi.hoisted(() => ({
  createUserClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mockedSupabase.createUserClient,
  createServiceRoleSupabaseClient: mockedSupabase.createServiceClient,
}));

import {
  submitPartyGameCommandAction,
  type PartyGameCommandInput,
} from "@/lib/actions/party-game";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const CHARACTER_ID = "10000000-0000-4000-8000-000000000001";
const SECOND_CHARACTER_ID = "10000000-0000-4000-8000-000000000002";
const PARTY_ID = "30000000-0000-4000-8000-000000000003";
const SESSION_ID = "40000000-0000-4000-8000-000000000004";
const COMMAND_ID = "60000000-0000-4000-8000-000000000006";

function queryBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: (
      resolve: (value: typeof result) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function session(overrides: Partial<PartySessionRow> = {}): PartySessionRow {
  return {
    id: SESSION_ID,
    party_id: PARTY_ID,
    chapter_id: "chapter-one-shadows-under-arfelon",
    session_state: { current_location_id: "village-gate" },
    current_scene_id: "arrival",
    current_turn: 0,
    status: "active",
    version: 3,
    created_at: "2026-07-31T18:00:00.000Z",
    updated_at: "2026-07-31T18:00:00.000Z",
    completed_at: null,
    ...overrides,
  };
}

function createUserClient(
  currentSession: PartySessionRow,
  submitResult: { data: Json | null; error: unknown } = { data: null, error: null },
  latestSnapshot?: Json,
) {
  const character = queryBuilder({ data: { id: CHARACTER_ID, owner_id: USER_ID }, error: null });
  const gameSession = queryBuilder({ data: currentSession, error: null });
  const membership = queryBuilder({
    data: { party_id: PARTY_ID, character_id: CHARACTER_ID },
    error: null,
  });
  const from = vi.fn((table: string) => {
    if (table === "characters") return character;
    if (table === "party_sessions") return gameSession;
    if (table === "party_members") return membership;
    throw new Error(`Unexpected user table: ${table}`);
  });
  const rpc = vi.fn(async (name: string) => {
    if (name === "get_latest_character_save") {
      return {
        data: latestSnapshot
          ? [{
              snapshot_id: "70000000-0000-4000-8000-000000000007",
              save_version: 2,
              snapshot: latestSnapshot,
              save_reason: "autosave",
              created_at: "2026-07-31T18:00:00.000Z",
            }]
          : [],
        error: null,
      };
    }
    return submitResult;
  });
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })) },
    from,
    rpc,
  } as unknown as SupabaseClient<Database>;
}

function moveInput(): PartyGameCommandInput<"MOVE_TO_LOCATION"> {
  return {
    commandId: COMMAND_ID,
    sessionId: SESSION_ID,
    characterId: CHARACTER_ID,
    expectedVersion: 3,
    type: "MOVE_TO_LOCATION",
    payload: { locationId: "arfelon-square" },
    timestamp: "2026-07-31T18:01:00.000Z",
  };
}

describe("מתאם פקודות סמכותי למשחק חבורה", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("עוצר לפני יצירת פקודה ממתינה כאשר מפתח השירות חסר", async () => {
    const userClient = createUserClient(session());
    mockedSupabase.createUserClient.mockResolvedValue(userClient);
    mockedSupabase.createServiceClient.mockImplementation(() => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
    });

    const result = await submitPartyGameCommandAction(moveInput());

    expect(result).toEqual({
      ok: false,
      code: "CONFIGURATION_ERROR",
      message: "מפתח שרת מאובטח חסר. אי אפשר לעבד כעת פעולות משחק מקוונות.",
    });
    expect(userClient.rpc).not.toHaveBeenCalled();
  });

  it("מוכיח בעלות וחברות, פותר מעבר מתוך התוכן וכותב רק דרך apply_party_command_result", async () => {
    const userSession = session();
    const userClient = createUserClient(userSession, {
      data: {
        command_id: COMMAND_ID,
        status: "pending",
        duplicate: false,
        session_version: 4,
        server_seed: 246813579,
      },
      error: null,
    });
    const trustedSession = session({
      version: 4,
      session_state: {
        current_location_id: "village-gate",
        pending_command_id: COMMAND_ID,
      },
    });
    const trustedSessionBuilder = queryBuilder({ data: trustedSession, error: null });
    const serviceRpc = vi.fn(async (name: string) => {
      if (name === "apply_party_command_result") {
        return {
          data: {
            command_id: COMMAND_ID,
            status: "accepted",
            duplicate: false,
            session_version: 5,
            result: { location_id: "arfelon-square" },
          },
          error: null,
        };
      }
      throw new Error(`Unexpected service RPC: ${name}`);
    });
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === "party_sessions") return trustedSessionBuilder;
        throw new Error(`Unexpected service table: ${table}`);
      }),
      rpc: serviceRpc,
    } as unknown as SupabaseClient<Database>;
    mockedSupabase.createUserClient.mockResolvedValue(userClient);
    mockedSupabase.createServiceClient.mockReturnValue(serviceClient);

    const result = await submitPartyGameCommandAction(moveInput());

    expect(userClient.rpc).toHaveBeenCalledWith("submit_party_command", {
      p_command_id: COMMAND_ID,
      p_session_id: SESSION_ID,
      p_character_id: CHARACTER_ID,
      p_expected_session_version: 3,
      p_command_type: "MOVE_TO_LOCATION",
      p_payload: { location_id: "arfelon-square" },
    });
    expect(serviceRpc).toHaveBeenCalledWith(
      "apply_party_command_result",
      expect.objectContaining({
        p_command_id: COMMAND_ID,
        p_expected_session_version: 4,
        p_success: true,
        p_state_patch: expect.objectContaining({
          current_location_id: "arfelon-square",
          phase: "narrative",
        }),
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      data: { commandId: COMMAND_ID, status: "accepted", sessionVersion: 5 },
    });
  });

  it("מסנכרן אינטראקציה כתובה לכל החבורה לפני הפעלת המשך הסצנה", async () => {
    const input: PartyGameCommandInput<"RESOLVE_INTERACTION"> = {
      ...moveInput(),
      type: "RESOLVE_INTERACTION",
      payload: { interactionId: "tutorial-combat" },
    };
    const currentSession = session({
      current_scene_id: "scene-tutorial-combat",
      session_state: { current_location_id: "mine-entrance" },
    });
    const userClient = createUserClient(currentSession, {
      data: {
        command_id: COMMAND_ID,
        status: "pending",
        duplicate: false,
        session_version: 4,
        server_seed: 246813579,
      },
      error: null,
    });
    const trustedSession = queryBuilder({
      data: session({
        current_scene_id: "scene-tutorial-combat",
        version: 4,
        session_state: {
          current_location_id: "mine-entrance",
          pending_command_id: COMMAND_ID,
        },
      }),
      error: null,
    });
    const serviceRpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name !== "apply_party_command_result") throw new Error(`Unexpected service RPC: ${name}`);
      return {
        data: {
          command_id: COMMAND_ID,
          status: "accepted",
          duplicate: false,
          session_version: 5,
          result: args.p_result,
        },
        error: null,
      };
    });
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === "party_sessions") return trustedSession;
        throw new Error(`Unexpected service table: ${table}`);
      }),
      rpc: serviceRpc,
    } as unknown as SupabaseClient<Database>;
    mockedSupabase.createUserClient.mockResolvedValue(userClient);
    mockedSupabase.createServiceClient.mockReturnValue(serviceClient);

    const result = await submitPartyGameCommandAction(input);

    expect(userClient.rpc).toHaveBeenCalledWith("submit_party_command", expect.objectContaining({
      p_command_type: "RESOLVE_INTERACTION",
      p_payload: { interaction_id: "tutorial-combat" },
    }));
    expect(serviceRpc).toHaveBeenCalledWith("apply_party_command_result", expect.objectContaining({
      p_success: true,
      p_state_patch: {
        resolved_interactions: {
          "tutorial-combat": expect.objectContaining({ interaction_id: "tutorial-combat" }),
        },
      },
    }));
    expect(result).toMatchObject({ ok: true, data: { sessionVersion: 5 } });
  });

  it("דוחה מפגש שאינו חוקי בסצנה ומסיר את נעילת הפקודה באמצעות תוצאת rejection", async () => {
    const input: PartyGameCommandInput<"BEGIN_ENCOUNTER"> = {
      ...moveInput(),
      type: "BEGIN_ENCOUNTER",
      payload: { encounterId: "tutorial-rat" },
    };
    const userClient = createUserClient(session(), {
      data: {
        command_id: COMMAND_ID,
        status: "pending",
        duplicate: false,
        session_version: 4,
        server_seed: 246813579,
      },
      error: null,
    });
    const trustedSessionBuilder = queryBuilder({
      data: session({ version: 4, session_state: { pending_command_id: COMMAND_ID } }),
      error: null,
    });
    const serviceRpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "apply_party_command_result") {
        return {
          data: {
            command_id: COMMAND_ID,
            status: "rejected",
            duplicate: false,
            session_version: 5,
            result: args.p_result,
          },
          error: null,
        };
      }
      throw new Error(`Unexpected service RPC: ${name}`);
    });
    const serviceClient = {
      from: vi.fn(() => trustedSessionBuilder),
      rpc: serviceRpc,
    } as unknown as SupabaseClient<Database>;
    mockedSupabase.createUserClient.mockResolvedValue(userClient);
    mockedSupabase.createServiceClient.mockReturnValue(serviceClient);

    const result = await submitPartyGameCommandAction(input);

    expect(result).toMatchObject({ ok: false, code: "INVALID_ACTION" });
    expect(serviceRpc).toHaveBeenCalledWith(
      "apply_party_command_result",
      expect.objectContaining({ p_success: false, p_state_patch: {} }),
    );
    expect(userClient.rpc).toHaveBeenCalledWith(
      "submit_party_command",
      expect.objectContaining({
        p_payload: { encounter_id: "corrupted_cave_rat" },
      }),
    );
  });

  it("בונה קרב מן הדמויות ומהתוכן, פותר תורי אויב ומחזיר את השליטה לשחקן", async () => {
    const input: PartyGameCommandInput<"BEGIN_ENCOUNTER"> = {
      ...moveInput(),
      type: "BEGIN_ENCOUNTER",
      payload: { encounterId: "tutorial-rat" },
    };
    const currentSession = session({
      current_scene_id: "scene-tutorial-combat",
      session_state: { current_location_id: "mine-entrance" },
    });
    const userClient = createUserClient(currentSession, {
      data: {
        command_id: COMMAND_ID,
        status: "pending",
        duplicate: false,
        session_version: 4,
        server_seed: 246813579,
      },
      error: null,
    });
    const trustedSession = queryBuilder({
      data: session({
        current_scene_id: "scene-tutorial-combat",
        version: 4,
        session_state: {
          current_location_id: "mine-entrance",
          pending_command_id: COMMAND_ID,
          resolved_interactions: {
            "tutorial-combat": {
              interaction_id: "tutorial-combat",
              character_id: CHARACTER_ID,
              command_id: "61000000-0000-4000-8000-000000000006",
            },
          },
        },
      }),
      error: null,
    });
    const members = queryBuilder({ data: [{ character_id: CHARACTER_ID }], error: null });
    const characters = queryBuilder({
      data: [{
        id: CHARACTER_ID,
        name: "נעמה",
        class_id: "fighter",
        level: 1,
        current_health: 30,
        maximum_health: 30,
        primary_resource: 8,
        maximum_primary_resource: 8,
      }],
      error: null,
    });
    const attributes = queryBuilder({
      data: [{
        character_id: CHARACTER_ID,
        strength: 14,
        dexterity: 12,
        constitution: 13,
        intelligence: 10,
        wisdom: 11,
        charisma: 10,
      }],
      error: null,
    });
    const inventory = queryBuilder({ data: [], error: null });
    const equipment = queryBuilder({ data: [], error: null });
    let appliedPatch: Record<string, unknown> | null = null;
    const serviceRpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "apply_party_command_result") {
        appliedPatch = args.p_state_patch as Record<string, unknown>;
        return {
          data: {
            command_id: COMMAND_ID,
            status: "accepted",
            duplicate: false,
            session_version: 5,
            result: args.p_result,
          },
          error: null,
        };
      }
      throw new Error(`Unexpected service RPC: ${name}`);
    });
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === "party_sessions") return trustedSession;
        if (table === "party_members") return members;
        if (table === "characters") return characters;
        if (table === "character_attributes") return attributes;
        if (table === "character_inventory") return inventory;
        if (table === "character_equipment") return equipment;
        throw new Error(`Unexpected service table: ${table}`);
      }),
      rpc: serviceRpc,
    } as unknown as SupabaseClient<Database>;
    mockedSupabase.createUserClient.mockResolvedValue(userClient);
    mockedSupabase.createServiceClient.mockReturnValue(serviceClient);

    const result = await submitPartyGameCommandAction(input);

    expect(result).toMatchObject({
      ok: true,
      data: {
        result: {
          encounter_id: "tutorial-rat",
          active_character_id: CHARACTER_ID,
        },
      },
    });
    expect(appliedPatch).toMatchObject({
      phase: "combat",
      current_turn: 1,
      combat: {
        active: true,
        encounter_id: "corrupted_cave_rat",
        authored_encounter_id: "tutorial-rat",
        active_character_id: CHARACTER_ID,
        state: {
          encounterId: "tutorial-rat",
          phase: "active",
        },
      },
    });
  });

  it("מגלגל בדיקת מיומנות בשרת ושומר תוצאה דטרמיניסטית במצב החבורה", async () => {
    const input: PartyGameCommandInput<"RESOLVE_SKILL_CHECK"> = {
      ...moveInput(),
      type: "RESOLVE_SKILL_CHECK",
      payload: { interactionId: "inspect-blue-dust" },
    };
    const userClient = createUserClient(session(), {
      data: { command_id: COMMAND_ID, status: "pending", duplicate: false, session_version: 4, server_seed: 246813579 },
      error: null,
    });
    const trustedSession = queryBuilder({
      data: session({
        version: 4,
        session_state: { current_location_id: "village-gate", pending_command_id: COMMAND_ID },
      }),
      error: null,
    });
    const character = queryBuilder({ data: { level: 1 }, error: null });
    const attributes = queryBuilder({
      data: { strength: 12, dexterity: 12, constitution: 12, intelligence: 14, wisdom: 13, charisma: 10 },
      error: null,
    });
    let appliedPatch: Record<string, unknown> | null = null;
    const serviceRpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name !== "apply_party_command_result") throw new Error(`Unexpected service RPC: ${name}`);
      appliedPatch = args.p_state_patch as Record<string, unknown>;
      return {
        data: {
          command_id: COMMAND_ID,
          status: "accepted",
          duplicate: false,
          session_version: 5,
          result: args.p_result,
        },
        error: null,
      };
    });
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === "party_sessions") return trustedSession;
        if (table === "characters") return character;
        if (table === "character_attributes") return attributes;
        throw new Error(`Unexpected service table: ${table}`);
      }),
      rpc: serviceRpc,
    } as unknown as SupabaseClient<Database>;
    mockedSupabase.createUserClient.mockResolvedValue(userClient);
    mockedSupabase.createServiceClient.mockReturnValue(serviceClient);

    const result = await submitPartyGameCommandAction(input);

    expect(userClient.rpc).toHaveBeenCalledWith("submit_party_command", expect.objectContaining({
      p_command_type: "RESOLVE_SKILL_CHECK",
      p_payload: { interaction_id: "inspect-blue-dust" },
    }));
    expect(result).toMatchObject({
      ok: true,
      data: {
        result: {
          interaction_id: "inspect-blue-dust",
          character_id: CHARACTER_ID,
          difficulty: expect.any(Number),
          outcome: expect.stringMatching(/^(critical-success|success|failure|critical-failure)$/),
        },
      },
    });
    expect(appliedPatch).toMatchObject({
      skill_checks: {
        "inspect-blue-dust": {
          command_id: COMMAND_ID,
          rolls: expect.any(Array),
        },
      },
    });
  });

  it("פותר הצבעה רק לאחר שכל חברי החבורה הצביעו ושומר את הכרעת המוביל בשוויון", async () => {
    const input: PartyGameCommandInput<"SUBMIT_DIALOGUE_VOTE"> = {
      ...moveInput(),
      type: "SUBMIT_DIALOGUE_VOTE",
      payload: {
        sceneId: "scene-village-leader",
        decisionId: "elric-quest",
        choiceId: "elric-accept",
      },
    };
    const currentSession = session({
      current_scene_id: "scene-village-leader",
      session_state: { current_location_id: "headman-house" },
    });
    const userClient = createUserClient(currentSession, {
      data: {
        command_id: COMMAND_ID,
        status: "accepted",
        duplicate: false,
        session_version: 4,
        result: { vote_recorded: true },
      },
      error: null,
    });
    const members = queryBuilder({
      data: [
        {
          character_id: CHARACTER_ID,
          connection_state: "connected",
          last_seen_at: "2099-01-01T00:00:00.000Z",
        },
        {
          character_id: SECOND_CHARACTER_ID,
          connection_state: "reconnecting",
          last_seen_at: "2099-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const votes = queryBuilder({
      data: [
        { character_id: CHARACTER_ID, choice_id: "elric-accept" },
        { character_id: SECOND_CHARACTER_ID, choice_id: "elric-kind-promise" },
      ],
      error: null,
    });
    const serviceRpc = vi.fn(async (name: string) => {
      if (name === "resolve_party_vote") {
        return {
          data: { choice_id: "elric-accept", votes: 1, leader_broke_tie: true },
          error: null,
        };
      }
      throw new Error(`Unexpected service RPC: ${name}`);
    });
    const serviceClient = {
      from: vi.fn((table: string) => table === "party_members" ? members : votes),
      rpc: serviceRpc,
    } as unknown as SupabaseClient<Database>;
    mockedSupabase.createUserClient.mockResolvedValue(userClient);
    mockedSupabase.createServiceClient.mockReturnValue(serviceClient);

    const result = await submitPartyGameCommandAction(input);

    expect(userClient.rpc).toHaveBeenCalledWith("submit_party_dialogue_vote", {
      p_command_id: COMMAND_ID,
      p_session_id: SESSION_ID,
      p_character_id: CHARACTER_ID,
      p_scene_id: "scene-village-leader",
      p_decision_id: "elric-quest",
      p_choice_id: "elric-accept",
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        sessionVersion: 4,
        resolvedVote: {
          choiceId: "elric-accept",
          votes: 1,
          leaderBrokeTie: true,
          submittedVotes: 2,
          requiredVotes: 2,
        },
      },
    });
    expect(serviceRpc).toHaveBeenCalledWith("resolve_party_vote", {
      p_session_id: SESSION_ID,
      p_scene_id: "scene-village-leader",
      p_decision_id: "elric-quest",
    });
    expect(serviceRpc).not.toHaveBeenCalledWith(
      "apply_party_command_result",
      expect.anything(),
    );
  });

  it("פותח envelope של שמירת ענן לפני אימות תנאי בחירת דיאלוג", async () => {
    const input: PartyGameCommandInput<"SUBMIT_DIALOGUE_VOTE"> = {
      ...moveInput(),
      type: "SUBMIT_DIALOGUE_VOTE",
      payload: {
        sceneId: "scene-preparation",
        decisionId: "thal-corruption",
        choiceId: "thal-medicine",
      },
    };
    const currentSession = session({
      current_scene_id: "scene-preparation",
      session_state: { current_location_id: "healer-hut" },
    });
    const save = migrateSave(makeSaveV1());
    save.character.backgroundId = "temple-servant";
    const cloudEnvelope = createCloudSaveEnvelope(save) as unknown as Json;
    const userClient = createUserClient(
      currentSession,
      {
        data: {
          command_id: COMMAND_ID,
          status: "accepted",
          duplicate: false,
          session_version: 4,
          result: { vote_recorded: true },
        },
        error: null,
      },
      cloudEnvelope,
    );
    const members = queryBuilder({
      data: [{
        character_id: CHARACTER_ID,
        connection_state: "connected",
        last_seen_at: "2099-01-01T00:00:00.000Z",
      }],
      error: null,
    });
    const votes = queryBuilder({
      data: [{ character_id: CHARACTER_ID, choice_id: "thal-medicine" }],
      error: null,
    });
    const serviceClient = {
      from: vi.fn((table: string) => table === "party_members" ? members : votes),
      rpc: vi.fn(async () => ({
        data: { choice_id: "thal-medicine", votes: 1, leader_broke_tie: true },
        error: null,
      })),
    } as unknown as SupabaseClient<Database>;
    mockedSupabase.createUserClient.mockResolvedValue(userClient);
    mockedSupabase.createServiceClient.mockReturnValue(serviceClient);

    const result = await submitPartyGameCommandAction(input);

    expect(result).toMatchObject({
      ok: true,
      data: { resolvedVote: { choiceId: "thal-medicine" } },
    });
    expect(userClient.rpc).toHaveBeenNthCalledWith(1, "get_latest_character_save", {
      p_character_id: CHARACTER_ID,
    });
    expect(userClient.rpc).toHaveBeenNthCalledWith(
      2,
      "submit_party_dialogue_vote",
      {
        p_command_id: COMMAND_ID,
        p_session_id: SESSION_ID,
        p_character_id: CHARACTER_ID,
        p_scene_id: "scene-preparation",
        p_decision_id: "thal-corruption",
        p_choice_id: "thal-medicine",
      },
    );
  });

  it("גוזר שלל משותף מן המפגש הנעול ומעניק אותו בעסקה סמכותית", async () => {
    const input: PartyGameCommandInput<"CLAIM_LOOT"> = {
      ...moveInput(),
      type: "CLAIM_LOOT",
      payload: {},
    };
    const currentSession = session({
      current_scene_id: "scene-stone-guardian",
      session_state: {
        current_location_id: "guardian-sanctum",
        combat: {
          active: false,
          authored_encounter_id: "stone-guardian-boss",
          outcome: "victory",
          available_reward_key: "opening.stone_guardian_victory",
        },
      },
    });
    const userClient = createUserClient(currentSession, {
      data: {
        command_id: COMMAND_ID,
        status: "pending",
        duplicate: false,
        session_version: 4,
        server_seed: 246813579,
      },
      error: null,
    });
    const serviceRpc = vi.fn(async (name: string) => {
      if (name !== "resolve_party_loot_claim") throw new Error(`Unexpected service RPC: ${name}`);
      return {
        data: {
          command_id: COMMAND_ID,
          status: "accepted",
          duplicate: false,
          session_version: 5,
          server_seed: 246813579,
          result: {
            reward_key: "opening.stone_guardian_victory",
            scope_key: `encounter:${SESSION_ID}:stone-guardian-boss`,
            character_id: CHARACTER_ID,
            grant: { experience: 250, gold: 100, inventory_entry_id: "70000000-0000-4000-8000-000000000007" },
          },
        },
        error: null,
      };
    });
    const serviceClient = { rpc: serviceRpc } as unknown as SupabaseClient<Database>;
    mockedSupabase.createUserClient.mockResolvedValue(userClient);
    mockedSupabase.createServiceClient.mockReturnValue(serviceClient);

    const result = await submitPartyGameCommandAction(input);

    expect(userClient.rpc).toHaveBeenCalledWith("submit_party_command", expect.objectContaining({
      p_command_type: "CLAIM_LOOT",
      p_payload: {},
    }));
    expect(serviceRpc).toHaveBeenCalledWith("resolve_party_loot_claim", {
      p_command_id: COMMAND_ID,
      p_expected_session_version: 4,
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        sessionVersion: 5,
        result: {
          reward_key: "opening.stone_guardian_victory",
          scope_key: `encounter:${SESSION_ID}:stone-guardian-boss`,
        },
      },
    });
  });

  it("דוחה ניסיון לקבוע rewardKey או scopeKey מן הלקוח", async () => {
    const forged = {
      ...moveInput(),
      type: "CLAIM_LOOT",
      payload: { rewardKey: "opening.stone_guardian_victory", scopeKey: "forged" },
    } as unknown as PartyGameCommandInput;

    const result = await submitPartyGameCommandAction(forged);

    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(mockedSupabase.createUserClient).not.toHaveBeenCalled();
  });
});
