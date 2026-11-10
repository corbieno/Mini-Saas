"use client";

import { useId, useState, type ChangeEvent } from "react";
import { ChevronDown, ChevronUp, Image as ImageIcon, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  GALLERY_LIMIT_ERROR,
  LISTING_IMAGE_ACCEPT,
  MAX_GALLERY_IMAGES,
  readListingImageFile,
} from "@/lib/listing-images";
import { cn } from "@/lib/utils";

export type DraftListingImage = {
  key: string;
  path: string | null;
  file: File | null;
  previewUrl: string | null;
};

type ListingImageEditorProps = {
  cover: DraftListingImage | null;
  gallery: DraftListingImage[];
  disabled?: boolean;
  onCoverChange: (image: DraftListingImage | null) => void;
  onGalleryChange: (images: DraftListingImage[]) => void;
  onRetire: (image: DraftListingImage) => void;
};

async function draftFromFile(file: File) {
  const validated = await readListingImageFile(file);
  if (!validated.ok) return validated;
  return {
    ok: true as const,
    image: {
      key: crypto.randomUUID(),
      path: null,
      file,
      previewUrl: URL.createObjectURL(file),
    } satisfies DraftListingImage,
  };
}

function Preview({ image, alt }: { image: DraftListingImage; alt: string }) {
  if (image.previewUrl) {
    return (
      <>
        {/* Blob previews are local object URLs, which next/image does not optimize. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.previewUrl} alt={alt} className="h-full w-full object-cover" />
      </>
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-100 text-slate-500">
      <ImageIcon className="size-5" aria-hidden />
      <span className="text-[11px]">Saved image</span>
    </div>
  );
}

export function ListingImageEditor({
  cover,
  gallery,
  disabled = false,
  onCoverChange,
  onGalleryChange,
  onRetire,
}: ListingImageEditorProps) {
  const coverInputId = useId();
  const galleryInputId = useId();
  const helpId = useId();
  const [localError, setLocalError] = useState<string | null>(null);
  const galleryFull = gallery.length >= MAX_GALLERY_IMAGES;

  async function pickCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const drafted = await draftFromFile(file);
    if (!drafted.ok) {
      setLocalError(drafted.error);
      return;
    }
    if (cover) onRetire(cover);
    onCoverChange(drafted.image);
    setLocalError(null);
  }

  async function addGallery(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;

    const next = [...gallery];
    let message: string | null = null;
    for (const file of files) {
      if (next.length >= MAX_GALLERY_IMAGES) {
        message = GALLERY_LIMIT_ERROR;
        break;
      }
      const drafted = await draftFromFile(file);
      if (!drafted.ok) {
        message = drafted.error;
        continue;
      }
      next.push(drafted.image);
    }
    onGalleryChange(next);
    setLocalError(message);
  }

  function moveGallery(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= gallery.length) return;
    const next = [...gallery];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    onGalleryChange(next);
  }

  function removeGallery(index: number) {
    const next = [...gallery];
    const [removed] = next.splice(index, 1);
    if (removed) onRetire(removed);
    onGalleryChange(next);
  }

  function makeCover(index: number) {
    const next = [...gallery];
    const [promoted] = next.splice(index, 1);
    if (!promoted) return;
    if (cover) next.splice(index, 0, cover);
    onCoverChange(promoted);
    onGalleryChange(next);
  }

  return (
    <fieldset className="min-w-0 space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium text-slate-900">Images</legend>
      <p id={helpId} className="text-xs text-slate-500">
        One cover and up to five gallery images. PNG, JPG, WEBP, or GIF. 5 MB each.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cover</p>
          <label className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}>
            {cover ? "Replace cover" : "Add cover"}
            <input
              id={coverInputId}
              className="sr-only"
              type="file"
              accept={LISTING_IMAGE_ACCEPT}
              onChange={pickCover}
              aria-describedby={helpId}
            />
          </label>
        </div>
        {cover ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-slate-200">
            <Preview image={cover} alt="Cover preview" />
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              className="absolute top-2 right-2 bg-white"
              aria-label="Remove cover image"
              onClick={() => {
                onRetire(cover);
                onCoverChange(null);
              }}
            >
              <X />
            </Button>
          </div>
        ) : (
          <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50 text-slate-400">
            <ImageIcon className="size-6" aria-hidden />
            <span className="text-xs">Cover preview</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Gallery</p>
          {galleryFull ? (
            <span className="text-xs text-slate-500">5 of 5</span>
          ) : (
            <label className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}>
              Add images
              <input
                id={galleryInputId}
                className="sr-only"
                type="file"
                accept={LISTING_IMAGE_ACCEPT}
                multiple
                onChange={addGallery}
                aria-describedby={helpId}
              />
            </label>
          )}
        </div>
        {gallery.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
            Gallery images show on the listing page.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {gallery.map((image, index) => (
              <li key={image.key} className="space-y-2 rounded-2xl border border-slate-200 p-2">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                  <Preview image={image} alt={`Gallery preview ${index + 1}`} />
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button type="button" variant="outline" size="icon-xs" aria-label="Move gallery image earlier" disabled={index === 0} onClick={() => moveGallery(index, -1)}>
                    <ChevronUp />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label="Move gallery image later"
                    disabled={index === gallery.length - 1}
                    onClick={() => moveGallery(index, 1)}
                  >
                    <ChevronDown />
                  </Button>
                  <Button type="button" variant="outline" size="xs" onClick={() => makeCover(index)}>
                    Use as cover
                  </Button>
                  <Button type="button" variant="outline" size="icon-xs" className="ml-auto" aria-label="Remove gallery image" onClick={() => removeGallery(index)}>
                    <X />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {localError ? <p className="text-sm text-red-600">{localError}</p> : null}
    </fieldset>
  );
}
