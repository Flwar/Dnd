"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, Gem, ShieldAlert, Sparkles } from "lucide-react";
import { heFormat, ui } from "@/lib/i18n";

export type HitEvent = {
  id: number;
  damage: number;
  spellName: string;
  symbol: string;
};

export function CombatOverlay({
  enemyHealth,
  hit,
}: {
  enemyHealth: number;
  hit: HitEvent | null;
}) {
  const enemyLabel = `${ui.accessibility.enemyHealth} · ${heFormat.percent(enemyHealth)}`;

  return (
    <div className="combat-layer" aria-label={ui.game.target}>
      <motion.div
        className="enemy-primary"
        animate={hit ? { scale: [1, 1.035, 1], x: [0, -3, 3, 0] } : {}}
        transition={{ duration: 0.34 }}
      >
        <div className="enemy-nameplate">
          <span className="enemy-mark" aria-hidden="true">
            <Crosshair />
          </span>
          <div>
            <strong>{enemyHealth > 0 ? ui.combat.enemy : ui.combat.defeated}</strong>
            <small>{ui.combat.enemyKind}</small>
            <div
              className="enemy-health"
              role="meter"
              aria-label={enemyLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={enemyHealth}
            >
              <motion.i animate={{ width: `${enemyHealth}%` }} />
            </div>
          </div>
        </div>
        <div className="target-reticle" aria-hidden="true">
          <span />
          <span />
          <i />
        </div>
        <AnimatePresence mode="popLayout">
          {hit ? (
            <motion.div
              key={hit.id}
              className={hit.damage >= 40 ? "floating-damage is-critical" : "floating-damage"}
              style={{ x: "-50%" }}
              initial={{ opacity: 0, y: 12, scale: 0.75 }}
              animate={{ opacity: [0, 1, 1, 0], y: -52, scale: [0.75, 1.18, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              aria-hidden="true"
            >
              <span>{hit.symbol}</span>
              <bdi>−{heFormat.number(hit.damage)}</bdi>
              <small>{hit.damage >= 40 ? ui.combat.critical : ui.combat.damage}</small>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {hit && hit.damage > 0 ? (
            <motion.div
              key={`effect-${hit.id}`}
              className="spell-impact"
              style={{ x: "-50%" }}
              initial={{ opacity: 0.9, scale: 0.2, rotate: 0 }}
              animate={{ opacity: 0, scale: 2.2, rotate: 120 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              aria-hidden="true"
            >
              <Sparkles />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <MinorEnemy className="minor-enemy-one" health={74} />
      <MinorEnemy className="minor-enemy-two" health={46} />
    </div>
  );
}

function MinorEnemy({ className, health }: { className: string; health: number }) {
  return (
    <div className={`minor-enemy ${className}`}>
      <span>
        <ShieldAlert aria-hidden="true" />
        {ui.combat.minorEnemy}
      </span>
      <div
        role="meter"
        aria-label={ui.accessibility.enemyHealth}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={health}
        aria-valuetext={`${ui.accessibility.enemyHealth} · ${heFormat.percent(health)}`}
      >
        <i style={{ width: `${health}%` }} />
      </div>
    </div>
  );
}

export function EventFeed({
  showLoot,
  systemPulse,
  onOpenInventory,
}: {
  showLoot: boolean;
  systemPulse: number;
  onOpenInventory: () => void;
}) {
  const systemText =
    systemPulse % 3 === 0
      ? ui.notifications.systemStart
      : systemPulse % 3 === 1
        ? ui.notifications.systemQuest
        : ui.notifications.systemSave;

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={systemPulse}
          className="system-message"
          style={{ x: "-50%" }}
          role="status"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          <Sparkles aria-hidden="true" />
          <span>
            <small>{ui.notifications.systemTitle}</small>
            {systemText}
          </span>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showLoot ? (
          <motion.button
            type="button"
            className="loot-toast"
            onClick={onOpenInventory}
            aria-live="polite"
            initial={{ opacity: 0, x: -40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <span className="loot-gem" aria-hidden="true">
              <Gem />
            </span>
            <span>
              <small>{ui.notifications.lootTitle}</small>
              <strong>{ui.notifications.lootItem}</strong>
              <em>{ui.notifications.lootRarity}</em>
            </span>
            <b>{ui.notifications.lootAction}</b>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}
