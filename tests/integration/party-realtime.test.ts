import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { subscribeToPartyLobby } from "@/lib/party/realtime";
import type { PartyConnectionState } from "@/lib/party/types";
import type { Database } from "@/types/database";

type ChangeHandler = () => void;
type StatusHandler = (status: "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR" | "CLOSED") => void;

describe("מנוי Realtime של לובי החבורה", () => {
  it("נרשם לכל טבלאות הלובי, מדווח חיבור ומנקה את הערוץ", () => {
    const changeHandlers: ChangeHandler[] = [];
    let statusHandler: StatusHandler = () => {
      throw new Error("Realtime status handler was not registered");
    };
    const channel = {
      on: vi.fn((_type: string, _filter: unknown, handler: ChangeHandler) => {
        changeHandlers.push(handler);
        return channel;
      }),
      subscribe: vi.fn((handler: StatusHandler) => {
        statusHandler = handler;
        return channel;
      }),
    };
    const removeChannel = vi.fn();
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel,
    } as unknown as SupabaseClient<Database>;
    const states: PartyConnectionState[] = [];
    const onChange = vi.fn();

    const cleanup = subscribeToPartyLobby(
      supabase,
      "30000000-0000-4000-8000-000000000003",
      { onChange, onConnectionChange: (state) => states.push(state) },
    );

    expect(channel.on).toHaveBeenCalledTimes(3);
    expect(states).toEqual(["connecting"]);
    statusHandler("SUBSCRIBED");
    expect(states.at(-1)).toBe("connected");
    expect(onChange).toHaveBeenCalledTimes(1);

    changeHandlers[0]?.();
    expect(onChange).toHaveBeenCalledTimes(2);
    statusHandler("CHANNEL_ERROR");
    expect(states.at(-1)).toBe("reconnecting");

    cleanup();
    expect(removeChannel).toHaveBeenCalledWith(channel as unknown as RealtimeChannel);
  });
});
