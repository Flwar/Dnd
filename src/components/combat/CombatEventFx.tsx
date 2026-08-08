"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HeartPulse, ShieldAlert, Sparkles, Swords } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CombatEvent, Combatant } from "@/types/game";

type VisualCombatEvent = Extract<
  CombatEvent,
  { kind: "damage" | "healing" | "status-applied" | "miss" | "defeated" }
>;

interface CombatEventFxProps {
  event: VisualCombatEvent | null;
  combatants: Readonly<Record<string, Combatant>>;
  reducedMotion: boolean;
}

function targetIdForEvent(event: VisualCombatEvent): string {
  return event.kind === "defeated" ? event.combatantId : event.targetId;
}

function eventPresentation(event: VisualCombatEvent) {
  switch (event.kind) {
    case "damage":
      return {
        label: event.critical ? `-${event.amount} · פגיעה מכרעת` : `-${event.amount}`,
        tone: event.critical ? "critical" : "damage",
        Icon: Swords,
      } as const;
    case "healing":
      return { label: `+${event.amount}`, tone: "healing", Icon: HeartPulse } as const;
    case "status-applied":
      return { label: "השפעה הופעלה", tone: "status", Icon: Sparkles } as const;
    case "miss":
      return { label: "החטאה", tone: "miss", Icon: ShieldAlert } as const;
    case "defeated":
      return { label: "הובס", tone: "defeated", Icon: Swords } as const;
  }
}

const toneClasses = {
  damage: "border-[#ef786d]/55 bg-[#3e1118]/88 text-[#ffd4cc] shadow-[0_0_34px_rgba(213,66,61,.32)]",
  critical: "border-[#ffb05c]/70 bg-[#4d1710]/92 text-[#fff0c5] shadow-[0_0_48px_rgba(241,91,48,.48)]",
  healing: "border-[#72dca0]/55 bg-[#103224]/90 text-[#c9ffdc] shadow-[0_0_38px_rgba(80,205,133,.34)]",
  status: "border-[#70cfe6]/55 bg-[#102e3b]/90 text-[#cff5ff] shadow-[0_0_38px_rgba(75,185,218,.34)]",
  miss: "border-[#aab2bc]/45 bg-[#24282d]/90 text-[#e1e5ea] shadow-[0_0_28px_rgba(150,160,175,.2)]",
  defeated: "border-[#bc5c68]/60 bg-[#2a0e14]/92 text-[#ffc6cf] shadow-[0_0_42px_rgba(156,46,65,.34)]",
} as const;

export function CombatEventFx({ event, combatants, reducedMotion }: CombatEventFxProps) {
  const [visibleEvent, setVisibleEvent] = useState<VisualCombatEvent | null>(null);

  useEffect(() => {
    if (!event) {
      const clearTimer = window.setTimeout(() => setVisibleEvent(null), 0);
      return () => window.clearTimeout(clearTimer);
    }
    const showTimer = window.setTimeout(() => setVisibleEvent(event), 0);
    const hideTimer = window.setTimeout(() => setVisibleEvent(null), reducedMotion ? 620 : 1_080);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [event, reducedMotion]);

  const target = visibleEvent ? combatants[targetIdForEvent(visibleEvent)] : null;
  const enemySide = target?.kind === "enemy";
  const presentation = visibleEvent ? eventPresentation(visibleEvent) : null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <AnimatePresence>
        {visibleEvent && presentation ? (
          <motion.div
            key={visibleEvent.sequence}
            data-testid="combat-event-fx"
            className={cn(
              "absolute top-[37%] -translate-x-1/2 -translate-y-1/2 sm:top-[42%]",
              enemySide ? "left-[26%]" : "left-[74%]",
            )}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.72 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: -10, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -54, scale: 1.08 }}
            transition={{ duration: reducedMotion ? 0.08 : 0.24, ease: "easeOut" }}
          >
            {presentation.tone === "damage" || presentation.tone === "critical" ? (
              <motion.span
                className="absolute left-1/2 top-1/2 h-1 w-32 origin-center -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] bg-[linear-gradient(90deg,transparent,rgba(255,223,176,.95),transparent)] blur-[1px] sm:w-48"
                initial={reducedMotion ? false : { scaleX: 0, opacity: 0 }}
                animate={reducedMotion ? { opacity: 0 } : { scaleX: 1, opacity: [0, 1, 0] }}
                transition={{ duration: 0.34 }}
              />
            ) : null}
            <div className={cn("relative flex min-w-28 items-center justify-center gap-2 border px-3 py-2 font-black backdrop-blur-md sm:min-w-36 sm:px-5 sm:py-3", toneClasses[presentation.tone])}>
              <presentation.Icon className="size-4 sm:size-5" />
              <bdi dir="rtl" className="text-base tabular-nums sm:text-xl">{presentation.label}</bdi>
            </div>
            {!reducedMotion ? (
              <span className="absolute inset-1 -z-10 animate-ping border border-current opacity-25 [animation-duration:650ms]" />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {visibleEvent?.kind === "damage" && visibleEvent.critical && !reducedMotion ? (
          <motion.div
            key={`flash-${visibleEvent.sequence}`}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,189,98,.18),transparent_58%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38 }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export type { VisualCombatEvent };
