"use client";

import { motion } from "framer-motion";
import { Dices } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GameButton } from "@/components/ui/GameButton";
import type { DicePresentation } from "@/store/game-store";

const outcomes = {
  "critical-success": { label: "הצלחה מכרעת", tone: "text-[#8de0a1]", border: "border-[#77b686]" },
  success: { label: "הצלחה", tone: "text-[#8de0a1]", border: "border-[#77b686]" },
  failure: { label: "כישלון", tone: "text-[#ef8a82]", border: "border-[#d05b54]" },
  "critical-failure": { label: "כישלון מכריע", tone: "text-[#ef8a82]", border: "border-[#d05b54]" },
};

export function DiceOverlay({ presentation, onClose }: { presentation: DicePresentation | null; onClose: () => void }) {
  const result = presentation?.result;
  const outcome = result ? outcomes[result.outcome] : null;
  return (
    <Modal open={Boolean(presentation)} title="בדיקת מיומנות" onClose={onClose} className="sm:max-w-xl" allowClose={false}>
      {result && presentation && outcome ? (
        <div className="text-center">
          <p className="mb-5 text-sm tracking-[0.18em] text-[#c9bea9]">{presentation.skillLabel}</p>
          <motion.div
            className={`mx-auto grid size-32 place-items-center border-2 bg-[radial-gradient(circle,#23343c,#0b1014_70%)] shadow-[0_0_45px_rgba(98,198,223,.25)] ${outcome.border}`}
            initial={{ rotate: -180, scale: 0.25, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 175, damping: 16 }}
          >
            <Dices className="absolute size-24 text-[#62c6df]/15" aria-hidden="true" />
            <bdi className="relative text-5xl font-black tabular-nums text-white">{result.selectedRoll}</bdi>
          </motion.div>
          {result.rolls.length > 1 ? (
            <p className="mt-3 text-sm text-[#a89f91]">תוצאות: <bdi className="ltr-isolate">{result.rolls.join(" / ")}</bdi> · {result.mode === "advantage" ? "יתרון" : "חיסרון"}</p>
          ) : null}
          <div className="mx-auto my-6 grid max-w-sm grid-cols-3 divide-x divide-x-reverse divide-[#c6a15b]/20 border-y border-[#c6a15b]/20 py-3 text-sm">
            <span>קובייה<bdi className="mt-1 block text-lg font-bold">{result.selectedRoll}</bdi></span>
            <span>תוסף<bdi className="mt-1 block text-lg font-bold">{result.modifier >= 0 ? "+" : ""}{result.modifier}</bdi></span>
            <span>דרגת קושי<bdi className="mt-1 block text-lg font-bold">{result.difficulty}</bdi></span>
          </div>
          <p className={`display-font text-3xl ${outcome.tone}`}>{outcome.label}</p>
          <p className="mt-2 text-[#bdb4a7]">תוצאה סופית: <bdi className="ltr-isolate font-bold text-white">{result.finalResult}</bdi></p>
          <GameButton className="mt-7 w-full" onClick={onClose}>המשך</GameButton>
        </div>
      ) : null}
    </Modal>
  );
}
