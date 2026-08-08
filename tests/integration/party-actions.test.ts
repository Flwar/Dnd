import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "00000000-0000-4000-8000-000000000001" } },
        error: null,
      })),
    },
    rpc: mocks.rpc,
  }),
}));

import {
  createPartyAction,
  joinPartyAction,
  leavePartyAction,
  recoverPartyMembershipAction,
  setPartyReadyAction,
  startPartySessionAction,
} from "@/lib/actions/party";

const CHARACTER_ID = "10000000-0000-4000-8000-000000000001";
const PARTY_ID = "30000000-0000-4000-8000-000000000003";
const SESSION_ID = "40000000-0000-4000-8000-000000000004";

describe("חוזי פעולות לובי החבורה", () => {
  beforeEach(() => vi.clearAllMocks());

  it("יוצר חדר ומחזיר קוד יציב", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ party_id: PARTY_ID, room_code: "ABC123" }],
      error: null,
    });

    await expect(createPartyAction({
      characterId: CHARACTER_ID,
      name: "שומרי הערפל",
      maximumMembers: 4,
    })).resolves.toEqual({
      ok: true,
      data: { partyId: PARTY_ID, roomCode: "ABC123" },
    });
  });

  it("מצטרף, מסמן מוכנות ומתחיל session דרך RPC סמכותיים", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: { party_id: PARTY_ID }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { session_id: SESSION_ID, version: 1 },
        error: null,
      });

    await expect(joinPartyAction({
      characterId: CHARACTER_ID,
      roomCode: "abc123",
    })).resolves.toMatchObject({ ok: true, data: { partyId: PARTY_ID } });
    await expect(setPartyReadyAction({
      partyId: PARTY_ID,
      characterId: CHARACTER_ID,
      ready: true,
    })).resolves.toMatchObject({ ok: true, data: { ready: true } });
    await expect(startPartySessionAction({ partyId: PARTY_ID })).resolves.toMatchObject({
      ok: true,
      data: { sessionId: SESSION_ID, version: 1 },
    });
  });

  it("משחרר חברות תקועה גם ללא partyId שמגיע מהלקוח", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { party_id: PARTY_ID, released: false, recovered: true },
      error: null,
    });

    await expect(recoverPartyMembershipAction({
      characterId: CHARACTER_ID,
    })).resolves.toEqual({
      ok: true,
      data: { partyId: PARTY_ID, released: false, recovered: true },
    });
    expect(mocks.rpc).toHaveBeenCalledWith("recover_party_membership", {
      p_character_id: CHARACTER_ID,
    });
  });

  it("מאפשר יציאה חוזרת idempotent בלי לנעול את הדמות", async () => {
    mocks.rpc.mockResolvedValue({ data: { duplicate: true }, error: null });

    await expect(leavePartyAction({
      partyId: PARTY_ID,
      characterId: CHARACTER_ID,
    })).resolves.toEqual({ ok: true, data: { left: true } });
  });
});
