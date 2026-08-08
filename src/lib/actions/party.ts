"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { mapPartyError } from "@/lib/party/errors";
import type { PartyActionFailure, PartyActionResult } from "@/lib/party/types";
import {
  connectionInputSchema,
  createPartyInputSchema,
  joinPartyInputSchema,
  partyCharacterInputSchema,
  partyIdInputSchema,
  partyMembershipRecoveryInputSchema,
  readyPartyInputSchema,
  transferLeadershipInputSchema,
  type ConnectionInput,
  type CreatePartyInput,
  type JoinPartyInput,
  type PartyCharacterInput,
  type PartyIdInput,
  type PartyMembershipRecoveryInput,
  type ReadyPartyInput,
  type TransferLeadershipInput,
} from "@/lib/party/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

type GameSupabaseClient = SupabaseClient<Database>;
type ActionContext = { ok: true; supabase: GameSupabaseClient } | PartyActionFailure;

function invalidInput(message = "יש לבדוק את הפרטים ולנסות שוב."): PartyActionFailure {
  return { ok: false, code: "INVALID_INPUT", message };
}

async function createActionContext(): Promise<ActionContext> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      code: "CONNECTION_FAILED",
      message: "שירות החבורות טרם חובר לשרת המשחק.",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return { ok: false, code: "AUTH_REQUIRED", message: "החיבור לחשבון פג. יש להתחבר מחדש." };
    }
    return { ok: true, supabase };
  } catch (error) {
    return mapPartyError(error);
  }
}

function asJsonObject(value: Json | null): Record<string, Json | undefined> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : null;
}

function readJsonString(value: Json | null, key: string): string | null {
  const candidate = asJsonObject(value)?.[key];
  return typeof candidate === "string" ? candidate : null;
}

function readJsonBoolean(value: Json | null, key: string): boolean {
  return asJsonObject(value)?.[key] === true;
}

function refreshPartyPages() {
  revalidatePath("/party");
  revalidatePath("/menu");
}

export async function createPartyAction(
  input: CreatePartyInput,
): Promise<PartyActionResult<{ partyId: string; roomCode: string }>> {
  const parsed = createPartyInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message);
  const context = await createActionContext();
  if (!context.ok) return context;

  try {
    const { data, error } = await context.supabase.rpc("create_party", {
      p_leader_character_id: parsed.data.characterId,
      p_name: parsed.data.name,
      p_maximum_members: parsed.data.maximumMembers,
    });
    if (error) return mapPartyError(error);
    const party = data?.[0];
    if (!party) return mapPartyError("PARTY_NOT_FOUND");
    refreshPartyPages();
    return { ok: true, data: { partyId: party.party_id, roomCode: party.room_code } };
  } catch (error) {
    return mapPartyError(error);
  }
}

export async function joinPartyAction(
  input: JoinPartyInput,
): Promise<PartyActionResult<{ partyId: string }>> {
  const parsed = joinPartyInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message);
  const context = await createActionContext();
  if (!context.ok) return context;

  try {
    const { data, error } = await context.supabase.rpc("join_party_by_code", {
      p_character_id: parsed.data.characterId,
      p_room_code: parsed.data.roomCode,
    });
    if (error) return mapPartyError(error);
    const partyId = readJsonString(data, "party_id");
    if (!partyId) return mapPartyError("PARTY_NOT_FOUND");
    refreshPartyPages();
    return { ok: true, data: { partyId } };
  } catch (error) {
    return mapPartyError(error);
  }
}

export async function setPartyReadyAction(
  input: ReadyPartyInput,
): Promise<PartyActionResult<{ ready: boolean }>> {
  const parsed = readyPartyInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message);
  const context = await createActionContext();
  if (!context.ok) return context;

  try {
    const { error } = await context.supabase.rpc("set_party_ready", {
      p_party_id: parsed.data.partyId,
      p_character_id: parsed.data.characterId,
      p_ready: parsed.data.ready,
    });
    if (error) return mapPartyError(error);
    revalidatePath("/party");
    return { ok: true, data: { ready: parsed.data.ready } };
  } catch (error) {
    return mapPartyError(error);
  }
}

