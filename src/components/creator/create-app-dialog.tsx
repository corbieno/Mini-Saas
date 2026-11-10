"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ListingImageEditor, type DraftListingImage } from "@/components/creator/listing-image-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/format";
import { APP_CATEGORIES, type MarketplaceApp } from "@/lib/types";

type ListingEditorDialogProps = {
  mode: "create" | "edit";
  app?: MarketplaceApp;
};

function revokeBlob(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

async function readJson(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { error?: string; data?: { id?: string; path?: string } };
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

export function CreateAppDialog() {
  return <ListingEditorDialog mode="create" />;
}

export function EditAppDialog({ app }: { app: MarketplaceApp }) {
  return <ListingEditorDialog mode="edit" app={app} />;
}

function ListingEditorDialog({ mode, app }: ListingEditorDialogProps) {
  const router = useRouter();
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<string>("Sales Ops");
  const [summary, setSummary] = useState("");
  const [price, setPrice] = useState("29");
  const [pricingModel, setPricingModel] = useState("subscription");
  const [cover, setCover] = useState<DraftListingImage | null>(null);
  const [gallery, setGallery] = useState<DraftListingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const listingIdRef = useRef<string | null>(app?.id ?? null);
  const savedRef = useRef(false);
  const imagesRef = useRef<{ cover: DraftListingImage | null; gallery: DraftListingImage[] }>({ cover: null, gallery: [] });
  imagesRef.current = { cover, gallery };

  const originalPaths = new Set(
    [app?.cover_image_path, ...(app?.gallery_images ?? []).map((image) => image.path)].filter((path): path is string => Boolean(path)),
  );
  const categories = (APP_CATEGORIES as readonly string[]).includes(category) ? APP_CATEGORIES : [category, ...APP_CATEGORIES];

  function retire(image: DraftListingImage) {
    revokeBlob(image.previewUrl);
    const id = listingIdRef.current;
    if (id && image.path && !originalPaths.has(image.path)) {
      void fetch(`/api/apps/${id}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: image.path }),
      });
    }
  }

  function cleanupUnsaved() {
    const images = [imagesRef.current.cover, ...imagesRef.current.gallery].filter((image): image is DraftListingImage => Boolean(image));
    if (savedRef.current) {
      for (const image of images) revokeBlob(image.previewUrl);
      return;
    }
    for (const image of images) retire(image);
  }

  function loadForm() {
    savedRef.current = false;
    listingIdRef.current = app?.id ?? null;
    setTitle(app?.title ?? "");
    setSlug(app?.slug ?? "");
    setCategory(app?.category ?? "Sales Ops");
    setSummary(app?.summary ?? "");
    setPrice(app ? (app.price == null ? "" : String(app.price)) : "29");
    setPricingModel(app?.pricing_model ?? "subscription");
    setSlugTouched(mode === "edit");
    setCover(
      app?.cover_image_path
        ? { key: app.cover_image_path, path: app.cover_image_path, file: null, previewUrl: app.cover_image_url }
        : null,
    );
    setGallery(
      (app?.gallery_images ?? []).map((image) => ({
        key: image.path,
        path: image.path,
        file: null,
        previewUrl: image.url,
      })),
    );
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (next) {
      loadForm();
      setOpen(true);
      return;
    }
    const shouldRefresh = savedRef.current || (mode === "create" && Boolean(listingIdRef.current));
    cleanupUnsaved();
    listingIdRef.current = app?.id ?? null;
    setOpen(false);
    if (shouldRefresh) router.refresh();
  }

  async function uploadDraft(appId: string, image: DraftListingImage) {
    if (image.path || !image.file) return image;
    const body = new FormData();
    body.append("file", image.file);
    const response = await fetch(`/api/apps/${appId}/images`, { method: "POST", body });
    const payload = await readJson(response);
    const path = payload.data?.path;
    if (!path) throw new Error("Could not upload image");
    return { ...image, path, file: null };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const fields = {
      title,
      slug: slug || slugify(title),
      category,
      summary,
      price: price === "" ? null : Number(price),
      pricing_model: pricingModel,
    };

    try {
      let id = listingIdRef.current;
      const existed = Boolean(id);
      if (!id) {
        const response = await fetch("/api/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...fields, status: "approved" }),
        });
        const payload = await readJson(response);
        id = payload.data?.id ?? null;
        if (!id) throw new Error("Could not create app");
        listingIdRef.current = id;
      }

      let nextCover = cover;
      if (nextCover) {
        try {
          nextCover = await uploadDraft(id, nextCover);
        } catch (uploadError) {
          imagesRef.current = { ...imagesRef.current, cover: nextCover };
          throw uploadError;
        }
        imagesRef.current = { ...imagesRef.current, cover: nextCover };
        setCover(nextCover);
      }

      const nextGallery = [...gallery];
      for (let index = 0; index < nextGallery.length; index += 1) {
        const image = nextGallery[index];
        if (!image) continue;
        try {
          nextGallery[index] = await uploadDraft(id, image);
        } catch (uploadError) {
          imagesRef.current = { cover: nextCover, gallery: nextGallery };
          setGallery(nextGallery);
          throw uploadError;
        }
      }
      imagesRef.current = { cover: nextCover, gallery: nextGallery };
      setGallery(nextGallery);

      const nextCoverPath = nextCover?.path ?? null;
      const nextGalleryPaths = nextGallery.map((image) => image.path).filter((path): path is string => Boolean(path));
      const originalGallery = (app?.gallery_images ?? []).map((image) => image.path);
      const imagesChanged =
        nextCoverPath !== (app?.cover_image_path ?? null) || nextGalleryPaths.join("\0") !== originalGallery.join("\0");

      if (existed || imagesChanged) {
        const response = await fetch(`/api/apps/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...fields,
            ...(imagesChanged ? { cover_image_path: nextCoverPath, gallery_image_paths: nextGalleryPaths } : {}),
          }),
        });
        await readJson(response);
      }

      savedRef.current = true;
      cleanupUnsaved();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save listing");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>Upload new app</Button>
        ) : (
          <Button variant="outline" size="sm">
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "List a Mini SaaS app" : "Edit listing"}</DialogTitle>
        </DialogHeader>
        <form className="max-h-[70vh] min-w-0 space-y-4 overflow-x-hidden overflow-y-auto pr-1" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor={`${baseId}-title`}>Title</Label>
            <Input
              id={`${baseId}-title`}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slugTouched) setSlug(slugify(event.target.value));
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${baseId}-slug`}>Slug</Label>
            <Input
              id={`${baseId}-slug`}
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
              }}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${baseId}-category`}>Category</Label>
              <select
                id={`${baseId}-category`}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${baseId}-price`}>Monthly price (USD)</Label>
              <Input
                id={`${baseId}-price`}
                type="number"
                min={0}
                step="1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${baseId}-summary`}>Summary</Label>
            <Textarea
              id={`${baseId}-summary`}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="What this automation does for buyers"
            />
          </div>
          <ListingImageEditor
            cover={cover}
            gallery={gallery}
            disabled={pending}
            onCoverChange={setCover}
            onGalleryChange={setGallery}
            onRetire={retire}
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : mode === "create" ? "Publish listing" : "Save listing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
