"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { OnlinePresenceProvider } from "@/components/providers/OnlinePresenceProvider";
import { audioManager } from "@/lib/audio/audio-manager";
import { voiceManager } from "@/lib/audio/voice-manager";
import { useSettingsStore } from "@/store/settings-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const settings = useSettingsStore();

  useEffect(() => {
    audioManager.configure({
      music: settings.musicVolume,
      effects: settings.effectsVolume,
      muted: settings.muted,
    });
    voiceManager.configure({
      volume: settings.voiceVolume,
      enabled: settings.voicesEnabled,
      muted: settings.muted,
    });
    document.documentElement.dataset.contrast = settings.highContrast ? "high" : "normal";
    document.documentElement.dataset.textScale = settings.textScale;
    document.documentElement.dataset.motion = settings.reducedMotion ? "reduced" : "full";
  }, [settings.musicVolume, settings.effectsVolume, settings.voiceVolume, settings.voicesEnabled, settings.muted, settings.highContrast, settings.textScale, settings.reducedMotion]);

  useEffect(() => {
    const unlock = () => { void audioManager.resumeRequestedAmbience(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      voiceManager.stop();
    };
  }, []);

  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? "always" : "user"}>
      <OnlinePresenceProvider>{children}</OnlinePresenceProvider>
    </MotionConfig>
  );
}
