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
      className="border-t border-[#c6a15b]/30 bg-[linear-gradient(180deg,rgba(12,14,17,.96),rgba(5,7,9,.99))] p-3 shadow-[0_20px_50px_rgba(0,0,0,.35)] backdrop-blur-md sm:p-4 lg:sticky lg:bottom-0 lg:z-20 xl:static xl:border"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="combat-actions-title" className="font-bold text-[#f0cf82]">פעולות הקרב</h2>
          <p className="text-xs text-[#9f978b]">
            {canAct ? selectedTarget ? <>מטרה: <strong className="text-[#c7eaf0]">{selectedTarget.name}</strong></> : "בחרו מטרה או פעולת הגנה" : "ממתינים לתור שלך"}
          </p>
        </div>
        {busy ? <span className="inline-flex items-center gap-2 text-sm text-[#b7dce4]" role="status"><Hourglass className="size-4 animate-pulse motion-reduce:animate-none" aria-hidden="true" />הפעולה נשלחת…</span> : null}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="יכולות המקצוע">
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
              className="group relative min-h-24 overflow-hidden border border-[#c6a15b]/30 bg-[linear-gradient(150deg,rgba(70,53,28,.5),rgba(19,22,25,.94)_55%)] p-3 text-start outline-none transition-[border-color,filter,opacity] hover:border-[#f0cf82]/70 focus-visible:ring-2 focus-visible:ring-[#70c7da] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
              aria-describedby={`${ability.id}-details`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 font-bold text-[#f5e8ce]"><Icon className="size-5 text-[#d9bf7c]" aria-hidden="true" />{ability.name}</span>
                <bdi dir="ltr" className="border border-[#62c6df]/25 bg-[#102b35]/70 px-1.5 py-0.5 text-xs tabular-nums text-[#9de4f2]">{ability.cost}</bdi>
              </span>
              <span id={`${ability.id}-details`} className="mt-2 block text-xs leading-5 text-[#aaa194]">
                {reason ?? ability.description}
              </span>
              <span className="mt-2 flex items-center justify-between text-[0.65rem] text-[#827b70]">
                <span>{targetLabels[ability.target]}</span>
                {ability.cooldown > 0 ? <span>המתנה: <bdi dir="ltr">{ability.cooldown}</bdi></span> : <span>ללא המתנה</span>}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={onDefend}
          disabled={!canAct || busy}
          className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 border border-[#8a939d]/35 bg-[#20252a] px-3 text-sm font-semibold text-[#d8dde3] outline-none transition-colors hover:border-[#c6a15b]/60 hover:text-[#f0cf82] focus-visible:ring-2 focus-visible:ring-[#70c7da] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Shield className="size-4" aria-hidden="true" /> התגוננות
        </button>
        <button
          type="button"
          onClick={onEscape}
          disabled={!canAct || busy}
          className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 border border-[#8a939d]/35 bg-[#20252a] px-3 text-sm font-semibold text-[#d8dde3] outline-none transition-colors hover:border-[#c6a15b]/60 hover:text-[#f0cf82] focus-visible:ring-2 focus-visible:ring-[#70c7da] disabled:cursor-not-allowed disabled:opacity-45"
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
              className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 border border-[#4d8467]/40 bg-[#132c24] px-3 text-sm font-semibold text-[#bde3ce] outline-none transition-colors hover:border-[#77b686] focus-visible:ring-2 focus-visible:ring-[#70c7da] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Backpack className="size-4" aria-hidden="true" />
              <span className="truncate">{option.item.name}</span>
              <bdi dir="ltr" className="text-xs text-[#86a995]">×{option.quantity}</bdi>
            </button>
          );
        })}
      </div>

      {!selectedTarget && canAct && classAbilities.some((ability) => ability.target === "enemy") ? (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[#d9bf7c]" role="status">
          <Crosshair className="size-3.5" aria-hidden="true" /> בחרו אויב כדי להפעיל יכולת התקפית
        </p>
      ) : null}
    </section>
  );
}
