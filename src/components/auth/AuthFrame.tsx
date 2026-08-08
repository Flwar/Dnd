import Link from "next/link";
import { Crown, Gem, ShieldCheck, Sparkles } from "lucide-react";
import { Atmosphere } from "@/components/shell/Atmosphere";
import { RunePanel } from "@/components/ui/RunePanel";
import { getAssetPath } from "@/lib/assets/manifest";

export function AuthFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main id="main-content" className="menu-screen screen-shell grid min-h-dvh place-items-center px-4 py-8 sm:px-7 sm:py-10">
      <Atmosphere
        image={getAssetPath("background-menu-cinematic")}
        mobileImage={getAssetPath("background-menu-cinematic-mobile")}
        priority
      />

      <div className="auth-layout relative z-10">
        <aside className="auth-lore" aria-label="על שמירת המסע">
          <div className="menu-eyebrow">
            <Sparkles className="size-5" aria-hidden="true" />
            <span>השער אל ארצות ואלדר</span>
          </div>
          <h2 className="display-font mt-4 text-5xl leading-[1.02] text-[#f0cf82]">
            האגדה זוכרת
            <span className="block text-[#ded2bb]">כל צעד בדרך</span>
          </h2>
          <p className="mt-5 max-w-md text-lg leading-8 text-[#c9c0b2]">
            הדמות, הציוד, היחסים והבחירות נשמרים בחשבון וממתינים לך בכל מכשיר.
          </p>
          <div className="ornament-rule my-6 max-w-md" aria-hidden="true">◆</div>
          <div className="grid max-w-md grid-cols-2 gap-3 text-sm text-[#b9b0a3]">
            <div className="flex items-center gap-2 border border-[#62c6df]/16 bg-[#071116]/55 p-3">
              <ShieldCheck className="size-5 shrink-0 text-[#77b686]" aria-hidden="true" />
              <span>שמירה מאובטחת בענן</span>
            </div>
            <div className="flex items-center gap-2 border border-[#c6a15b]/16 bg-[#151005]/45 p-3">
              <Gem className="size-5 shrink-0 text-[#f0cf82]" aria-hidden="true" />
              <span>המשך מסע מכל מקום</span>
            </div>
          </div>
        </aside>

        <RunePanel className="auth-panel w-full max-w-md justify-self-center">
          <Link href="/" className="auth-crown-link mb-5 text-sm font-bold">
            <span className="menu-seal !size-9"><Crown className="size-4" aria-hidden="true" /></span>
            <span>הכתר המנופץ</span>
          </Link>
          <div className="border-s-2 border-[#c6a15b]/35 ps-4">
            <p className="mb-1 text-xs font-bold tracking-[0.18em] text-[#72cfe2]">שער השבים</p>
            <h1 className="display-font text-3xl leading-tight text-[#f0cf82] sm:text-4xl">{title}</h1>
            <p className="mt-2 leading-7 text-[#a89f91]">{description}</p>
          </div>
          <div className="ornament-rule my-6" aria-hidden="true">◆</div>
          {children}
        </RunePanel>
      </div>
    </main>
  );
}
