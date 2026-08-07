"use client";

import { cn } from "@/lib/cn";
import { ArtDirectedPicture } from "@/components/ui/ArtDirectedPicture";

export function Atmosphere({ image, mobileImage, alt = "", className, priority = false }: { image: string; mobileImage?: string; alt?: string; className?: string; priority?: boolean }) {
  return (
    <div className={cn("absolute inset-0 -z-20 overflow-hidden bg-[#08090b]", className)} aria-hidden={!alt || undefined}>
      <ArtDirectedPicture desktopSrc={image} mobileSrc={mobileImage} alt={alt} priority={priority} pictureClassName="absolute inset-0" className="object-center" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,4,6,.85),rgba(3,4,6,.25)_46%,rgba(3,4,6,.72)),linear-gradient(0deg,rgba(3,4,6,.92),transparent_45%,rgba(3,4,6,.38))]" />
      <div className="animate-fog absolute -inset-[12%] bg-[radial-gradient(ellipse_at_35%_65%,rgba(140,167,171,.16),transparent_44%),radial-gradient(ellipse_at_70%_55%,rgba(90,130,144,.12),transparent_38%)] blur-2xl" />
      <div className="animate-torch absolute bottom-[8%] right-[18%] size-[24rem] rounded-full bg-[#d27c32]/8 blur-3xl" />
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          className="absolute size-1 rounded-full bg-[#f0a24a]/70 [animation:ember-rise_var(--duration)_linear_infinite]"
          style={{
            right: `${8 + ((index * 17) % 82)}%`,
            bottom: `${3 + ((index * 11) % 28)}%`,
            animationDelay: `${(index % 6) * -0.8}s`,
            ["--duration" as string]: `${5 + (index % 5)}s`,
          }}
        />
      ))}
    </div>
  );
}
