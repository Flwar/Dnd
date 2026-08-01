import { describe, expect, it } from "vitest";
import { soundtrackProfiles } from "@/lib/audio/soundtrack-profiles";
import { isHebrewVoice, npcVoiceProfiles, selectHebrewVoice } from "@/lib/audio/voice-manager";

const voice = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice;

describe("פסקול פרוצדורלי", () => {
  it("מגדיר סצנה מוזיקלית נפרדת לכל מצב משחק", () => {
    expect(Object.keys(soundtrackProfiles)).toEqual(["menu", "village", "mine", "combat", "boss", "vision"]);
    expect(soundtrackProfiles.menu.motif).not.toEqual(soundtrackProfiles.mine.motif);
    expect(soundtrackProfiles.combat.percussion).toBe(true);
    expect(soundtrackProfiles.boss.pulseSeconds).toBeLessThan(soundtrackProfiles.combat.pulseSeconds);
    expect(soundtrackProfiles.village.noiseVolume).toBeGreaterThan(0);
  });
});

describe("קולות דמויות", () => {
  it("בוחר רק קול עברי ומשנה את הבחירה בין דמויות כשיש מגוון", () => {
    const voices = [voice("English", "en-US"), voice("עברית א", "he-IL"), voice("עברית ב", "he")];
    expect(isHebrewVoice(voices[0])).toBe(false);
    expect(isHebrewVoice(voices[1])).toBe(true);
    expect(selectHebrewVoice(voices, "elric")?.name).toBe("עברית א");
    expect(selectHebrewVoice(voices, "mira")?.name).toBe("עברית ב");
  });

  it("מחזיר fallback ברור כשאין במכשיר קול עברי", () => {
    expect(selectHebrewVoice([voice("English", "en-US")], "thal")).toBeNull();
  });

  it("מעניק לכל דמות מרכזית פרופיל קולי מובחן", () => {
    const profiles = Object.values(npcVoiceProfiles).map(({ rate, pitch }) => `${rate}:${pitch}`);
    expect(Object.keys(npcVoiceProfiles)).toEqual(["elric", "mira", "thal", "brom", "danor", "grey-woman"]);
    expect(new Set(profiles).size).toBe(profiles.length);
  });
});
