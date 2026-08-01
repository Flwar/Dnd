import type { Metadata } from "next";
import { PartyLobbyClient } from "@/components/party/PartyLobbyClient";
import { classesById } from "@/content/classes";
import { requireUser } from "@/lib/auth/require-user";
import { PartyQueryError } from "@/lib/party/errors";
import {
  fetchPartyLobbySnapshot,
  findActivePartyMembership,
  findFirstActivePartyMembership,
} from "@/lib/party/queries";
import type { PartyCharacterOption, PartyLobbySnapshot } from "@/lib/party/types";
import type { ClassId } from "@/types/game";

export const metadata: Metadata = {
  title: "החבורה המקוונת",
  description: "יצירה והצטרפות לחבורה מקוונת בהכתר המנופץ",
};

type PartyPageProps = {
  searchParams: Promise<{ character?: string }>;
};

export default async function PartyPage({ searchParams }: PartyPageProps) {
  const { supabase } = await requireUser("/party");
  const { data, error } = await supabase
    .from("characters")
    .select("id,name,class_id,portrait_key,level,current_health,maximum_health")
    .eq("is_active", true)
    .order("last_played_at", { ascending: false });

  if (error) throw new Error("לא הצלחנו לטעון את הדמויות עבור המשחק המקוון.");

  const characters: PartyCharacterOption[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    classId: row.class_id,
    className: classesById[row.class_id as ClassId]?.name ?? "הרפתקן",
    portraitKey: row.portrait_key,
    level: row.level,
    currentHealth: row.current_health,
    maximumHealth: row.maximum_health,
  }));

  const query = await searchParams;
  const requestedCharacter = characters.find((character) => character.id === query.character) ?? null;
  let selectedCharacterId = requestedCharacter?.id ?? characters[0]?.id ?? "";
  let initialSnapshot: PartyLobbySnapshot | null = null;
  let initialError: string | null = null;

  if (characters.length) {
    try {
      let membership = selectedCharacterId
        ? await findActivePartyMembership(supabase, selectedCharacterId)
        : null;
      if (!membership) {
        membership = await findFirstActivePartyMembership(
          supabase,
          characters.map((character) => character.id),
        );
      }
      if (membership) {
        selectedCharacterId = membership.characterId;
        initialSnapshot = await fetchPartyLobbySnapshot(supabase, membership.partyId);
      }
    } catch (queryError) {
      initialError = queryError instanceof PartyQueryError
        ? queryError.actionResult.message
        : "לא הצלחנו לשחזר את מצב החבורה הפעילה.";
    }
  }

  return (
    <PartyLobbyClient
      characters={characters}
      initialSelectedCharacterId={selectedCharacterId}
      initialSnapshot={initialSnapshot}
      initialError={initialError}
    />
  );
}
