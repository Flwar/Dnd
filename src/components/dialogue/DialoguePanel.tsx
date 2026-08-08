"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Dices, LoaderCircle, MessageCircle, Quote, Sparkles, Square, Volume2, X } from "lucide-react";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { GameButton } from "@/components/ui/GameButton";
import { availableChoices } from "@/game/dialogue";
import { dialoguesById } from "@/content/dialogues";
import { npcsById } from "@/content/npcs";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { voiceManager, type VoicePlaybackResult } from "@/lib/audio/voice-manager";
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

const approachStyles: Record<DialogueChoice["approach"], string> = {
  kind: "border-[#77b686]/30 text-[#a9d8b5]",
  direct: "border-[#c6a15b]/30 text-[#dec387]",
  curious: "border-[#62c6df]/30 text-[#9eeaff]",
  deceptive: "border-[#997bc7]/35 text-[#cbb4ef]",
  threatening: "border-[#d05b54]/35 text-[#f0a29c]",
  humorous: "border-[#d1aa58]/30 text-[#ead298]",
  "class-specific": "border-[#f0cf82]/40 text-[#ffe6a5]",
  "race-specific": "border-[#74b6a1]/35 text-[#a6dbc9]",
  "background-specific": "border-[#a98c70]/35 text-[#d9bea3]",
};

