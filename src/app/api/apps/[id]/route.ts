import { NextResponse } from "next/server";
import { requireOwnedListing, validateStoredListingImage } from "@/lib/data/owned-listing";
import {
  LISTING_IMAGES_BUCKET,
  isMissingListingImageColumn,
  normalizeListingImageUpdate,
  readListingWrite,
} from "@/lib/listing-images";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const owned = await requireOwnedListing(id);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = readListingWrite(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const hasCover = Object.prototype.hasOwnProperty.call(body, "cover_image_path");
  const hasGallery = Object.prototype.hasOwnProperty.call(body, "gallery_image_paths");
  const update: Record<string, unknown> = {
    title: parsed.value.title,
    slug: parsed.value.slug,
    category: parsed.value.category,
    summary: parsed.value.summary,
    price: parsed.value.price,
  };
  if (typeof body.pricing_model === "string") {
    update.pricing_model = body.pricing_model || "subscription";
  }

  let nextCover = owned.app.cover_image_path;
  let nextGallery = owned.app.gallery_image_paths;

  if (hasCover || hasGallery) {
    const normalized = normalizeListingImageUpdate({
      appId: id,
      cover: hasCover ? body.cover_image_path : owned.app.cover_image_path,
      gallery: hasGallery ? body.gallery_image_paths : owned.app.gallery_image_paths,
    });
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const previous = new Set(
      [owned.app.cover_image_path, ...owned.app.gallery_image_paths].filter((path): path is string => typeof path === "string"),
    );
    const added = [normalized.cover, ...normalized.gallery]
      .filter((path): path is string => typeof path === "string")
      .filter((path) => !previous.has(path));
    for (const path of added) {
      const checked = await validateStoredListingImage(owned.supabase, path);
      if (!checked.ok) {
        if (checked.remove) {
          await owned.supabase.storage.from(LISTING_IMAGES_BUCKET).remove([path]);
        }
        return NextResponse.json({ error: checked.error }, { status: 400 });
      }
    }

    nextCover = normalized.cover;
    nextGallery = normalized.gallery;
    update.cover_image_path = nextCover;
    update.gallery_image_paths = nextGallery;
  }

  const returning = hasCover || hasGallery ? "id, title, slug, cover_image_path, gallery_image_paths" : "id, title, slug";
  const { data, error } = await owned.supabase.from("apps").update(update).eq("id", id).select(returning).single();

  if (error) {
    if (isMissingListingImageColumn(error.message)) {
      return NextResponse.json(
        { error: "Apply supabase/migrations/20261110153000_listing_images.sql before saving images." },
        { status: 503 },
      );
    }
    const conflict = error.code === "23505";
    return NextResponse.json(
      { error: conflict ? "An app with that slug already exists" : error.message },
      { status: conflict ? 409 : 400 },
    );
  }

  if (hasCover || hasGallery) {
    const kept = new Set([nextCover, ...nextGallery].filter((path): path is string => typeof path === "string"));
    const removed = [owned.app.cover_image_path, ...owned.app.gallery_image_paths]
      .filter((path): path is string => typeof path === "string")
      .filter((path) => !kept.has(path));
    if (removed.length > 0) {
      const { error: removeError } = await owned.supabase.storage.from(LISTING_IMAGES_BUCKET).remove(removed);
      if (removeError) {
        console.warn("Failed to delete replaced listing images", removeError.message);
      }
    }
  }

  return NextResponse.json({ data });
}
