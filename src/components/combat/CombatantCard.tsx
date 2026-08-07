import { motion } from "framer-motion";
import { AlertTriangle, Crosshair, Eye, Shield, Sparkles, Swords } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Combatant, StatusDefinition } from "@/types/game";
import type { CombatEnemyIntent } from "./types";
import { CombatMeter } from "./CombatMeter";

interface CombatantCardProps {
  combatant: Combatant;
  statusDefinitions: Readonly<Record<string, StatusDefinition>>;
  intent?: CombatEnemyIntent;
  selected: boolean;
  targetable: boolean;
  active: boolean;
  onTarget: (combatantId: string) => void;
}

const intentTone = {
  normal: "border-[#658c9b]/35 bg-[#18323b]/65 text-[#b7dce4]",
  danger: "border-[#bc6b3d]/50 bg-[#4a2717]/70 text-[#ffd1a5]",
  critical: "border-[#d05b54]/65 bg-[#4f171d]/80 text-[#ffc2bc]",
} as const;

export function CombatantCard({
  combatant,
  statusDefinitions,
  intent,
  selected,
  targetable,
  active,
  onTarget,
}: CombatantCardProps) {
  const telegraphed = combatant.statuses.some((status) => status.statusId === "telegraphed");
  const guarded = combatant.statuses.some((status) => status.statusId === "guarded");
  const runeExposed = combatant.statuses.some((status) => status.statusId === "exposed-rune");
  const boss = combatant.enemyId === "ancient-stone-guardian";

  return (
    <motion.button
      type="button"
      layout="position"
      disabled={!targetable || combatant.defeated}
      aria-pressed={selected}
      aria-label={`${combatant.name}, ${combatant.currentHealth} מתוך ${combatant.maximumHealth} נקודות חיים${selected ? ", נבחר כמטרה" : ""}`}
      onClick={() => onTarget(combatant.id)}
      whileHover={targetable && !combatant.defeated ? { y: -2 } : undefined}
      whileTap={targetable && !combatant.defeated ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.14 }}
      className={cn(
        "group relative w-full overflow-hidden border bg-[linear-gradient(145deg,rgba(27,31,35,.93),rgba(8,10,12,.97))] p-2 text-start shadow-[0_18px_40px_rgba(0,0,0,.34)] outline-none backdrop-blur-sm transition-[border-color,box-shadow,opacity] duration-200 focus-visible:ring-2 focus-visible:ring-[#70c7da] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090b] motion-reduce:transition-none sm:p-4",
        targetable && "cursor-crosshair hover:border-[#c6a15b]/65",
        selected && "border-[#70c7da] shadow-[0_0_0_1px_rgba(112,199,218,.2),0_18px_40px_rgba(0,0,0,.42)]",
        !selected && "border-white/12",
        active && "ring-1 ring-[#f0cf82]/45",
        combatant.defeated && "opacity-45 grayscale",
      )}
    >
      <span className="pointer-events-none absolute inset-y-0 end-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(98,198,223,.09),transparent_65%)]" />
      <header className="relative mb-1.5 flex items-start justify-between gap-1.5 sm:mb-3 sm:gap-3">
        <div>
          <p className="mb-1 hidden text-[0.65rem] font-bold tracking-[0.2em] text-[#8f877a] sm:block">
            {boss ? "שומר קדום" : combatant.kind === "enemy" ? "אויב" : "בן חבורה"}
          </p>
          <h3 className="line-clamp-2 text-xs font-bold leading-tight text-[#f3e9d9] sm:text-xl">{combatant.name}</h3>
        </div>
        {selected ? (
          <span className="inline-flex shrink-0 items-center gap-1 border border-[#70c7da]/45 bg-[#163845]/80 p-1 text-[0.62rem] text-[#b7ecf5] sm:px-2 sm:py-1 sm:text-xs">
            <Crosshair className="size-3 sm:size-3.5" aria-hidden="true" /><span className="hidden sm:inline">מטרה</span>
          </span>
        ) : null}
      </header>

      <div className="relative space-y-1 sm:space-y-2">
        <CombatMeter label="חיים" value={combatant.currentHealth} maximum={combatant.maximumHealth} tone="health" />
        {combatant.maximumResource > 0 ? (
          <CombatMeter label="משאב" value={combatant.currentResource} maximum={combatant.maximumResource} tone="resource" />
        ) : null}
      </div>

      {intent && !combatant.defeated ? (
        <div className={cn("relative mt-1.5 flex items-start gap-1 border px-1.5 py-1 text-[0.62rem] leading-4 sm:mt-3 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm", intentTone[intent.severity ?? "normal"])}>
          <Eye className="mt-0.5 size-3 shrink-0 sm:size-4" aria-hidden="true" />
          <span className="line-clamp-2"><strong className="hidden sm:inline">כוונת האויב: </strong>{intent.label}</span>
        </div>
      ) : null}

      {boss && (telegraphed || guarded || runeExposed) ? (
        <div className="relative mt-1.5 space-y-1 sm:mt-3 sm:space-y-1.5" aria-label="מכניקות שומר האבן">
          {telegraphed ? (
            <p className="flex items-center gap-1 border border-[#d05b54]/60 bg-[#551923]/80 px-1.5 py-1 text-[0.62rem] font-bold text-[#ffc4bf] sm:gap-2 sm:px-3 sm:py-2 sm:text-sm">
              <AlertTriangle className="size-3 shrink-0 sm:size-4" aria-hidden="true" /> מכת חורבן מתקרבת — התגוננו או שברו את המשמר
            </p>
          ) : null}
          {guarded ? (
            <p className="flex items-center gap-1 border border-[#9ca3af]/45 bg-[#252a30]/85 px-1.5 py-1 text-[0.62rem] text-[#d8dde3] sm:gap-2 sm:px-3 sm:py-2 sm:text-sm">
              <Shield className="size-3 shrink-0 sm:size-4" aria-hidden="true" /> משמר האבן פעיל — פגיעה כבדה תשבור אותו
            </p>
          ) : null}
          {runeExposed ? (
            <p className="flex items-center gap-1 border border-[#62c6df]/50 bg-[#123744]/85 px-1.5 py-1 text-[0.62rem] font-bold text-[#bcecf5] sm:gap-2 sm:px-3 sm:py-2 sm:text-sm">
              <Sparkles className="size-3 shrink-0 sm:size-4" aria-hidden="true" /> הרונה חשופה — השריון נחלש
            </p>
          ) : null}
        </div>
      ) : null}

      {combatant.statuses.length > 0 ? (
        <ul className="relative mt-1.5 flex max-h-7 flex-wrap gap-1 overflow-hidden sm:mt-3 sm:max-h-none sm:gap-1.5" aria-label={`השפעות פעילות על ${combatant.name}`}>
          {combatant.statuses.map((status) => {
            const definition = statusDefinitions[status.statusId];
            return (
              <li
                key={`${status.statusId}-${status.sourceCombatantId}`}
                className="inline-flex items-center gap-1 border border-[#c6a15b]/25 bg-black/35 px-1 py-0.5 text-[0.6rem] text-[#d6ccbb] sm:px-2 sm:py-1 sm:text-xs"
                title={definition?.description ?? "השפעה פעילה"}
              >
                {status.statusId === "guarded" ? <Shield className="size-3" aria-hidden="true" /> : status.statusId === "telegraphed" ? <AlertTriangle className="size-3" aria-hidden="true" /> : status.statusId === "exposed-rune" ? <Sparkles className="size-3" aria-hidden="true" /> : <Swords className="size-3" aria-hidden="true" />}
                <span>{definition?.name ?? "השפעה לא מוכרת"}</span>
                <bdi dir="ltr" className="text-[#8f877a]">{status.remainingTurns}</bdi>
              </li>
            );
          })}
        </ul>
      ) : null}
    </motion.button>
  );
}
