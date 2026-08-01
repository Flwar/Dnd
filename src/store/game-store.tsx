"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createStore, useStore } from "zustand";
import type { CombatState, DiceResult, Notification, SaveData } from "@/types/game";

export type GamePanel = "inventory" | "character" | "quests" | "map" | "journal" | "settings" | "merchant" | null;

export interface DicePresentation {
  result: DiceResult;
  skillLabel: string;
}

interface GameState {
  save: SaveData;
  expectedSaveVersion: number;
  checkpoint: SaveData;
  dialogueNodeId: string | null;
  combat: CombatState | null;
  dice: DicePresentation | null;
  activePanel: GamePanel;
  notifications: Notification[];
  saveStatus: "idle" | "saving" | "saved" | "offline" | "conflict" | "error";
  cinematicOpen: boolean;
  chapterComplete: boolean;
  replaceSave: (save: SaveData) => void;
  updateSave: (updater: (save: SaveData) => SaveData) => void;
  setExpectedSaveVersion: (version: number) => void;
  setCheckpoint: (save?: SaveData) => void;
  restoreCheckpoint: () => void;
  setDialogueNodeId: (nodeId: string | null) => void;
  setCombat: (combat: CombatState | null) => void;
  setDice: (dice: DicePresentation | null) => void;
  setActivePanel: (panel: GamePanel) => void;
  addNotification: (notification: Notification) => void;
  dismissNotification: (id: string) => void;
  setSaveStatus: (status: GameState["saveStatus"]) => void;
  setCinematicOpen: (open: boolean) => void;
  setChapterComplete: (complete: boolean) => void;
}

function cloneSave(save: SaveData): SaveData {
  return structuredClone(save);
}

function createGameStore(initialSave: SaveData, expectedSaveVersion: number) {
  return createStore<GameState>((set) => ({
    save: cloneSave(initialSave),
    expectedSaveVersion,
    checkpoint: cloneSave(initialSave),
    dialogueNodeId: null,
    combat: null,
    dice: null,
    activePanel: null,
    notifications: [],
    saveStatus: "idle",
    cinematicOpen: !Boolean(initialSave.story.flags.opening_cinematic_seen),
    chapterComplete: Boolean(initialSave.story.flags.chapter_one_completed),
    replaceSave: (save) => set({ save: cloneSave(save) }),
    updateSave: (updater) => set((state) => ({ save: updater(state.save) })),
    setExpectedSaveVersion: (version) => set({ expectedSaveVersion: version }),
    setCheckpoint: (save) => set((state) => ({ checkpoint: cloneSave(save ?? state.save) })),
    restoreCheckpoint: () => set((state) => ({ save: cloneSave(state.checkpoint), combat: null, dice: null })),
    setDialogueNodeId: (nodeId) => set({ dialogueNodeId: nodeId }),
    setCombat: (combat) => set({ combat }),
    setDice: (dice) => set({ dice }),
    setActivePanel: (panel) => set({ activePanel: panel }),
    addNotification: (notification) =>
      set((state) => {
        const duplicate = notification.deduplicationKey
          ? state.notifications.some((item) => item.deduplicationKey === notification.deduplicationKey)
          : false;
        if (duplicate) return state;
        return { notifications: [...state.notifications.slice(-3), notification] };
      }),
    dismissNotification: (id) => set((state) => ({ notifications: state.notifications.filter((item) => item.id !== id) })),
    setSaveStatus: (status) => set({ saveStatus: status }),
    setCinematicOpen: (open) => set({ cinematicOpen: open }),
    setChapterComplete: (complete) => set({ chapterComplete: complete }),
  }));
}

type GameStore = ReturnType<typeof createGameStore>;
const GameStoreContext = createContext<GameStore | null>(null);

export function GameStoreProvider({
  children,
  initialSave,
  expectedSaveVersion,
}: {
  children: ReactNode;
  initialSave: SaveData;
  expectedSaveVersion: number;
}) {
  const [store] = useState(() => createGameStore(initialSave, expectedSaveVersion));
  return <GameStoreContext.Provider value={store}>{children}</GameStoreContext.Provider>;
}

export function useGameStore<T>(selector: (state: GameState) => T): T {
  const store = useContext(GameStoreContext);
  if (!store) throw new Error("GameStoreProvider is missing.");
  return useStore(store, selector);
}
