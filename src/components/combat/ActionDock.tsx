import { motion } from "framer-motion";
import {
  Backpack,
  Crosshair,
  Footprints,
  HeartPulse,
  Hourglass,
  Shield,
  Swords,
  WandSparkles,
} from "lucide-react";
import type { Ability, Combatant } from "@/types/game";
import type { CombatConsumableOption } from "./types";

interface ActionDockProps {
  player: Combatant;
  selectedTarget: Combatant | null;
  livingEnemies: readonly Combatant[];
  abilities: Readonly<Record<string, Ability>>;
  items: readonly CombatConsumableOption[];
  canAct: boolean;
  busy: boolean;
  onAbility: (abilityId: string, targetIds: string[]) => void;
  onDefend: () => void;
  onConsumable: (entryId: string, targetId: string) => void;
  onEscape: () => void;
}

const targetLabels = {
  self: "עצמי",
  ally: "בן חבורה",
  enemy: "אויב",
  "all-enemies": "כל האויבים",
} as const;

function targetsForAbility(
  ability: Ability,
  player: Combatant,
  selectedTarget: Combatant | null,
  livingEnemies: readonly Combatant[],
): string[] {
  if (ability.target === "self") return [player.id];
  if (ability.target === "all-enemies") return livingEnemies.map((enemy) => enemy.id);
  if (ability.target === "ally") {
    return [selectedTarget?.kind === "player" && !selectedTarget.defeated ? selectedTarget.id : player.id];
  }
  return selectedTarget?.kind === "enemy" && !selectedTarget.defeated ? [selectedTarget.id] : [];
}

function unavailableReason(
  ability: Ability,
  player: Combatant,
  targets: readonly string[],
  selectedTarget: Combatant | null,
): string | null {
  if (player.currentResource < ability.cost) return "אין די משאב";
  const cooldown = player.cooldowns[ability.id] ?? 0;
  if (cooldown > 0) return `זמין בעוד ${cooldown} תורות`;
  if (ability.target === "enemy" && targets.length === 0) return "יש לבחור אויב כמטרה";
  if (ability.target === "all-enemies" && targets.length === 0) return "אין אויבים זמינים";
  if (ability.availability.kind === "health-below" && player.currentHealth / player.maximumHealth >= ability.availability.percentage) {
    return "החיים עדיין גבוהים מדי להפעלה";
  }
  if (ability.availability.kind === "self-status-absent") {
    const statusId = ability.availability.statusId;
    if (player.statuses.some((status) => status.statusId === statusId)) return "ההשפעה כבר פעילה";
  }
  if (ability.availability.kind === "target-status") {
    const statusId = ability.availability.statusId;
    if (!selectedTarget?.statuses.some((status) => status.statusId === statusId)) return "המטרה אינה נושאת את ההשפעה הנדרשת";
  }
  return null;
}

function abilityIcon(ability: Ability) {
  if (ability.healingFormula) return HeartPulse;
  if (ability.formula?.damageType === "arcane" || ability.formula?.damageType === "fire" || ability.formula?.damageType === "cold") return WandSparkles;
  if (ability.target === "self" || ability.target === "ally") return Shield;
  return Swords;
}

