import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  fetchPartyGameSnapshot,
  subscribeToPartyGame,
} from "@/lib/party/game-realtime";
import type {
  PartyGameConnectionState,
  PartyGameRealtimeSource,
} from "@/lib/party/game-realtime";
import type { Database } from "@/types/database";

const SESSION_ID = "40000000-0000-4000-8000-000000000004";

describe("מצב Realtime של משחק חבורה", () => {
  it("טוען session, אירועים והצבעות ל-snapshot משותף מאומת", async () => {
    const combatState = {
      encounterId: "tutorial-rat",
      round: 1,
      turnOrder: ["player-a"],
      activeTurnIndex: 0,
      combatants: {},
      phase: "active",
      log: [],
      seed: 42,
      nextEventSequence: 1,
      processedCommandIds: [],
    };
    const sessionBuilder = {
      select: vi.fn(() => sessionBuilder),
      eq: vi.fn(() => sessionBuilder),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: SESSION_ID,
          party_id: "30000000-0000-4000-8000-000000000003",
          chapter_id: "opening-chapter",
          session_state: {
            phase: "combat",
            current_location_id: "mine-main-tunnel",
            combat: {
              active: true,
              encounter_id: "corrupted_cave_rat",
              authored_encounter_id: "tutorial-rat",
              active_character_id: "20000000-0000-4000-8000-000000000002",
              state: combatState,
            },
          },
          current_scene_id: "scene-tutorial-combat",
          current_turn: 3,
          status: "active",
          version: 8,
          created_at: "2026-07-31T18:00:00.000Z",
          updated_at: "2026-07-31T18:05:00.000Z",
          completed_at: null,
        },
        error: null,
      }),
    };
    const eventBuilder = {
      select: vi.fn(() => eventBuilder),
      eq: vi.fn(() => eventBuilder),
      order: vi.fn(() => eventBuilder),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "50000000-0000-4000-8000-000000000005",
            session_id: SESSION_ID,
            event_type: "COMMAND_ACCEPTED",
            payload: { command_id: "60000000-0000-4000-8000-000000000006" },
            created_by_character_id: "20000000-0000-4000-8000-000000000002",
            sequence_number: 4,
            created_at: "2026-07-31T18:05:00.000Z",
          },
        ],
        error: null,
      }),
    };
    const voteBuilder = {
      select: vi.fn(() => voteBuilder),
      eq: vi.fn(() => voteBuilder),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            session_id: SESSION_ID,
            scene_id: "scene-tutorial-combat",
            decision_id: "choose-route",
            character_id: "20000000-0000-4000-8000-000000000002",
            choice_id: "main-tunnel",
            created_at: "2026-07-31T18:03:00.000Z",
            updated_at: "2026-07-31T18:03:00.000Z",
          },
          {
            session_id: SESSION_ID,
            scene_id: "scene-tutorial-combat",
            decision_id: "choose-route",
            character_id: "20000000-0000-4000-8000-000000000007",
            choice_id: "main-tunnel",
            created_at: "2026-07-31T18:04:00.000Z",
            updated_at: "2026-07-31T18:04:00.000Z",
          },
        ],
        error: null,
      }),
    };
    const partyBuilder = {
      select: vi.fn(() => partyBuilder),
      eq: vi.fn(() => partyBuilder),
      single: vi.fn().mockResolvedValue({
        data: { leader_character_id: "20000000-0000-4000-8000-000000000002" },
        error: null,
      }),
    };
    const membersBuilder = {
      select: vi.fn(() => membersBuilder),
      eq: vi.fn(() => membersBuilder),
      is: vi.fn(() => membersBuilder),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            character_id: "20000000-0000-4000-8000-000000000002",
            connection_state: "connected",
            last_seen_at: "2099-01-01T00:00:00.000Z",
          },
          {
            character_id: "20000000-0000-4000-8000-000000000007",
            connection_state: "reconnecting",
            last_seen_at: "2099-01-01T00:00:00.000Z",
          },
        ],
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "party_sessions") return sessionBuilder;
        if (table === "party_events") return eventBuilder;
        if (table === "party_votes") return voteBuilder;
        if (table === "parties") return partyBuilder;
        if (table === "party_members") return membersBuilder;
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient<Database>;

    const snapshot = await fetchPartyGameSnapshot(supabase, SESSION_ID);

    expect(snapshot?.session.version).toBe(8);
    expect(snapshot?.scene).toMatchObject({
      id: "scene-tutorial-combat",
      locationId: "mine-main-tunnel",
      phase: "combat",
    });
    expect(snapshot?.combat).toMatchObject({
      active: true,
      encounterId: "tutorial-rat",
      activeCharacterId: "20000000-0000-4000-8000-000000000002",
    });
    expect(snapshot?.events[0]).toMatchObject({
      type: "COMMAND_ACCEPTED",
      sequenceNumber: 4,
    });
    expect(snapshot?.voteState.decisions[0]).toMatchObject({
      decisionId: "choose-route",
      totalVotes: 2,
      requiredVotes: 2,
      choiceCounts: { "main-tunnel": 2 },
      resolvedChoiceId: "main-tunnel",
    });
  });

  it("נרשם לארבע טבלאות, מסנכרן חברות, מדווח חיבור מחדש ומנקה את הערוץ", () => {
    const changeHandlers: Array<(payload?: unknown) => void> = [];
    let statusHandler: (
      status: "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR" | "CLOSED",
    ) => void = () => {
      throw new Error("Realtime status handler was not registered");
    };
    const channel = {
      on: vi.fn((_type: string, _filter: unknown, handler: (payload?: unknown) => void) => {
        changeHandlers.push(handler);
        return channel;
      }),
      subscribe: vi.fn((handler: typeof statusHandler) => {
        statusHandler = handler;
        return channel;
      }),
    };
    const removeChannel = vi.fn();
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel,
    } as unknown as SupabaseClient<Database>;
    const states: PartyGameConnectionState[] = [];
    const sources: PartyGameRealtimeSource[] = [];

    const cleanup = subscribeToPartyGame(supabase, SESSION_ID, {
      onChange: (source) => sources.push(source),
      onConnectionChange: (state) => states.push(state),
    });

    expect(channel.on).toHaveBeenCalledTimes(4);
    expect(states).toEqual(["connecting"]);
    statusHandler("SUBSCRIBED");
    expect(states.at(-1)).toBe("connected");
    expect(sources).toEqual(["session"]);

    changeHandlers[1]?.();
    changeHandlers[2]?.();
    expect(sources).toEqual(["session", "event", "vote"]);
    changeHandlers[3]?.({
      eventType: "UPDATE",
      old: { left_at: null, connection_state: "connected", role: "member" },
      new: { left_at: null, connection_state: "disconnected", role: "member" },
    });
    expect(sources).toEqual(["session", "event", "vote", "member"]);
    statusHandler("CHANNEL_ERROR");
    expect(states.at(-1)).toBe("reconnecting");

    cleanup();
    changeHandlers[0]?.();
    expect(sources).toEqual(["session", "event", "vote", "member"]);
    expect(removeChannel).toHaveBeenCalledWith(channel as unknown as RealtimeChannel);
  });
});
