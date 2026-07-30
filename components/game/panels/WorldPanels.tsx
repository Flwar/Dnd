"use client";

import {
  Anvil,
  Check,
  ChevronLeft,
  Coins,
  HandCoins,
  MessageCircle,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { heFormat, ui } from "@/lib/i18n";

export function PartyPanel() {
  const [selected, setSelected] = useState(0);
  const member = ui.party.members[selected];
  return (
    <div className="split-panel party-panel-full">
      <aside className="panel-list">
        <div className="panel-section-heading">
          <Users aria-hidden="true" />
          <div>
            <h3>{ui.party.formation}</h3>
            <p>{ui.party.inspiration}</p>
          </div>
        </div>
        {ui.party.members.map((entry, index) => (
          <button
            type="button"
            key={entry.name}
            className={selected === index ? "list-card party-list-card is-active" : "list-card party-list-card"}
            onClick={() => setSelected(index)}
          >
            <span className="list-avatar">{entry.initials}</span>
            <div>
              <strong>{entry.name}</strong>
              <small>{entry.role}</small>
              <i><b style={{ width: `${entry.health}%` }} /></i>
            </div>
            <ChevronLeft aria-hidden="true" />
          </button>
        ))}
      </aside>
      <article className="party-detail-card">
        <div className="party-large-avatar">{member.initials}</div>
        <span className="status-chip">{member.status}</span>
        <h3>{member.name}</h3>
        <p>{member.role}</p>
        <div className="party-stat-ring" style={{ "--health": heFormat.percent(member.health) } as React.CSSProperties}>
          <strong><bdi>{heFormat.percent(member.health)}</bdi></strong>
          <small>{ui.status.health}</small>
        </div>
        <div className="character-summary">
          <span><Shield aria-hidden="true" />{ui.character.summary.defense}</span>
          <span><Sparkles aria-hidden="true" />{ui.character.summary.critical}</span>
        </div>
      </article>
    </div>
  );
}

export function TradePanel() {
  const [gold, setGold] = useState(1240);
  const [notice, setNotice] = useState<string>(ui.trade.greeting);

  const buy = (name: string, price: number) => {
    if (gold < price) return;
    setGold((current) => current - price);
    setNotice(name);
  };

  return (
    <div className="trade-panel">
      <header className="merchant-header">
        <span className="merchant-avatar" aria-hidden="true"><HandCoins /></span>
        <div>
          <h3>{ui.trade.merchant}</h3>
          <p>{notice}</p>
        </div>
        <div className="gold-purse">
          <Coins aria-hidden="true" />
          <bdi>{heFormat.number(gold)}</bdi>
          <span>{ui.common.gold}</span>
        </div>
      </header>
      <div className="trade-columns">
        <section>
          <h3>{ui.trade.offer}</h3>
          <div className="trade-list">
            {ui.trade.items.map((item, index) => (
              <article key={item.name}>
                <span className="trade-item-symbol" aria-hidden="true">{index % 2 ? "◆" : "✦"}</span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.stock}</small>
                </div>
                <b><bdi>{heFormat.number(item.price)}</bdi> {ui.common.gold}</b>
                <button type="button" onClick={() => buy(item.name, item.price)}>
                  {ui.common.buy}
                </button>
              </article>
            ))}
          </div>
        </section>
        <aside className="trade-scale">
          <Coins aria-hidden="true" />
          <strong>{ui.trade.yourGold}</strong>
          <span aria-hidden="true" />
          <button
            type="button"
            className="gold-button"
            onClick={() => {
              setGold((current) => current + 42);
              setNotice(ui.trade.soldNotice);
            }}
          >
            {ui.common.sell}
          </button>
        </aside>
      </div>
    </div>
  );
}

export function CraftingPanel() {
  const [selected, setSelected] = useState(0);
  const [created, setCreated] = useState(0);
  const recipe = ui.crafting.recipes[selected];

  return (
    <div className="crafting-panel">
      <aside className="recipe-list">
        <div className="panel-section-heading">
          <Anvil aria-hidden="true" />
          <div>
            <h3>{ui.crafting.station}</h3>
            <p>{ui.crafting.materials}</p>
          </div>
        </div>
        {ui.crafting.recipes.map((entry, index) => (
          <button
            type="button"
            key={entry.name}
            className={selected === index ? "recipe-card is-active" : "recipe-card"}
            onClick={() => {
              setSelected(index);
              setCreated(0);
            }}
          >
            <span aria-hidden="true">{index === 0 ? "✹" : index === 1 ? "●" : "◆"}</span>
            <div>
              <strong>{entry.name}</strong>
              <small>{entry.cost}</small>
            </div>
            {entry.ready ? <Check aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
          </button>
        ))}
      </aside>
      <article className="craft-result">
        <div className="craft-glow" aria-hidden="true" />
        <span className="craft-rune" aria-hidden="true"><Anvil /></span>
        <h3>{recipe.name}</h3>
        <p>{recipe.description}</p>
        <div className="material-line">
          <small>{ui.crafting.materials}</small>
          <strong>{recipe.cost}</strong>
        </div>
        <button
          type="button"
          className="gold-button"
          disabled={!recipe.ready}
          onClick={() => setCreated((current) => current + 1)}
        >
          <Anvil aria-hidden="true" />
          {recipe.ready ? ui.common.create : ui.common.locked}
        </button>
        <p className="craft-notice" aria-live="polite">
          {created > 0 ? (
            <>
              <Check aria-hidden="true" />
              {ui.crafting.success} · {ui.crafting.totalCreated} <bdi>{heFormat.number(created)}</bdi>
            </>
          ) : null}
        </p>
      </article>
    </div>
  );
}

export function DialoguePanel() {
  const [choice, setChoice] = useState<number | null>(null);
  return (
    <div className="dialogue-panel">
      <aside className="dialogue-portrait">
        <span aria-hidden="true"><MessageCircle /></span>
        <h3>{ui.dialogue.speaker}</h3>
        <small>{ui.dialogue.attitude}</small>
      </aside>
      <section className="dialogue-content">
        <blockquote>{choice === null ? ui.dialogue.line : ui.dialogue.response}</blockquote>
        {choice === null ? (
          <div className="dialogue-choices">
            {ui.dialogue.choices.map((entry, index) => (
              <button type="button" key={entry} onClick={() => setChoice(index)}>
                <span><bdi>{heFormat.number(index + 1)}</bdi></span>
                <strong>{entry}</strong>
                {index === 1 ? <small>{ui.dialogue.roll}</small> : null}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" className="stone-button" onClick={() => setChoice(null)}>
            {ui.common.continue}
          </button>
        )}
      </section>
    </div>
  );
}
