"use client";

import { soundtrackProfiles, type SoundtrackKind } from "@/lib/audio/soundtrack-profiles";

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

export type Ambience = SoundtrackKind | null;

type VolumeState = { music: number; effects: number; muted: boolean };

type ActiveSoundtrack = {
  kind: SoundtrackKind;
  master: GainNode;
  nodes: Set<AudioNode>;
  intervals: Set<number>;
  timeouts: Set<number>;
  motifIndex: number;
};

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

class AudioManager {
  private context: AudioContext | null = null;
  private soundtrack: ActiveSoundtrack | null = null;
  private requestedAmbience: Ambience = null;
  private volumes: VolumeState = { music: 0.35, effects: 0.65, muted: false };

  configure(next: VolumeState) {
    this.volumes = {
      music: clampVolume(next.music),
      effects: clampVolume(next.effects),
      muted: next.muted,
    };
    if (this.soundtrack && this.context) {
      this.soundtrack.master.gain.setTargetAtTime(
        this.soundtrackVolume(),
        this.context.currentTime,
        0.08,
      );
    }
  }

  async unlock(): Promise<boolean> {
    if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return false;
    try {
      this.context ??= new window.AudioContext({ latencyHint: "interactive" });
      if (this.context.state === "suspended") await this.context.resume();
      return this.context.state === "running";
    } catch {
      // Browsers can reject Web Audio until a trusted user gesture.
      return false;
    }
  }

  async resumeRequestedAmbience(): Promise<void> {
    const kind = this.requestedAmbience;
    if (!kind || this.soundtrack?.kind === kind) return;
    if (await this.unlock()) this.activateSoundtrack(kind);
  }

