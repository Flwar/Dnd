import type { GameSnapshot, SettingsState } from "@/types/game";

const gameKey = "gates-of-fate-save-v1";
const settingsKey = "gates-of-fate-settings-v1";

export const defaultSnapshot: GameSnapshot = {
  enemyHealth: 100,
  playerHealth: 88,
  mana: 92,
  stamina: 68,
  equipped: {},
};

export function loadGame(): GameSnapshot {
  return readJson<GameSnapshot>(gameKey, defaultSnapshot);
}

export function saveGame(snapshot: GameSnapshot) {
  window.localStorage.setItem(gameKey, JSON.stringify(snapshot));
}

export function clearGame() {
  window.localStorage.removeItem(gameKey);
}

export function loadSettings(fallback: SettingsState): SettingsState {
  return readJson<SettingsState>(settingsKey, fallback);
}

export function saveSettings(settings: SettingsState) {
  window.localStorage.setItem(settingsKey, JSON.stringify(settings));
}

function readJson<Value extends object>(key: string, fallback: Value): Value {
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(value) as Partial<Value>) };
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}
