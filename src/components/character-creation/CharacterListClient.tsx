"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, MapPin, Plus, Shield, Swords } from "lucide-react";
import { motion } from "framer-motion";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { GameButton } from "@/components/ui/GameButton";

export type CharacterListEntry = {
  id: string;
  name: string;
  raceName: string;
  className: string;
  backgroundName: string;
  portraitKey: string;
  level: number;
  experience: number;
  currentHealth: number;
  maximumHealth: number;
  locationName: string;
  lastPlayed: string;
};

export function CharacterListClient({ characters, chooseMode }: { characters: CharacterListEntry[]; chooseMode: boolean }) {
  const router = useRouter();
  return (
    <main id="main-content" className="min-h-dvh bg-[radial-gradient(circle_at_top,#18303b_0,transparent_30rem),#08090b] px-4 py-7 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><button className="mb-3 flex items-center gap-2 text-sm text-[#a89f91] hover:text-[#f0cf82]" onClick={() => router.push("/menu")}><ArrowRight className="size-4" />חזרה לתפריט</button><p className="text-xs font-bold tracking-[0.22em] text-[#62c6df]">גיבורים בארצות ואלדר</p><h1 className="display-font text-5xl text-[#f0cf82]">הדמויות שלי</h1>{chooseMode ? <p className="mt-2 text-[#b9ad9c]">בחרו דמות כדי להתחיל או להמשיך משחק יחיד.</p> : null}</div>
          <GameButton onClick={() => router.push("/characters/new")}><Plus className="size-5" aria-hidden="true" />יצירת דמות</GameButton>
        </header>

        {characters.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((character, index) => (
              <motion.article key={character.id} className="stone-panel overflow-hidden" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <div className="relative aspect-[16/10] overflow-hidden bg-[#101318]">
                  <CharacterPortrait portraitKey={character.portraitKey} alt={`דיוקן הדמות ${character.name}`} sizes="(max-width: 640px) 100vw, 33vw" className="object-cover object-[center_30%]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-transparent" />
                  <span className="absolute bottom-3 end-3 border border-[#c6a15b]/50 bg-black/70 px-3 py-1 text-sm text-[#f0cf82]">דרגה <bdi className="ltr-isolate">{character.level}</bdi></span>
                </div>
                <div className="p-5">
                  <h2 className="display-font text-3xl text-[#f0cf82]">{character.name}</h2>
                  <p className="text-sm text-[#b9ad9c]">{character.raceName} · {character.className}</p>
                  <p className="mt-1 text-xs text-[#8f877a]">{character.backgroundName}</p>
                  <dl className="my-4 space-y-2 border-y border-white/8 py-3 text-sm text-[#b9ad9c]">
                    <div className="flex items-center gap-2"><MapPin className="size-4 text-[#62c6df]" /><dt className="sr-only">מיקום</dt><dd>{character.locationName}</dd></div>
                    <div className="flex items-center gap-2"><Clock3 className="size-4 text-[#c6a15b]" /><dt className="sr-only">שוחק לאחרונה</dt><dd>{character.lastPlayed}</dd></div>
                    <div className="flex items-center gap-2"><Shield className="size-4 text-[#d05b54]" /><dt>חיים:</dt><dd><bdi className="ltr-isolate">{character.currentHealth}/{character.maximumHealth}</bdi></dd></div>
                  </dl>
                  <GameButton className="w-full" onClick={() => router.push(`/game/${character.id}`)}><Swords className="size-5" aria-hidden="true" />{chooseMode ? "בחירת הדמות" : "המשך המסע"}</GameButton>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <section className="stone-panel grid min-h-80 place-items-center p-8 text-center"><div><Shield className="mx-auto mb-4 size-12 text-[#c6a15b]" /><h2 className="display-font text-3xl">עוד אין גיבור שיישא את הכתר</h2><p className="mt-2 text-[#a89f91]">יצירת הדמות אורכת כמה דקות ונשמרת בענן.</p><GameButton className="mt-6" onClick={() => router.push("/characters/new")}>יצירת הדמות הראשונה</GameButton></div></section>
        )}
      </div>
    </main>
  );
}
