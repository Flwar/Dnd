"use client";

import { AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";
import { signOutAction } from "@/lib/actions/auth";

export default function MenuError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="screen-shell grid min-h-dvh place-items-center px-5">
      <section className="stone-panel max-w-lg p-7 text-center sm:p-9" role="alert">
        <AlertTriangle className="mx-auto mb-4 size-11 text-[#d88a64]" aria-hidden="true" />
        <h1 className="display-font text-3xl text-[#f0cf82]">הדרך אל התפריט התעכבה</h1>
        <p className="mt-3 leading-7 text-[#b9ad9c]">
          החיבור לענן לא הסתיים בזמן. ההתקדמות שלך נשארה שמורה ואפשר לנסות שוב בבטחה.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <GameButton onClick={reset}>
            <RefreshCw className="size-4" aria-hidden="true" />
            ניסיון נוסף
          </GameButton>
          <form action={signOutAction}>
            <GameButton type="submit" variant="secondary">
              <LogOut className="size-4" aria-hidden="true" />
              התנתקות בטוחה
            </GameButton>
          </form>
        </div>
      </section>
    </main>
  );
}
