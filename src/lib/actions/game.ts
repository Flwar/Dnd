"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { saveDataV2Schema } from "@/game/persistence";
import { cloudSaveReason, createCloudSaveEnvelope } from "@/lib/game/save-envelope";
import { unwrapCloudSaveEnvelope } from "@/lib/game/save-envelope";
import type { Json } from "@/types/database";
import type { SaveData } from "@/types/game";

export type SaveActionResult =
  | { ok: true; saveVersion: number; snapshotId?: string }
  | { ok: false; code: "validation" | "session" | "conflict" | "network"; message: string };

export async function saveGameAction(input: SaveData, expectedSaveVersion: number, reason: string, commandId: string): Promise<SaveActionResult> {
  const parsed = saveDataV2Schema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "validation", message: "השמירה אינה תקינה ולכן לא נשלחה לענן." };
  if (!isSupabaseConfigured()) return { ok: false, code: "network", message: "שירות השמירה בענן אינו מחובר." };
  try {
    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || auth.user.id !== parsed.data.character.ownerId) return { ok: false, code: "session", message: "החיבור לחשבון פג. יש להתחבר מחדש." };
    const { data, error } = await supabase.rpc("save_character_snapshot", {
      p_command_id: commandId,
      p_character_id: parsed.data.character.id,
      p_expected_save_version: expectedSaveVersion,
      p_snapshot: createCloudSaveEnvelope(parsed.data as SaveData) as unknown as Json,
      p_save_reason: cloudSaveReason(reason),
    });
    if (error) {
      if (error.message.includes("VERSION") || error.message.includes("CONFLICT")) return { ok: false, code: "conflict", message: "נמצאה שמירה חדשה יותר בענן. טוענים אותה לפני המשך המשחק." };
      return { ok: false, code: "network", message: "לא הצלחנו לשמור בענן. ננסה שוב בפעולה הבאה." };
    }
    const result = data as { save_version?: number; snapshot_id?: string } | null;
    revalidatePath(`/game/${parsed.data.character.id}`);
    revalidatePath("/menu");
    return { ok: true, saveVersion: result?.save_version ?? expectedSaveVersion + 1, snapshotId: result?.snapshot_id };
  } catch {
    return { ok: false, code: "network", message: "החיבור לענן נותק. עותק זמני נשמר במכשיר." };
  }
}

export async function completeChapterAction(characterId: string, idempotencyKey: string) {
  if (!isSupabaseConfigured()) return { ok: false, message: "שירות הפרסים אינו מחובר." } as const;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, message: "החיבור לחשבון פג." } as const;
    const { data: ownedCharacter } = await supabase
      .from("characters")
      .select("id")
      .eq("id", characterId)
      .eq("owner_id", auth.user.id)
      .maybeSingle();
    if (!ownedCharacter) return { ok: false, message: "הדמות אינה שייכת לחשבון המחובר." } as const;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return { ok: false, message: "מזהה השלמת הפרק אינו תקין." } as const;
    }
    const { data: latestSave, error: latestSaveError } = await supabase
      .from("save_snapshots")
      .select("snapshot, save_reason")
      .eq("character_id", characterId)
      .order("save_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const verifiedSave = saveDataV2Schema.safeParse(unwrapCloudSaveEnvelope(latestSave?.snapshot));
    if (
      latestSaveError ||
      latestSave?.save_reason !== "chapter_complete" ||
      !verifiedSave.success ||
      verifiedSave.data.character.chapterId !== "shadows-beneath-mistvale" ||
      verifiedSave.data.story.currentSceneId !== "scene-chapter-completion" ||
      verifiedSave.data.story.flags.guardian_defeated !== true ||
      verifiedSave.data.story.flags.vision_seen !== true ||
      verifiedSave.data.story.flags.chapter_one_completed !== true
    ) {
      return { ok: false, message: "שמירת הפרק עדיין לא כוללת הוכחת השלמה תקינה." } as const;
    }
    const summary = {
      miner_rescued: verifiedSave.data.story.flags.danor_rescued === true,
      secret_found: verifiedSave.data.story.flags.hidden_chamber_open === true,
      answered_voice: verifiedSave.data.story.flags.answered_fog_voice === true,
      playtime_seconds: verifiedSave.data.playtimeSeconds,
    } satisfies Json;
    const trusted = (() => {
      try {
        return createServiceRoleSupabaseClient();
      } catch {
        return null;
      }
    })();
    if (!trusted) return { ok: false, message: "שרת התגמולים טרם הוגדר. ההשלמה נשמרה ותישלח לאחר חיבור המפתח המאובטח." } as const;
    const { error } = await trusted.rpc("complete_character_chapter", {
      p_idempotency_key: idempotencyKey,
      p_character_id: characterId,
      p_chapter_id: "shadows-beneath-mistvale",
      p_reward_key: "opening.chapter_complete",
      p_completion_summary: summary,
    });
    if (error) return { ok: false, message: "הפרק הושלם, אך הפרס טרם נשמר. ננסה שוב ללא כפל פרסים." } as const;
    revalidatePath("/menu");
    return { ok: true } as const;
  } catch {
    return { ok: false, message: "החיבור נותק לפני שמירת פרס הפרק." } as const;
  }
}
