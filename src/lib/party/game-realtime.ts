import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { partyMemberIsPresent } from "@/lib/party/presence";
import type { CombatState } from "@/types/game";
import type { Database, Json } from "@/types/database";

export type PartyGameConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export type PartyGameSessionStatus =
  Database["public"]["Tables"]["party_sessions"]["Row"]["status"];

export type PartyGamePhase = "narrative" | "combat" | "completed";

export type PartyGameSession = {
  id: string;
  partyId: string;
  chapterId: string;
  currentSceneId: string;
  currentTurn: number;
  status: PartyGameSessionStatus;
  version: number;
  state: Readonly<Record<string, Json | undefined>>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type PartyGameEvent = {
  id: string;
  sessionId: string;
  type: string;
  payload: Json;
  createdByCharacterId: string | null;
  sequenceNumber: number;
  createdAt: string;
};

export type PartyGameVote = {
  sessionId: string;
  sceneId: string;
  decisionId: string;
  characterId: string;
  choiceId: string;
  createdAt: string;
  updatedAt: string;
};

export type PartyGameDecisionState = {
  sceneId: string;
  decisionId: string;
  totalVotes: number;
  requiredVotes: number;
  choiceCounts: Readonly<Record<string, number>>;
  votes: readonly PartyGameVote[];
  resolvedChoiceId: string | null;
  leaderBrokeTie: boolean;
};

export type PartyGameVoteState = {
  currentSceneVotes: readonly PartyGameVote[];
  decisions: readonly PartyGameDecisionState[];
};

export type PartyGameSceneState = {
  /** Database scene identifier, used for optimistic command checks. */
  id: string;
  /** Identifier used by the authored chapter content. */
  authoredId: string;
  chapterId: string;
  locationId: string | null;
  phase: PartyGamePhase;
  status: PartyGameSessionStatus;
  currentTurn: number;
};

export type PartyGameCombatState = {
  active: boolean;
  encounterId: string;
  databaseEncounterId: string | null;
  activeCharacterId: string | null;
  outcome: CombatState["phase"] | null;
  availableRewardKey: string | null;
  state: CombatState;
};

export type PartyGameSnapshot = {
  session: PartyGameSession;
  party: {
    leaderCharacterId: string;
    memberCharacterIds: readonly string[];
  };
  events: readonly PartyGameEvent[];
  votes: readonly PartyGameVote[];
  scene: PartyGameSceneState;
  combat: PartyGameCombatState | null;
  voteState: PartyGameVoteState;
};

export type PartyGameRealtimeSource = "session" | "event" | "vote" | "member";

export type PartyGameRealtimeCallbacks = {
  onChange: (source: PartyGameRealtimeSource) => void;
  onConnectionChange: (state: PartyGameConnectionState) => void;
};

type PartyGameSupabaseClient = SupabaseClient<Database>;

const SESSION_COLUMNS =
  "id,party_id,chapter_id,session_state,current_scene_id,current_turn,status,version,created_at,updated_at,completed_at";
const EVENT_COLUMNS =
  "id,session_id,event_type,payload,created_by_character_id,sequence_number,created_at";
const VOTE_COLUMNS =
  "session_id,scene_id,decision_id,character_id,choice_id,created_at,updated_at";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStateRecord(value: Json): Readonly<Record<string, Json | undefined>> {
  return isRecord(value) ? (value as Record<string, Json | undefined>) : {};
}

function readString(record: Readonly<Record<string, Json | undefined>>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function isCombatPhase(value: unknown): value is CombatState["phase"] {
  return (
    value === "initiative" ||
    value === "active" ||
    value === "victory" ||
    value === "defeat" ||
    value === "escaped"
  );
}

/**
 * Realtime payloads are untrusted input. This deliberately checks the stable
 * outer combat contract before exposing it to the game UI. The combat engine
 * performs the deeper command validation on the server.
 */
function isCombatState(value: unknown): value is CombatState {
  if (!isRecord(value)) return false;
  return (
    typeof value.encounterId === "string" &&
    Number.isInteger(value.round) &&
    Array.isArray(value.turnOrder) &&
    value.turnOrder.every((entry) => typeof entry === "string") &&
    Number.isInteger(value.activeTurnIndex) &&
    isRecord(value.combatants) &&
    isCombatPhase(value.phase) &&
    Array.isArray(value.log) &&
    typeof value.seed === "number" &&
    Number.isInteger(value.nextEventSequence) &&
    Array.isArray(value.processedCommandIds) &&
    value.processedCommandIds.every((entry) => typeof entry === "string")
  );
}

function toCombatState(
  state: Readonly<Record<string, Json | undefined>>,
): PartyGameCombatState | null {
  const rawCombat = state.combat;
  if (!isRecord(rawCombat)) return null;

  // Accept both the authoritative envelope and the original direct state form
  // so old sessions can reconnect after the server adapter is upgraded.
  const candidate = isCombatState(rawCombat.state)
    ? rawCombat.state
    : isCombatState(rawCombat)
      ? rawCombat
      : null;
  if (!candidate) return null;

  const activeValue = rawCombat.active;
  const active =
    typeof activeValue === "boolean"
      ? activeValue
      : candidate.phase === "initiative" || candidate.phase === "active";
  const activeCharacterId =
    typeof rawCombat.active_character_id === "string"
      ? rawCombat.active_character_id
      : typeof rawCombat.activeCharacterId === "string"
        ? rawCombat.activeCharacterId
        : null;
  const encounterId =
    typeof rawCombat.authored_encounter_id === "string"
      ? rawCombat.authored_encounter_id
      : typeof rawCombat.encounter_id === "string"
        ? rawCombat.encounter_id
      : typeof rawCombat.encounterId === "string"
        ? rawCombat.encounterId
        : candidate.encounterId;
  const databaseEncounterId =
    typeof rawCombat.encounter_id === "string" ? rawCombat.encounter_id : null;
  const outcome = isCombatPhase(rawCombat.outcome) ? rawCombat.outcome : null;
  const availableRewardKey =
    typeof rawCombat.available_reward_key === "string"
      ? rawCombat.available_reward_key
      : null;

  return {
    active,
    encounterId,
    databaseEncounterId,
    activeCharacterId,
    outcome,
    availableRewardKey,
    state: candidate,
  };
}

function toVoteState(
  votes: readonly PartyGameVote[],
  currentSceneId: string,
  memberCharacterIds: readonly string[],
  sessionState: Readonly<Record<string, Json | undefined>>,
): PartyGameVoteState {
  const currentSceneVotes = votes.filter((vote) => vote.sceneId === currentSceneId);
  const grouped = new Map<string, PartyGameVote[]>();

  for (const vote of currentSceneVotes) {
    const decisionVotes = grouped.get(vote.decisionId);
    if (decisionVotes) decisionVotes.push(vote);
    else grouped.set(vote.decisionId, [vote]);
  }

  const persistedDecisions: Array<{
    sceneId: string;
    decisionId: string;
    choiceId: string;
    submittedVotes: number;
    requiredVotes: number;
    leaderBrokeTie: boolean;
    resolvedAt: string | null;
  }> = [];
  const allPersisted = isRecord(sessionState.resolved_votes) ? sessionState.resolved_votes : {};
  for (const [sceneId, rawScene] of Object.entries(allPersisted)) {
    if (!isRecord(rawScene)) continue;
    for (const [decisionId, rawResolution] of Object.entries(rawScene)) {
      if (!isRecord(rawResolution) || typeof rawResolution.choice_id !== "string") continue;
      const winningVotes = typeof rawResolution.votes === "number" && Number.isInteger(rawResolution.votes)
        ? Math.max(0, rawResolution.votes)
        : 0;
      const submittedVotes = typeof rawResolution.submitted_votes === "number" && Number.isInteger(rawResolution.submitted_votes)
        ? Math.max(0, rawResolution.submitted_votes)
        : winningVotes;
      const requiredVotes = typeof rawResolution.required_votes === "number" && Number.isInteger(rawResolution.required_votes)
        ? Math.max(0, rawResolution.required_votes)
        : submittedVotes;
      persistedDecisions.push({
        sceneId,
        decisionId,
        choiceId: rawResolution.choice_id,
        submittedVotes,
        requiredVotes,
        leaderBrokeTie: rawResolution.leader_broke_tie === true,
        resolvedAt: typeof rawResolution.resolved_at === "string" ? rawResolution.resolved_at : null,
      });
    }
  }

  const persistedCurrent = new Map(
    persistedDecisions
      .filter((decision) => decision.sceneId === currentSceneId)
      .map((decision) => [decision.decisionId, decision] as const),
  );
  const currentDecisionIds = new Set([...grouped.keys(), ...persistedCurrent.keys()]);
  const decisionsWithOrder: Array<{
    decision: PartyGameDecisionState;
    resolvedAt: string | null;
  }> = [...currentDecisionIds]
    .map((decisionId) => {
      const decisionVotes = grouped.get(decisionId) ?? [];
      const choiceCounts: Record<string, number> = {};
      for (const vote of decisionVotes) {
        choiceCounts[vote.choiceId] = (choiceCounts[vote.choiceId] ?? 0) + 1;
      }
      const persisted = persistedCurrent.get(decisionId);
      const resolvedChoiceId = persisted?.choiceId ?? null;
      return {
        resolvedAt: persisted?.resolvedAt ?? null,
        decision: {
          sceneId: currentSceneId,
          decisionId,
          totalVotes: decisionVotes.length,
          requiredVotes: memberCharacterIds.length,
          choiceCounts,
          votes: decisionVotes,
          resolvedChoiceId,
          leaderBrokeTie: persisted?.leaderBrokeTie ?? false,
        },
      };
    });

  for (const persisted of persistedDecisions) {
    if (persisted.sceneId === currentSceneId) continue;
    decisionsWithOrder.push({
      resolvedAt: persisted.resolvedAt,
      decision: {
        sceneId: persisted.sceneId,
        decisionId: persisted.decisionId,
        totalVotes: persisted.submittedVotes,
        requiredVotes: persisted.requiredVotes,
        choiceCounts: {},
        votes: [],
        resolvedChoiceId: persisted.choiceId,
        leaderBrokeTie: persisted.leaderBrokeTie,
      },
    });
  }

  const decisions = decisionsWithOrder
    .sort((left, right) => {
      if (left.resolvedAt && right.resolvedAt && left.resolvedAt !== right.resolvedAt) {
        return left.resolvedAt.localeCompare(right.resolvedAt);
      }
      if (left.resolvedAt && !right.resolvedAt) return -1;
      if (!left.resolvedAt && right.resolvedAt) return 1;
      if (left.decision.sceneId !== right.decision.sceneId) {
        return left.decision.sceneId.localeCompare(right.decision.sceneId);
      }
      return left.decision.decisionId.localeCompare(right.decision.decisionId);
    })
    .map(({ decision }) => decision);

  return { currentSceneVotes, decisions };
}

function toSceneState(
  session: PartyGameSession,
  combat: PartyGameCombatState | null,
): PartyGameSceneState {
  const explicitPhase = readString(session.state, "phase");
  const phase: PartyGamePhase =
    session.status === "completed" || explicitPhase === "completed"
      ? "completed"
      : combat?.active || explicitPhase === "combat"
        ? "combat"
        : "narrative";

  return {
    id: session.currentSceneId,
    authoredId:
      session.currentSceneId === "arrival" ? "scene-arrival" : session.currentSceneId,
    chapterId: session.chapterId,
    locationId: readString(session.state, "current_location_id", "currentLocationId"),
    phase,
    status: session.status,
    currentTurn: session.currentTurn,
  };
}

export class PartyGameQueryError extends Error {
  readonly code: string;

  constructor(code = "PARTY_GAME_QUERY_FAILED") {
    super("לא הצלחנו לטעון את מצב המשחק המשותף. בדקו את החיבור ונסו שוב.");
    this.name = "PartyGameQueryError";
    this.code = code;
  }
}

export async function fetchPartyGameSnapshot(
  supabase: PartyGameSupabaseClient,
  sessionId: string,
): Promise<PartyGameSnapshot | null> {
  const sessionResult = await supabase
    .from("party_sessions")
    .select(SESSION_COLUMNS)
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionResult.error) throw new PartyGameQueryError(sessionResult.error.code);
  if (!sessionResult.data) return null;

  const [eventsResult, votesResult, partyResult, membersResult] = await Promise.all([
    supabase
      .from("party_events")
      .select(EVENT_COLUMNS)
      .eq("session_id", sessionId)
      .order("sequence_number", { ascending: false })
      .limit(250),
    supabase
      .from("party_votes")
      .select(VOTE_COLUMNS)
      .eq("session_id", sessionId)
      .order("updated_at", { ascending: true }),
    supabase
      .from("parties")
      .select("leader_character_id")
      .eq("id", sessionResult.data.party_id)
      .single(),
    supabase
      .from("party_members")
      .select("character_id,connection_state,last_seen_at")
      .eq("party_id", sessionResult.data.party_id)
      .is("left_at", null)
      .order("joined_at", { ascending: true }),
  ]);

  if (eventsResult.error) throw new PartyGameQueryError(eventsResult.error.code);
  if (votesResult.error) throw new PartyGameQueryError(votesResult.error.code);
  if (partyResult.error) throw new PartyGameQueryError(partyResult.error.code);
  if (membersResult.error) throw new PartyGameQueryError(membersResult.error.code);

  const row = sessionResult.data;
  const session: PartyGameSession = {
    id: row.id,
    partyId: row.party_id,
    chapterId: row.chapter_id,
    currentSceneId: row.current_scene_id,
    currentTurn: row.current_turn,
    status: row.status,
    version: row.version,
    state: toStateRecord(row.session_state),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
  const events: PartyGameEvent[] = (eventsResult.data ?? [])
    .map((event) => ({
      id: event.id,
      sessionId: event.session_id,
      type: event.event_type,
      payload: event.payload,
      createdByCharacterId: event.created_by_character_id,
      sequenceNumber: event.sequence_number,
      createdAt: event.created_at,
    }))
    .reverse();
  const memberCharacterIds = (membersResult.data ?? [])
    .filter((member) => partyMemberIsPresent(member))
    .map((member) => member.character_id);
  const activeMemberIds = new Set(memberCharacterIds);
  const votes: PartyGameVote[] = (votesResult.data ?? [])
    .filter((vote) => activeMemberIds.has(vote.character_id))
    .map((vote) => ({
    sessionId: vote.session_id,
    sceneId: vote.scene_id,
    decisionId: vote.decision_id,
    characterId: vote.character_id,
    choiceId: vote.choice_id,
    createdAt: vote.created_at,
    updatedAt: vote.updated_at,
    }));
  const combat = toCombatState(session.state);
  const leaderCharacterId = partyResult.data.leader_character_id;
  return {
    session,
    party: { leaderCharacterId, memberCharacterIds },
    events,
    votes,
    scene: toSceneState(session, combat),
    combat,
    voteState: toVoteState(
      votes,
      session.currentSceneId,
      memberCharacterIds,
      session.state,
    ),
  };
}

export function subscribeToPartyGame(
  supabase: PartyGameSupabaseClient,
  sessionId: string,
  partyId: string,
  callbacks: PartyGameRealtimeCallbacks,
): () => void {
  let wasConnected = false;
  let disposed = false;
  callbacks.onConnectionChange("connecting");

  const notify = (source: PartyGameRealtimeSource) => {
    if (!disposed) callbacks.onChange(source);
  };

  const channel: RealtimeChannel = supabase
    .channel(`party-game:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "party_sessions", filter: `id=eq.${sessionId}` },
      () => notify("session"),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "party_events", filter: `session_id=eq.${sessionId}` },
      () => notify("event"),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "party_votes", filter: `session_id=eq.${sessionId}` },
      () => notify("vote"),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` },
      (payload) => {
        const previous = isRecord(payload.old) ? payload.old : {};
        const current = isRecord(payload.new) ? payload.new : {};
        if (
          payload.eventType !== "UPDATE" ||
          previous.left_at !== current.left_at ||
          previous.connection_state !== current.connection_state ||
          previous.role !== current.role
        ) {
          notify("member");
        }
      },
    )
    .subscribe((status) => {
      if (disposed) return;
      if (status === "SUBSCRIBED") {
        wasConnected = true;
        callbacks.onConnectionChange("connected");
        notify("session");
      } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
        callbacks.onConnectionChange(wasConnected ? "reconnecting" : "disconnected");
      } else if (status === "CLOSED") {
        callbacks.onConnectionChange("disconnected");
      }
    });

  return () => {
    if (disposed) return;
    disposed = true;
    void supabase.removeChannel(channel);
  };
}
