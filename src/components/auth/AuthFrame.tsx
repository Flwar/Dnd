import Link from "next/link";
import { Crown } from "lucide-react";
import { Atmosphere } from "@/components/shell/Atmosphere";
import { RunePanel } from "@/components/ui/RunePanel";
import { getAssetPath } from "@/lib/assets/manifest";

export function AuthFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main id="main-content" className="screen-shell grid min-h-dvh place-items-center px-4 py-10 sm:px-6">
      <Atmosphere image={getAssetPath("background-menu-cinematic")} mobileImage={getAssetPath("background-menu-cinematic-mobile")} priority />
      <RunePanel className="relative z-10 w-full max-w-md p-6 sm:p-8">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-[#c6a15b] hover:text-[#f0cf82]">
          <Crown className="size-5" aria-hidden="true" />
          הכתר המנופץ
        </Link>
        <h1 className="display-font text-3xl text-[#f0cf82] sm:text-4xl">{title}</h1>
        <p className="mt-2 text-[#a89f91]">{description}</p>
        <div className="ornament-rule my-6" aria-hidden="true">◆</div>
        {children}
      </RunePanel>
    </main>
  );
}
