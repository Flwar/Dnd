import type { SupabaseClient } from "@supabase/supabase-js";
import { PartyQueryError } from "@/lib/party/errors";
import { partyMemberIsPresent } from "@/lib/party/presence";
import type {
  ActivePartyMembership,
  PartyLobbySnapshot,
  PartyRosterMember,
} from "@/lib/party/types";
import type { Database } from "@/types/database";

type GameSupabaseClient = SupabaseClient<Database>;

function toMembership(row: {
  party_id: string;
  character_id: string;
  role: string;
}): ActivePartyMembership {
  return {
    partyId: row.party_id,
    characterId: row.character_id,
    role: row.role === "leader" ? "leader" : "member",
  };
}

export async function findActivePartyMembership(
  supabase: GameSupabaseClient,
  characterId: string,
): Promise<ActivePartyMembership | null> {
  const { data, error } = await supabase
    .from("party_members")
    .select("party_id,character_id,role")
    .eq("character_id", characterId)
    .is("left_at", null)
    .maybeSingle();

  if (error) throw new PartyQueryError(error);
  return data ? toMembership(data) : null;
}

export async function findFirstActivePartyMembership(
  supabase: GameSupabaseClient,
  characterIds: string[],
): Promise<ActivePartyMembership | null> {
  if (!characterIds.length) return null;
  const { data, error } = await supabase
    .from("party_members")
    .select("party_id,character_id,role")
    .in("character_id", characterIds)
    .is("left_at", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new PartyQueryError(error);
  return data ? toMembership(data) : null;
}

function toRosterMember(
  row: Database["public"]["Functions"]["get_party_roster"]["Returns"][number],
): PartyRosterMember {
  const connectionState = partyMemberIsPresent(row)
    ? row.connection_state === "reconnecting"
      ? "reconnecting"
      : "connected"
    : "disconnected";
  return {
    characterId: row.character_id,
    displayName: row.display_name,
    characterName: row.character_name,
    portraitKey: row.portrait_key,
    classId: row.class_id,
    level: row.level,
    currentHealth: row.current_health,
    maximumHealth: row.maximum_health,
    role: row.member_role === "leader" ? "leader" : "member",
    ready: row.ready_state,
    connectionState,
    lastSeenAt: row.last_seen_at,
  };
}

export async function fetchPartyLobbySnapshot(
  supabase: GameSupabaseClient,
  partyId: string,
): Promise<PartyLobbySnapshot | null> {
  const [partyResult, rosterResult, sessionResult] = await Promise.all([
    supabase
      .from("parties")
      .select("id,name,room_code,leader_character_id,status,maximum_members,updated_at")
      .eq("id", partyId)
      .maybeSingle(),
    supabase.rpc("get_party_roster", { p_party_id: partyId }),
    supabase
      .from("party_sessions")
      .select("id,chapter_id,current_scene_id,status,version")
      .eq("party_id", partyId)
      .in("status", ["forming", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (partyResult.error) throw new PartyQueryError(partyResult.error);
  if (!partyResult.data) return null;
  if (rosterResult.error) throw new PartyQueryError(rosterResult.error);
  if (sessionResult.error) throw new PartyQueryError(sessionResult.error);

  return {
    party: {
      id: partyResult.data.id,
      name: partyResult.data.name,
      roomCode: partyResult.data.room_code,
      leaderCharacterId: partyResult.data.leader_character_id,
      status: partyResult.data.status,
      maximumMembers: partyResult.data.maximum_members,
      updatedAt: partyResult.data.updated_at,
    },
    members: (rosterResult.data ?? []).map(toRosterMember),
    session: sessionResult.data
      ? {
          id: sessionResult.data.id,
          chapterId: sessionResult.data.chapter_id,
          currentSceneId: sessionResult.data.current_scene_id,
          status: sessionResult.data.status,
          version: sessionResult.data.version,
        }
      : null,
  };
}
