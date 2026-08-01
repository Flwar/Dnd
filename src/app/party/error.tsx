"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";

export default function PartyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_top,#3a1a21_0,transparent_32rem),#08090b] px-5">
      <section className="stone-panel max-w-xl p-7 text-center sm:p-10" role="alert">
        <AlertTriangle className="mx-auto mb-4 size-12 text-[#e87972]" aria-hidden="true" />
        <h1 className="display-font text-4xl text-[#f0cf82]">החיבור לחבורה השתבש</h1>
        <p className="mt-3 leading-7 text-[#b9ad9c]">לא הצלחנו לטעון את חדר החבורה. מצב המשחק לא נמחק ואפשר לנסות שוב.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <GameButton onClick={reset}><RefreshCw className="size-4" />ניסיון נוסף</GameButton>
          <Link href="/menu" className="inline-flex min-h-12 items-center gap-2 border border-white/15 bg-black/25 px-5 font-semibold text-[#d8cebd] hover:border-[#c6a15b]/45 hover:text-[#f0cf82]"><ArrowRight className="size-4" />חזרה לתפריט</Link>
        </div>
      </section>
    </main>
  );
}
