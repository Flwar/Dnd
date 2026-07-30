import Image from "next/image";
import { ui } from "@/lib/i18n";

const particles = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  x: (index * 37 + 11) % 100,
  y: (index * 53 + 7) % 100,
  delay: (index % 7) * 1.3,
  duration: 14 + (index % 6) * 2,
  size: 1 + (index % 3),
}));

export function Atmosphere({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <div className="atmosphere" aria-hidden="true">
      <Image
        className="world-art"
        src="/assets/game-world-bg.png"
        alt={ui.accessibility.worldBackground}
        fill
        priority
        sizes="100vw"
      />
      <div className={dimmed ? "world-shade is-dimmed" : "world-shade"} />
      <div className="moon-haze" />
      <div className="fog fog-one" />
      <div className="fog fog-two" />
      <div className="ember-glow" />
      <div className="dust-layer">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="dust"
            style={
              {
                "--dust-x": `${particle.x}%`,
                "--dust-y": `${particle.y}%`,
                "--dust-delay": `${particle.delay}s`,
                "--dust-duration": `${particle.duration}s`,
                "--dust-size": `${particle.size}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="vignette" />
    </div>
  );
}
