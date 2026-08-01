"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SkipForward } from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";
import { openingChapter } from "@/content/chapters/opening";
import { getAssetPath } from "@/lib/assets/manifest";

export function OpeningCinematic({ open, onFinish }: { open: boolean; onFinish: () => void }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.section className="fixed inset-0 z-[150] grid place-items-center overflow-hidden bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label="פתיחת הפרק">
          <motion.img src={getAssetPath("background-village-gate")} alt="שער הכפר ערפלון לאחר רעידת האדמה" className="absolute inset-0 size-full object-cover opacity-55" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 8, ease: "linear" }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(0,0,0,.94)_90%),linear-gradient(to_bottom,rgba(0,0,0,.35),rgba(0,0,0,.88))]" />
          <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
            <motion.p className="mb-3 text-xs font-bold tracking-[0.4em] text-[#c6a15b] sm:text-sm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>פרק ראשון</motion.p>
            <motion.h1 className="display-font text-4xl text-[#f4dfad] drop-shadow-2xl sm:text-7xl" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>{openingChapter.name}</motion.h1>
            <div className="ornament-rule mx-auto my-6 max-w-md">◆</div>
            <div className="space-y-4 text-base leading-8 text-[#ded5c5] sm:text-xl">
              {openingChapter.openingNarration.map((paragraph, index) => (
                <motion.p key={paragraph} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 + index * 0.55 }}>{paragraph}</motion.p>
              ))}
            </div>
            <motion.div className="mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
              <GameButton size="lg" onClick={onFinish}>כניסה לערפלון</GameButton>
            </motion.div>
          </div>
          <GameButton variant="ghost" className="absolute end-4 top-4 z-20" onClick={onFinish}><SkipForward className="size-5" aria-hidden="true" /> דילוג</GameButton>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
