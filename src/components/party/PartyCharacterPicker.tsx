"use client";

import Image from "next/image";
import { Check, Heart, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { getPartyPortraitPath } from "@/lib/party/assets";
import type { PartyCharacterOption } from "@/lib/party/types";

type Props = {
  characters: PartyCharacterOption[];
  selectedCharacterId: string;
  disabled?: boolean;
  onSelect: (characterId: string) => void;
};

export function PartyCharacterPicker({ characters, selectedCharacterId, disabled, onSelect }: Props) {
  return (
    <section aria-labelledby="party-character-title">
      <div className="mb-4">
        <p className="text-xs font-bold tracking-[0.2em] text-[#62c6df]">הגיבור שנכנס לחבורה</p>
        <h2 id="party-character-title" className="display-font text-3xl text-[#f0cf82]">בחירת דמות</h2>
        <p className="mt-1 text-sm text-[#a89f91]">
          לכל דמות יכולה להיות חבורה פעילה אחת. בזמן שהחדר פתוח אי אפשר להחליף דמות.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {characters.map((character) => {
          const selected = character.id === selectedCharacterId;
          return (
            <motion.button
              type="button"
              key={character.id}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onSelect(character.id)}
              whileTap={disabled ? undefined : { scale: 0.985 }}
              className={`relative grid min-h-28 grid-cols-[5rem_1fr] overflow-hidden border text-start transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "border-[#f0cf82]/75 bg-[#8b6b34]/20 shadow-[0_0_0_2px_rgba(198,161,91,.12)]"
                  : "border-white/10 bg-black/25 hover:border-[#c6a15b]/45"
              }`}
            >
              <span className="relative block h-full min-h-28 overflow-hidden bg-[#101318]">
                <Image
                  src={getPartyPortraitPath(character.portraitKey)}
                  alt={`דיוקן הדמות ${character.name}`}
                  fill
                  sizes="80px"
                  className="object-cover object-[center_28%]"
                />
              </span>
              <span className="flex min-w-0 flex-col justify-center p-3">
                <span className="truncate font-semibold text-[#f3e6c9]">{character.name}</span>
                <span className="text-xs text-[#a89f91]">{character.className} · דרגה <bdi className="ltr-isolate">{character.level}</bdi></span>
                <span className="mt-2 flex items-center gap-1 text-xs text-[#c9bfb0]">
                  <Heart className="size-3.5 text-[#d05b54]" aria-hidden="true" />
                  <bdi className="ltr-isolate">{character.currentHealth}/{character.maximumHealth}</bdi>
                </span>
              </span>
              {selected ? (
                <span className="absolute end-2 top-2 grid size-6 place-items-center rounded-full bg-[#c6a15b] text-[#17120b]" aria-label="הדמות נבחרה">
                  <Check className="size-4" aria-hidden="true" />
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>
      {!characters.length ? (
        <div className="grid min-h-40 place-items-center border border-dashed border-[#c6a15b]/30 bg-black/20 text-center text-[#a89f91]">
          <div><Shield className="mx-auto mb-2 size-8 text-[#c6a15b]" /><p>אין עדיין דמות זמינה למשחק מקוון.</p></div>
        </div>
      ) : null}
    </section>
  );
}
