import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureCreatorForUser, getAuthUser } from "@/lib/data/creators";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  LISTING_IMAGES_BUCKET,
  extensionMatchesMime,
  isListingUuid,
  isMissingListingImageColumn,
  listingImagePath,
  readListingImageFile,
  validateListingImageBytes,
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_SIZE_ERROR,
  LISTING_IMAGE_TYPE_ERROR,
} from "@/lib/listing-images";

export type OwnedListing = {
  id: string;
  creator_id: string;
  cover_image_path: string | null;
  gallery_image_paths: string[];
};

type OwnedListingResult =
  | { ok: true; supabase: SupabaseClient; app: OwnedListing }
  | { ok: false; status: number; error: string };

export async function requireOwnedListing(appId: string): Promise<OwnedListingResult> {
  if (!isListingUuid(appId)) {
    return { ok: false, status: 404, error: "Listing not found" };
  }

  const user = await getAuthUser();
  if (!user) {
    return { ok: false, status: 401, error: "Sign in required" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "Supabase is not configured" };
  }

  const creator = await ensureCreatorForUser(user);
  if (!creator) {
    return { ok: false, status: 500, error: "Could not load creator profile" };
  }

  const { data, error } = await supabase
    .from("apps")
    .select("id, creator_id, cover_image_path, gallery_image_paths")
    .eq("id", appId)
    .maybeSingle();

  if (error) {
    if (isMissingListingImageColumn(error.message)) {
      return {
        ok: false,
        status: 503,
        error: "Apply supabase/migrations/20261110153000_listing_images.sql before saving images.",
      };
    }
    return { ok: false, status: 400, error: error.message };
  }

  if (!data || data.creator_id !== creator.id) {
    return { ok: false, status: 404, error: "Listing not found" };
  }

  return {
    ok: true,
    supabase,
    app: {
      id: data.id,
      creator_id: data.creator_id,
      cover_image_path: typeof data.cover_image_path === "string" ? data.cover_image_path : null,
      gallery_image_paths: Array.isArray(data.gallery_image_paths)
        ? data.gallery_image_paths.filter((path): path is string => typeof path === "string")
        : [],
    },
  };
}

export async function validateStoredListingImage(supabase: SupabaseClient, path: string) {
  const bucket = supabase.storage.from(LISTING_IMAGES_BUCKET);
  const info = await bucket.info(path);
  if (info.error || !info.data) {
    return { ok: false as const, error: "One of the images did not finish uploading. Try again.", remove: false };
  }

  if (typeof info.data.size === "number" && info.data.size > LISTING_IMAGE_MAX_BYTES) {
    return { ok: false as const, error: LISTING_IMAGE_SIZE_ERROR, remove: true };
  }

  const downloaded = await bucket.download(path);
  if (downloaded.error || !downloaded.data) {
    return { ok: false as const, error: "One of the images could not be read back. Try again.", remove: false };
  }

  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const validated = validateListingImageBytes(bytes);
  if (!validated.ok) {
    return { ok: false as const, error: validated.error, remove: true };
  }
  if (!extensionMatchesMime(path, validated.mime)) {
    return { ok: false as const, error: LISTING_IMAGE_TYPE_ERROR, remove: true };
  }
  return { ok: true as const };
}

export async function uploadListingImage(supabase: SupabaseClient, appId: string, file: File) {
  const listed = await supabase.storage.from(LISTING_IMAGES_BUCKET).list(appId, { limit: 25 });
  if (!listed.error && (listed.data?.length ?? 0) >= 20) {
    return {
      ok: false as const,
      error: "This listing already has too many uploaded images. Remove some, then try again.",
    };
  }

  const validated = await readListingImageFile(file);
  if (!validated.ok) return validated;

  const path = listingImagePath(appId, crypto.randomUUID(), validated.mime);
  const { error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).upload(path, validated.bytes, {
    contentType: validated.mime,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, path };
}
