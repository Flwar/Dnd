"use client";

import { Menu, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveGame } from "@/lib/game-storage";
import { ui } from "@/lib/i18n";
import type { EquipmentSlot, GamePanel, GameSnapshot, SettingsState } from "@/types/game";
import { ActionBar } from "./ActionBar";
import { Atmosphere } from "./Atmosphere";
import { ChatPanel } from "./ChatPanel";
import { CombatOverlay, EventFeed, type HitEvent } from "./CombatOverlay";
import { GamePanels } from "./GamePanels";
import {
  LocationBanner,
  MiniMap,
  PartyStrip,
  QuestTracker,
  VitalBars,
} from "./HudWidgets";

export function GameWorld({
  settings,
  initialSnapshot,
  onReturnToMenu,
}: {
  settings: SettingsState;
  initialSnapshot: GameSnapshot;
  onReturnToMenu: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<GamePanel | null>(null);
  const [enemyHealth, setEnemyHealth] = useState(initialSnapshot.enemyHealth);
  const [playerHealth, setPlayerHealth] = useState(initialSnapshot.playerHealth);
  const [mana, setMana] = useState(initialSnapshot.mana);
  const [stamina, setStamina] = useState(initialSnapshot.stamina);
  const [hit, setHit] = useState<HitEvent | null>(null);
  const [showLoot, setShowLoot] = useState(false);
  const [systemPulse, setSystemPulse] = useState(0);
  const [equipped, setEquipped] = useState(initialSnapshot.equipped);

  useEffect(() => {
    saveGame({ enemyHealth, playerHealth, mana, stamina, equipped });
  }, [enemyHealth, equipped, mana, playerHealth, stamina]);

  const openPanel = useCallback((nextPanel: GamePanel) => setPanel(nextPanel), []);

  const cast = useCallback(
    (damage: number, spellName: string, symbol: string) => {
      if (damage === 0) {
        setPlayerHealth((current) => Math.min(100, current + 12));
        setSystemPulse((current) => current + 1);
        return;
      }

      if (enemyHealth <= 0) {
        setShowLoot(true);
        return;
      }

      const usesStamina = spellName === ui.combat.spells[2].name;
      if (usesStamina) {
        if (stamina < 12) return;
        setStamina((current) => Math.max(0, current - 12));
      } else {
        if (mana < 8) return;
        setMana((current) => Math.max(0, current - 8));
      }

      const id = Date.now();
      const nextHealth = Math.max(0, enemyHealth - damage);
      setEnemyHealth(nextHealth);
      setHit({ id, damage, spellName, symbol });
      setSystemPulse((current) => current + 1);
      if (nextHealth === 0) setShowLoot(true);
      window.setTimeout(() => setHit((current) => (current?.id === id ? null : current)), 950);
    },
    [enemyHealth, mana, stamina],
  );

  const moveLight = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shellRef.current || settings.reducedMotion) return;
    const x = (event.clientX / window.innerWidth) * 100;
    const y = (event.clientY / window.innerHeight) * 100;
    shellRef.current.style.setProperty("--light-x", `${x}%`);
    shellRef.current.style.setProperty("--light-y", `${y}%`);
  };

  const rootClasses = [
    "game-world",
    settings.largeText ? "is-large-text" : "",
    settings.highContrast ? "is-high-contrast" : "",
    settings.reducedMotion ? "is-reduced-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main
      ref={shellRef}
      className={rootClasses}
      onPointerMove={moveLight}
      aria-label={ui.game.hudAria}
    >
      <Atmosphere />
      <div className="dynamic-light" aria-hidden="true" />
      <LocationBanner />

      <button
        type="button"
        className="game-menu-button"
        onClick={onReturnToMenu}
        aria-label={ui.game.menu}
        title={ui.game.menu}
      >
        <Menu aria-hidden="true" />
        <span>{ui.game.menu}</span>
      </button>

      <div className="hud-minimap"><MiniMap onOpen={openPanel} /></div>
      <div className="hud-quests"><QuestTracker onOpen={openPanel} /></div>
      <div className="hud-party"><PartyStrip onOpen={openPanel} /></div>
      <div className="hud-vitals">
        <VitalBars health={playerHealth} mana={mana} stamina={stamina} />
      </div>
      <div className="hud-chat"><ChatPanel /></div>

      <button
        type="button"
        className="world-interact"
        onClick={() => openPanel("dialogue")}
      >
        <MessageCircle aria-hidden="true" />
        <span>{ui.game.interact}</span>
      </button>

      <CombatOverlay enemyHealth={enemyHealth} hit={hit} />
      <EventFeed
        showLoot={showLoot}
        systemPulse={systemPulse}
        onOpenInventory={() => {
          setShowLoot(false);
          openPanel("inventory");
        }}
      />

      <ActionBar onCast={cast} onOpenPanel={openPanel} />

      <GamePanels
        panel={panel}
        onClose={() => setPanel(null)}
        equipped={equipped}
        onEquip={(slot: EquipmentSlot, itemId: string) =>
          setEquipped((current) => ({ ...current, [slot]: itemId }))
        }
        onUnequip={(slot: EquipmentSlot) =>
          setEquipped((current) => {
            const next = { ...current };
            delete next[slot];
            return next;
          })
        }
      />
    </main>
  );
}
