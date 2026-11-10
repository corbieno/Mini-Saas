import { NextResponse } from "next/server";
import { requireOwnedListing, uploadListingImage } from "@/lib/data/owned-listing";
import { LISTING_IMAGES_BUCKET, isListingImagePath, storageErrorMessage } from "@/lib/listing-images";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const owned = await requireOwnedListing(id);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload a PNG, JPG, WEBP, or GIF." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  }

  const uploaded = await uploadListingImage(owned.supabase, id, file);
  if (!uploaded.ok) {
    return NextResponse.json({ error: storageErrorMessage(uploaded.error) }, { status: 400 });
  }

  return NextResponse.json({ data: { path: uploaded.path } }, { status: 201 });
}

export async function DELETE(request: Request, context: RouteContext) {
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

  const path = typeof body.path === "string" ? body.path : "";
  if (!isListingImagePath(id, path)) {
    return NextResponse.json({ error: "That image is not part of this listing." }, { status: 400 });
  }

  const referenced =
    path === owned.app.cover_image_path || owned.app.gallery_image_paths.includes(path);
  if (referenced) {
    return NextResponse.json(
      { error: "Save the listing before deleting an image that is still attached." },
      { status: 409 },
    );
  }

  const { error } = await owned.supabase.storage.from(LISTING_IMAGES_BUCKET).remove([path]);
  if (error) {
    return NextResponse.json({ error: storageErrorMessage(error.message) }, { status: 400 });
  }

  return NextResponse.json({ data: { path } });
}
