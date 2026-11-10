import { NextResponse } from "next/server";
import { listApps } from "@/lib/data/apps";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureCreatorForUser, getAuthUser } from "@/lib/data/creators";
import { readListingWrite } from "@/lib/listing-images";
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

  const parsed = readListingWrite(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { title, slug, category, summary, description, pricingModel, price } = parsed.value;

  const requestedStatus = typeof body.status === "string" ? body.status : "draft";
  const status = PUBLIC_APP_STATUSES.includes(requestedStatus as (typeof PUBLIC_APP_STATUSES)[number])
    ? requestedStatus
    : "draft";

  const { data, error } = await supabase
    .from("apps")
    .insert({
      creator_id: creator.id,
      title,
      slug,
      category,
      summary,
      description,
      pricing_model: pricingModel,
      price,
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
