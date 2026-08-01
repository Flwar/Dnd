"use client";

import { motion } from "framer-motion";
import { Crown, ShieldCheck, Sparkles } from "lucide-react";
import { currentRelease } from "@/content/releases";
import { cn } from "@/lib/cn";

const toneStyles = {
  gold: "border-[#c6a15b]/35 bg-[#c6a15b]/8 text-[#f0cf82]",
  magic: "border-[#62c6df]/30 bg-[#1f6b82]/10 text-[#9eeaff]",
  success: "border-[#77b686]/30 bg-[#245b37]/10 text-[#a8d9b3]",
} as const;

const toneIcons = {
  gold: Crown,
  magic: Sparkles,
  success: ShieldCheck,
} as const;

export function ReleaseNotesPanel() {
  return (
    <div className="space-y-5">
      <header className="border-b border-[#c6a15b]/20 pb-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold tracking-[0.14em] text-[#c6a15b]">
          <span>מה חדש</span>
          <span aria-hidden="true">·</span>
          <bdi className="ltr-isolate">{currentRelease.version}</bdi>
          <span aria-hidden="true">·</span>
          <span>{currentRelease.publishedLabel}</span>
        </div>
        <h2 className="display-font text-3xl text-[#f0cf82]">{currentRelease.title}</h2>
        <p className="mt-2 leading-7 text-[#c9c0b2]">{currentRelease.summary}</p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2" aria-label="שינויים בגרסה הנוכחית">
        {currentRelease.notes.map((note, index) => {
          const Icon = toneIcons[note.tone];
          return (
            <motion.li
              key={note.title}
              className={cn("relative overflow-hidden border p-4", toneStyles[note.tone])}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.045, 0.2), duration: 0.22 }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <h3 className="font-bold text-[#eee3cf]">{note.title}</h3>
              </div>
              <p className="text-sm leading-6 text-[#bdb4a7]">{note.description}</p>
              <span className="pointer-events-none absolute -bottom-8 -left-8 size-20 rounded-full bg-current opacity-[.035] blur-xl" aria-hidden="true" />
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
