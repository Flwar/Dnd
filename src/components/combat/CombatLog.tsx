import { ScrollText } from "lucide-react";
import type { CombatEvent } from "@/types/game";
import { combatEventKey } from "./types";

export function CombatLog({ events }: { events: readonly CombatEvent[] }) {
  const visibleEvents = events.slice(-8).reverse();
  return (
    <section aria-labelledby="combat-log-title" className="border border-white/10 bg-black/30 p-3 sm:p-4">
      <h2 id="combat-log-title" className="mb-3 flex items-center gap-2 text-sm font-bold text-[#d9bf7c]">
        <ScrollText className="size-4" aria-hidden="true" /> יומן הקרב
      </h2>
      <ol className="max-h-44 space-y-2 overflow-y-auto pe-1 text-sm" role="log" aria-live="polite" aria-relevant="additions text">
        {visibleEvents.length > 0 ? visibleEvents.map((event, index) => (
          <li key={combatEventKey(event)} className={index === 0 ? "border-s-2 border-[#70c7da] ps-2 text-[#eee5d6]" : "ps-2 text-[#9f978b]"}>
            <span className="sr-only">אירוע {event.sequence}: </span>{event.text}
          </li>
        )) : <li className="text-[#817a70]">הקרב עומד להתחיל.</li>}
      </ol>
    </section>
  );
}
