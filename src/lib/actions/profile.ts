"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CHARACTER_PORTRAIT_BUCKET, parseCustomPortraitKey } from "@/lib/portrait-upload";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const profileAvatarKeys = ["portrait-human-01", "portrait-elf-01", "portrait-dwarf-01", "portrait-halfling-01", "portrait-orc-01", "portrait-dragonborn-01"] as const;
const profileSchema = z.object({
  displayName: z.string().trim().min(2, "שם התצוגה חייב להכיל לפחות שני תווים.").max(32, "שם התצוגה ארוך מדי.").regex(/^[\p{L}\p{N} .,'’"־-]+$/u, "שם התצוגה כולל תווים שאינם נתמכים."),
  avatarKey: z.string().max(160, "מפתח תמונת הפרופיל ארוך מדי.").refine(
    (value) => profileAvatarKeys.includes(value as typeof profileAvatarKeys[number]) || parseCustomPortraitKey(value) !== null,
    "תמונת הפרופיל אינה תקינה.",
  ),
});

export type ProfileActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function updateProfileAction(input: z.input<typeof profileSchema>): Promise<ProfileActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "פרטי הפרופיל אינם תקינים." };
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, message: "החיבור לחשבון פג. יש להתחבר מחדש." };
    const customAvatar = parseCustomPortraitKey(parsed.data.avatarKey);
    if (customAvatar) {
      if (customAvatar.ownerId !== data.user.id) {
        return { ok: false, message: "אין הרשאה להשתמש בתמונת הפרופיל הזאת." };
      }
      const objectName = `${customAvatar.objectId}.${customAvatar.extension}`;
      const { data: objects, error: storageError } = await supabase.storage
        .from(CHARACTER_PORTRAIT_BUCKET)
        .list(customAvatar.ownerId, { limit: 2, search: objectName });
      if (storageError || !objects?.some((object) => object.name === objectName)) {
        return { ok: false, message: "תמונת הפרופיל לא נמצאה בענן. נסו להעלות אותה מחדש." };
      }
    }
    const { error } = await supabase.from("profiles").update({ display_name: parsed.data.displayName, avatar_key: parsed.data.avatarKey, last_active_at: new Date().toISOString() }).eq("id", data.user.id);
    if (error) return { ok: false, message: "לא הצלחנו לעדכן את הפרופיל. נסו שוב בעוד רגע." };
    revalidatePath("/menu");
    revalidatePath("/profile");
    return { ok: true, message: "הפרופיל עודכן ונשמר בענן." };
  } catch {
    return { ok: false, message: "החיבור נותק לפני שמירת הפרופיל." };
  }
}
