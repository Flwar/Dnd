"use client";

import { Volume2, VolumeX } from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";
import { useSettingsStore, type TextScale } from "@/store/settings-store";

export function SettingsPanel() {
  const settings = useSettingsStore();
  const textOptions: Array<{ value: TextScale; label: string }> = [
    { value: "normal", label: "רגיל" },
    { value: "large", label: "גדול" },
    { value: "extra", label: "גדול מאוד" },
  ];
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <label className="space-y-3">
        <span className="flex items-center justify-between"><b>עוצמת מוזיקה</b><bdi className="ltr-isolate">{Math.round(settings.musicVolume * 100)}%</bdi></span>
        <input className="w-full accent-[#c6a15b]" type="range" min="0" max="1" step="0.05" value={settings.musicVolume} onChange={(event) => settings.setMusicVolume(Number(event.target.value))} />
      </label>
      <label className="space-y-3">
        <span className="flex items-center justify-between"><b>עוצמת אפקטים</b><bdi className="ltr-isolate">{Math.round(settings.effectsVolume * 100)}%</bdi></span>
        <input className="w-full accent-[#c6a15b]" type="range" min="0" max="1" step="0.05" value={settings.effectsVolume} onChange={(event) => settings.setEffectsVolume(Number(event.target.value))} />
      </label>
      <label className="space-y-3">
        <span className="flex items-center justify-between"><b>עוצמת דיבור</b><bdi className="ltr-isolate">{Math.round(settings.voiceVolume * 100)}%</bdi></span>
        <input className="w-full accent-[#62c6df]" type="range" min="0" max="1" step="0.05" value={settings.voiceVolume} onChange={(event) => settings.setVoiceVolume(Number(event.target.value))} />
      </label>
      <Toggle label="קולות לדמויות" description="מאפשר להשמיע טקסט באמצעות קול עברי הזמין במכשיר." checked={settings.voicesEnabled} onChange={settings.setVoicesEnabled} />
      <div>
        <p className="mb-3 font-bold">גודל הכתב</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="גודל הכתב">
          {textOptions.map((option) => (
            <GameButton key={option.value} variant={settings.textScale === option.value ? "primary" : "secondary"} size="sm" role="radio" aria-checked={settings.textScale === option.value} onClick={() => settings.setTextScale(option.value)}>
              {option.label}
            </GameButton>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
        <Toggle label="הפחתת תנועה" description="מצמצם אנימציות ואפקטים סביבתיים." checked={settings.reducedMotion} onChange={settings.setReducedMotion} />
        <Toggle label="ניגודיות גבוהה" description="מחזק גבולות, טקסט ומצבי מיקוד." checked={settings.highContrast} onChange={settings.setHighContrast} />
      </div>
      <GameButton className="sm:col-span-2" variant={settings.muted ? "primary" : "secondary"} onClick={() => settings.setMuted(!settings.muted)}>
        {settings.muted ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
        {settings.muted ? "הפעלת שמע" : "השתקת כל השמע"}
      </GameButton>
      <p className="sm:col-span-2 text-sm text-[#a89f91]" role="status">ההגדרות נשמרות במכשיר הזה ומוחלות מיד.</p>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 border border-[#c6a15b]/20 bg-black/20 p-3">
      <span><b className="block">{label}</b><span className="text-xs text-[#a89f91]">{description}</span></span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${checked ? "border-[#f0cf82] bg-[#7b5a29]" : "border-white/20 bg-black/40"}`}>
        <input className="peer sr-only" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className={`absolute top-1 size-5 rounded-full bg-[#e8dfce] transition-[inset-inline-start] ${checked ? "start-1" : "start-6"}`} />
      </span>
    </label>
  );
}
