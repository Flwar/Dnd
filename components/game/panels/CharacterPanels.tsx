"use client";

import {
  Brain,
  Check,
  Flame,
  Footprints,
  Gem,
  Lock,
  Shield,
  Sparkles,
  Swords,
  WandSparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { heFormat, ui } from "@/lib/i18n";

export function CharacterPanel() {
  const [points, setPoints] = useState(2);
  const [bonuses, setBonuses] = useState<number[]>(() =>
    ui.character.attributes.map(() => 0),
  );

  const improve = (index: number) => {
    if (points <= 0) return;
    setBonuses((current) =>
      current.map((value, attributeIndex) =>
        attributeIndex === index ? value + 1 : value,
      ),
    );
    setPoints((current) => current - 1);
  };

  return (
    <div className="character-layout">
      <section className="character-portrait-card">
        <div className="character-aura" aria-hidden="true" />
        <div className="character-silhouette" aria-hidden="true">
          <Shield />
        </div>
        <span className="level-medal">{heFormat.number(8)}</span>
        <h3>{ui.character.name}</h3>
        <p>{ui.character.class}</p>
        <small>{ui.character.origin}</small>
        <div className="experience-line">
          <span>{ui.status.experience}</span>
          <i><b /></i>
        </div>
      </section>
      <section className="attribute-section">
        <header>
          <div>
            <h3>{ui.character.level}</h3>
            <p><bdi>{heFormat.number(points)}</bdi> {ui.character.availablePoints}</p>
          </div>
          <Sparkles aria-hidden="true" />
        </header>
        <div className="attribute-grid">
          {ui.character.attributes.map((attribute, index) => (
            <article key={attribute.name}>
              <span aria-hidden="true">
                {index % 3 === 0 ? <Swords /> : index % 3 === 1 ? <Footprints /> : <Brain />}
              </span>
              <small>{attribute.name}</small>
              <strong><bdi>{heFormat.number(attribute.value + bonuses[index])}</bdi></strong>
              <em><bdi>{attribute.modifier}</bdi></em>
              <button
                type="button"
                disabled={points === 0}
                onClick={() => improve(index)}
                aria-label={`${ui.common.select} · ${attribute.name}`}
              >+</button>
            </article>
          ))}
        </div>
        <div className="character-summary">
          <span><Shield aria-hidden="true" />{ui.character.summary.defense}</span>
          <span><Footprints aria-hidden="true" />{ui.character.summary.speed}</span>
          <span><Zap aria-hidden="true" />{ui.character.summary.critical}</span>
        </div>
      </section>
    </div>
  );
}

export function SkillsPanel() {
  const [selected, setSelected] = useState(0);
  const [learned, setLearned] = useState<Set<number>>(new Set());
  return (
    <div className="skill-tree-panel">
      <div className="skill-points">
        <Sparkles aria-hidden="true" />
        <strong>{ui.skills.points}</strong>
      </div>
      <div className="skill-tree-line" aria-hidden="true" />
      <div className="skill-tree">
        {ui.skills.entries.map((skill, index) => (
          <button
            type="button"
            className={`${skill.unlocked ? "skill-node" : "skill-node is-locked"}${selected === index ? " is-selected" : ""}`}
            key={skill.name}
            onClick={() => setSelected(index)}
          >
            <span aria-hidden="true">
              {skill.unlocked ? (index % 2 ? <Zap /> : <Swords />) : <Lock />}
            </span>
            <strong>{skill.name}</strong>
            <small>{skill.rank}</small>
          </button>
        ))}
      </div>
      <article className="skill-detail-card">
        <span className="detail-emblem" aria-hidden="true"><Swords /></span>
        <div>
          <small>{ui.skills.entries[selected].rank}</small>
          <h3>{ui.skills.entries[selected].name}</h3>
          <p>{ui.skills.entries[selected].description}</p>
        </div>
        <button
          className="gold-button"
          type="button"
          disabled={!ui.skills.entries[selected].unlocked}
          onClick={() =>
            setLearned((current) => new Set(current).add(selected))
          }
        >
          {!ui.skills.entries[selected].unlocked
            ? ui.common.locked
            : learned.has(selected)
              ? ui.common.selected
              : ui.skills.learn}
        </button>
      </article>
    </div>
  );
}

export function SpellsPanel() {
  const [prepared, setPrepared] = useState<Set<number>>(new Set([0, 2]));
  const toggle = (index: number) => {
    setPrepared((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="spells-panel">
      <header className="spellbook-header">
        <WandSparkles aria-hidden="true" />
        <div>
          <h3>{ui.panels.spells.title}</h3>
          <p>{ui.spells.mana}</p>
        </div>
      </header>
      <div className="spell-grid">
        {ui.spells.entries.map((spell, index) => (
          <article className={prepared.has(index) ? "spell-card is-prepared" : "spell-card"} key={spell.name}>
            <span className="spell-rune" aria-hidden="true">{spell.symbol}</span>
            <div>
              <small>{spell.school}</small>
              <h3>{spell.name}</h3>
              <p>{spell.description}</p>
              <b>{spell.cost}</b>
            </div>
            <button type="button" onClick={() => toggle(index)}>
              {prepared.has(index) ? <Check aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              {prepared.has(index) ? ui.spells.prepared : ui.spells.prepare}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ProfessionPanel() {
  return (
    <div className="profession-panel">
      <section className="profession-hero">
        <div className="profession-seal" aria-hidden="true">
          <Gem />
          <Flame />
        </div>
        <p>{ui.panels.profession.title}</p>
        <h3>{ui.profession.title}</h3>
        <strong>{ui.profession.rank}</strong>
        <span className="profession-progress"><i /></span>
        <small>{ui.profession.experience}</small>
      </section>
      <section className="profession-detail">
        <h3>{ui.profession.description}</h3>
        <div className="trait-list">
          {ui.profession.traits.map((trait, index) => (
            <article key={trait}>
              <span aria-hidden="true">{heFormat.number(index + 1)}</span>
              <div>
                <strong>{trait}</strong>
                <small>{index < 2 ? ui.common.available : ui.common.locked}</small>
              </div>
              {index < 2 ? <Check aria-hidden="true" /> : <Lock aria-hidden="true" />}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
