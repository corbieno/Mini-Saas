import { NextResponse } from "next/server";
import { listApps } from "@/lib/data/apps";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureCreatorForUser, getAuthUser } from "@/lib/data/creators";
import { slugify } from "@/lib/format";
import { PUBLIC_APP_STATUSES } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const featuredParam = searchParams.get("featured");

  const data = await listApps({
    query: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    featured: featuredParam === "true" || featuredParam === "1",
    status,
  });

  return NextResponse.json({ data, count: data.length });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const creator = await ensureCreatorForUser(user);
  if (!creator) {
    return NextResponse.json({ error: "Could not load creator profile" }, { status: 500 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const pricingModel = typeof body.pricing_model === "string" ? body.pricing_model : "subscription";
  const requestedSlug = typeof body.slug === "string" ? slugify(body.slug) : slugify(title);
  const priceValue = body.price == null || body.price === "" ? null : Number(body.price);

  if (!title || !category || !requestedSlug) {
    return NextResponse.json({ error: "Title, category, and slug are required" }, { status: 400 });
  }

  if (priceValue != null && Number.isNaN(priceValue)) {
    return NextResponse.json({ error: "Price must be a number" }, { status: 400 });
  }

  const requestedStatus = typeof body.status === "string" ? body.status : "draft";
  const status = PUBLIC_APP_STATUSES.includes(requestedStatus as (typeof PUBLIC_APP_STATUSES)[number])
    ? requestedStatus
    : "draft";

  const { data, error } = await supabase
    .from("apps")
    .insert({
      creator_id: creator.id,
      title,
      slug: requestedSlug,
      category,
      summary: summary || null,
      description: description || null,
      pricing_model: pricingModel,
      price: priceValue,
      currency: "usd",
      status,
      featured: false,
      tags: Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string") : [],
    })
    .select("id, title, slug, category, summary, price, status")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json(
      { error: conflict ? "An app with that slug already exists" : error.message },
      { status: conflict ? 409 : 400 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
