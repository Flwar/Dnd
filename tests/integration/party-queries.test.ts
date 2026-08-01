import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  fetchPartyLobbySnapshot,
  findActivePartyMembership,
} from "@/lib/party/queries";
import type { Database } from "@/types/database";

function queryBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
  };
  return builder;
}

describe("שאילתות מצב החבורה", () => {
  it("טוען חדר, סגל וסשן למבנה לובי יחיד", async () => {
    const party = queryBuilder({
      data: {
        id: "30000000-0000-4000-8000-000000000003",
        name: "שומרי הערפל",
        room_code: "A7K9Q2",
        leader_character_id: "10000000-0000-4000-8000-000000000001",
        status: "active",
        maximum_members: 4,
        updated_at: "2026-07-31T20:00:00.000Z",
      },
      error: null,
    });
    const session = queryBuilder({
      data: {
        id: "40000000-0000-4000-8000-000000000004",
        chapter_id: "shadows-beneath-mistvale",
        current_scene_id: "arrival",
        status: "active",
        version: 3,
      },
      error: null,
    });
    const from = vi.fn((table: string) => table === "parties" ? party : session);
    const rpc = vi.fn(async () => ({
      data: [{
        character_id: "10000000-0000-4000-8000-000000000001",
        display_name: "בודקת",
        character_name: "אריאל",
        portrait_key: "portrait-human-01",
        class_id: "fighter",
        level: 1,
        current_health: 30,
        maximum_health: 30,
        member_role: "leader",
        ready_state: true,
        connection_state: "connected",
        last_seen_at: "2026-07-31T20:00:00.000Z",
      }],
      error: null,
    }));
    const supabase = { from, rpc } as unknown as SupabaseClient<Database>;

    const result = await fetchPartyLobbySnapshot(
      supabase,
      "30000000-0000-4000-8000-000000000003",
    );

    expect(result?.party.roomCode).toBe("A7K9Q2");
    expect(result?.members[0]).toMatchObject({ characterName: "אריאל", role: "leader", ready: true });
    expect(result?.session).toMatchObject({ currentSceneId: "arrival", version: 3 });
    expect(rpc).toHaveBeenCalledWith("get_party_roster", {
      p_party_id: "30000000-0000-4000-8000-000000000003",
    });
  });

  it("מאתר חברות פעילה עבור הדמות הנבחרת", async () => {
    const membership = queryBuilder({
      data: {
        party_id: "30000000-0000-4000-8000-000000000003",
        character_id: "10000000-0000-4000-8000-000000000001",
        role: "member",
      },
      error: null,
    });
    const supabase = {
      from: vi.fn(() => membership),
    } as unknown as SupabaseClient<Database>;

    await expect(findActivePartyMembership(
      supabase,
      "10000000-0000-4000-8000-000000000001",
    )).resolves.toEqual({
      partyId: "30000000-0000-4000-8000-000000000003",
      characterId: "10000000-0000-4000-8000-000000000001",
      role: "member",
    });
  });
});
