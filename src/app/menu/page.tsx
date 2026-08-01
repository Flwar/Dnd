import type { Metadata } from "next";
import { MainMenuClient, type CharacterSummary } from "@/components/menu/MainMenuClient";
import { requireUser } from "@/lib/auth/require-user";
import { formatRelativeTime } from "@/lib/formatting/hebrew";
import { classesById } from "@/content/classes";
import { locationsById } from "@/content/locations";
import { validateAndMigrateSave } from "@/game/persistence";
import { unwrapCloudSaveEnvelope } from "@/lib/game/save-envelope";
import type { ClassId } from "@/types/game";

export const metadata: Metadata = { title: "התפריט הראשי" };

export default async function MenuPage() {
  const { supabase, user } = await requireUser("/menu");
  const [profileResult, characterResult] = await Promise.all([
    supabase.from("profiles").select("display_name,account_title,is_king,account_role").eq("id", user.id).maybeSingle(),
    supabase.from("characters").select("id,name,class_id,portrait_key,level,current_location_id,chapter_id,last_played_at").eq("is_active", true).order("last_played_at", { ascending: false }),
  ]);
  const rows = characterResult.data ?? [];
  const latestSaves = await Promise.all(rows.map((row) => supabase.rpc("get_latest_character_save", { p_character_id: row.id })));
  const characters: CharacterSummary[] = rows.map((row, index) => {
    const latest = latestSaves[index].data?.[0];
    const validated = latest ? validateAndMigrateSave(unwrapCloudSaveEnvelope(latest.snapshot)) : null;
    const saved = validated?.ok ? validated.data : null;
    return {
      id: row.id,
      name: saved?.character.name ?? row.name,
      level: saved?.character.level ?? row.level,
      className: classesById[(saved?.character.classId ?? row.class_id) as ClassId]?.name ?? "הרפתקן",
      portraitPath: saved?.character.portraitKey ?? row.portrait_key,
      currentLocation: locationsById[saved?.story.currentLocationId ?? row.current_location_id]?.name ?? "דרך לא נודעת",
      chapterName: "הצללים שמתחת לערפלון",
      lastPlayedAt: formatRelativeTime(saved?.character.lastPlayedAt ?? row.last_played_at),
    };
  });
  const fallbackName = (user.user_metadata.display_name as string | undefined) ?? user.email?.split("@")[0] ?? "נודד";
  const isKing = profileResult.data?.account_role === "administrator" && profileResult.data.is_king === true;
  return <MainMenuClient displayName={profileResult.data?.display_name ?? fallbackName} characters={characters} accountTitle={profileResult.data?.account_title ?? null} isKing={isKing} />;
}
