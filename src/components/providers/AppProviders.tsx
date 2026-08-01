"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { audioManager } from "@/lib/audio/audio-manager";
import { useSettingsStore } from "@/store/settings-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const settings = useSettingsStore();

  useEffect(() => {
    audioManager.configure({
      music: settings.musicVolume,
      effects: settings.effectsVolume,
      muted: settings.muted,
    });
    document.documentElement.dataset.contrast = settings.highContrast ? "high" : "normal";
    document.documentElement.dataset.textScale = settings.textScale;
    document.documentElement.dataset.motion = settings.reducedMotion ? "reduced" : "full";
  }, [settings.musicVolume, settings.effectsVolume, settings.muted, settings.highContrast, settings.textScale, settings.reducedMotion]);

  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
