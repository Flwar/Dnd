"use client";

import {
  BookOpen,
  Compass,
  Heart,
  Map,
  Shield,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { heFormat, ui } from "@/lib/i18n";
import type { GamePanel } from "@/types/game";

export function VitalBars({
  health = 88,
  mana = 92,
  stamina = 68,
}: {
  health?: number;
  mana?: number;
  stamina?: number;
}) {
  const bars = [
    {
      label: ui.status.health,
      current: health,
      maximum: 100,
      progress: health,
      className: "health",
      icon: Heart,
    },
    {
      label: ui.status.mana,
      current: mana,
      maximum: 120,
      progress: (mana / 120) * 100,
      className: "mana",
      icon: Sparkles,
    },
    {
      label: ui.status.stamina,
      current: stamina,
      maximum: 80,
      progress: (stamina / 80) * 100,
      className: "stamina",
      icon: Zap,
    },
  ];

  return (
    <section className="vital-cluster" aria-label={ui.game.hudAria}>
      <div className="player-medallion" aria-label={ui.accessibility.playerPortrait}>
        <Shield aria-hidden="true" />
        <span>{heFormat.number(8)}</span>
      </div>
      <div className="vital-bars">
        {bars.map((bar) => {
          const Icon = bar.icon;
          return (
            <div className="vital-row" key={bar.label}>
              <span className="vital-label">
                <Icon aria-hidden="true" />
                {bar.label}
              </span>
              <div
                className={`vital-track ${bar.className}`}
                role="meter"
                aria-label={bar.label}
                aria-valuemin={0}
                aria-valuemax={bar.maximum}
                aria-valuenow={bar.current}
                aria-valuetext={heFormat.resource(bar.label, bar.current, bar.maximum)}
              >
                <motion.span
                  animate={{ width: `${bar.progress}%` }}
                  transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                />
                <bdi>{heFormat.fraction(bar.current, bar.maximum)}</bdi>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MiniMap({ onOpen }: { onOpen: (panel: GamePanel) => void }) {
  return (
    <button
      className="minimap"
      type="button"
      onClick={() => onOpen("map")}
      aria-label={ui.panels.map.title}
      title={ui.panels.map.title}
    >
      <div className="minimap-ring" aria-hidden="true">
        <span className="map-road road-one" />
        <span className="map-road road-two" />
        <span className="map-ruin ruin-one" />
        <span className="map-ruin ruin-two" />
        <span className="map-pin player-pin" title={ui.minimap.player} />
        <span className="map-pin quest-pin" title={ui.minimap.quest} />
        <span className="map-pin danger-pin" title={ui.minimap.danger} />
      </div>
      <span className="map-compass">
        <Compass aria-hidden="true" />
        {ui.minimap.north}
      </span>
      <span className="map-title">
        <Map aria-hidden="true" />
        {ui.minimap.title}
      </span>
    </button>
  );
}

export function QuestTracker({ onOpen }: { onOpen: (panel: GamePanel) => void }) {
  const active = ui.quests.entries[0];
  return (
    <button
      type="button"
      className="quest-tracker"
      onClick={() => onOpen("quests")}
      aria-label={ui.panels.quests.title}
    >
      <span className="tracker-heading">
        <Target aria-hidden="true" />
        {ui.game.objective}
      </span>
      <strong>{active.title}</strong>
      <span>{active.description}</span>
      <small>{active.progress}</small>
      <span className="tracker-progress" aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

export function PartyStrip({ onOpen }: { onOpen: (panel: GamePanel) => void }) {
  return (
    <section className="party-strip" aria-label={ui.panels.party.title}>
      {ui.party.members.map((member, index) => (
        <button
          key={member.name}
          type="button"
          className="party-card"
          onClick={() => onOpen("party")}
          aria-label={`${member.name} · ${member.role} · ${member.status}`}
        >
          <span className="party-avatar">{member.initials}</span>
          <span className="party-copy">
            <strong>{member.name}</strong>
            <small>{member.role}</small>
            <span className="party-health" aria-label={ui.status.health}>
              <i style={{ width: `${member.health}%` }} />
            </span>
          </span>
          {index === 0 ? <BookOpen className="party-leader" aria-hidden="true" /> : null}
        </button>
      ))}
    </section>
  );
}

export function LocationBanner() {
  return (
    <motion.div
      className="location-banner"
      style={{ x: "-50%" }}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
    >
      <span aria-hidden="true" />
      <div>
        <strong>{ui.game.location}</strong>
        <small>{ui.game.time}</small>
      </div>
      <span aria-hidden="true" />
    </motion.div>
  );
}
