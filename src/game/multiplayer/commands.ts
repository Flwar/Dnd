import type {
  CharacterId,
  CommandValidationResult,
  Party,
  PartyCommand,
  PartyMember,
  PartySession,
  UserId,
} from "../../types/game";

export interface CommandValidationContext {
  actorUserId: UserId;
  party: Party;
  session: PartySession;
  members: readonly PartyMember[];
  ownedCharacterIds: readonly CharacterId[];
  validLocationIds?: ReadonlySet<string>;
  validEncounterIds?: ReadonlySet<string>;
  validSceneIds?: ReadonlySet<string>;
  allRequiredMembersReady?: boolean;
}

function invalid(code: Exclude<CommandValidationResult, { ok: true }>["code"], message: string): CommandValidationResult {
  return { ok: false, code, message };
}

function hasEmptyStringPayload(command: PartyCommand): boolean {
  return Object.values(command.payload).some((value) => typeof value === "string" && value.trim().length === 0);
}

export function validatePartyCommand(
  command: PartyCommand,
  context: CommandValidationContext,
): CommandValidationResult {
  if (command.sessionId !== context.session.id) {
    return invalid("SESSION_NOT_FOUND", "הפעולה אינה שייכת למפגש הפעיל.");
  }
  if (context.session.processedCommandIds.includes(command.commandId)) {
    return invalid("DUPLICATE_COMMAND", "הפעולה כבר עובדה.");
  }
  if (!context.ownedCharacterIds.includes(command.characterId)) {
    return invalid("NOT_OWNER", "אין לך הרשאה לפעול בשם הדמות הזאת.");
  }
  const member = context.members.find((candidate) => candidate.characterId === command.characterId);
  if (command.type !== "JOIN_PARTY" && (!member || member.userId !== context.actorUserId)) {
    return invalid("NOT_A_MEMBER", "הדמות אינה חברה בחבורה הזאת.");
  }
  if (command.expectedVersion !== context.session.version) {
    return invalid("VERSION_CONFLICT", "מצב החבורה השתנה. מרעננים את המידע לפני ניסיון נוסף.");
  }
  if (!Number.isFinite(Date.parse(command.timestamp)) || hasEmptyStringPayload(command)) {
    return invalid("INVALID_PAYLOAD", "פרטי הפעולה אינם תקינים.");
  }

  const isLeader = context.party.leaderCharacterId === command.characterId;
  switch (command.type) {
    case "JOIN_PARTY":
      if (context.party.status !== "lobby") return invalid("INVALID_PHASE", "אי אפשר להצטרף אחרי תחילת המסע.");
      if (command.payload.roomCode !== context.party.roomCode) return invalid("INVALID_PAYLOAD", "קוד החדר אינו תקין.");
      if (member) return invalid("PRECONDITION_FAILED", "הדמות כבר חברה בחבורה הזאת.");
      if (context.members.length >= context.party.maximumMembers) return invalid("PRECONDITION_FAILED", "החבורה כבר מלאה.");
      break;
    case "LEAVE_PARTY":
      if (context.party.status === "closed") return invalid("INVALID_PHASE", "החבורה כבר נסגרה.");
      break;
    case "SET_READY":
      if (context.session.status !== "lobby") return invalid("INVALID_PHASE", "אפשר לשנות מוכנות רק בחדר ההמתנה.");
      break;
    case "START_SESSION":
      if (!isLeader) return invalid("NOT_LEADER", "רק מנהיג החבורה יכול להתחיל את הפרק.");
      if (context.session.status !== "lobby") return invalid("INVALID_PHASE", "המפגש כבר התחיל.");
      if (!context.allRequiredMembersReady) return invalid("PRECONDITION_FAILED", "כל חברי החבורה חייבים להיות מוכנים.");
      break;
    case "SUBMIT_DIALOGUE_VOTE":
      if (context.session.status !== "narrative") return invalid("INVALID_PHASE", "אין כעת הצבעה פעילה.");
      break;
    case "MOVE_TO_LOCATION":
      if (!isLeader) return invalid("NOT_LEADER", "רק מנהיג החבורה יכול לאשר מעבר משותף.");
      if (context.session.status !== "narrative") return invalid("INVALID_PHASE", "אי אפשר לעבור מיקום כעת.");
      if (context.validLocationIds && !context.validLocationIds.has(command.payload.locationId)) {
        return invalid("INVALID_PAYLOAD", "המיקום המבוקש אינו זמין.");
      }
      break;
    case "BEGIN_ENCOUNTER":
      if (!isLeader) return invalid("NOT_LEADER", "רק מנהיג החבורה יכול להתחיל עימות.");
      if (context.session.status !== "narrative") return invalid("INVALID_PHASE", "אי אפשר להתחיל עימות כעת.");
      if (context.validEncounterIds && !context.validEncounterIds.has(command.payload.encounterId)) {
        return invalid("INVALID_PAYLOAD", "העימות המבוקש אינו זמין.");
      }
      break;
    case "SUBMIT_COMBAT_ACTION":
      if (context.session.status !== "combat") return invalid("INVALID_PHASE", "אין קרב פעיל.");
      if (context.session.currentTurnCharacterId !== command.characterId) {
        return invalid("OUT_OF_TURN", "אפשר לפעול רק בתורך.");
      }
      break;
    case "USE_ITEM":
      if (command.payload.targetCharacterId !== command.characterId && context.session.status !== "combat") {
        return invalid("PRECONDITION_FAILED", "אי אפשר להשתמש בפריט על דמות אחרת מחוץ לקרב.");
      }
      break;
    case "CLAIM_LOOT":
      if (context.session.status !== "narrative" && context.session.status !== "combat") {
        return invalid("INVALID_PHASE", "אין כעת שלל שניתן לבחור.");
      }
      break;
    case "COMPLETE_SCENE":
      if (!isLeader) return invalid("NOT_LEADER", "רק מנהיג החבורה יכול לסיים סצנה משותפת.");
      if (context.session.status !== "narrative") return invalid("INVALID_PHASE", "אי אפשר לסיים את הסצנה כעת.");
      if (context.validSceneIds && !context.validSceneIds.has(command.payload.sceneId)) {
        return invalid("INVALID_PAYLOAD", "הסצנה המבוקשת אינה תקינה.");
      }
      break;
  }
  return { ok: true };
}

export function recordAcceptedCommand(session: PartySession, command: PartyCommand): PartySession {
  if (session.processedCommandIds.includes(command.commandId)) return session;
  return {
    ...session,
    version: session.version + 1,
    processedCommandIds: [...session.processedCommandIds, command.commandId],
    lastSequenceNumber: session.lastSequenceNumber + 1,
  };
}

export function chooseDialogueVote(
  votes: Readonly<Record<string, string>>,
  leaderCharacterId: CharacterId,
): string | null {
  const counts = new Map<string, number>();
  for (const choiceId of Object.values(votes)) counts.set(choiceId, (counts.get(choiceId) ?? 0) + 1);
  if (counts.size === 0) return null;
  const highest = Math.max(...counts.values());
  const tied = [...counts.entries()].filter(([, count]) => count === highest).map(([choiceId]) => choiceId).sort();
  if (tied.length === 1) return tied[0];
  const leaderVote = votes[leaderCharacterId];
  return leaderVote && tied.includes(leaderVote) ? leaderVote : tied[0];
}

export function roomCodeIsValid(roomCode: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(roomCode);
}
