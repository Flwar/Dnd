"use client";

export type SoundCue =
  | "hover"
  | "confirm"
  | "dice"
  | "sword"
  | "bow"
  | "magic"
  | "heal"
  | "damage"
  | "critical"
  | "quest"
  | "pickup"
  | "victory"
  | "defeat"
  | "boss"
  | "vision";

export type Ambience = "menu" | "village" | "mine" | null;

type VolumeState = { music: number; effects: number; muted: boolean };

class AudioManager {
  private context: AudioContext | null = null;
  private ambienceNodes: AudioNode[] = [];
  private ambienceGain: GainNode | null = null;
  private activeAmbience: Ambience = null;
  private volumes: VolumeState = { music: 0.35, effects: 0.65, muted: false };

  configure(next: VolumeState) {
    this.volumes = next;
    if (this.ambienceGain) {
      this.ambienceGain.gain.setTargetAtTime(
        next.muted ? 0 : next.music * 0.18,
        this.context?.currentTime ?? 0,
        0.08,
      );
    }
  }

  async unlock(): Promise<boolean> {
    if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return false;
    try {
      this.context ??= new window.AudioContext();
      if (this.context.state === "suspended") await this.context.resume();
      return true;
    } catch {
      // Audio is enhancement-only. Browsers may deny Web Audio even after interaction.
      this.context = null;
      return false;
    }
  }

  play(cue: SoundCue) {
    if (this.volumes.muted || this.volumes.effects <= 0) return;
    void this.unlock().then((unlocked) => {
      if (!unlocked) return;
      const context = this.context;
      if (!context) return;
      const now = context.currentTime;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.012, this.volumes.effects * 0.14),
        now + 0.012,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + this.duration(cue));
      gain.connect(context.destination);

      const oscillator = context.createOscillator();
      oscillator.type = this.wave(cue);
      const [start, end] = this.frequencies(cue);
      oscillator.frequency.setValueAtTime(start, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, end), now + this.duration(cue));
      oscillator.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + this.duration(cue) + 0.03);

      if (["dice", "sword", "damage", "critical", "boss"].includes(cue)) {
        this.addNoise(context, gain, now, Math.min(0.42, this.duration(cue)));
      }
    });
  }

  async setAmbience(kind: Ambience) {
    if (kind === this.activeAmbience) return;
    const unlocked = await this.unlock();
    this.stopAmbience();
    this.activeAmbience = kind;
    if (!unlocked || !kind || !this.context) return;

    const context = this.context;
    const master = context.createGain();
    master.gain.setValueAtTime(0, context.currentTime);
    master.gain.linearRampToValueAtTime(
      this.volumes.muted ? 0 : this.volumes.music * 0.18,
      context.currentTime + 1.2,
    );
    master.connect(context.destination);
    this.ambienceGain = master;

    const baseFrequency = kind === "menu" ? 54 : kind === "village" ? 82 : 41;
    for (const ratio of [1, 1.5, 2.02]) {
      const oscillator = context.createOscillator();
      const localGain = context.createGain();
      oscillator.type = kind === "mine" ? "sine" : "triangle";
      oscillator.frequency.value = baseFrequency * ratio;
      localGain.gain.value = ratio === 1 ? 0.5 : 0.13;
      oscillator.connect(localGain).connect(master);
      oscillator.start();
      this.ambienceNodes.push(oscillator, localGain);
    }
    this.ambienceNodes.push(master);
  }

  stopAmbience() {
    if (this.context && this.ambienceGain) {
      this.ambienceGain.gain.setTargetAtTime(0, this.context.currentTime, 0.12);
    }
    for (const node of this.ambienceNodes) {
      if (node instanceof OscillatorNode) {
        try {
          node.stop(this.context ? this.context.currentTime + 0.5 : 0);
        } catch {
          // הצומת כבר נעצר.
        }
      }
      window.setTimeout(() => node.disconnect(), 650);
    }
    this.ambienceNodes = [];
    this.ambienceGain = null;
    this.activeAmbience = null;
  }

  private addNoise(context: AudioContext, output: AudioNode, now: number, duration: number) {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1100;
    source.buffer = buffer;
    source.connect(filter).connect(output);
    source.start(now);
  }

  private duration(cue: SoundCue) {
    if (["victory", "defeat", "boss", "vision"].includes(cue)) return 0.85;
    if (["dice", "magic", "heal", "critical", "quest"].includes(cue)) return 0.42;
    return 0.16;
  }

  private wave(cue: SoundCue): OscillatorType {
    if (["magic", "heal", "vision", "quest"].includes(cue)) return "sine";
    if (["sword", "damage", "critical", "boss"].includes(cue)) return "sawtooth";
    return "triangle";
  }

  private frequencies(cue: SoundCue): [number, number] {
    const map: Record<SoundCue, [number, number]> = {
      hover: [320, 390],
      confirm: [260, 520],
      dice: [180, 90],
      sword: [540, 120],
      bow: [760, 260],
      magic: [240, 920],
      heal: [330, 720],
      damage: [180, 70],
      critical: [520, 95],
      quest: [392, 784],
      pickup: [440, 660],
      victory: [220, 880],
      defeat: [180, 48],
      boss: [92, 38],
      vision: [110, 880],
    };
    return map[cue];
  }
}

export const audioManager = new AudioManager();
