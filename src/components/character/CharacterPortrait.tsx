"use client";

import { useState } from "react";
import Image from "next/image";
import { DEFAULT_PORTRAIT_KEY, getPortraitSource } from "@/lib/portraits";

type CharacterPortraitProps = {
  portraitKey: string;
  portraitUrl?: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  testId?: string;
};

export function CharacterPortrait({
  portraitKey,
  portraitUrl,
  alt,
  sizes,
  className = "object-cover",
  priority = false,
  testId,
}: CharacterPortraitProps) {
  const source = getPortraitSource(portraitKey, portraitUrl);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = failedSource === source.src;
  const fallback = getPortraitSource(DEFAULT_PORTRAIT_KEY);

  if (source.kind === "custom" && !failed) {
    return (
      // The authenticated same-origin image request must come from the browser;
      // Next's image optimizer does not forward the player's session cookie.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={source.src}
        alt={alt}
        className={`absolute inset-0 size-full ${className}`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailedSource(source.src)}
        data-testid={testId}
      />
    );
  }

  return (
    <Image
      src={fallback.src === source.src || !failed ? source.src : fallback.src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailedSource(source.src)}
      data-testid={testId}
    />
  );
}
