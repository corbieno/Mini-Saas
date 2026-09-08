"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_CATEGORIES } from "@/lib/types";
import { slugify } from "@/lib/format";

export function CreateAppDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<(typeof APP_CATEGORIES)[number]>("Sales Ops");
  const [summary, setSummary] = useState("");
  const [price, setPrice] = useState("29");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  function reset() {
    setTitle("");
    setSlug("");
    setCategory("Sales Ops");
    setSummary("");
    setPrice("29");
    setError(null);
    setSlugTouched(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug || slugify(title),
          category,
          summary,
          price: price === "" ? null : Number(price),
          status: "approved",
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not create app");
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create app");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Upload new app</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>List a Mini SaaS app</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="app-title">Title</Label>
            <Input
              id="app-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slugTouched) {
                  setSlug(slugify(event.target.value));
                }
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="app-slug">Slug</Label>
            <Input
              id="app-slug"
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
              <Label htmlFor="app-category">Category</Label>
              <select
                id="app-category"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={category}
                onChange={(event) => setCategory(event.target.value as (typeof APP_CATEGORIES)[number])}
              >
                {APP_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-price">Monthly price (USD)</Label>
              <Input
                id="app-price"
                type="number"
                min={0}
                step="1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="app-summary">Summary</Label>
            <Textarea
              id="app-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="What this automation does for buyers"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Publishing…" : "Publish listing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
