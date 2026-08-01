import type { Metadata } from "next";
import { CharacterListClient, type CharacterListEntry } from "@/components/character-creation/CharacterListClient";
import { requireUser } from "@/lib/auth/require-user";
import { formatRelativeTime } from "@/lib/formatting/hebrew";
import { racesById } from "@/content/races";
import { classesById } from "@/content/classes";
import { backgroundsById } from "@/content/backgrounds";
import { locationsById } from "@/content/locations";
import { validateAndMigrateSave } from "@/game/persistence";
import { unwrapCloudSaveEnvelope } from "@/lib/game/save-envelope";
import type { BackgroundId, ClassId, RaceId } from "@/types/game";

export const metadata: Metadata = { title: "הדמויות שלי" };

export default async function CharactersPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { supabase } = await requireUser("/characters");
  const { data } = await supabase.from("characters").select("id,name,race_id,class_id,background_id,portrait_key,level,experience,current_health,maximum_health,current_location_id,last_played_at").eq("is_active", true).order("last_played_at", { ascending: false });
  const rows = data ?? [];
  const latestSaves = await Promise.all(rows.map((row) => supabase.rpc("get_latest_character_save", { p_character_id: row.id })));
  const characters: CharacterListEntry[] = rows.map((row, index) => {
    const latest = latestSaves[index].data?.[0];
    const validated = latest ? validateAndMigrateSave(unwrapCloudSaveEnvelope(latest.snapshot)) : null;
    const saved = validated?.ok ? validated.data : null;
    return {
      id: row.id,
      name: saved?.character.name ?? row.name,
      raceName: racesById[(saved?.character.raceId ?? row.race_id) as RaceId]?.name ?? "נודד",
      className: classesById[(saved?.character.classId ?? row.class_id) as ClassId]?.name ?? "הרפתקן",
      backgroundName: backgroundsById[(saved?.character.backgroundId ?? row.background_id) as BackgroundId]?.name ?? "עבר לא ידוע",
      portraitKey: saved?.character.portraitKey ?? row.portrait_key,
      level: saved?.character.level ?? row.level,
      experience: saved?.character.experience ?? row.experience,
      currentHealth: saved?.character.currentHealth ?? row.current_health,
      maximumHealth: saved?.character.derivedStats.maximumHealth ?? row.maximum_health,
      locationName: locationsById[saved?.story.currentLocationId ?? row.current_location_id]?.name ?? "דרך לא נודעת",
      lastPlayed: formatRelativeTime(saved?.character.lastPlayedAt ?? row.last_played_at),
    };
  });
  const query = await searchParams;
  return <CharacterListClient characters={characters} chooseMode={query.mode === "single"} />;
}
