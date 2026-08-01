import { notFound } from "next/navigation";
import { GameClient } from "@/components/game/GameClient";
import { loadCharacterGame } from "@/lib/game/load-character";

export const dynamic = "force-dynamic";

export default async function CharacterGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ characterId: string }>;
  searchParams: Promise<{ partySession?: string }>;
}) {
  const [{ characterId }, query] = await Promise.all([params, searchParams]);
  const loaded = await loadCharacterGame(characterId);
  if (!loaded) notFound();
  return <GameClient initialSave={loaded.save} expectedSaveVersion={loaded.expectedSaveVersion} partySessionId={query.partySession} />;
}
