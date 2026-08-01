"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Crown, ShieldCheck, Trophy } from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";
import { updateProfileAction } from "@/lib/actions/profile";
import { getAssetPath } from "@/lib/assets/manifest";

const avatarKeys = ["portrait-human-01", "portrait-elf-01", "portrait-dwarf-01", "portrait-halfling-01", "portrait-orc-01", "portrait-dragonborn-01"] as const;

export function ProfileClient({ profile }: { profile: { display_name: string; avatar_key: string; created_at: string; last_active_at: string; total_playtime_seconds: number; highest_character_level: number; completed_chapter_count: number } }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [avatarKey, setAvatarKey] = useState<typeof avatarKeys[number]>(avatarKeys.includes(profile.avatar_key as typeof avatarKeys[number]) ? profile.avatar_key as typeof avatarKeys[number] : "portrait-human-01");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const hours = Math.floor(profile.total_playtime_seconds / 3600);
  const minutes = Math.floor((profile.total_playtime_seconds % 3600) / 60);
  const created = new Intl.DateTimeFormat("he-IL", { dateStyle: "long" }).format(new Date(profile.created_at));
  return <main id="main-content" className="min-h-dvh bg-[radial-gradient(circle_at_top,#18303b,transparent_34rem),#08090b] px-4 py-8">
    <div className="mx-auto max-w-5xl">
      <button onClick={() => router.push("/menu")} className="mb-5 flex items-center gap-2 text-[#a89f91] hover:text-[#f0cf82]"><ArrowRight className="size-4" aria-hidden="true" />חזרה לתפריט</button>
      <div className="grid gap-5 md:grid-cols-[19rem_1fr]">
        <section className="stone-panel p-5 text-center"><div className="mx-auto size-48 overflow-hidden border border-[#c6a15b]/45">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated local portrait */}
          <img src={getAssetPath(avatarKey)} alt="דיוקן הפרופיל" className="size-full object-cover" />
        </div><h1 className="display-font mt-4 text-4xl text-[#f0cf82]">{profile.display_name}</h1><p className="mt-1 text-sm text-[#9e968a]">במסע מאז {created}</p></section>
        <div className="space-y-5">
          <section className="stone-panel grid grid-cols-3 gap-3 p-4"><ProfileStat icon={Clock3} label="זמן משחק" value={hours ? `${hours} שעות ${minutes} דקות` : `${minutes} דקות`} /><ProfileStat icon={Trophy} label="דרגה גבוהה" value={`${profile.highest_character_level}`} /><ProfileStat icon={Crown} label="פרקים שהושלמו" value={`${profile.completed_chapter_count}`} /></section>
          <form className="stone-panel p-5" onSubmit={(event) => { event.preventDefault(); setMessage(""); startTransition(async () => { const result = await updateProfileAction({ displayName, avatarKey }); setMessage(result.message); }); }}>
            <h2 className="display-font text-2xl text-[#f0cf82]">עריכת הפרופיל</h2>
            <label className="mt-4 block"><span className="mb-2 block font-bold">שם תצוגה</span><input className="fantasy-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={32} autoComplete="nickname" /></label>
            <fieldset className="mt-5"><legend className="mb-2 font-bold">סמל שחקן</legend><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{avatarKeys.map((key) => <button type="button" key={key} className={`overflow-hidden border ${avatarKey === key ? "border-[#f0cf82] ring-2 ring-[#f0cf82]/20" : "border-white/15"}`} onClick={() => setAvatarKey(key)} aria-pressed={avatarKey === key}>
              {/* eslint-disable-next-line @next/next/no-img-element -- generated local portrait */}
              <img src={getAssetPath(key)} alt="אפשרות לדיוקן פרופיל" className="aspect-square w-full object-cover" />
            </button>)}</div></fieldset>
            {message ? <p className="mt-4 text-sm text-[#bcdcc4]" role="status">{message}</p> : null}
            <GameButton type="submit" loading={pending} className="mt-5 w-full"><ShieldCheck className="size-5" aria-hidden="true" />שמירת הפרופיל</GameButton>
          </form>
        </div>
      </div>
    </div>
  </main>;
}

function ProfileStat({ icon: Icon, label, value }: { icon: typeof Crown; label: string; value: string }) { return <div className="text-center"><Icon className="mx-auto size-5 text-[#c6a15b]" aria-hidden="true" /><bdi className="mt-2 block text-lg font-bold">{value}</bdi><span className="text-xs text-[#9e968a]">{label}</span></div>; }
