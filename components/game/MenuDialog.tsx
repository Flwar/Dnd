"use client";

import {
  Check,
  Crown,
  Headphones,
  Lock,
  MonitorCog,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { heFormat, ui } from "@/lib/i18n";
import type { MenuDialog as MenuDialogId, SettingsState } from "@/types/game";
import { PanelWindow } from "./PanelWindow";

type MenuDialogProps = {
  dialog: MenuDialogId | null;
  settings: SettingsState;
  onSettingsChange: (settings: SettingsState) => void;
  onClose: () => void;
  onStart: () => void;
};

export function MenuDialog({
  dialog,
  settings,
  onSettingsChange,
  onClose,
  onStart,
}: MenuDialogProps) {
  const titles: Record<MenuDialogId, string> = {
    settings: ui.settings.title,
    achievements: ui.achievements.title,
    online: ui.online.title,
    exit: ui.exit.title,
  };

  return (
    <PanelWindow
      open={dialog !== null}
      title={dialog ? titles[dialog] : ui.settings.title}
      eyebrow={dialog === "settings" ? ui.settings.subtitle : undefined}
      onClose={onClose}
      size={dialog === "achievements" ? "medium" : "small"}
    >
      {dialog === "settings" ? (
        <SettingsContent settings={settings} onChange={onSettingsChange} />
      ) : null}
      {dialog === "achievements" ? <AchievementsContent /> : null}
      {dialog === "online" ? <OnlineContent onStart={onStart} /> : null}
      {dialog === "exit" ? <ExitContent onClose={onClose} /> : null}
    </PanelWindow>
  );
}

function SettingsContent({
  settings,
  onChange,
}: {
  settings: SettingsState;
  onChange: (settings: SettingsState) => void;
}) {
  const update = <Key extends keyof SettingsState>(
    key: Key,
    value: SettingsState[Key],
  ) => onChange({ ...settings, [key]: value });

  return (
    <div className="settings-stack">
      <section className="settings-section">
        <h3>
          <Headphones aria-hidden="true" />
          {ui.settings.sound}
        </h3>
        <label className="range-setting">
          <span>
            <Volume2 aria-hidden="true" />
            {ui.settings.music}
          </span>
          <bdi>{heFormat.percent(settings.music)}</bdi>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.music}
            onChange={(event) => update("music", Number(event.target.value))}
            aria-label={ui.settings.music}
          />
        </label>
        <label className="range-setting">
          <span>
            <Sparkles aria-hidden="true" />
            {ui.settings.effects}
          </span>
          <bdi>{heFormat.percent(settings.effects)}</bdi>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.effects}
            onChange={(event) => update("effects", Number(event.target.value))}
            aria-label={ui.settings.effects}
          />
        </label>
      </section>

      <section className="settings-section">
        <h3>
          <MonitorCog aria-hidden="true" />
          {ui.settings.interface}
        </h3>
        <ToggleSetting
          icon={Radio}
          label={ui.settings.largeText}
          checked={settings.largeText}
          onChange={(checked) => update("largeText", checked)}
        />
        <ToggleSetting
          icon={Sparkles}
          label={ui.settings.reducedMotion}
          checked={settings.reducedMotion}
          onChange={(checked) => update("reducedMotion", checked)}
        />
        <ToggleSetting
          icon={ShieldCheck}
          label={ui.settings.highContrast}
          checked={settings.highContrast}
          onChange={(checked) => update("highContrast", checked)}
        />
      </section>
      <p className="settings-saved">
        <Check aria-hidden="true" />
        {ui.settings.saved}
      </p>
    </div>
  );
}

function ToggleSetting({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-setting">
      <span>
        <Icon aria-hidden="true" />
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-visual" aria-hidden="true" />
      <small>{checked ? ui.settings.on : ui.settings.off}</small>
    </label>
  );
}

function AchievementsContent() {
  return (
    <div className="achievements-panel">
      <div className="achievement-summary">
        <Crown aria-hidden="true" />
        <div>
          <strong>{ui.achievements.total}</strong>
          <span>{ui.achievements.subtitle}</span>
        </div>
      </div>
      <div className="achievement-grid">
        {ui.achievements.entries.map((entry) => (
          <article
            className={entry.unlocked ? "achievement is-unlocked" : "achievement is-locked"}
            key={entry.title}
          >
            <div className="achievement-seal" aria-hidden="true">
              {entry.unlocked ? <Crown /> : <Lock />}
            </div>
            <div>
              <span className="status-chip">
                {entry.unlocked ? ui.common.available : ui.common.locked}
              </span>
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
              <small>{entry.reward}</small>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function OnlineContent({ onStart }: { onStart: () => void }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string>(ui.online.status);
  const [roomReady, setRoomReady] = useState(false);
  return (
    <div className="online-panel">
      <div className="online-emblem" aria-hidden="true">
        <Users />
      </div>
      <p>{ui.online.subtitle}</p>
      <button
        className="gold-button"
        type="button"
        onClick={() => {
          setCode(ui.online.demoCode);
          setStatus(ui.online.roomReady);
          setRoomReady(true);
        }}
      >
        <Users aria-hidden="true" />
        {ui.online.createRoom}
      </button>
      <div className="divider-label">
        <span />
        {ui.online.joinRoom}
        <span />
      </div>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length !== 6) {
            setStatus(ui.online.invalidCode);
            return;
          }
          onStart();
        }}
      >
        <label htmlFor="invite-code">{ui.online.inviteCode}</label>
        <div className="code-entry">
          <input
            id="invite-code"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            placeholder={ui.online.placeholder}
            aria-label={ui.online.inviteCode}
          />
          <button type="submit" className="stone-button">
            {ui.common.confirm}
          </button>
        </div>
      </form>
      <div className="online-status">
        <span aria-hidden="true" />
        {status}
      </div>
      {roomReady ? (
        <button type="button" className="stone-button" onClick={onStart}>
          {ui.common.continue}
        </button>
      ) : null}
      <small>{ui.online.privacy}</small>
    </div>
  );
}

function ExitContent({ onClose }: { onClose: () => void }) {
  const [safeToClose, setSafeToClose] = useState(false);
  return (
    <div className="exit-panel">
      <p>{safeToClose ? ui.exit.safe : ui.exit.description}</p>
      <div className="dialog-actions">
        {!safeToClose ? (
          <button type="button" className="gold-button" onClick={() => setSafeToClose(true)}>
            {ui.exit.returnToMenu}
          </button>
        ) : null}
        <button type="button" className="stone-button" onClick={onClose}>
          {safeToClose ? ui.common.back : ui.exit.stay}
        </button>
      </div>
    </div>
  );
}