type VoiceStatus = "idle" | "loading" | "speaking" | "unsupported" | "disabled" | "failed";

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
  const titleId = useId();
  const textId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const onChoiceRef = useRef(onChoice);
  const onCloseRef = useRef(onClose);
  const prefersReducedMotion = useReducedMotion();
  const [voicePlayback, setVoicePlayback] = useState<{ nodeId: string | null; status: VoiceStatus }>({ nodeId: null, status: "idle" });
  const voiceStatus: VoiceStatus = voicePlayback.nodeId === node?.id ? voicePlayback.status : "idle";
  const choices = useMemo(
    () => node ? availableChoices(node.choices, { character: save.character, story: save.story, inventory: save.inventory, quests: save.quests }) : [],
    [node, save.character, save.story, save.inventory, save.quests],
  );
  const choicesRef = useRef(choices);
  const activeNodeId = node?.id;

  useEffect(() => {
    onChoiceRef.current = onChoice;
    onCloseRef.current = onClose;
    choicesRef.current = choices;
  }, [choices, onChoice, onClose]);

  useEffect(() => {
    if (!activeNodeId) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
    ) ?? []);
    const focusTimer = window.setTimeout(() => {
      panel?.querySelector<HTMLElement>("[data-dialogue-choice], button:not([disabled])")?.focus();
    }, 80);
    const releaseScrollLock = acquireBodyScrollLock();
    const handler = (event: KeyboardEvent) => {
      // Keep game-level shortcuts from firing against the obscured scene while
      // the dialogue owns keyboard input.
      event.stopPropagation();
      if (event.key === "Tab") {
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const currentChoices = choicesRef.current;
      const number = Number(event.key);
      if (!event.repeat && Number.isInteger(number) && number > 0 && number <= currentChoices.length) {
        event.preventDefault();
        onChoiceRef.current(currentChoices[number - 1]);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handler);
      releaseScrollLock();
      previousFocus?.focus();
    };
  }, [activeNodeId]);

  useEffect(() => {
    voiceManager.stop();
    return () => voiceManager.stop();
  }, [node?.id]);

  const toggleVoice = async () => {
    if (!node || !npc) return;
    const setCurrentVoiceStatus = (status: VoiceStatus) => setVoicePlayback({ nodeId: node.id, status });
    if (voiceStatus === "speaking" || voiceStatus === "loading") {
      voiceManager.stop();
      setCurrentVoiceStatus("idle");
      return;
    }
    setCurrentVoiceStatus("loading");
    const result: VoicePlaybackResult = await voiceManager.speak(npc.id, node.text, {
      onStart: () => setCurrentVoiceStatus("speaking"),
      onEnd: () => setCurrentVoiceStatus("idle"),
      onError: () => setCurrentVoiceStatus("failed"),
    });
    if (result !== "started") setCurrentVoiceStatus(result);
  };

  const voiceNotice = voiceStatus === "unsupported"
    ? "לא נמצא במכשיר קול עברי. אפשר להמשיך לקרוא את השיחה כרגיל."
    : voiceStatus === "disabled"
      ? "קולות הדמויות כבויים בהגדרות השמע."
      : voiceStatus === "failed"
        ? "לא הצלחנו להשמיע את הקול. הטקסט נשאר זמין לקריאה."
        : null;

  return (
    <AnimatePresence>
      {node && npc ? (
        <motion.div
          className="fixed inset-0 z-80 flex items-end justify-center bg-[linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.76))] sm:p-5"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            ref={panelRef}
            className="relative grid h-[min(82dvh,48rem)] w-full max-w-6xl overflow-hidden rounded-t-xl border border-b-0 border-[#c6a15b]/42 bg-[linear-gradient(155deg,rgba(25,27,31,.985),rgba(5,7,9,.995))] shadow-[0_-28px_90px_rgba(0,0,0,.82),0_0_55px_rgba(198,161,91,.08)] sm:h-auto sm:max-h-[88dvh] sm:grid-cols-[13rem_minmax(0,1fr)] sm:rounded-md sm:border"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 42, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 26, scale: 0.995 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={textId}
          >
            <div className="absolute inset-x-0 top-1.5 z-20 mx-auto h-1 w-10 rounded-full bg-[#c6a15b]/35 sm:hidden" aria-hidden="true" />
            <div className="relative hidden min-h-[30rem] overflow-hidden border-l border-[#c6a15b]/25 sm:block">
              <CharacterPortrait portraitKey={node.portraitKey} alt={`דיוקן של ${npc.name}`} sizes="208px" className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_36%,rgba(4,5,7,.28)_60%,rgba(4,5,7,.98)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="display-font text-2xl text-[#f0cf82]">{npc.name}</p>
                <p className="mt-1 text-xs leading-5 text-[#bcb3a5]">{npc.title}</p>
              </div>
            </div>

            <div className="flex min-h-0 flex-col px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 sm:p-6">
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#c6a15b]/18 pb-2.5 sm:pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-full border border-[#c6a15b]/55 shadow-[0_0_20px_rgba(198,161,91,.18)] sm:hidden">
                    <CharacterPortrait portraitKey={node.portraitKey} alt="" sizes="48px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-bold tracking-[.18em] text-[#9e968a]">שיחה</p>
                    <h2 id={titleId} className="display-font truncate text-xl text-[#f0cf82] sm:text-3xl">{npc.name}</h2>
                    <p className="truncate text-[0.68rem] text-[#a59d91] sm:text-xs">{npc.title} · <span className="text-[#cbbd9d]">{node.emotionalState}</span></p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <GameButton
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => void toggleVoice()}
                    aria-label={voiceStatus === "speaking" || voiceStatus === "loading" ? `הפסקת הקול של ${npc.name}` : `השמעת הקול של ${npc.name}`}
                    aria-pressed={voiceStatus === "speaking"}
                    title={voiceStatus === "speaking" ? "הפסקת הדיבור" : "השמעת הדיבור"}
                  >
                    {voiceStatus === "loading" ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : voiceStatus === "speaking" ? <Square className="size-4 fill-current" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
                  </GameButton>
                  <GameButton variant="ghost" size="icon" className="h-10 w-10" onClick={onClose} aria-label="סגירת השיחה"><X className="size-5" aria-hidden="true" /></GameButton>
                </div>
              </header>

              <div className="relative mt-2 max-h-[22dvh] shrink-0 overflow-y-auto overscroll-contain border-b border-white/8 pb-2 sm:mt-4 sm:max-h-[30dvh] sm:pb-4">
                <Quote className="absolute end-1 top-1 size-7 text-[#c6a15b]/12" aria-hidden="true" />
                {voiceNotice ? <p className={`mb-2 border px-3 py-2 text-xs ${voiceStatus === "failed" ? "border-[#d05b54]/30 bg-[#2b1116]/35 text-[#ffd0cb]" : "border-[#c6a15b]/25 bg-black/25 text-[#c9c0b2]"}`} role="status">{voiceNotice}</p> : null}
                <motion.p key={node.id} id={textId} className="border-r-2 border-[#c6a15b]/60 pe-4 text-[0.94rem] leading-7 text-[#eee4d2] sm:text-lg sm:leading-8" initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>{node.text}</motion.p>
              </div>

              <div className="mt-2 flex min-h-0 flex-1 flex-col sm:mt-4">
                <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[0.68rem] font-bold tracking-[.13em] text-[#d8c493]"><Sparkles className="size-3.5" aria-hidden="true" />התגובה שלך</p>
                  <p className="hidden text-[0.65rem] text-[#807a72] sm:block">ניתן לבחור גם במקשי <bdi className="ltr-isolate">1–{choices.length}</bdi></p>
                </div>
                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pe-0.5" aria-label="אפשרויות תשובה">
                  {choices.map((choice, index) => (
                    <motion.button
                      key={choice.id}
                      className="group flex min-h-[3.25rem] w-full items-center gap-2.5 border border-white/10 bg-[linear-gradient(110deg,rgba(255,255,255,.038),rgba(255,255,255,.012))] px-2.5 py-2 text-right shadow-[inset_0_1px_rgba(255,255,255,.025)] transition-colors hover:border-[#c6a15b]/55 hover:bg-[#c6a15b]/8 focus-visible:z-10 sm:gap-3 sm:px-3 sm:py-2.5"
                      onClick={() => onChoice(choice)}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 7 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: prefersReducedMotion ? 0 : Math.min(index * 0.04, 0.16), duration: 0.18 }}
                      data-dialogue-choice
                      data-testid={`dialogue-choice-${choice.id}`}
                    >
                      <kbd className="grid size-7 shrink-0 place-items-center border border-white/15 bg-black/35 text-[0.68rem] text-[#a89f91]">{index + 1}</kbd>
                      <span className="min-w-0 flex-1 text-sm leading-5 text-[#e5dccd] group-hover:text-white sm:text-base">{choice.text}</span>
                      <span className={`flex shrink-0 items-center gap-1 border bg-black/20 px-1.5 py-1 text-[0.58rem] sm:text-xs ${choice.skillCheck ? "border-[#62c6df]/35 text-[#9eeaff]" : approachStyles[choice.approach]}`}>
                        {choice.skillCheck ? <Dices className="size-3.5" aria-hidden="true" /> : <MessageCircle className="hidden size-3.5 sm:block" aria-hidden="true" />}
                        <span>{choice.skillCheck ? `קושי ${choice.skillCheck.difficulty}` : approachLabels[choice.approach]}</span>
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
