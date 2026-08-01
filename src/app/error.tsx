"use client";

import { AlertTriangle } from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="screen-shell grid min-h-dvh place-items-center p-6">
      <section className="stone-panel max-w-lg p-8 text-center" role="alert">
        <AlertTriangle className="mx-auto mb-4 size-10 text-[#d05b54]" aria-hidden="true" />
        <h1 className="display-font text-3xl">הדרך אבדה בתוך הערפל</h1>
        <p className="mt-3 text-[#a89f91]">אירעה תקלה בלתי צפויה. ההתקדמות האחרונה שנשמרה בענן לא נפגעה.</p>
        <GameButton className="mt-6" onClick={reset}>נסה שוב</GameButton>
      </section>
    </main>
  );
}
