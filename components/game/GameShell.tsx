"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useState } from "react";
import { clearGame, defaultSnapshot, loadGame, loadSettings, saveSettings } from "@/lib/game-storage";
import type { GameSnapshot, MenuDialog as MenuDialogId, SettingsState } from "@/types/game";
import { Atmosphere } from "./Atmosphere";
import { GameWorld } from "./GameWorld";
import { MainMenu } from "./MainMenu";
import { MenuDialog } from "./MenuDialog";

const initialSettings: SettingsState = {
  music: 72,
  effects: 84,
  largeText: false,
  reducedMotion: false,
  highContrast: false,
};

export function GameShell() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [dialog, setDialog] = useState<MenuDialogId | null>(null);
  const [settings, setSettings] = useState(initialSettings);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(defaultSnapshot);

  const updateSettings = (next: SettingsState) => {
    setSettings(next);
    saveSettings(next);
  };

  const start = (mode: "new" | "continue" = "new") => {
    const restoredSettings = loadSettings(initialSettings);
    setSettings(restoredSettings);
    if (mode === "new") {
      clearGame();
      setSnapshot(defaultSnapshot);
    } else {
      setSnapshot(loadGame());
    }
    setDialog(null);
    setScreen("game");
  };

  const openDialog = (nextDialog: MenuDialogId) => {
    if (nextDialog === "settings") setSettings(loadSettings(initialSettings));
    setDialog(nextDialog);
  };

  const menuClasses = [
    "menu-scene",
    settings.largeText ? "is-large-text" : "",
    settings.highContrast ? "is-high-contrast" : "",
    settings.reducedMotion ? "is-reduced-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? "always" : "user"}>
      <AnimatePresence mode="wait">
        {screen === "menu" ? (
          <motion.div
            key="menu"
            className={menuClasses}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Atmosphere dimmed />
            <MainMenu onStart={start} onOpenDialog={openDialog} />
            <MenuDialog
              dialog={dialog}
              settings={settings}
              onSettingsChange={updateSettings}
              onClose={() => setDialog(null)}
              onStart={() => start("new")}
            />
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          >
            <GameWorld
              key={`${snapshot.enemyHealth}-${Object.keys(snapshot.equipped).length}`}
              settings={settings}
              initialSnapshot={snapshot}
              onReturnToMenu={() => setScreen("menu")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
