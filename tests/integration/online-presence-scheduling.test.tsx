import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnlinePresenceProvider } from "@/components/providers/OnlinePresenceProvider";

const supabaseMocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  removeChannel: vi.fn(),
  channel: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getSession: supabaseMocks.getSession,
      onAuthStateChange: supabaseMocks.onAuthStateChange,
    },
    rpc: supabaseMocks.rpc,
    channel: supabaseMocks.channel,
    removeChannel: supabaseMocks.removeChannel,
  }),
}));

function heartbeatCalls() {
  return supabaseMocks.rpc.mock.calls.filter(([name]) => name === "heartbeat_player_presence");
}

async function flushAuthenticatedUser() {
  await waitFor(() => expect(supabaseMocks.getSession).toHaveBeenCalledOnce());
  await act(async () => {
    await Promise.resolve();
  });
}

describe("online presence heartbeat scheduling", () => {
  let visibilityState: DocumentVisibilityState;
  let online: boolean;
  let presenceEventHandler: ((payload: { new: unknown }) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    visibilityState = "visible";
    online = true;
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibilityState);
    vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);

    supabaseMocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    supabaseMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: supabaseMocks.unsubscribe } },
    });
    supabaseMocks.channel.mockImplementation(() => {
      const channel = {
        on: vi.fn((_kind, _filter, handler) => {
          presenceEventHandler = handler;
          return channel;
        }),
        subscribe: vi.fn(() => channel),
      };
      return channel;
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not overlap a slow heartbeat and schedules the next one after completion", async () => {
    let finishHeartbeat: ((value: { error: null }) => void) | undefined;
    const pendingHeartbeat = new Promise<{ error: null }>((resolve) => {
      finishHeartbeat = resolve;
    });
    supabaseMocks.rpc.mockImplementation((name: string) => name === "heartbeat_player_presence"
      ? pendingHeartbeat
      : Promise.resolve({ data: [], error: null }));

    render(<OnlinePresenceProvider><div>משחק</div></OnlinePresenceProvider>);
    await flushAuthenticatedUser();
    await waitFor(() => expect(heartbeatCalls()).toHaveLength(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    });
    expect(heartbeatCalls()).toHaveLength(1);

    await act(async () => {
      finishHeartbeat?.({ error: null });
      await pendingHeartbeat;
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_999);
    });
    expect(heartbeatCalls()).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(heartbeatCalls()).toHaveLength(2);
  });

  it("pauses while hidden or offline and resumes immediately with a reset schedule", async () => {
    visibilityState = "hidden";
    supabaseMocks.rpc.mockImplementation((name: string) => Promise.resolve(
      name === "heartbeat_player_presence"
        ? { error: null }
        : { data: [], error: null },
    ));

    render(<OnlinePresenceProvider><div>משחק</div></OnlinePresenceProvider>);
    await flushAuthenticatedUser();
    expect(heartbeatCalls()).toHaveLength(0);

    visibilityState = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(heartbeatCalls()).toHaveLength(1);

    visibilityState = "hidden";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    });
    expect(heartbeatCalls()).toHaveLength(1);

    visibilityState = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(heartbeatCalls()).toHaveLength(2);

    online = false;
    await act(async () => {
      window.dispatchEvent(new Event("offline"));
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    });
    expect(heartbeatCalls()).toHaveLength(2);

    online = true;
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(heartbeatCalls()).toHaveLength(3);
  });

  it("refreshes the roster initially and then only every five minutes without a realtime event", async () => {
    supabaseMocks.rpc.mockImplementation((name: string) => Promise.resolve(
      name === "heartbeat_player_presence"
        ? { error: null }
        : { data: [], error: null },
    ));

    render(<OnlinePresenceProvider><div>משחק</div></OnlinePresenceProvider>);
    await flushAuthenticatedUser();
    await waitFor(() => expect(heartbeatCalls()).toHaveLength(1));
    expect(supabaseMocks.rpc.mock.calls.filter(([name]) => name === "get_online_players")).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4 * 60_000);
    });
    expect(heartbeatCalls()).toHaveLength(5);
    expect(supabaseMocks.rpc.mock.calls.filter(([name]) => name === "get_online_players")).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(heartbeatCalls()).toHaveLength(6);
    expect(supabaseMocks.rpc.mock.calls.filter(([name]) => name === "get_online_players")).toHaveLength(2);
  });

  it("coalesces a burst of realtime presence events into one roster refresh", async () => {
    supabaseMocks.rpc.mockImplementation((name: string) => Promise.resolve(
      name === "heartbeat_player_presence"
        ? { error: null }
        : { data: [], error: null },
    ));

    render(<OnlinePresenceProvider><div>משחק</div></OnlinePresenceProvider>);
    await flushAuthenticatedUser();
    await waitFor(() => expect(heartbeatCalls()).toHaveLength(1));
    expect(presenceEventHandler).toBeTypeOf("function");

    await act(async () => {
      presenceEventHandler?.({ new: { id: 1, user_id: "user-2", event_type: "joined", display_name: "שחקן שני" } });
      presenceEventHandler?.({ new: { id: 2, user_id: "user-3", event_type: "joined", display_name: "שחקן שלישי" } });
      presenceEventHandler?.({ new: { id: 3, user_id: "user-4", event_type: "left", display_name: "שחקן רביעי" } });
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(supabaseMocks.rpc.mock.calls.filter(([name]) => name === "get_online_players")).toHaveLength(2);
  });
});
