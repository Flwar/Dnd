"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Crown, ScrollText, ShieldCheck, Sparkles } from "lucide-react";
import { currentRelease } from "@/content/releases";
import { cn } from "@/lib/cn";

const toneStyles = {
  gold: "text-[#f0cf82]",
  magic: "text-[#9eeaff]",
  success: "text-[#a8d9b3]",
} as const;

const toneBorders = {
  gold: "border-[#c6a15b]/25",
  magic: "border-[#62c6df]/22",
  success: "border-[#77b686]/22",
} as const;

const toneIcons = {
  gold: Crown,
  magic: Sparkles,
  success: ShieldCheck,
} as const;

export function ReleaseNotesPanel() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-6">
      <header className="release-hero">
        <ScrollText className="pointer-events-none absolute -bottom-8 -left-5 size-40 rotate-[-12deg] text-[#f0cf82] opacity-[0.035]" aria-hidden="true" />
        <div className="relative flex items-start gap-4">
          <span className="menu-seal !size-12"><Crown className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold tracking-[0.14em] text-[#c6a15b]">
              <span>דברי הימים</span>
              <span aria-hidden="true">◆</span>
              <bdi className="ltr-isolate border border-[#c6a15b]/24 bg-black/20 px-2 py-0.5 text-[#f0cf82]">{currentRelease.version}</bdi>
              <span aria-hidden="true">◆</span>
              <span>{currentRelease.publishedLabel}</span>
            </div>
            <h2 className="display-font text-3xl leading-tight text-[#f0cf82] sm:text-4xl">{currentRelease.title}</h2>
            <p className="mt-2 max-w-3xl leading-7 text-[#c9c0b2]">{currentRelease.summary}</p>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-l from-[#c6a15b]/45 to-transparent" aria-hidden="true" />
        <h3 className="text-xs font-bold tracking-[0.2em] text-[#aaa092]">השינויים שנחרטו בגרסה</h3>
        <span className="h-px flex-1 bg-gradient-to-r from-[#c6a15b]/45 to-transparent" aria-hidden="true" />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2" aria-label="שינויים בגרסה הנוכחית">
        {currentRelease.notes.map((note, index) => {
          const Icon = toneIcons[note.tone];
          const featured = index < 3;
          return (
            <motion.li
              key={note.title}
              className={cn(
                "release-note",
                toneBorders[note.tone],
                featured && "release-note--featured",
                index === 0 && "sm:col-span-2",
              )}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.18), duration: reduceMotion ? 0 : 0.22 }}
            >
              <div className="flex items-start gap-3">
                <span className={cn("release-note__icon mt-1", toneStyles[note.tone])} aria-hidden="true">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2">
                    {featured ? <span className={cn("size-1.5 rotate-45 bg-current", toneStyles[note.tone])} aria-hidden="true" /> : null}
                    <h4 className="font-bold text-[#eee3cf]">{note.title}</h4>
                  </div>
                  <p className="text-sm leading-6 text-[#bdb4a7]">{note.description}</p>
                </div>
              </div>
              <span className={cn("pointer-events-none absolute -bottom-12 -left-10 size-28 rounded-full bg-current opacity-[.025] blur-xl", toneStyles[note.tone])} aria-hidden="true" />
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
