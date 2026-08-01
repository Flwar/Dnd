"use client";

export type NpcVoiceProfile = {
  rate: number;
  pitch: number;
  voiceOffset: number;
};

export const npcVoiceProfiles: Record<string, NpcVoiceProfile> = {
  elric: { rate: 0.84, pitch: 0.72, voiceOffset: 0 },
  mira: { rate: 0.96, pitch: 0.86, voiceOffset: 1 },
  thal: { rate: 0.78, pitch: 0.96, voiceOffset: 2 },
  brom: { rate: 1.08, pitch: 1.04, voiceOffset: 3 },
  danor: { rate: 1.01, pitch: 1.14, voiceOffset: 4 },
  "grey-woman": { rate: 0.72, pitch: 1.28, voiceOffset: 5 },
};

const defaultProfile: NpcVoiceProfile = { rate: 0.92, pitch: 1, voiceOffset: 0 };

export type VoicePlaybackResult = "started" | "disabled" | "unsupported" | "failed";

export function isHebrewVoice(voice: Pick<SpeechSynthesisVoice, "lang">): boolean {
  return /^he(?:-|$)/i.test(voice.lang);
}

export function selectHebrewVoice(
  voices: readonly SpeechSynthesisVoice[],
  npcId: string,
): SpeechSynthesisVoice | null {
  const hebrewVoices = voices.filter(isHebrewVoice);
  if (hebrewVoices.length === 0) return null;
  const profile = npcVoiceProfiles[npcId] ?? defaultProfile;
  return hebrewVoices[profile.voiceOffset % hebrewVoices.length] ?? hebrewVoices[0];
}

class VoiceManager {
  private volume = 0.85;
  private enabled = true;
  private muted = false;
  private playbackToken = 0;

  configure({ volume, enabled, muted }: { volume: number; enabled: boolean; muted: boolean }) {
    this.volume = Math.min(1, Math.max(0, volume));
    this.enabled = enabled;
    this.muted = muted;
    if (!enabled || muted || this.volume === 0) this.stop();
  }

  async speak(
    npcId: string,
    text: string,
    callbacks: { onStart?: () => void; onEnd?: () => void; onError?: () => void } = {},
  ): Promise<VoicePlaybackResult> {
    if (!this.enabled || this.muted || this.volume === 0) return "disabled";
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof window.SpeechSynthesisUtterance === "undefined"
    ) return "unsupported";

    const synthesis = window.speechSynthesis;
    this.stop();
    const token = ++this.playbackToken;
    const voices = await this.loadVoices(synthesis);
    if (token !== this.playbackToken) return "failed";
    const voice = selectHebrewVoice(voices, npcId);
    if (!voice) return "unsupported";

    try {
      const profile = npcVoiceProfiles[npcId] ?? defaultProfile;
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = voice.lang || "he-IL";
      utterance.voice = voice;
      utterance.rate = profile.rate;
      utterance.pitch = profile.pitch;
      utterance.volume = this.volume;
      utterance.onstart = () => {
        if (token === this.playbackToken) callbacks.onStart?.();
      };
      utterance.onend = () => {
        if (token === this.playbackToken) callbacks.onEnd?.();
      };
      utterance.onerror = () => {
        if (token === this.playbackToken) callbacks.onError?.();
      };
      synthesis.speak(utterance);
      return "started";
    } catch {
      callbacks.onError?.();
      return "failed";
    }
  }

  stop() {
    this.playbackToken += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch { /* optional browser enhancement */ }
    }
  }

  private async loadVoices(synthesis: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
    const immediate = synthesis.getVoices();
    if (immediate.length > 0) return immediate;
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        synthesis.removeEventListener("voiceschanged", finish);
        resolve(synthesis.getVoices());
      };
      synthesis.addEventListener("voiceschanged", finish, { once: true });
      window.setTimeout(finish, 750);
    });
  }
}

export const voiceManager = new VoiceManager();
