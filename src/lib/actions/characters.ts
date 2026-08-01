"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { characterDraftSchema, type CharacterDraftInput } from "@/lib/validation/character";
import { isSupabaseConfigured } from "@/lib/env";

type CharacterActionResult = { ok: true; characterId: string } | { ok: false; message: string; fields?: Record<string, string> };

export async function createCharacterAction(input: CharacterDraftInput, commandId: string): Promise<CharacterActionResult> {
  const parsed = characterDraftSchema.safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).flatMap(([key, messages]) => messages?.[0] ? [[key, messages[0]]] : []));
    return { ok: false, message: "יש לתקן את הבחירות המסומנות.", fields };
  }
  if (!isSupabaseConfigured()) return { ok: false, message: "שירות שמירת הדמויות טרם חובר לענן." };
  try {
    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, message: "החיבור לחשבון פג. יש להתחבר מחדש." };
    const { data, error } = await supabase.rpc("create_character", {
      p_name: parsed.data.name,
      p_race_id: parsed.data.raceId,
      p_class_id: parsed.data.classId,
      p_background_id: parsed.data.backgroundId,
      p_portrait_key: parsed.data.portraitKey,
      p_attributes: parsed.data.attributes,
      p_description: parsed.data.description || null,
      p_form_of_address: parsed.data.formOfAddress || null,
      p_command_id: commandId,
    });
    if (error) {
      const message = error.message.includes("POINT_BUY") ? "תקציב התכונות אינו תקין." : error.message.includes("INVALID_") ? "אחת מבחירות הדמות אינה תקינה." : "לא הצלחנו לשמור את הדמות. אפשר לנסות שוב.";
      return { ok: false, message };
    }
    const result = data as { character_id?: string } | null;
    if (!result?.character_id) return { ok: false, message: "הדמות נשמרה ללא מזהה תקין. נסו שוב." };
    revalidatePath("/characters");
    revalidatePath("/menu");
    return { ok: true, characterId: result.character_id };
  } catch {
    return { ok: false, message: "לא הצלחנו להגיע לשרת השמירה. בדקו את החיבור ונסו שוב." };
  }
}
