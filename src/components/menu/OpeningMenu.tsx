"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CloudOff,
  Crown,
  Flame,
  Gem,
  LogIn,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Atmosphere } from "@/components/shell/Atmosphere";
import { GameButton } from "@/components/ui/GameButton";
import { Modal } from "@/components/ui/Modal";
import { RunePanel } from "@/components/ui/RunePanel";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ReleaseNotesPanel } from "@/components/menu/ReleaseNotesPanel";
import { releaseVersionLabel } from "@/content/releases";
import { audioManager } from "@/lib/audio/audio-manager";
import { getAssetPath } from "@/lib/assets/manifest";

export function OpeningMenu({ cloudConfigured }: { cloudConfigured: boolean }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [dialog, setDialog] = useState<"settings" | "about" | "release" | null>(null);

  useEffect(() => {
    const unlock = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      void audioManager.setAmbience("menu");
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audioManager.stopAmbience("menu");
    };
  }, []);

  return (
    <main id="main-content" className="menu-screen screen-shell flex min-h-dvh items-center px-4 py-8 sm:px-8 sm:py-12 lg:px-[5vw]">
      <Atmosphere
        image={getAssetPath("background-menu-cinematic")}
        mobileImage={getAssetPath("background-menu-cinematic-mobile")}
        priority
      />

      <div className="menu-cinematic-grid relative z-10">
        <motion.section
          className="menu-brand-block pt-4 lg:pt-0"
          initial={reduceMotion ? false : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          aria-labelledby="opening-game-title"
        >
          <div className="menu-eyebrow">
            <Crown className="size-5" aria-hidden="true" />
            <span>אגדה חדשה בארצות ואלדר</span>
          </div>
          <h1 id="opening-game-title" className="menu-title living-title display-font text-[clamp(3.8rem,10vw,7.8rem)] leading-[0.78]">
            הכתר
            <span className="mt-3 block">המנופץ</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#d7cebf] sm:text-xl sm:leading-9">
            שבעה רסיסים מתעוררים. הערפל לוחש בשמך. כל ברית, הקרבה והטלת קובייה יחרטו דרך אחרת בעולם.
          </p>
          <div className="ornament-rule my-6 max-w-lg" aria-hidden="true">◆</div>
          <div className="flex max-w-lg items-center gap-3 text-sm text-[#b8afa2]">
            <span className="menu-seal !size-10"><Gem className="size-4" aria-hidden="true" /></span>
            <p>
              <span className="block font-bold text-[#eadbb9]">פרק ראשון: הצללים שמתחת לערפלון</span>
              <span>מסע עלילתי, קרבות טקטיים ובחירות שנשמרות בענן.</span>
            </p>
          </div>
        </motion.section>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.62, delay: reduceMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <RunePanel as="aside" className="menu-command-panel" aria-label="שער הכניסה למשחק">
            <header className="mb-6 flex items-center gap-4 border-b border-[#c6a15b]/18 pb-5">
              <span className="menu-seal"><Flame className="size-5" aria-hidden="true" /></span>
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-[#72cfe2]">שער המסע</p>
                <h2 className="display-font mt-1 text-3xl leading-none text-[#f0cf82]">היכנסו אל הערפל</h2>
              </div>
            </header>

            {!cloudConfigured ? (
              <div className="mb-5 flex items-start gap-3 border border-[#d05b54]/45 bg-[#2b1116]/80 p-4 text-sm leading-6 text-[#ffd0cb]" role="alert">
                <CloudOff className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <p>
                  <b className="block text-[#ffe6e1]">שער הענן טרם נפתח</b>
                  שירות החשבונות דורש חיבור Supabase לפני שניתן ליצור דמויות ולשמור מסעות.
                </p>
              </div>
            ) : null}

            <nav className="grid gap-3" aria-label="כניסה למשחק">
              {cloudConfigured ? (
                <>
                  <GameButton size="lg" className="w-full justify-start" onClick={() => router.push("/auth/login")}>
                    <LogIn className="size-6 shrink-0" aria-hidden="true" />
                    התחברות לחשבון
                  </GameButton>
                  <GameButton size="lg" variant="secondary" className="w-full justify-start" onClick={() => router.push("/auth/register")}>
                    <UserPlus className="size-6 shrink-0" aria-hidden="true" />
                    יצירת חשבון חדש
                  </GameButton>
                </>
              ) : null}

              <div className="mt-1 grid grid-cols-2 gap-2">
                <GameButton variant="ghost" className="px-3" onClick={() => setDialog("about")}>
                  <BookOpen className="size-5" aria-hidden="true" />
                  על העולם
                </GameButton>
                <GameButton variant="ghost" className="px-3" onClick={() => setDialog("settings")}>
                  <Settings className="size-5" aria-hidden="true" />
                  הגדרות
                </GameButton>
              </div>
              <GameButton variant="ghost" className="w-full" onClick={() => setDialog("release")}>
                <Sparkles className="size-5 text-[#72cfe2]" aria-hidden="true" />
                מה חדש <span aria-hidden="true">·</span> <span>{releaseVersionLabel}</span>
              </GameButton>
            </nav>

            <footer className="mt-5 flex items-center justify-center gap-2 border-t border-[#c6a15b]/12 pt-4 text-xs text-[#827b70]">
              <ShieldCheck className="size-4 text-[#77b686]" aria-hidden="true" />
              <span>שמירה מוצפנת וחשבון מתמשך</span>
            </footer>
          </RunePanel>
        </motion.div>
      </div>

      <Modal open={dialog === "settings"} title="הגדרות" onClose={() => setDialog(null)}>
        <SettingsPanel />
      </Modal>
      <Modal open={dialog === "release"} title="מה חדש במשחק" onClose={() => setDialog(null)}>
        <ReleaseNotesPanel />
      </Modal>
      <Modal open={dialog === "about"} title="האגדה על הכתר" onClose={() => setDialog(null)}>
        <div className="grid gap-4 text-base leading-8 text-[#d3cabb] sm:grid-cols-3">
          <article className="release-note">
            <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[#72cfe2]">לפני אלף שנים</p>
            <p>שבעה שליטים איחדו את ממלכותיהם מול המלך שמעבר לערפל — כוח שלא היה אפשר להרוג.</p>
          </article>
          <article className="release-note">
            <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[#f0cf82]">כתר הברית</p>
            <p>הכתר כלא אותו בין העולמות, אך הטקס שבר אותו לשבעה רסיסים והאמת הפכה לאגדה.</p>
          </article>
          <article className="release-note border-[#62c6df]/25">
            <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[#9eeaff]">כעת</p>
            <p>מכרות נפתחים מעצמם, דרכים נבלעות בערפל וסמל נשכח מופיע על דלתות הכפר ערפלון.</p>
          </article>
        </div>
      </Modal>
    </main>
  );
}
