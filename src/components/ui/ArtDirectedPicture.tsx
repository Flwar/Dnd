import Image from "next/image";
import { cn } from "@/lib/cn";

interface ArtDirectedPictureProps {
  desktopSrc: string;
  mobileSrc?: string;
  alt: string;
  className?: string;
  pictureClassName?: string;
  priority?: boolean;
}

/**
 * Keeps the manually art-directed mobile crop while retaining Next/Image's
 * intrinsic sizing, loading priority and layout-shift protection. The WebP
 * files are already encoded at production quality, so they are served without
 * a second lossy optimization pass.
 */
export function ArtDirectedPicture({
  desktopSrc,
  mobileSrc,
  alt,
  className,
  pictureClassName,
  priority = false,
}: ArtDirectedPictureProps) {
  return (
    <picture className={pictureClassName}>
      {mobileSrc ? <source media="(max-width: 760px)" srcSet={mobileSrc} /> : null}
      <Image
        src={desktopSrc}
        alt={alt}
        width={1920}
        height={1080}
        sizes="100vw"
        priority={priority}
        unoptimized
        className={cn("size-full object-cover", className)}
      />
    </picture>
  );
}
