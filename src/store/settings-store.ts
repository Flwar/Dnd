"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TextScale = "normal" | "large" | "extra";

type SettingsState = {
  musicVolume: number;
  effectsVolume: number;
  muted: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  textScale: TextScale;
  setMusicVolume: (value: number) => void;
  setEffectsVolume: (value: number) => void;
  setMuted: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
  setTextScale: (value: TextScale) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      musicVolume: 0.35,
      effectsVolume: 0.65,
      muted: false,
      reducedMotion: false,
      highContrast: false,
      textScale: "normal",
      setMusicVolume: (musicVolume) => set({ musicVolume }),
      setEffectsVolume: (effectsVolume) => set({ effectsVolume }),
      setMuted: (muted) => set({ muted }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setTextScale: (textScale) => set({ textScale }),
    }),
    { name: "shattered-crown-device-settings", version: 1 },
  ),
);
