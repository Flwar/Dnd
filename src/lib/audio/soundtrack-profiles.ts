export type SoundtrackKind = "menu" | "village" | "mine" | "combat" | "boss" | "vision";

export type SoundtrackProfile = {
  chord: readonly number[];
  motif: readonly number[];
  pulseSeconds: number;
  noteDuration: number;
  droneVolume: number;
  motifVolume: number;
  noiseVolume: number;
  filterFrequency: number;
  percussion: boolean;
};

/**
 * Original score map for the procedural Web Audio soundtrack. Frequencies are
 * deliberately written as data so scene routing remains testable without an
 * AudioContext and never influences authoritative game state.
 */
export const soundtrackProfiles: Record<SoundtrackKind, SoundtrackProfile> = {
  menu: {
    chord: [55, 82.41, 110, 164.81],
    motif: [220, 261.63, 329.63, 293.66, 220],
    pulseSeconds: 3.8,
    noteDuration: 2.9,
    droneVolume: 0.2,
    motifVolume: 0.16,
    noiseVolume: 0.025,
    filterFrequency: 1_250,
    percussion: false,
  },
  village: {
    chord: [73.42, 110, 146.83, 220],
    motif: [293.66, 349.23, 440, 392, 293.66],
    pulseSeconds: 4.4,
    noteDuration: 2.5,
    droneVolume: 0.14,
    motifVolume: 0.12,
    noiseVolume: 0.045,
    filterFrequency: 1_850,
    percussion: false,
  },
  mine: {
    chord: [36.71, 55, 77.78, 110],
    motif: [146.83, 155.56, 116.54, 103.83],
    pulseSeconds: 5.1,
    noteDuration: 3.8,
    droneVolume: 0.24,
    motifVolume: 0.1,
    noiseVolume: 0.065,
    filterFrequency: 720,
    percussion: false,
  },
  combat: {
    chord: [41.2, 61.74, 82.41, 123.47],
    motif: [164.81, 196, 185, 246.94, 196],
    pulseSeconds: 1.35,
    noteDuration: 0.82,
    droneVolume: 0.22,
    motifVolume: 0.16,
    noiseVolume: 0.045,
    filterFrequency: 1_450,
    percussion: true,
  },
  boss: {
    chord: [30.87, 46.25, 61.74, 92.5],
    motif: [123.47, 130.81, 155.56, 138.59, 92.5],
    pulseSeconds: 0.95,
    noteDuration: 0.72,
    droneVolume: 0.3,
    motifVolume: 0.18,
    noiseVolume: 0.075,
    filterFrequency: 980,
    percussion: true,
  },
  vision: {
    chord: [55, 82.41, 116.54, 174.61],
    motif: [440, 523.25, 659.25, 880, 698.46],
    pulseSeconds: 2.35,
    noteDuration: 3.4,
    droneVolume: 0.18,
    motifVolume: 0.14,
    noiseVolume: 0.035,
    filterFrequency: 2_300,
    percussion: false,
  },
};
