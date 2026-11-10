import NextImage from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ListingImageProps = {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

function isGif(src: string) {
  return src.split("?")[0]?.toLowerCase().endsWith(".gif") ?? false;
}

export function ListingImage({ src, alt, sizes, priority = false, className }: ListingImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-emerald-50",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <ImageIcon className="size-7" strokeWidth={1.5} aria-hidden />
          <span className="text-[11px] font-medium uppercase tracking-[0.16em]">No image yet</span>
        </div>
      </div>
    );
  }

  return (
    <NextImage
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={isGif(src)}
      className={cn("object-cover", className)}
    />
  );
}

export function ListingGallery({
  title,
  coverUrl,
  gallery,
}: {
  title: string;
  coverUrl: string | null;
  gallery: { path: string; url: string | null }[];
}) {
  const photos = gallery.filter((image): image is { path: string; url: string } => Boolean(image.url));

  return (
    <section className="space-y-3" aria-label={`${title} images`}>
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-slate-200">
        <ListingImage
          src={coverUrl}
          alt={coverUrl ? `${title} cover` : ""}
          sizes="(min-width: 896px) 896px, 100vw"
          priority={Boolean(coverUrl)}
        />
      </div>
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {photos.map((image, index) => (
            <li key={image.path} className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200">
              <ListingImage src={image.url} alt={`${title} gallery image ${index + 1}`} sizes="(min-width: 640px) 160px, 50vw" />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
