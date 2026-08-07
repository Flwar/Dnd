import type { Metadata } from "next";
import { CharacterListClient, type CharacterListEntry } from "@/components/character-creation/CharacterListClient";
import { requireUser } from "@/lib/auth/require-user";
import { formatRelativeTime } from "@/lib/formatting/hebrew";
import { racesById } from "@/content/races";
import { classesById } from "@/content/classes";
import { backgroundsById } from "@/content/backgrounds";
import { locationsById } from "@/content/locations";
import type { BackgroundId, ClassId, RaceId } from "@/types/game";

export const metadata: Metadata = { title: "הדמויות שלי" };

export default async function CharactersPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { supabase } = await requireUser("/characters");
  const { data, error } = await supabase.from("characters").select("id,name,race_id,class_id,background_id,portrait_key,level,experience,current_health,maximum_health,current_location_id,last_played_at").eq("is_active", true).order("last_played_at", { ascending: false });
  if (error) {
    console.error("[characters] data query failed", { code: error.code });
    throw new Error("CHARACTER_LIST_UNAVAILABLE");
  }
  const rows = data ?? [];
  const characters: CharacterListEntry[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    raceName: racesById[row.race_id as RaceId]?.name ?? "נודד",
    className: classesById[row.class_id as ClassId]?.name ?? "הרפתקן",
    backgroundName: backgroundsById[row.background_id as BackgroundId]?.name ?? "עבר לא ידוע",
    portraitKey: row.portrait_key,
    level: row.level,
    experience: row.experience,
    currentHealth: row.current_health,
    maximumHealth: row.maximum_health,
    locationName: locationsById[row.current_location_id]?.name ?? "דרך לא נודעת",
    lastPlayed: formatRelativeTime(row.last_played_at),
  }));
  const query = await searchParams;
  return <CharacterListClient characters={characters} chooseMode={query.mode === "single"} />;
}
