"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Crown, LogOut, Settings, Shield, Sparkles, Swords, UserRoundPlus, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { Atmosphere } from "@/components/shell/Atmosphere";
import { GameButton } from "@/components/ui/GameButton";
import { Modal } from "@/components/ui/Modal";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { OnlinePlayersPanel } from "@/components/menu/OnlinePlayersPanel";
import { ReleaseNotesPanel } from "@/components/menu/ReleaseNotesPanel";
import { releaseVersionLabel } from "@/content/releases";
import { signOutAction } from "@/lib/actions/auth";
import { audioManager } from "@/lib/audio/audio-manager";
import { getAssetPath } from "@/lib/assets/manifest";

export type CharacterSummary = {
  id: string;
  name: string;
  level: number;
  className: string;
  portraitPath: string;
  currentLocation: string;
  chapterName: string;
  lastPlayedAt: string;
};

export function MainMenuClient({
  displayName,
  characters,
  accountTitle = null,
  isKing = false,
}: {
  displayName: string;
  characters: CharacterSummary[];
  accountTitle?: string | null;
  isKing?: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"settings" | "about" | "release" | null>(null);
  const active = characters[0] ?? null;

  useEffect(() => {
    void audioManager.setAmbience("menu");
    return () => audioManager.stopAmbience("menu");
  }, []);

  const goSinglePlayer = () => router.push(characters.length ? "/characters?mode=single" : "/characters/new");

  return (
    <main id="main-content" className="screen-shell flex min-h-dvh items-center px-4 py-8 sm:px-8 lg:px-[7vw]" style={{ overflowY: "auto" }}>
      <Atmosphere image={getAssetPath("background-menu-cinematic")} priority />
      <motion.section className="relative z-10 w-full max-w-3xl" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
        <div className="mb-7">
          <button className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[#b9ad9c] hover:text-[#f0cf82]" onClick={() => router.push("/profile")}>
            <span>ברוכים השבים, {displayName}</span>
            {isKing ? <span className="inline-flex items-center gap-1 border border-[#f0cf82]/45 bg-[#c6a15b]/14 px-2 py-1 font-bold text-[#ffe6a0]"><Crown className="size-4" aria-hidden="true" />{accountTitle ?? "המלך"}</span> : null}
          </button>
          <div className="flex items-center gap-3"><Crown className={`size-8 ${isKing ? "text-[#f0cf82] drop-shadow-[0_0_10px_rgba(240,207,130,.45)]" : "text-[#62c6df]"}`} aria-hidden="true" /><h1 className="living-title display-font text-5xl text-[#f0cf82] sm:text-7xl">הכתר המנופץ</h1></div>
        </div>

        <OnlinePlayersPanel />

        {active ? (
          <button
            className="stone-panel group mb-6 grid w-full gap-4 p-5 text-start transition-transform hover:-translate-y-0.5 sm:grid-cols-[1fr_auto] sm:items-center"
            onClick={() => router.push(`/game/${active.id}`)}
          >
            <div>
              <p className="mb-1 text-xs font-bold tracking-[0.2em] text-[#62c6df]">המשך המסע</p>
              <h2 className="display-font text-3xl text-[#f0cf82]">{active.name}</h2>
              <p className="mt-1 text-sm text-[#b9ad9c]"><span>דרגה <bdi className="ltr-isolate">{active.level}</bdi></span><span aria-hidden="true"> · </span><span>{active.className}</span></p>
              <dl className="mt-4 grid gap-1 text-sm text-[#a89f91] sm:grid-cols-2">
                <div><dt className="inline text-[#d3cabb]">מיקום: </dt><dd className="inline">{active.currentLocation}</dd></div>
                <div><dt className="inline text-[#d3cabb]">פרק: </dt><dd className="inline">{active.chapterName}</dd></div>
                <div className="sm:col-span-2"><dt className="inline text-[#d3cabb]">שוחק לאחרונה: </dt><dd className="inline">{active.lastPlayedAt}</dd></div>
              </dl>
            </div>
            <div className="relative hidden size-24 overflow-hidden border border-[#c6a15b]/35 bg-black/30 sm:block">
              <CharacterPortrait portraitKey={active.portraitPath} alt={`דיוקן של ${active.name}`} sizes="96px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
            </div>
          </button>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <GameButton size="lg" className="justify-start" onClick={() => router.push("/characters/new")}><UserRoundPlus className="size-6" aria-hidden="true" />מסע חדש</GameButton>
          <GameButton size="lg" variant="secondary" className="justify-start" onClick={goSinglePlayer}><Swords className="size-6" aria-hidden="true" />משחק יחיד</GameButton>
          <GameButton size="lg" variant="secondary" className="justify-start" onClick={() => router.push("/party")}><UsersRound className="size-6" aria-hidden="true" />משחק מקוון</GameButton>
          <GameButton size="lg" variant="secondary" className="justify-start" onClick={() => router.push("/characters")}><Shield className="size-6" aria-hidden="true" />הדמויות שלי</GameButton>
          <GameButton variant="ghost" onClick={() => setDialog("settings")}><Settings className="size-5" aria-hidden="true" />הגדרות</GameButton>
          <GameButton variant="ghost" onClick={() => setDialog("about")}><BookOpen className="size-5" aria-hidden="true" />אודות</GameButton>
          <GameButton variant="ghost" className="sm:col-span-2" onClick={() => setDialog("release")}><Sparkles className="size-5 text-[#62c6df]" aria-hidden="true" />מה חדש · <span>{releaseVersionLabel}</span></GameButton>
        </div>
        <form action={signOutAction} className="mt-3" onSubmit={() => {
          for (let index = localStorage.length - 1; index >= 0; index -= 1) {
            const key = localStorage.key(index);
            if (key?.startsWith("shattered-crown:save:")) localStorage.removeItem(key);
          }
        }}>
          <GameButton type="submit" variant="ghost" className="w-full text-[#a89f91]"><LogOut className="size-5" aria-hidden="true" />התנתקות</GameButton>
        </form>
      </motion.section>

      <Modal open={dialog === "settings"} title="הגדרות" onClose={() => setDialog(null)}><SettingsPanel /></Modal>
      <Modal open={dialog === "release"} title="מה חדש במשחק" onClose={() => setDialog(null)}><ReleaseNotesPanel /></Modal>
      <Modal open={dialog === "about"} title="אודות הכתר המנופץ" onClose={() => setDialog(null)}>
        <div className="space-y-5 leading-8 text-[#d3cabb]"><p>זהו פרק הפתיחה של משחק תפקידים עלילתי בעברית, שבו בחירות, קוביות וקרבות טקטיים מעצבים את מסעה של כל דמות.</p><p>הפרק הראשון מתרחש בכפר ערפלון ובמכרה שנפתח מחדש אחרי אלף שנות שתיקה.</p><p className="text-sm text-[#8f877a]">הנכסים החזותיים והקוליים נוצרו במיוחד עבור הפרויקט או תועדו ברישיון מתאים.</p></div>
      </Modal>
    </main>
  );
}
