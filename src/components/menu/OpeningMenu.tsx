"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CloudOff, Crown, LogIn, Settings, Sparkles, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { Atmosphere } from "@/components/shell/Atmosphere";
import { GameButton } from "@/components/ui/GameButton";
import { Modal } from "@/components/ui/Modal";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ReleaseNotesPanel } from "@/components/menu/ReleaseNotesPanel";
import { releaseVersionLabel } from "@/content/releases";
import { audioManager } from "@/lib/audio/audio-manager";
import { getAssetPath } from "@/lib/assets/manifest";

export function OpeningMenu({ cloudConfigured }: { cloudConfigured: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"settings" | "about" | "release" | null>(null);

  useEffect(() => {
    const unlock = () => { void audioManager.setAmbience("menu"); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audioManager.stopAmbience("menu");
    };
  }, []);

  return (
    <main id="main-content" className="screen-shell flex min-h-dvh items-center px-5 py-10 sm:px-10 lg:px-[8vw]">
      <Atmosphere image={getAssetPath("background-menu-cinematic")} mobileImage={getAssetPath("background-menu-cinematic-mobile")} priority />
      <motion.section
        className="relative z-10 w-full max-w-xl"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-4 flex items-center gap-3 text-[#62c6df]">
          <Crown className="size-7" aria-hidden="true" />
          <span className="text-sm font-bold tracking-[0.26em]">אגדה חדשה בארצות ואלדר</span>
        </div>
        <h1 className="living-title display-font text-6xl leading-[0.9] text-[#f0cf82] drop-shadow-[0_4px_18px_rgba(0,0,0,.9)] sm:text-7xl lg:text-8xl">הכתר<br />המנופץ</h1>
        <p className="mt-5 max-w-lg text-lg leading-8 text-[#d3cabb] sm:text-xl">שבעה רסיסים מתעוררים. הערפל לוחש בשמך. הבחירה הראשונה עדיין בידיך.</p>
        <div className="ornament-rule my-7 max-w-md" aria-hidden="true">◆</div>

        {!cloudConfigured ? (
          <div className="mb-5 flex max-w-md items-start gap-3 border border-[#d05b54]/45 bg-[#2b1116]/80 p-4 text-sm text-[#ffd0cb]" role="alert">
            <CloudOff className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p><b className="block">שער הענן טרם נפתח</b>שירות החשבונות דורש חיבור Supabase לפני שאפשר ליצור דמויות ולשמור מסעות.</p>
          </div>
        ) : null}

        <nav className="grid max-w-md gap-3" aria-label="כניסה למשחק">
          {cloudConfigured ? (
            <>
              <GameButton size="lg" className="justify-start" onClick={() => router.push("/auth/login")}>
                <LogIn className="relative z-10 size-6" aria-hidden="true" />
                התחברות לחשבון
              </GameButton>
              <GameButton size="lg" variant="secondary" className="justify-start" onClick={() => router.push("/auth/register")}>
                <UserPlus className="relative z-10 size-6" aria-hidden="true" />
                יצירת חשבון חדש
              </GameButton>
            </>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <GameButton variant="ghost" onClick={() => setDialog("about")}><BookOpen className="size-5" aria-hidden="true" />על העולם</GameButton>
            <GameButton variant="ghost" onClick={() => setDialog("settings")}><Settings className="size-5" aria-hidden="true" />הגדרות</GameButton>
          </div>
          <GameButton variant="ghost" onClick={() => setDialog("release")}><Sparkles className="size-5 text-[#62c6df]" aria-hidden="true" />מה חדש · <span>{releaseVersionLabel}</span></GameButton>
        </nav>
        <p className="mt-7 text-xs text-[#817a70]">פרק ראשון — הצללים שמתחת לערפלון</p>
      </motion.section>

      <Modal open={dialog === "settings"} title="הגדרות" onClose={() => setDialog(null)}>
        <SettingsPanel />
      </Modal>
      <Modal open={dialog === "release"} title="מה חדש במשחק" onClose={() => setDialog(null)}>
        <ReleaseNotesPanel />
      </Modal>
      <Modal open={dialog === "about"} title="האגדה על הכתר" onClose={() => setDialog(null)}>
        <div className="space-y-5 text-lg leading-8 text-[#d3cabb]">
          <p>לפני אלף שנים איחדו שבעה שליטים את ממלכותיהם מול המלך שמעבר לערפל. הם לא הצליחו להרוג אותו — ולכן כלאו אותו בין העולמות.</p>
          <p>כתר הברית נשבר בטקס לשבעה רסיסים. כל רסיס הוסתר באזור אחר, והאמת הפכה לאגדה.</p>
          <p className="border-s-2 border-[#62c6df] ps-4 text-[#e8dfce]">כעת מכרות נפתחים מעצמם, דרכים נבלעות בערפל, וסמל נשכח מופיע על דלתות הכפר ערפלון.</p>
        </div>
      </Modal>
    </main>
  );
}
