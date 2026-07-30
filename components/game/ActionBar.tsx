"use client";

import { motion } from "framer-motion";
import {
  Anvil,
  Backpack,
  BookOpen,
  HandCoins,
  MessageCircle,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Target,
  Users,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { ui } from "@/lib/i18n";
import type { GamePanel } from "@/types/game";

const panelButtons: Array<{ id: GamePanel; icon: LucideIcon }> = [
  { id: "inventory", icon: Backpack },
  { id: "character", icon: Shield },
  { id: "skills", icon: Swords },
  { id: "spells", icon: WandSparkles },
  { id: "profession", icon: Target },
  { id: "party", icon: Users },
  { id: "quests", icon: ScrollText },
  { id: "journal", icon: BookOpen },
  { id: "trade", icon: HandCoins },
  { id: "crafting", icon: Anvil },
  { id: "dialogue", icon: MessageCircle },
];

export function ActionBar({
  onCast,
  onOpenPanel,
}: {
  onCast: (damage: number, spellName: string, symbol: string) => void;
  onOpenPanel: (panel: GamePanel) => void;
}) {
  return (
    <div className="action-area">
      <section className="ability-bar" aria-label={ui.game.quickActions}>
        {ui.combat.spells.map((spell, index) => (
          <motion.button
            type="button"
            className={`ability ability-${index + 1}`}
            key={spell.name}
            title={spell.name}
            aria-label={`${ui.combat.cast} · ${spell.name}`}
            onClick={() => onCast(spell.damage, spell.name, spell.symbol)}
            whileTap={{ scale: 0.9 }}
          >
            <span className="ability-rune" aria-hidden="true">
              {spell.symbol}
            </span>
            <small>{spell.key}</small>
            <span className="ability-name">{spell.name}</span>
          </motion.button>
        ))}
        <span className="ability-divider" aria-hidden="true" />
        <button
          type="button"
          className="ability utility-ability"
          title={ui.panels.inventory.title}
          aria-label={ui.panels.inventory.title}
          onClick={() => onOpenPanel("inventory")}
        >
          <Backpack aria-hidden="true" />
          <small>{ui.common.use}</small>
        </button>
      </section>

      <nav className="panel-dock" aria-label={ui.game.panelDock}>
        {panelButtons.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onOpenPanel(id)}
            aria-label={`${ui.game.openPanel} · ${ui.panels[id].title}`}
            title={ui.panels[id].title}
          >
            <Icon aria-hidden="true" />
            <span>{ui.panels[id].short}</span>
          </button>
        ))}
      </nav>
      <p className="action-hint">
        <Sparkles aria-hidden="true" />
        {ui.combat.actionHint}
      </p>
    </div>
  );
}
