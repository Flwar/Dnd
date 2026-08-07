"use client";

import { motion } from "framer-motion";
import { Check, Clock3, Crown, Gem, Swords, UserRoundCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GameButton } from "@/components/ui/GameButton";
import { ArtDirectedPicture } from "@/components/ui/ArtDirectedPicture";
import { chapterSummaryFields, openingChapter } from "@/content/chapters/opening";
import { getAssetPath } from "@/lib/assets/manifest";
import type { SaveData } from "@/types/game";

export function ChapterSummary({ open, save, onReturnToMenu, onClose }: { open: boolean; save: SaveData; onReturnToMenu: () => void; onClose: () => void }) {
  const decisions = chapterSummaryFields.map((field) => ({ ...field, completed: Boolean(save.story.flags[field.flag]) }));
  const battles = ["tutorial_enemy_defeated", "road_ambush_defeated", "flood_pack_defeated", "guardian_defeated"].filter((key) => Boolean(save.story.flags[key])).length;
  const secrets = ["blue_dust_found", "cult_symbol_understood", "foreman_journal_found", "hidden_chamber_open", "seven_shards_lore"].filter((key) => Boolean(save.story.flags[key])).length;
  const minutes = Math.max(1, Math.round(save.playtimeSeconds / 60));
  return <Modal open={open} title="הפרק הושלם" onClose={onClose} allowClose={false} className="sm:max-w-4xl">
    <div className="relative overflow-hidden border border-[#c6a15b]/30 bg-black/25 p-5 text-center sm:p-8">
      <ArtDirectedPicture
        desktopSrc={getAssetPath("background-shard-sanctum")}
        mobileSrc={getAssetPath("background-shard-sanctum-mobile")}
        alt="רסיס הכתר מאיר בתוך היכל האבן"
        pictureClassName="absolute inset-0"
        className="opacity-20"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/90" />
      <div className="relative">
        <motion.div className="mx-auto grid size-20 place-items-center rounded-full border border-[#62c6df]/60 bg-[#13333e]/65 shadow-[0_0_45px_rgba(98,198,223,.35)]" initial={{ scale: 0.5, rotate: -25 }} animate={{ scale: 1, rotate: 0 }}><Crown className="size-10 text-[#9eeaff]" aria-hidden="true" /></motion.div>
        <p className="mt-4 text-xs font-bold tracking-[.25em] text-[#c6a15b]">פרק ראשון</p>
        <h2 className="display-font mt-1 text-4xl text-[#f2dfb0] sm:text-5xl">{openingChapter.name}</h2>
        <p className="mx-auto mt-3 max-w-2xl leading-7 text-[#c9c0b2]">הרסיס הראשון התעורר, ומעבר לערפל משהו עתיק הבחין בך. ערפלון ניצלה לעת עתה — אבל הדרך אל ששת הרסיסים האחרים רק נפתחה.</p>
        <div className="mx-auto mt-7 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryValue icon={UserRoundCheck} label="כורים שניצלו" value={save.story.flags.danor_rescued ? "1" : "0"} />
          <SummaryValue icon={Swords} label="קרבות" value={`${battles}`} />
          <SummaryValue icon={Gem} label="סודות" value={`${secrets}`} />
          <SummaryValue icon={Clock3} label="זמן משחק" value={`${minutes} דק׳`} />
        </div>
        <div className="mx-auto mt-6 grid max-w-2xl gap-2 text-right sm:grid-cols-2">
          {decisions.map((decision) => <div key={decision.id} className={`flex items-center gap-2 border p-3 text-sm ${decision.completed ? "border-[#77b686]/35 bg-[#285238]/15 text-[#bce2c5]" : "border-white/10 bg-black/20 text-[#8e877d]"}`}><Check className={`size-4 ${decision.completed ? "opacity-100" : "opacity-20"}`} aria-hidden="true" />{decision.label}</div>)}
        </div>
        <div className="mx-auto mt-7 max-w-2xl border-y border-[#c6a15b]/22 py-4"><p className="text-xs tracking-[.18em] text-[#9e968a]">הרמז לפרק הבא</p><p className="display-font mt-1 text-xl text-[#f0cf82]">{openingChapter.nextChapterHook}</p></div>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><GameButton size="lg" onClick={onReturnToMenu}>חזרה לתפריט הראשי</GameButton><GameButton size="lg" variant="secondary" onClick={onClose}>עיון בדמות ובשלל</GameButton></div>
      </div>
    </div>
  </Modal>;
}

function SummaryValue({ icon: Icon, label, value }: { icon: typeof Crown; label: string; value: string }) {
  return <div className="glass-inset p-3"><Icon className="mx-auto size-5 text-[#c6a15b]" aria-hidden="true" /><bdi className="mt-1 block text-xl font-bold text-white">{value}</bdi><span className="text-xs text-[#9e968a]">{label}</span></div>;
}
