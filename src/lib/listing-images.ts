import { slugify } from "./format.ts";

/**
 * Listing images are a cover file plus a gallery. `apps.description` is plain
 * text — there is no markdown or rich-text renderer — so descriptions do not
 * accept inline images.
 */
export const LISTING_IMAGES_BUCKET = "listing-images";

export const LISTING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const MAX_GALLERY_IMAGES = 5;

export const LISTING_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export type ListingImageMime = (typeof LISTING_IMAGE_MIME_TYPES)[number];

export const LISTING_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export const LISTING_IMAGE_TYPE_ERROR = "Use a PNG, JPG, WEBP, or GIF.";

export const LISTING_IMAGE_SIZE_ERROR = "Images must be 5 MB or smaller.";

export const LISTING_IMAGE_EMPTY_ERROR = "The file is empty.";

export const GALLERY_LIMIT_ERROR = "Gallery holds up to 5 images.";

export const PRODUCTION_SUPABASE_HOST = "skpjpbhkxntmlcuzzjee.supabase.co";

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const UUID_RE = new RegExp(`^${UUID_PATTERN}$`, "i");

export type ListingWrite = {
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  description: string | null;
  pricingModel: string;
  price: number | null;
};

export function isListingUuid(value: string) {
  return UUID_RE.test(value);
}

export function isMissingListingImageColumn(message: string) {
  return /cover_image_path|gallery_image_paths/i.test(message);
}

export function extensionForMime(mime: ListingImageMime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "gif";
}

export function extensionMatchesMime(path: string, mime: ListingImageMime) {
  const extension = path.split(".").pop()?.toLowerCase();
  if (mime === "image/jpeg") return extension === "jpg" || extension === "jpeg";
  if (mime === "image/png") return extension === "png";
  if (mime === "image/webp") return extension === "webp";
  return extension === "gif";
}

export function isAllowedDeclaredImageType(type: string) {
  if (!type || type === "image/jpg") return true;
  return (LISTING_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

export function detectListingImageMime(bytes: Uint8Array): ListingImageMime | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function validateListingImageBytes(bytes: Uint8Array) {
  if (bytes.byteLength === 0) {
    return { ok: false as const, error: LISTING_IMAGE_EMPTY_ERROR };
  }
  if (bytes.byteLength > LISTING_IMAGE_MAX_BYTES) {
    return { ok: false as const, error: LISTING_IMAGE_SIZE_ERROR };
  }
  const mime = detectListingImageMime(bytes);
  if (!mime) {
    return { ok: false as const, error: LISTING_IMAGE_TYPE_ERROR };
  }
  return { ok: true as const, mime };
}

export async function readListingImageFile(file: { type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }) {
  if (!isAllowedDeclaredImageType(file.type)) {
    return { ok: false as const, error: LISTING_IMAGE_TYPE_ERROR };
  }
  if (file.size > LISTING_IMAGE_MAX_BYTES) {
    return { ok: false as const, error: LISTING_IMAGE_SIZE_ERROR };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validated = validateListingImageBytes(bytes);
  if (!validated.ok) return validated;
  return { ok: true as const, mime: validated.mime, bytes };
}

export function listingImagePath(appId: string, fileId: string, mime: ListingImageMime) {
  return `${appId}/${fileId}.${extensionForMime(mime)}`;
}

export function isListingImagePath(appId: string, path: string) {
  if (!isListingUuid(appId)) return false;
  const pattern = new RegExp(`^${appId}/${UUID_PATTERN}\\.(png|jpe?g|webp|gif)$`, "i");
  return pattern.test(path);
}

export function normalizeListingImageUpdate(input: { appId: string; cover: unknown; gallery: unknown }) {
  if (!isListingUuid(input.appId)) {
    return { ok: false as const, error: "Listing not found" };
  }

  let cover: string | null = null;
  if (input.cover != null && input.cover !== "") {
    if (typeof input.cover !== "string" || !isListingImagePath(input.appId, input.cover)) {
      return { ok: false as const, error: "The cover image is not part of this listing." };
    }
    cover = input.cover;
  }

  if (!Array.isArray(input.gallery)) {
    return { ok: false as const, error: "Gallery images must be a list." };
  }
  if (input.gallery.length > MAX_GALLERY_IMAGES) {
    return { ok: false as const, error: GALLERY_LIMIT_ERROR };
  }

  const gallery: string[] = [];
  for (const entry of input.gallery) {
    if (typeof entry !== "string" || !isListingImagePath(input.appId, entry)) {
      return { ok: false as const, error: "A gallery image is not part of this listing." };
    }
    if (entry === cover || gallery.includes(entry)) {
      return { ok: false as const, error: "Each image can only appear once." };
    }
    gallery.push(entry);
  }

  return { ok: true as const, cover, gallery };
}

export function readListingWrite(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const pricingModel = typeof body.pricing_model === "string" ? body.pricing_model : "subscription";
  const requestedSlug = typeof body.slug === "string" ? slugify(body.slug) : slugify(title);
  const price = body.price == null || body.price === "" ? null : Number(body.price);

  if (!title || !category || !requestedSlug) {
    return { ok: false as const, error: "Title, category, and slug are required" };
  }
  if (price != null && Number.isNaN(price)) {
    return { ok: false as const, error: "Price must be a number" };
  }

  const value: ListingWrite = {
    title,
    slug: requestedSlug,
    category,
    summary: summary || null,
    description: description || null,
    pricingModel,
    price,
  };
  return { ok: true as const, value };
}

export function supabaseStorageHostnames(envUrl: string | undefined, fallback = PRODUCTION_SUPABASE_HOST) {
  const hosts = new Set<string>();
  if (fallback) hosts.add(fallback);
  if (!envUrl) return [...hosts];
  try {
    const hostname = new URL(envUrl).hostname;
    if (hostname.endsWith(".supabase.co")) hosts.add(hostname);
  } catch {
    // Ignore a malformed project URL and keep the known host.
  }
  return [...hosts];
}

export function listingImageRemotePatterns(hostnames: string[]) {
  return hostnames.map((hostname) => ({
    protocol: "https" as const,
    hostname,
    pathname: `/storage/v1/object/sign/${LISTING_IMAGES_BUCKET}/**`,
  }));
}

export function storageErrorMessage(message: string) {
  if (/row-level security/i.test(message)) {
    return "Upload blocked by storage policy. Apply supabase/migrations/20261110153000_listing_images.sql in the Supabase SQL editor.";
  }
  if (/mime|file size|maximum size|payload too large/i.test(message)) {
    return LISTING_IMAGE_TYPE_ERROR + " " + LISTING_IMAGE_SIZE_ERROR;
  }
  return message;
}
