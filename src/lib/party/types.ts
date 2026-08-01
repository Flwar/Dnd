export type PartyConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export type PartyActionErrorCode =
  | "AUTH_REQUIRED"
  | "CONNECTION_FAILED"
  | "INVALID_INPUT"
  | "CHARACTER_NOT_OWNED"
  | "CHARACTER_ALREADY_IN_PARTY"
  | "PARTY_NOT_FOUND"
  | "PARTY_NOT_OPEN"
  | "PARTY_FULL"
  | "NOT_A_PARTY_MEMBER"
  | "LEADER_REQUIRED"
  | "PARTY_NOT_READY"
  | "PARTY_REQUIRES_TWO_MEMBERS"
  | "TRANSFER_LEADERSHIP_REQUIRED"
  | "INVALID_MEMBER"
  | "SESSION_CONFLICT"
  | "UNKNOWN";

export type PartyActionFailure = {
  ok: false;
  code: PartyActionErrorCode;
  message: string;
};

export type PartyActionResult<T> = { ok: true; data: T } | PartyActionFailure;

export type PartyCharacterOption = {
  id: string;
  name: string;
  classId: string;
  className: string;
  portraitKey: string;
  level: number;
  currentHealth: number;
  maximumHealth: number;
};

export type PartyRosterMember = {
  characterId: string;
  displayName: string;
  characterName: string;
  portraitKey: string;
  classId: string;
  level: number;
  currentHealth: number;
  maximumHealth: number;
  role: "leader" | "member";
  ready: boolean;
  connectionState: "connected" | "reconnecting" | "disconnected";
  lastSeenAt: string;
};

export type PartySessionSummary = {
  id: string;
  chapterId: string;
  currentSceneId: string;
  status: "forming" | "active" | "completed" | "abandoned";
  version: number;
};

export type PartyLobbySnapshot = {
  party: {
    id: string;
    name: string;
    roomCode: string;
    leaderCharacterId: string;
    status: "open" | "active" | "closed";
    maximumMembers: number;
    updatedAt: string;
  };
  members: PartyRosterMember[];
  session: PartySessionSummary | null;
};

export type ActivePartyMembership = {
  partyId: string;
  characterId: string;
  role: "leader" | "member";
};