export function ActionDock({
  player,
  selectedTarget,
  livingEnemies,
  abilities,
  items,
  canAct,
  busy,
  onAbility,
  onDefend,
  onConsumable,
  onEscape,
}: ActionDockProps) {
  const classAbilities = player.abilityIds.slice(0, 3).map((abilityId) => abilities[abilityId]).filter((ability): ability is Ability => Boolean(ability));

  return (
    <section
      aria-labelledby="combat-actions-title"
      className="mx-auto w-full max-w-[96rem] bg-[linear-gradient(180deg,rgba(12,14,17,.96),rgba(5,7,9,.99))] p-2.5 shadow-[0_-18px_44px_rgba(0,0,0,.38)] backdrop-blur-md sm:p-4"
    >
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
        <div>
          <h2 id="combat-actions-title" className="text-sm font-bold text-[#f0cf82] sm:text-base">פעולות הקרב</h2>
          <p className="max-w-[70vw] truncate text-[0.7rem] text-[#9f978b] sm:max-w-none sm:text-xs">
            {canAct ? selectedTarget ? <>מטרה: <strong className="text-[#c7eaf0]">{selectedTarget.name}</strong></> : "בחרו מטרה או פעולת הגנה" : "ממתינים לתור שלך"}
          </p>
        </div>
        {busy ? <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[#b7dce4] sm:gap-2 sm:text-sm" role="status"><Hourglass className="size-4 animate-pulse motion-reduce:animate-none" aria-hidden="true" /><span className="hidden sm:inline">הפעולה נשלחת…</span><span className="sm:hidden">שולחים…</span></span> : null}
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2" aria-label="יכולות המקצוע">
        {classAbilities.map((ability) => {
          const targets = targetsForAbility(ability, player, selectedTarget, livingEnemies);
          const reason = unavailableReason(ability, player, targets, selectedTarget);
          const Icon = abilityIcon(ability);
          const disabled = !canAct || busy || Boolean(reason);
          return (
            <motion.button
              key={ability.id}
              type="button"
              disabled={disabled}
              onClick={() => onAbility(ability.id, targets)}
              whileHover={!disabled ? { y: -2 } : undefined}
              whileTap={!disabled ? { scale: 0.985 } : undefined}
              transition={{ duration: 0.12 }}
              className="group relative min-h-[4.5rem] overflow-hidden border border-[#c6a15b]/30 bg-[linear-gradient(150deg,rgba(70,53,28,.5),rgba(19,22,25,.94)_55%)] p-2 text-center outline-none transition-[border-color,filter,opacity] hover:border-[#f0cf82]/70 focus-visible:ring-2 focus-visible:ring-[#70c7da] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none sm:min-h-24 sm:p-3 sm:text-start"
              aria-describedby={`${ability.id}-details`}
              title={reason ?? ability.description}
            >
              <span className="flex flex-col items-center gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <span className="flex min-w-0 flex-col items-center gap-0.5 text-[0.7rem] font-bold leading-tight text-[#f5e8ce] sm:flex-row sm:gap-2 sm:text-base"><Icon className="size-4 shrink-0 text-[#d9bf7c] sm:size-5" aria-hidden="true" /><span className="line-clamp-2">{ability.name}</span></span>
                <bdi dir="ltr" className="border border-[#62c6df]/25 bg-[#102b35]/70 px-1 py-0 text-[0.65rem] tabular-nums text-[#9de4f2] sm:px-1.5 sm:py-0.5 sm:text-xs">{ability.cost}</bdi>
              </span>
              <span id={`${ability.id}-details`} className="sr-only sm:not-sr-only sm:mt-2 sm:block sm:text-xs sm:leading-5 sm:text-[#aaa194]">
                {reason ?? ability.description}
              </span>
              <span className="mt-2 hidden items-center justify-between text-[0.65rem] text-[#827b70] sm:flex">
                <span>{targetLabels[ability.target]}</span>
                {ability.cooldown > 0 ? <span>המתנה: <bdi dir="ltr">{ability.cooldown}</bdi></span> : <span>ללא המתנה</span>}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:mt-2 sm:grid-cols-4 sm:gap-2">
        <button
          type="button"
          onClick={onDefend}
          disabled={!canAct || busy}
          className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 border border-[#8a939d]/35 bg-[#20252a] px-2 text-xs font-semibold text-[#d8dde3] outline-none transition-colors hover:border-[#c6a15b]/60 hover:text-[#f0cf82] focus-visible:ring-2 focus-visible:ring-[#70c7da] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-12 sm:gap-2 sm:px-3 sm:text-sm"
        >
          <Shield className="size-4" aria-hidden="true" /> התגוננות
        </button>
        <button
          type="button"
          onClick={onEscape}
          disabled={!canAct || busy}
          className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 border border-[#8a939d]/35 bg-[#20252a] px-2 text-xs font-semibold text-[#d8dde3] outline-none transition-colors hover:border-[#c6a15b]/60 hover:text-[#f0cf82] focus-visible:ring-2 focus-visible:ring-[#70c7da] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-12 sm:gap-2 sm:px-3 sm:text-sm"
        >
          <Footprints className="size-4" aria-hidden="true" /> נסיגה
        </button>
        {items.slice(0, 2).map((option) => {
          const targetId = selectedTarget?.kind === "player" ? selectedTarget.id : player.id;
          const disabled = !canAct || busy || option.quantity <= 0 || Boolean(option.unavailableReason);
          return (
            <button
              key={option.entryId}
              type="button"
              onClick={() => onConsumable(option.entryId, targetId)}
              disabled={disabled}
              title={option.unavailableReason ?? option.item.description}
              className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 border border-[#4d8467]/40 bg-[#132c24] px-2 text-xs font-semibold text-[#bde3ce] outline-none transition-colors hover:border-[#77b686] focus-visible:ring-2 focus-visible:ring-[#70c7da] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-12 sm:gap-2 sm:px-3 sm:text-sm"
            >
              <Backpack className="size-4" aria-hidden="true" />
              <span className="truncate">{option.item.name}</span>
              <bdi dir="ltr" className="text-xs text-[#86a995]">×{option.quantity}</bdi>
            </button>
          );
        })}
      </div>

      {!selectedTarget && canAct && classAbilities.some((ability) => ability.target === "enemy") ? (
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[0.7rem] text-[#d9bf7c] sm:mt-3 sm:gap-2 sm:text-xs" role="status">
          <Crosshair className="size-3.5" aria-hidden="true" /> בחרו אויב כדי להפעיל יכולת התקפית
        </p>
      ) : null}
    </section>
  );
}