  play(cue: SoundCue) {
    if (this.volumes.muted || this.volumes.effects <= 0) return;
    void this.unlock().then((unlocked) => {
      if (!unlocked || !this.context) return;
      const context = this.context;
      const now = context.currentTime;
      const duration = this.duration(cue);
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(
        Math.max(0.012, this.volumes.effects * 0.14),
        now + 0.012,
      );
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      master.connect(context.destination);

      const [start, end] = this.frequencies(cue);
      const oscillator = context.createOscillator();
      oscillator.type = this.wave(cue);
      oscillator.frequency.setValueAtTime(start, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, end), now + duration);
      oscillator.connect(master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.03);

      if (["magic", "heal", "critical", "quest", "victory", "vision"].includes(cue)) {
        const harmonic = context.createOscillator();
        const harmonicGain = context.createGain();
        harmonic.type = "sine";
        harmonic.frequency.setValueAtTime(start * 1.5, now);
        harmonic.frequency.exponentialRampToValueAtTime(Math.max(45, end * 2), now + duration);
        harmonicGain.gain.value = 0.28;
        harmonic.connect(harmonicGain).connect(master);
        harmonic.start(now + 0.025);
        harmonic.stop(now + duration);
        harmonic.onended = () => harmonicGain.disconnect();
      }

      if (["dice", "sword", "bow", "damage", "critical", "boss"].includes(cue)) {
        this.addNoise(context, master, now, Math.min(0.5, duration), cue === "bow" ? 2_600 : 1_100);
      }

      oscillator.onended = () => {
        oscillator.disconnect();
        master.disconnect();
      };
    });
  }

  async setAmbience(kind: Ambience) {
    this.requestedAmbience = kind;
    if (!kind) {
      this.stopAmbience();
      return;
    }
    if (kind === this.soundtrack?.kind) return;
    if (await this.unlock()) this.activateSoundtrack(kind);
  }

  stopAmbience(expectedKind?: SoundtrackKind) {
    if (expectedKind && this.soundtrack?.kind !== expectedKind) return;
    if (!expectedKind || this.requestedAmbience === expectedKind) this.requestedAmbience = null;
    const previous = this.soundtrack;
    this.soundtrack = null;
    if (previous) this.disposeSoundtrack(previous, 0.55);
  }

  private activateSoundtrack(kind: SoundtrackKind) {
    if (!this.context || this.requestedAmbience !== kind || this.soundtrack?.kind === kind) return;
    const previous = this.soundtrack;
    const context = this.context;
    const profile = soundtrackProfiles[kind];
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, this.soundtrackVolume()),
      context.currentTime + 1.1,
    );
    compressor.threshold.value = -24;
    compressor.knee.value = 20;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.08;
    compressor.release.value = 0.8;
    master.connect(compressor).connect(context.destination);

    const active: ActiveSoundtrack = {
      kind,
      master,
      nodes: new Set<AudioNode>([master, compressor]),
      intervals: new Set<number>(),
      timeouts: new Set<number>(),
      motifIndex: 0,
    };

    profile.chord.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const filter = context.createBiquadFilter();
      const localGain = context.createGain();
      const lfo = context.createOscillator();
      const lfoDepth = context.createGain();
      oscillator.type = kind === "mine" || kind === "boss" ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = (index - 1.5) * 2.5;
      filter.type = "lowpass";
      filter.frequency.value = profile.filterFrequency * (0.7 + index * 0.12);
      filter.Q.value = 0.7;
      localGain.gain.value = profile.droneVolume / (index === 0 ? 1 : 2.4 + index * 0.5);
      lfo.frequency.value = 0.045 + index * 0.012;
      lfoDepth.gain.value = localGain.gain.value * 0.22;
      lfo.connect(lfoDepth).connect(localGain.gain);
      oscillator.connect(filter).connect(localGain).connect(master);
      oscillator.start();
      lfo.start();
      active.nodes.add(oscillator);
      active.nodes.add(filter);
      active.nodes.add(localGain);
      active.nodes.add(lfo);
      active.nodes.add(lfoDepth);
    });

    this.addLoopingAtmosphere(active, profile.noiseVolume, profile.filterFrequency);
    const pulse = () => this.scheduleMotif(active);
    const firstPulse = window.setTimeout(pulse, kind === "combat" || kind === "boss" ? 180 : 650);
    const interval = window.setInterval(pulse, profile.pulseSeconds * 1_000);
    active.timeouts.add(firstPulse);
    active.intervals.add(interval);
    this.soundtrack = active;

    if (previous) this.disposeSoundtrack(previous, 1.15);
  }

  private scheduleMotif(active: ActiveSoundtrack) {
    if (!this.context || this.soundtrack !== active) return;
    const context = this.context;
    const profile = soundtrackProfiles[active.kind];
    const now = context.currentTime;
    const frequency = profile.motif[active.motifIndex % profile.motif.length];
    active.motifIndex += 1;

    const oscillator = context.createOscillator();
    const overtone = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = active.kind === "combat" || active.kind === "boss" ? "sawtooth" : "sine";
    oscillator.frequency.value = frequency;
    overtone.type = "sine";
    overtone.frequency.value = frequency * 2.01;
    filter.type = "lowpass";
    filter.frequency.value = profile.filterFrequency * 1.25;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(profile.motifVolume, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.noteDuration);
    oscillator.connect(filter);
    overtone.connect(filter);
    filter.connect(gain).connect(active.master);
    oscillator.start(now);
    overtone.start(now + 0.018);
    oscillator.stop(now + profile.noteDuration + 0.05);
    overtone.stop(now + profile.noteDuration);
    for (const node of [oscillator, overtone, filter, gain]) active.nodes.add(node);
    oscillator.onended = () => {
      for (const node of [oscillator, overtone, filter, gain]) {
        active.nodes.delete(node);
        try { node.disconnect(); } catch { /* already disconnected */ }
      }
    };

    if (profile.percussion) this.schedulePercussion(active, now);
  }

  private schedulePercussion(active: ActiveSoundtrack, now: number) {
    if (!this.context) return;
    const kick = this.context.createOscillator();
    const gain = this.context.createGain();
    kick.type = "sine";
    kick.frequency.setValueAtTime(active.kind === "boss" ? 74 : 92, now);
    kick.frequency.exponentialRampToValueAtTime(38, now + 0.32);
    gain.gain.setValueAtTime(active.kind === "boss" ? 0.22 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    kick.connect(gain).connect(active.master);
    kick.start(now);
    kick.stop(now + 0.38);
    active.nodes.add(kick);
    active.nodes.add(gain);
    kick.onended = () => {
      active.nodes.delete(kick);
      active.nodes.delete(gain);
      kick.disconnect();
      gain.disconnect();
    };
  }

  private addLoopingAtmosphere(active: ActiveSoundtrack, volume: number, cutoff: number) {
    if (!this.context || volume <= 0) return;
    const context = this.context;
    const seconds = 2.5;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * seconds), context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.985 + white * 0.015;
      data[index] = previous;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(active.master);
    source.start();
    active.nodes.add(source);
    active.nodes.add(filter);
    active.nodes.add(gain);
  }

  private disposeSoundtrack(active: ActiveSoundtrack, fadeSeconds: number) {
    for (const interval of active.intervals) window.clearInterval(interval);
    for (const timeout of active.timeouts) window.clearTimeout(timeout);
    active.intervals.clear();
    active.timeouts.clear();
    if (this.context) {
      const now = this.context.currentTime;
      active.master.gain.cancelScheduledValues(now);
      active.master.gain.setValueAtTime(Math.max(0.0001, active.master.gain.value), now);
      active.master.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
    }
    window.setTimeout(() => {
      for (const node of active.nodes) {
        if ("stop" in node && typeof node.stop === "function") {
          try { node.stop(); } catch { /* scheduled source already stopped */ }
        }
        try { node.disconnect(); } catch { /* node already disconnected */ }
      }
      active.nodes.clear();
    }, Math.ceil((fadeSeconds + 0.08) * 1_000));
  }

  private addNoise(context: AudioContext, output: AudioNode, now: number, duration: number, cutoff: number) {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    source.buffer = buffer;
    source.connect(filter).connect(output);
    source.start(now);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
    };
  }

  private soundtrackVolume() {
    return this.volumes.muted ? 0.0001 : Math.max(0.0001, this.volumes.music * 0.24);
  }

  private duration(cue: SoundCue) {
    if (["victory", "defeat", "boss", "vision"].includes(cue)) return 0.9;
    if (["dice", "magic", "heal", "critical", "quest"].includes(cue)) return 0.46;
    return 0.18;
  }

  private wave(cue: SoundCue): OscillatorType {
    if (["magic", "heal", "vision", "quest"].includes(cue)) return "sine";
    if (["sword", "damage", "critical", "boss"].includes(cue)) return "sawtooth";
    return "triangle";
  }

  private frequencies(cue: SoundCue): [number, number] {
    const map: Record<SoundCue, [number, number]> = {
      hover: [320, 390], confirm: [260, 520], dice: [180, 90], sword: [540, 120],
      bow: [760, 260], magic: [240, 920], heal: [330, 720], damage: [180, 70],
      critical: [520, 95], quest: [392, 784], pickup: [440, 660], victory: [220, 880],
      defeat: [180, 48], boss: [92, 38], vision: [110, 880],
    };
    return map[cue];
  }
}

export const audioManager = new AudioManager();
