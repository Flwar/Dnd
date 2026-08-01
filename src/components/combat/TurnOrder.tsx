import { Crown, Skull, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CombatState } from "@/types/game";
import { CombatMeter } from "./CombatMeter";

interface TurnOrderProps {
  state: CombatState;
  playerCombatantId: string;
}

export function TurnOrder({ state, playerCombatantId }: TurnOrderProps) {
  const activeId = state.turnOrder[state.activeTurnIndex];

  return (
    <section aria-labelledby="combat-turn-order-title" className="border-b border-[#c6a15b]/20 bg-black/35 px-3 py-3 backdrop-blur-sm sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="combat-turn-order-title" className="text-xs font-bold tracking-[0.18em] text-[#d9bf7c]">סדר התורות</h2>
        <p className="text-xs text-[#9f978b]">סיבוב <bdi dir="ltr" className="text-[#e8dfce]">{state.round}</bdi></p>
      </div>
      <ol className="flex snap-x gap-2 overflow-x-auto pb-1" aria-label="סדר הלחימה הנוכחי">
        {state.turnOrder.map((combatantId, index) => {
          const combatant = state.combatants[combatantId];
          if (!combatant) return null;
          const active = combatantId === activeId;
          const isPlayer = combatantId === playerCombatantId;
          const boss = combatant.enemyId === "ancient-stone-guardian";
          return (
            <li
              key={combatantId}
              aria-current={active ? "step" : undefined}
              className={cn(
                "relative min-w-36 snap-start border bg-[#0d1013]/90 px-3 py-2 transition-[border-color,opacity,transform] duration-200 motion-reduce:transition-none",
                active ? "-translate-y-0.5 border-[#f0cf82] shadow-[0_0_18px_rgba(198,161,91,.2)] motion-reduce:translate-y-0" : "border-white/10",
                combatant.defeated && "opacity-45 grayscale",
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                {boss ? <Crown className="size-4 text-[#d9bf7c]" aria-hidden="true" /> : combatant.kind === "enemy" ? <Skull className="size-4 text-[#d26467]" aria-hidden="true" /> : <UserRound className="size-4 text-[#70c7da]" aria-hidden="true" />}
                <span className="truncate text-sm font-semibold text-[#eee5d6]">{combatant.name}{isPlayer ? " — הדמות שלך" : ""}</span>
              </div>
              <CombatMeter label={`חיים של ${combatant.name}`} value={combatant.currentHealth} maximum={combatant.maximumHealth} tone="health" compact />
              <span className="absolute end-2 top-1 text-[0.65rem] text-[#817a70]" aria-hidden="true"><bdi dir="ltr">{index + 1}</bdi></span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