export async function startPartySessionAction(
  input: PartyIdInput,
): Promise<PartyActionResult<{ sessionId: string; version: number }>> {
  const parsed = partyIdInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message);
  const context = await createActionContext();
  if (!context.ok) return context;

  try {
    const { data, error } = await context.supabase.rpc("start_party_session", {
      p_party_id: parsed.data.partyId,
      p_chapter_id: "shadows-beneath-mistvale",
    });
    if (error) return mapPartyError(error);
    const sessionId = readJsonString(data, "session_id");
    const versionValue = asJsonObject(data)?.version;
    const version = typeof versionValue === "number" ? versionValue : 1;
    if (!sessionId) return mapPartyError("SESSION_NOT_FOUND");
    refreshPartyPages();
    return { ok: true, data: { sessionId, version } };
  } catch (error) {
    return mapPartyError(error);
  }
}

export async function leavePartyAction(
  input: PartyCharacterInput,
): Promise<PartyActionResult<{ left: true }>> {
  const parsed = partyCharacterInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message);
  const context = await createActionContext();
  if (!context.ok) return context;

  try {
    const { error } = await context.supabase.rpc("leave_party", {
      p_party_id: parsed.data.partyId,
      p_character_id: parsed.data.characterId,
    });
    if (error) return mapPartyError(error);
    refreshPartyPages();
    return { ok: true, data: { left: true } };
  } catch (error) {
    return mapPartyError(error);
  }
}

export async function recoverPartyMembershipAction(
  input: PartyMembershipRecoveryInput,
): Promise<PartyActionResult<{
  partyId: string | null;
  released: boolean;
  recovered: boolean;
}>> {
  const parsed = partyMembershipRecoveryInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message);
  const context = await createActionContext();
  if (!context.ok) return context;

  try {
    const { data, error } = await context.supabase.rpc("recover_party_membership", {
      p_character_id: parsed.data.characterId,
    });
    if (error) return mapPartyError(error);
    const partyId = readJsonString(data, "party_id");
    refreshPartyPages();
    return {
      ok: true,
      data: {
        partyId,
        released: readJsonBoolean(data, "released"),
        recovered: readJsonBoolean(data, "recovered"),
      },
    };
  } catch (error) {
    return mapPartyError(error);
  }
}

export async function removePartyMemberAction(
  input: PartyCharacterInput,
): Promise<PartyActionResult<{ removed: true }>> {
  const parsed = partyCharacterInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message);
  const context = await createActionContext();
  if (!context.ok) return context;

  try {
    const { error } = await context.supabase.rpc("remove_party_member", {
      p_party_id: parsed.data.partyId,
      p_character_id: parsed.data.characterId,
    });
    if (error) return mapPartyError(error);
    revalidatePath("/party");
    return { ok: true, data: { removed: true } };
  } catch (error) {
    return mapPartyError(error);
  }
}

export async function transferPartyLeadershipAction(
  input: TransferLeadershipInput,
): Promise<PartyActionResult<{ leaderCharacterId: string }>> {
  const parsed = transferLeadershipInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message);
  const context = await createActionContext();
  if (!context.ok) return context;

  try {
    const { error } = await context.supabase.rpc("transfer_party_leadership", {
      p_party_id: parsed.data.partyId,
      p_new_leader_character_id: parsed.data.newLeaderCharacterId,
    });
    if (error) return mapPartyError(error);
    revalidatePath("/party");
    return { ok: true, data: { leaderCharacterId: parsed.data.newLeaderCharacterId } };
  } catch (error) {
    return mapPartyError(error);
  }
}

export async function closePartyAction(
  input: PartyIdInput,
): Promise<PartyActionResult<{ closed: true }>> {
  const parsed = partyIdInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message);
  const context = await createActionContext();
  if (!context.ok) return context;

  try {
    const { error } = await context.supabase.rpc("close_party", {
      p_party_id: parsed.data.partyId,
    });
    if (error) return mapPartyError(error);
    refreshPartyPages();
    return { ok: true, data: { closed: true } };
  } catch (error) {
    return mapPartyError(error);
  }
}

export async function updatePartyConnectionAction(
  input: ConnectionInput,
): Promise<PartyActionResult<{ updated: true }>> {
  const parsed = connectionInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message);
  const context = await createActionContext();
  if (!context.ok) return context;

  try {
    const { error } = await context.supabase.rpc("update_party_connection", {
      p_party_id: parsed.data.partyId,
      p_character_id: parsed.data.characterId,
      p_connection_state: parsed.data.connectionState,
    });
    if (error) return mapPartyError(error);
    return { ok: true, data: { updated: true } };
  } catch (error) {
    return mapPartyError(error);
  }
}
