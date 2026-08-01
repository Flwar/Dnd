import { describe, expect, it } from "vitest";
import {
  chooseDialogueVote,
  recordAcceptedCommand,
  roomCodeIsValid,
  validatePartyCommand,
} from "../../src/game/multiplayer";
import type {
  CharacterId,
  CommandId,
  Party,
  PartyCommand,
  PartyId,
  PartyMember,
  PartySession,
  SessionId,
  UserId,
} from "../../src/types/game";
import { now } from "./fixtures";

const leaderCharacterId = "leader-character" as CharacterId;
const memberCharacterId = "member-character" as CharacterId;
const joiningCharacterId = "joining-character" as CharacterId;
const leaderUserId = "leader-user" as UserId;
const memberUserId = "member-user" as UserId;
const joiningUserId = "joining-user" as UserId;
const sessionId = "session-one" as SessionId;

const party: Party = {
  id: "party-one" as PartyId,
  leaderCharacterId,
  roomCode: "K7M4Q2",
  name: "שומרי הערפל",
  status: "lobby",
  maximumMembers: 4,
  version: 3,
};

const members: PartyMember[] = [
  { characterId: leaderCharacterId, userId: leaderUserId, displayName: "מנהיגה", role: "leader", ready: true, connected: true, joinedAt: now },
  { characterId: memberCharacterId, userId: memberUserId, displayName: "חבר", role: "member", ready: false, connected: true, joinedAt: now },
];

function makeSession(overrides: Partial<PartySession> = {}): PartySession {
  return {
    id: sessionId,
    partyId: party.id,
    chapterId: "chapter-one-shadows-under-arfelon",
    currentSceneId: "scene-arrival",
    currentTurnCharacterId: null,
    status: "lobby",
    version: 7,
    lastSequenceNumber: 2,
    processedCommandIds: [],
    ...overrides,
  };
}

function readyCommand(overrides: Partial<PartyCommand<"SET_READY">> = {}): PartyCommand<"SET_READY"> {
  return {
    commandId: "command-ready" as CommandId,
    type: "SET_READY",
    sessionId,
    characterId: memberCharacterId,
    expectedVersion: 7,
    payload: { ready: true },
    timestamp: now,
    ...overrides,
  };
}

describe("אימות פקודות חבורה", () => {
  it("מקבל שינוי מוכנות חוקי", () => {
    const result = validatePartyCommand(readyCommand(), {
      actorUserId: memberUserId,
      party,
      session: makeSession(),
      members,
      ownedCharacterIds: [memberCharacterId],
    });
    expect(result).toEqual({ ok: true });
  });

  it("דוחה גרסת מצב ישנה", () => {
    const result = validatePartyCommand(readyCommand({ expectedVersion: 6 }), {
      actorUserId: memberUserId,
      party,
      session: makeSession(),
      members,
      ownedCharacterIds: [memberCharacterId],
    });
    expect(result).toMatchObject({ ok: false, code: "VERSION_CONFLICT" });
  });

  it("דוחה מזהה פקודה שכבר עובד", () => {
    const command = readyCommand();
    const result = validatePartyCommand(command, {
      actorUserId: memberUserId,
      party,
      session: makeSession({ processedCommandIds: [command.commandId] }),
      members,
      ownedCharacterIds: [memberCharacterId],
    });
    expect(result).toMatchObject({ ok: false, code: "DUPLICATE_COMMAND" });
  });

  it("דוחה פעולת קרב שלא בתור הדמות", () => {
    const command: PartyCommand<"SUBMIT_COMBAT_ACTION"> = {
      commandId: "combat-command" as CommandId,
      type: "SUBMIT_COMBAT_ACTION",
      sessionId,
      characterId: memberCharacterId,
      expectedVersion: 7,
      payload: { action: { kind: "defend" } },
      timestamp: now,
    };
    const result = validatePartyCommand(command, {
      actorUserId: memberUserId,
      party: { ...party, status: "active" },
      session: makeSession({ status: "combat", currentTurnCharacterId: leaderCharacterId }),
      members,
      ownedCharacterIds: [memberCharacterId],
    });
    expect(result).toMatchObject({ ok: false, code: "OUT_OF_TURN" });
  });

  it("דוחה התחלת מפגש על ידי מי שאינו מנהיג", () => {
    const command: PartyCommand<"START_SESSION"> = {
      commandId: "start-command" as CommandId,
      type: "START_SESSION",
      sessionId,
      characterId: memberCharacterId,
      expectedVersion: 7,
      payload: { chapterId: "chapter-one-shadows-under-arfelon" },
      timestamp: now,
    };
    const result = validatePartyCommand(command, {
      actorUserId: memberUserId,
      party,
      session: makeSession(),
      members,
      ownedCharacterIds: [memberCharacterId],
      allRequiredMembersReady: true,
    });
    expect(result).toMatchObject({ ok: false, code: "NOT_LEADER" });
  });

  it("מאפשר לדמות בבעלות המשתמש להצטרף בקוד חדר תקין", () => {
    const command: PartyCommand<"JOIN_PARTY"> = {
      commandId: "join-command" as CommandId,
      type: "JOIN_PARTY",
      sessionId,
      characterId: joiningCharacterId,
      expectedVersion: 7,
      payload: { roomCode: party.roomCode },
      timestamp: now,
    };
    const result = validatePartyCommand(command, {
      actorUserId: joiningUserId,
      party,
      session: makeSession(),
      members,
      ownedCharacterIds: [joiningCharacterId],
    });
    expect(result).toEqual({ ok: true });
  });

  it("רושם פקודה פעם אחת ומעלה גרסה ורצף", () => {
    const session = makeSession();
    const command = readyCommand();
    const next = recordAcceptedCommand(session, command);
    const duplicate = recordAcceptedCommand(next, command);
    expect(next.version).toBe(session.version + 1);
    expect(next.lastSequenceNumber).toBe(session.lastSequenceNumber + 1);
    expect(duplicate).toBe(next);
  });
});

describe("כללי חדר והצבעה", () => {
  it("מאמת קוד חדר חד־משמעי בן שישה תווים", () => {
    expect(roomCodeIsValid("K7M4Q2")).toBe(true);
    expect(roomCodeIsValid("O0I1AA")).toBe(false);
  });

  it("נותן למנהיג לשבור שוויון בהצבעה", () => {
    const result = chooseDialogueVote(
      {
        [leaderCharacterId]: "kind-choice",
        [memberCharacterId]: "direct-choice",
      },
      leaderCharacterId,
    );
    expect(result).toBe("kind-choice");
  });
});
