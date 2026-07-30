"use client";

import {
  BookMarked,
  Check,
  Compass,
  MapPin,
  ScrollText,
  Target,
} from "lucide-react";
import { useState } from "react";
import { ui } from "@/lib/i18n";

export function QuestsPanel() {
  const [tracked, setTracked] = useState(0);
  const [selected, setSelected] = useState(0);
  return (
    <div className="split-panel quest-panel-full">
      <aside className="panel-list">
        <div className="panel-section-heading">
          <Target aria-hidden="true" />
          <div>
            <h3>{ui.quests.active}</h3>
            <p>{ui.game.objective}</p>
          </div>
        </div>
        {ui.quests.entries.map((quest, index) => (
          <button
            type="button"
            key={quest.title}
            className={selected === index ? "list-card is-active" : "list-card"}
            onClick={() => setSelected(index)}
          >
            <span>{tracked === index ? <Check aria-hidden="true" /> : <ScrollText aria-hidden="true" />}</span>
            <div>
              <strong>{quest.title}</strong>
              <small>{quest.progress}</small>
            </div>
          </button>
        ))}
      </aside>
      <article className="panel-detail quest-detail">
        <span className="detail-emblem" aria-hidden="true">
          <Target />
        </span>
        <p className="detail-kicker">
          {tracked === selected ? ui.quests.tracked : ui.quests.active}
        </p>
        <h3>{ui.quests.entries[selected].title}</h3>
        <p>{ui.quests.entries[selected].description}</p>
        <div className="quest-progress-large">
          <span>{ui.common.progress}</span>
          <strong>{ui.quests.entries[selected].progress}</strong>
          <i>
            <b style={{ width: `${54 + selected * 11}%` }} />
          </i>
        </div>
        <div className="reward-card">
          <BookMarked aria-hidden="true" />
          <span>
            <small>{ui.common.details}</small>
            <strong>{ui.quests.entries[selected].reward}</strong>
          </span>
        </div>
        <button type="button" className="gold-button" onClick={() => setTracked(selected)}>
          <Target aria-hidden="true" />
          {ui.quests.track}
        </button>
      </article>
    </div>
  );
}

export function JournalPanel() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="split-panel journal-layout">
      <aside className="panel-list journal-list">
        <div className="panel-section-heading">
          <BookMarked aria-hidden="true" />
          <div>
            <h3>{ui.panels.journal.title}</h3>
            <p>{ui.journal.subtitle}</p>
          </div>
        </div>
        {ui.journal.entries.map((entry, index) => (
          <button
            type="button"
            key={entry.title}
            className={selected === index ? "list-card is-active" : "list-card"}
            onClick={() => setSelected(index)}
          >
            <span><ScrollText aria-hidden="true" /></span>
            <div>
              <small>{entry.date}</small>
              <strong>{entry.title}</strong>
            </div>
          </button>
        ))}
      </aside>
      <article className="journal-page">
        <div className="paper-stain" aria-hidden="true" />
        <p>{ui.journal.entries[selected].date}</p>
        <h3>{ui.journal.entries[selected].title}</h3>
        <span className="ink-rule" aria-hidden="true" />
        <blockquote>{ui.journal.entries[selected].body}</blockquote>
        <div className="journal-sigil" aria-hidden="true">
          <Compass />
        </div>
      </article>
    </div>
  );
}

export function MapPanel() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="world-map-panel">
      <header>
        <div>
          <h3>{ui.map.subtitle}</h3>
          <p>{ui.map.discovered}</p>
        </div>
        <span>
          <Compass aria-hidden="true" />
          {ui.minimap.north}
        </span>
      </header>
      <div className="world-map-canvas">
        <span className="map-land land-a" aria-hidden="true" />
        <span className="map-land land-b" aria-hidden="true" />
        <span className="map-land land-c" aria-hidden="true" />
        <span className="map-path" aria-hidden="true" />
        {ui.map.regions.map((region, index) => (
          <button
            type="button"
            key={region.name}
            className={`region-pin region-${index}${selected === index ? " is-selected" : ""}`}
            onClick={() => setSelected(index)}
            aria-label={`${region.name} · ${region.state}`}
          >
            <MapPin aria-hidden="true" />
            <span>
              <strong>{region.name}</strong>
              <small>{region.state}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="map-selection">
        <Target aria-hidden="true" />
        <span>
          <strong>{ui.map.regions[selected].name}</strong>
          <small>{ui.map.regions[selected].state}</small>
        </span>
      </div>
    </div>
  );
}
