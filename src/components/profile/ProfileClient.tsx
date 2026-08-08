"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Crown, ShieldCheck, Trophy } from "lucide-react";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { ProfileAvatarPicker, profileAvatarKeys } from "@/components/profile/ProfileAvatarPicker";
import { GameButton } from "@/components/ui/GameButton";
import { updateProfileAction, type ProfileActionResult } from "@/lib/actions/profile";
import { deletePortrait } from "@/lib/portrait-upload-client";
import { isCustomPortraitKey, isPresetPortraitKey } from "@/lib/portraits";

export function ProfileClient({ profile }: { profile: { display_name: string; avatar_key: string; created_at: string; last_active_at: string; total_playtime_seconds: number; highest_character_level: number; completed_chapter_count: number } }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const initialAvatarKey = isPresetPortraitKey(profile.avatar_key) || isCustomPortraitKey(profile.avatar_key)
    ? profile.avatar_key
    : profileAvatarKeys[0];
  const [avatarKey, setAvatarKey] = useState(initialAvatarKey);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savedAvatarKey, setSavedAvatarKey] = useState(initialAvatarKey);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [result, setResult] = useState<ProfileActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const hours = Math.floor(profile.total_playtime_seconds / 3600);
  const minutes = Math.floor((profile.total_playtime_seconds % 3600) / 60);
  const created = new Intl.DateTimeFormat("he-IL", { dateStyle: "long" }).format(new Date(profile.created_at));
  return <main id="main-content" className="min-h-dvh bg-[radial-gradient(circle_at_top,#18303b,transparent_34rem),#08090b] px-4 py-8">
    <div className="mx-auto max-w-5xl">
      <button disabled={avatarBusy || pending} onClick={() => router.push("/menu")} className="mb-5 flex items-center gap-2 text-[#a89f91] hover:text-[#f0cf82] disabled:cursor-not-allowed disabled:opacity-50"><ArrowRight className="size-4" aria-hidden="true" />חזרה לתפריט</button>
      <div className="grid gap-5 md:grid-cols-[19rem_1fr]">
        <section className="stone-panel p-5 text-center"><div className="relative mx-auto size-48 overflow-hidden border border-[#c6a15b]/45">
          <CharacterPortrait portraitKey={avatarKey} portraitUrl={avatarUrl} alt="דיוקן הפרופיל" sizes="192px" className="object-cover" />
        </div><h1 className="display-font mt-4 text-4xl text-[#f0cf82]">{profile.display_name}</h1><p className="mt-1 text-sm text-[#9e968a]">במסע מאז {created}</p></section>
        <div className="space-y-5">
          <section className="stone-panel grid grid-cols-3 gap-3 p-4"><ProfileStat icon={Clock3} label="זמן משחק" value={hours ? `${hours} שעות ${minutes} דקות` : `${minutes} דקות`} /><ProfileStat icon={Trophy} label="דרגה גבוהה" value={`${profile.highest_character_level}`} /><ProfileStat icon={Crown} label="פרקים שהושלמו" value={`${profile.completed_chapter_count}`} /></section>
          <form className="stone-panel p-5" aria-busy={avatarBusy || pending} onSubmit={(event) => { event.preventDefault(); setResult(null); startTransition(async () => {
            const response = await updateProfileAction({ displayName, avatarKey });
            setResult(response);
            if (response.ok) {
              const previousSavedAvatar = savedAvatarKey;
              setSavedAvatarKey(avatarKey);
              if (isCustomPortraitKey(previousSavedAvatar) && previousSavedAvatar !== avatarKey) {
                void deletePortrait(previousSavedAvatar).catch(() => undefined);
              }
            }
          }); }}>
            <h2 className="display-font text-2xl text-[#f0cf82]">עריכת הפרופיל</h2>
            <label className="mt-4 block"><span className="mb-2 block font-bold">שם תצוגה</span><input className="fantasy-input" value={displayName} disabled={pending || avatarBusy} onChange={(event) => { setDisplayName(event.target.value); setResult(null); }} minLength={2} maxLength={32} autoComplete="nickname" /></label>
            <ProfileAvatarPicker selected={avatarKey} selectedUrl={avatarUrl} committedKey={savedAvatarKey} commitPending={pending} disabled={pending} onBusyChange={setAvatarBusy} onSelect={(key, url) => { setAvatarKey(key); setAvatarUrl(url ?? null); setResult(null); }} />
            {result ? <p className={`mt-4 text-sm ${result.ok ? "text-[#bcdcc4]" : "text-[#ffaaa3]"}`} role={result.ok ? "status" : "alert"}>{result.message}</p> : null}
            <GameButton type="submit" loading={pending} disabled={avatarBusy} className="mt-5 w-full"><ShieldCheck className="size-5" aria-hidden="true" />שמירת הפרופיל</GameButton>
          </form>
        </div>
      </div>
    </div>
  </main>;
}

function ProfileStat({ icon: Icon, label, value }: { icon: typeof Crown; label: string; value: string }) { return <div className="text-center"><Icon className="mx-auto size-5 text-[#c6a15b]" aria-hidden="true" /><bdi className="mt-2 block text-lg font-bold">{value}</bdi><span className="text-xs text-[#9e968a]">{label}</span></div>; }
