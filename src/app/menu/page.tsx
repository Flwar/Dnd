import type { Metadata } from "next";
import { MainMenuClient, type CharacterSummary } from "@/components/menu/MainMenuClient";
import { requireUser } from "@/lib/auth/require-user";
import { formatRelativeTime } from "@/lib/formatting/hebrew";
import { classesById } from "@/content/classes";
import { locationsById } from "@/content/locations";
import type { ClassId } from "@/types/game";

export const metadata: Metadata = { title: "התפריט הראשי" };

export default async function MenuPage() {
  const { supabase, user } = await requireUser("/menu");
  console.info("[menu] data query started");
  const [profileResult, characterResult] = await Promise.all([
    supabase.from("profiles").select("display_name,account_title,is_king,account_role").eq("id", user.id).maybeSingle(),
    supabase.from("characters").select("id,name,class_id,portrait_key,level,current_location_id,chapter_id,last_played_at").eq("is_active", true).order("last_played_at", { ascending: false }),
  ]);

  if (profileResult.error || characterResult.error) {
    console.error("[menu] data query failed", {
      profileCode: profileResult.error?.code ?? null,
      characterCode: characterResult.error?.code ?? null,
    });
    throw new Error("MENU_DATA_UNAVAILABLE");
  }

  const rows = characterResult.data ?? [];
  const characters: CharacterSummary[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    level: row.level,
    className: classesById[row.class_id as ClassId]?.name ?? "הרפתקן",
    portraitPath: row.portrait_key,
    currentLocation: locationsById[row.current_location_id]?.name ?? "דרך לא נודעת",
    chapterName: "הצללים שמתחת לערפלון",
    lastPlayedAt: formatRelativeTime(row.last_played_at),
  }));
  const fallbackName = (user.user_metadata.display_name as string | undefined) ?? user.email?.split("@")[0] ?? "נודד";
  const isKing = profileResult.data?.account_role === "administrator" && profileResult.data.is_king === true;
  console.info("[menu] ready", {
    characterCount: characters.length,
  });
  return <MainMenuClient displayName={profileResult.data?.display_name ?? fallbackName} characters={characters} accountTitle={profileResult.data?.account_title ?? null} isKing={isKing} />;
}
