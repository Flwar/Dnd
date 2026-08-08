"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Circle, Clock3, Crown, Eye, Gem, Route, ShieldCheck, Swords, UserRoundCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GameButton } from "@/components/ui/GameButton";
import { ArtDirectedPicture } from "@/components/ui/ArtDirectedPicture";
import { chapterSummaryFields, openingChapter } from "@/content/chapters/opening";
import { getAssetPath } from "@/lib/assets/manifest";
import type { SaveData } from "@/types/game";

export function ChapterSummary({ open, save, onReturnToMenu, onClose }: { open: boolean; save: SaveData; onReturnToMenu: () => void; onClose: () => void }) {
  const decisions = chapterSummaryFields.map((field) => ({ ...field, completed: Boolean(save.story.flags[field.flag]) }));
  const prefersReducedMotion = useReducedMotion();
  const completedDecisions = decisions.filter((decision) => decision.completed).length;
  const battles = ["tutorial_enemy_defeated", "road_ambush_defeated", "flood_pack_defeated", "guardian_defeated"].filter((key) => Boolean(save.story.flags[key])).length;
  const secrets = ["blue_dust_found", "cult_symbol_understood", "foreman_journal_found", "hidden_chamber_open", "seven_shards_lore", "bell_runes_decoded", "keepers_betrayal_discovered", "fog_voice_traced", "elric_lineage_proven", "second_shard_region_known"].filter((key) => Boolean(save.story.flags[key])).length;
  const minutes = Math.max(1, Math.round(save.playtimeSeconds / 60));
  const minerSaved = Boolean(save.story.flags.danor_rescued || save.story.flags.danor_rescued_after_return);
  const journeySeal = save.story.flags.path_north_chosen
    ? "חלוץ הדרך הצפונית"
    : save.story.flags.shard_echo_sealed
      ? "שומר הד הרסיס"
      : secrets >= 6
        ? "חושף השבועה השביעית"
        : "נושא הרסיס הראשון";

  return <Modal open={open} title="חותם הפרק הראשון" onClose={onClose} allowClose={false} className="sm:max-w-5xl">
    <div className="relative overflow-hidden border border-[#c6a15b]/32 bg-[#080a0d]/80 p-4 text-center sm:p-8">
      <ArtDirectedPicture
        desktopSrc={getAssetPath("background-shard-sanctum")}
        mobileSrc={getAssetPath("background-shard-sanctum-mobile")}
        alt="רסיס הכתר מאיר בתוך היכל האבן"
        pictureClassName="absolute inset-0"
        className="opacity-30"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(63,164,190,.12),transparent_34%),linear-gradient(to_bottom,rgba(4,6,8,.54),rgba(4,5,7,.96)_72%)]" />
      <div className="relative">
        <motion.div className="mx-auto grid size-16 place-items-center rounded-full border border-[#62c6df]/60 bg-[#13333e]/65 shadow-[0_0_50px_rgba(98,198,223,.4)] sm:size-20" initial={prefersReducedMotion ? false : { scale: 0.55, rotate: -18, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}><Crown className="size-8 text-[#b8f1ff] sm:size-10" aria-hidden="true" /></motion.div>
        <p className="mt-3 text-[0.65rem] font-bold tracking-[.28em] text-[#c6a15b] sm:mt-4 sm:text-xs">הפרק הושלם</p>
        <h2 className="display-font mt-1 text-3xl text-[#f2dfb0] drop-shadow-xl sm:text-5xl">{openingChapter.name}</h2>
        <div className="mx-auto mt-3 inline-flex items-center gap-2 border border-[#c6a15b]/35 bg-black/35 px-3 py-1.5 text-xs font-bold tracking-wide text-[#f0cf82]"><ShieldCheck className="size-4" aria-hidden="true" />חותם המסע: {journeySeal}</div>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#c9c0b2] sm:text-base sm:leading-7">הרסיס הראשון התעורר, והבחירות שלך כבר נחרטו בערפלון. מה שהצלת, מה שחשפת ומה שהשארת מאחור ימשיכו איתך אל הדרך הבאה.</p>
        <div className="mx-auto mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:mt-7 sm:grid-cols-5 sm:gap-3">
          <SummaryValue icon={UserRoundCheck} label="כורים שניצלו" value={minerSaved ? "1" : "0"} />
          <SummaryValue icon={Swords} label="קרבות" value={`${battles}`} />
          <SummaryValue icon={Gem} label="סודות" value={`${secrets}`} />
          <SummaryValue icon={Route} label="הכרעות" value={`${completedDecisions}/${decisions.length}`} />
          <SummaryValue icon={Clock3} label="זמן משחק" value={`${minutes} דק׳`} />
        </div>
        <div className="mx-auto mt-5 max-w-3xl text-right sm:mt-6">
          <div className="mb-2 flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-bold tracking-[.15em] text-[#d9c89f]"><Eye className="size-4 text-[#62c6df]" aria-hidden="true" />עקבות שהשארת בעולם</p><span className="text-[0.65rem] text-[#817a70]">{completedDecisions} מתוך {decisions.length} נחרטו</span></div>
          <div className="grid max-h-52 gap-1.5 overflow-y-auto overscroll-contain pe-1 sm:grid-cols-2">
            {decisions.map((decision, index) => <motion.div key={decision.id} className={`flex min-h-11 items-center gap-2 border px-3 py-2 text-xs sm:text-sm ${decision.completed ? "border-[#77b686]/35 bg-[#285238]/18 text-[#c5e7cd]" : "border-white/8 bg-black/25 text-[#777168]"}`} initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: prefersReducedMotion ? 0 : Math.min(index * 0.025, 0.2) }}>{decision.completed ? <Check className="size-4 shrink-0 text-[#8bd19b]" aria-hidden="true" /> : <Circle className="size-3.5 shrink-0 opacity-35" aria-hidden="true" />}{decision.label}<span className="ms-auto text-[0.58rem] font-bold tracking-wide">{decision.completed ? "בוצע" : "לא נבחר"}</span></motion.div>)}
          </div>
        </div>
        <div className="mx-auto mt-5 max-w-3xl border-y border-[#c6a15b]/22 bg-black/20 py-3 sm:mt-7 sm:py-4"><p className="text-[0.62rem] tracking-[.18em] text-[#9e968a]">הרמז לפרק הבא</p><p className="display-font mx-auto mt-1 max-w-2xl text-base leading-6 text-[#f0cf82] sm:text-xl sm:leading-8">{openingChapter.nextChapterHook}</p></div>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:mt-7 sm:flex-row sm:gap-3"><GameButton size="lg" onClick={onReturnToMenu}>חזרה לתפריט הראשי</GameButton><GameButton size="lg" variant="secondary" onClick={onClose}>עיון בדמות ובשלל</GameButton></div>
      </div>
    </div>
  </Modal>;
}

function SummaryValue({ icon: Icon, label, value }: { icon: typeof Crown; label: string; value: string }) {
  return <div className="glass-inset p-2.5 sm:p-3"><Icon className="mx-auto size-4 text-[#c6a15b] sm:size-5" aria-hidden="true" /><bdi className="mt-1 block text-lg font-bold tabular-nums text-white sm:text-xl">{value}</bdi><span className="text-[0.62rem] text-[#9e968a] sm:text-xs">{label}</span></div>;
}
