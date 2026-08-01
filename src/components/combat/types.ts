import type { Ability, CombatEvent, CombatState, Item, StatusDefinition } from "@/types/game";

export interface CombatConsumableOption {
  entryId: string;
  item: Item;
  quantity: number;
  unavailableReason?: string;
}

export interface CombatEnemyIntent {
  abilityId?: string;
  label: string;
  severity?: "normal" | "danger" | "critical";
}

export interface CombatUIProps {
  state: CombatState;
  playerCombatantId: string;
  abilities: Readonly<Record<string, Ability>>;
  items: readonly CombatConsumableOption[];
  statusDefinitions: Readonly<Record<string, StatusDefinition>>;
  enemyIntents?: Readonly<Record<string, CombatEnemyIntent>>;
  selectedTargetId: string | null;
  objective: string;
  tutorialHints?: readonly string[];
  busy?: boolean;
  reducedMotion?: boolean;
  onAbility: (abilityId: string, targetIds: string[]) => void;
  onTarget: (combatantId: string) => void;
  onDefend: () => void;
  onConsumable: (entryId: string, targetId: string) => void;
  onEscape: () => void;
  onRetry: () => void;
  onContinue: () => void;
}

export function combatEventKey(event: CombatEvent): string {
  return `${event.sequence}-${event.kind}`;
}
