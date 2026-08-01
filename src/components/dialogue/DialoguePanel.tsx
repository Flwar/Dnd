"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dices, MessageCircle, X } from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";
import { availableChoices } from "@/game/dialogue";
import { dialoguesById } from "@/content/dialogues";
import { npcsById } from "@/content/npcs";
import { getAssetPath } from "@/lib/assets/manifest";
import type { DialogueChoice, SaveData } from "@/types/game";

const approachLabels: Record<DialogueChoice["approach"], string> = {
  kind: "אמפתיה",
  direct: "ישירות",
  curious: "סקרנות",
  deceptive: "הטעיה",
  threatening: "איום",
  humorous: "הומור",
  "class-specific": "מקצוע",
  "race-specific": "גזע",
  "background-specific": "רקע",
};

export function DialoguePanel({
  nodeId,
  save,
  onChoice,
  onClose,
}: {
  nodeId: string | null;
  save: SaveData;
  onChoice: (choice: DialogueChoice) => void;
  onClose: () => void;
}) {
  const node = nodeId ? dialoguesById[nodeId] : undefined;
  const npc = node ? npcsById[node.npcId] : undefined;
  const choices = useMemo(
    () => node ? availableChoices(node.choices, { character: save.character, story: save.story, inventory: save.inventory, quests: save.quests }) : [],
    [node, save.character, save.story, save.inventory, save.quests],
  );

  useEffect(() => {
    if (!node) return;
    const handler = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const number = Number(event.key);
      if (Number.isInteger(number) && number > 0 && number <= choices.length) onChoice(choices[number - 1]);
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [node, choices, onChoice, onClose]);

  return (
    <AnimatePresence>
      {node && npc ? (
        <motion.section
          className="safe-inline-area fixed inset-x-0 bottom-0 z-80 mx-auto w-full border-t border-[#c6a15b]/35 bg-[linear-gradient(180deg,rgba(11,13,16,.96),rgba(5,6,8,.99))] shadow-[0_-24px_70px_rgba(0,0,0,.75)] sm:bottom-5 sm:max-w-5xl sm:border"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28 }}
          role="dialog"
          aria-label={`שיחה עם ${npc.name}`}
        >
          <div className="grid max-h-[86dvh] overflow-y-auto sm:grid-cols-[10rem_1fr]">
            <div className="relative hidden min-h-52 overflow-hidden border-l border-[#c6a15b]/25 sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated local portrait */}
              <img src={getAssetPath(node.portraitKey)} alt={`דיוקן של ${npc.name}`} className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            </div>
            <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
              <header className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-14 shrink-0 overflow-hidden rounded-full border border-[#c6a15b]/45 sm:hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element -- generated local portrait */}
                    <img src={getAssetPath(node.portraitKey)} alt="" className="size-full object-cover" />
                  </div>
                  <div>
                    <h2 className="display-font text-2xl text-[#f0cf82]">{npc.name}</h2>
                    <p className="text-xs text-[#9e968a]">{npc.title} · {node.emotionalState}</p>
                  </div>
                </div>
                <GameButton variant="ghost" size="icon" onClick={onClose} aria-label="סגירת השיחה"><X className="size-5" aria-hidden="true" /></GameButton>
              </header>
              <motion.p key={node.id} className="mb-5 border-r-2 border-[#c6a15b]/60 pr-4 text-base leading-8 text-[#e8dfce] sm:text-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{node.text}</motion.p>
              <div className="grid gap-2" aria-label="אפשרויות תשובה">
                {choices.map((choice, index) => (
                  <motion.button
                    key={choice.id}
                    className="group flex min-h-12 w-full items-center gap-3 border border-white/10 bg-white/[.025] px-3 py-2.5 text-right transition hover:border-[#c6a15b]/55 hover:bg-[#c6a15b]/8"
                    onClick={() => onChoice(choice)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.045, 0.2) }}
                    data-testid={`dialogue-choice-${choice.id}`}
                  >
                    <kbd className="grid size-7 shrink-0 place-items-center border border-white/15 bg-black/30 text-xs text-[#a89f91]">{index + 1}</kbd>
                    <span className="min-w-0 flex-1 text-[#ddd4c5] group-hover:text-white">{choice.text}</span>
                    <span className="hidden shrink-0 items-center gap-1 text-xs text-[#a89f91] sm:flex">
                      {choice.skillCheck ? <Dices className="size-4 text-[#62c6df]" aria-hidden="true" /> : <MessageCircle className="size-4" aria-hidden="true" />}
                      {choice.skillCheck ? `בדיקה · קושי ${choice.skillCheck.difficulty}` : approachLabels[choice.approach]}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
