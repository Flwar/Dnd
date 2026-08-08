"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  Clock3,
  Crown,
  LogOut,
  MapPin,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Swords,
  UserRound,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Atmosphere } from "@/components/shell/Atmosphere";
import { GameButton } from "@/components/ui/GameButton";
import { Modal } from "@/components/ui/Modal";
import { RunePanel } from "@/components/ui/RunePanel";
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
  const reduceMotion = useReducedMotion();
  const [dialog, setDialog] = useState<"settings" | "about" | "release" | null>(null);
  const active = characters[0] ?? null;

  useEffect(() => {
    void audioManager.setAmbience("menu");
    return () => audioManager.stopAmbience("menu");
  }, []);

  const goSinglePlayer = () => router.push(characters.length ? "/characters?mode=single" : "/characters/new");

  return (
    <main id="main-content" className="menu-screen screen-shell flex min-h-dvh items-center overflow-y-auto px-4 py-7 sm:px-8 sm:py-10 lg:px-[5vw]">
      <Atmosphere
        image={getAssetPath("background-menu-cinematic")}
        mobileImage={getAssetPath("background-menu-cinematic-mobile")}
        priority
      />

      <div className="menu-cinematic-grid relative z-10 !items-start lg:!items-center">
        <motion.section
          className="menu-brand-block min-w-0"
          initial={reduceMotion ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.58, ease: [0.22, 1, 0.36, 1] }}
          aria-labelledby="main-menu-title"
        >
          <button className="menu-profile-chip mb-4 max-w-full" onClick={() => router.push("/profile")}>
            <UserRound className="size-4 shrink-0 text-[#72cfe2]" aria-hidden="true" />
            <span className="min-w-0 truncate">ברוכים השבים, <bdi>{displayName}</bdi></span>
            {isKing ? (
              <span className="inline-flex shrink-0 items-center gap-1 border-s border-[#f0cf82]/25 ps-2 font-bold text-[#ffe6a0]">
                <Crown className="size-4" aria-hidden="true" />
                {accountTitle ?? "המלך"}
              </span>
            ) : null}
          </button>

          <div className="menu-eyebrow">
            <Crown className={`size-5 ${isKing ? "text-[#f0cf82] drop-shadow-[0_0_10px_rgba(240,207,130,.55)]" : ""}`} aria-hidden="true" />
            <span>ארצות ואלדר ממתינות</span>
          </div>
          <h1 id="main-menu-title" className="menu-title living-title display-font text-[clamp(3rem,7.5vw,6.4rem)] leading-[0.86]">
            הכתר המנופץ
          </h1>

          {active ? (
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold tracking-[0.2em] text-[#78d3e6]">השמירה האחרונה</p>
              <button
                className="menu-continue-card group"
                onClick={() => router.push(`/game/${active.id}`)}
                aria-label={`המשך המסע של ${active.name}, דרגה ${active.level}, ${active.currentLocation}`}
              >
                <span className="menu-portrait-frame">
                  <CharacterPortrait
                    portraitKey={active.portraitPath}
                    alt=""
                    sizes="(min-width: 1024px) 96px, 72px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate display-font text-2xl leading-tight text-[#f0cf82] sm:text-3xl">{active.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[#c7bdad] sm:text-sm">
                    <span>דרגה <bdi className="ltr-isolate font-bold text-[#eee4d2]">{active.level}</bdi></span>
                    <span aria-hidden="true" className="text-[#c6a15b]">◆</span>
                    <span>{active.className}</span>
                  </span>
                  <span className="mt-3 hidden gap-x-4 gap-y-1 text-xs text-[#9f978b] sm:flex sm:flex-wrap">
                    <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-[#72cfe2]" aria-hidden="true" />{active.currentLocation}</span>
                    <span className="inline-flex items-center gap-1.5"><ScrollText className="size-3.5 text-[#c6a15b]" aria-hidden="true" />{active.chapterName}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden="true" />{active.lastPlayedAt}</span>
                  </span>
                </span>
                <span className="grid size-10 shrink-0 place-items-center border border-[#c6a15b]/24 bg-black/25 text-[#f0cf82] transition-colors group-hover:border-[#f0cf82]/55 group-hover:bg-[#c6a15b]/10" aria-hidden="true">
                  <ChevronLeft className="size-5" />
                </span>
              </button>
            </div>
          ) : (
            <div className="mt-6 border-s-2 border-[#62c6df]/55 bg-[#071116]/72 px-4 py-3 text-sm leading-6 text-[#c7bdad]">
              טרם נכתבה אגדה בשמך. צרו דמות ראשונה והתחילו את הדרך אל ערפלון.
            </div>
          )}

          <div className="menu-online-frame mt-4">
            <OnlinePlayersPanel />
          </div>
        </motion.section>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.988 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.56, delay: reduceMotion ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <RunePanel as="aside" className="menu-command-panel" aria-label="תפריט המשחק הראשי">
            <header className="mb-5 flex items-center gap-4 border-b border-[#c6a15b]/18 pb-5">
              <span className="menu-seal"><Swords className="size-5" aria-hidden="true" /></span>
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-[#72cfe2]">יומן המסע</p>
                <h2 className="display-font mt-1 text-3xl leading-none text-[#f0cf82]">בחרו את דרככם</h2>
              </div>
            </header>

            <nav className="grid gap-3" aria-label="אפשרויות משחק">
              <GameButton size="lg" className="w-full justify-start" onClick={() => router.push("/characters/new")}>
                <UserRoundPlus className="size-6 shrink-0" aria-hidden="true" />
                מסע חדש
              </GameButton>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <GameButton size="lg" variant="secondary" className="justify-start px-5" onClick={goSinglePlayer}>
                  <Swords className="size-6 shrink-0" aria-hidden="true" />
                  משחק יחיד
                </GameButton>
                <GameButton size="lg" variant="secondary" className="justify-start border-[#62c6df]/35 px-5 hover:border-[#72d5e8]" onClick={() => router.push("/party")}>
                  <UsersRound className="size-6 shrink-0 text-[#72cfe2]" aria-hidden="true" />
                  משחק מקוון
                </GameButton>
              </div>
              <GameButton variant="secondary" className="w-full justify-start" onClick={() => router.push("/characters")}>
                <Shield className="size-5 shrink-0" aria-hidden="true" />
                הדמויות שלי
              </GameButton>

              <div className="mt-1 grid grid-cols-2 gap-2">
                <GameButton variant="ghost" className="px-3" onClick={() => setDialog("settings")}>
                  <Settings className="size-5" aria-hidden="true" />
                  הגדרות
                </GameButton>
                <GameButton variant="ghost" className="px-3" onClick={() => setDialog("about")}>
                  <BookOpen className="size-5" aria-hidden="true" />
                  אודות
                </GameButton>
              </div>
              <GameButton variant="ghost" className="w-full" onClick={() => setDialog("release")}>
                <Sparkles className="size-5 text-[#72cfe2]" aria-hidden="true" />
                מה חדש <span aria-hidden="true">·</span> <span>{releaseVersionLabel}</span>
              </GameButton>
            </nav>

            <form
              action={signOutAction}
              className="mt-3 border-t border-[#c6a15b]/12 pt-3"
              onSubmit={() => {
                for (let index = localStorage.length - 1; index >= 0; index -= 1) {
                  const key = localStorage.key(index);
                  if (key?.startsWith("shattered-crown:save:")) localStorage.removeItem(key);
                }
              }}
            >
              <GameButton type="submit" variant="ghost" className="w-full text-[#8f887d]">
                <LogOut className="size-5" aria-hidden="true" />
                התנתקות
              </GameButton>
            </form>
          </RunePanel>
        </motion.div>
      </div>

      <Modal open={dialog === "settings"} title="הגדרות" onClose={() => setDialog(null)}><SettingsPanel /></Modal>
      <Modal open={dialog === "release"} title="מה חדש במשחק" onClose={() => setDialog(null)}><ReleaseNotesPanel /></Modal>
      <Modal open={dialog === "about"} title="אודות הכתר המנופץ" onClose={() => setDialog(null)}>
        <div className="grid gap-4 leading-7 text-[#d3cabb] sm:grid-cols-2">
          <article className="release-note">
            <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[#72cfe2]">המשחק</p>
            <p>משחק תפקידים עלילתי בעברית שבו בחירות, קוביות וקרבות טקטיים מעצבים מסע שונה לכל דמות.</p>
          </article>
          <article className="release-note">
            <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[#f0cf82]">הפרק הראשון</p>
            <p>המסע מתחיל בכפר ערפלון ובמכרה שנפתח מחדש אחרי אלף שנות שתיקה.</p>
          </article>
          <p className="sm:col-span-2 border-s-2 border-[#77b686]/45 ps-4 text-sm text-[#9f978b]">
            הנכסים החזותיים והקוליים נוצרו במיוחד עבור הפרויקט או תועדו ברישיון מתאים.
          </p>
        </div>
      </Modal>
    </main>
  );
}
