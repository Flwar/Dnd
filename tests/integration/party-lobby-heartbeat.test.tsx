// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartyLobbyClient } from "@/components/party/PartyLobbyClient";
import type { PartyConnectionState, PartyLobbySnapshot } from "@/lib/party/types";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({ rpc: mocks.rpc }),
}));

vi.mock("@/lib/party/realtime", () => ({
  subscribeToPartyLobby: mocks.subscribe,
}));

vi.mock("@/lib/actions/party", () => ({
  closePartyAction: vi.fn(),
  createPartyAction: vi.fn(),
  joinPartyAction: vi.fn(),
  leavePartyAction: vi.fn(),
  recoverPartyMembershipAction: vi.fn(),
  removePartyMemberAction: vi.fn(),
  setPartyReadyAction: vi.fn(),
  startPartySessionAction: vi.fn(),
  transferPartyLeadershipAction: vi.fn(),
}));

const CHARACTER_ID = "10000000-0000-4000-8000-000000000001";
const PARTY_ID = "30000000-0000-4000-8000-000000000003";

function snapshot(): PartyLobbySnapshot {
  return {
    party: {
      id: PARTY_ID,
      name: "שומרי הערפל",
      roomCode: "ABC123",
      leaderCharacterId: CHARACTER_ID,
      status: "open",
      maximumMembers: 4,
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
    members: [{
      characterId: CHARACTER_ID,
      displayName: "שחקן",
      characterName: "ארדן",
      portraitKey: "portrait-human-01",
      classId: "fighter",
      level: 1,
      currentHealth: 30,
      maximumHealth: 30,
      role: "leader",
      ready: false,
      connectionState: "connected",
      lastSeenAt: "2026-08-08T00:00:00.000Z",
    }],
    session: null,
  };
}

describe("heartbeat בחדר החבורה", () => {
  let reportConnection: ((state: PartyConnectionState) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.subscribe.mockImplementation((_client, _partyId, callbacks) => {
      reportConnection = callbacks.onConnectionChange;
      return mocks.unsubscribe;
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("מרענן last_seen מיד בחיבור ובכל 20 שניות בלי לחכות לשינוי Realtime", async () => {
    render(
      <PartyLobbyClient
        characters={[{
          id: CHARACTER_ID,
          name: "ארדן",
          classId: "fighter",
          className: "לוחם",
          portraitKey: "portrait-human-01",
          level: 1,
          currentHealth: 30,
          maximumHealth: 30,
        }]}
        initialSelectedCharacterId={CHARACTER_ID}
        initialSnapshot={snapshot()}
      />,
    );

    await waitFor(() => expect(mocks.subscribe).toHaveBeenCalledOnce());
    await act(async () => {
      reportConnection?.("connected");
      await Promise.resolve();
    });

    expect(mocks.rpc).toHaveBeenCalledWith("update_party_connection", {
      p_party_id: PARTY_ID,
      p_character_id: CHARACTER_ID,
      p_connection_state: "connected",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
});
