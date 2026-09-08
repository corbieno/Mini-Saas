import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PUBLIC_APP_STATUSES, type MarketplaceApp } from "@/lib/types";

type CreatorJoin = { workspace_name: string } | { workspace_name: string }[] | null;

type AppRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  description: string | null;
  pricing_model: string;
  price: number | string | null;
  currency: string;
  status: string;
  featured: boolean;
  tags: string[] | null;
  creator_id: string | null;
  creators: CreatorJoin;
};

const APP_SELECT = `
  id,
  title,
  slug,
  category,
  summary,
  description,
  pricing_model,
  price,
  currency,
  status,
  featured,
  tags,
  creator_id,
  creators ( workspace_name )
`;

function creatorName(creators: CreatorJoin) {
  if (!creators) {
    return null;
  }

  return Array.isArray(creators) ? (creators[0]?.workspace_name ?? null) : creators.workspace_name;
}

export function mapAppRow(row: AppRow): MarketplaceApp {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    summary: row.summary,
    description: row.description,
    pricing_model: row.pricing_model,
    price: row.price == null ? null : Number(row.price),
    currency: row.currency,
    status: row.status,
    featured: row.featured,
    tags: row.tags ?? [],
    creator_id: row.creator_id,
    creator_name: creatorName(row.creators),
  };
}

export type ListAppsFilters = {
  query?: string;
  category?: string;
  featured?: boolean;
  status?: string;
};

export async function listApps(filters: ListAppsFilters = {}): Promise<MarketplaceApp[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  let query = supabase.from("apps").select(APP_SELECT).order("featured", { ascending: false }).order("created_at", {
    ascending: false,
  });

  const status = filters.status?.trim();
  if (status && status !== "all") {
    query = query.eq("status", status);
  } else {
    query = query.in("status", [...PUBLIC_APP_STATUSES]);
  }

  const category = filters.category?.trim();
  if (category && category !== "All") {
    query = query.ilike("category", `%${category}%`);
  }

  const search = filters.query?.trim();
  if (search) {
    query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%,category.ilike.%${search}%`);
  }

  if (filters.featured) {
    query = query.eq("featured", true);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Failed to list apps", error.message);
    return [];
  }

  return ((data ?? []) as AppRow[]).map(mapAppRow);
}

export async function getAppBySlug(slug: string): Promise<MarketplaceApp | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("apps").select(APP_SELECT).eq("slug", slug).maybeSingle();
  if (error) {
    console.warn("Failed to load app", error.message);
    return null;
  }

  return data ? mapAppRow(data as AppRow) : null;
}

export async function listCreatorApps(creatorId: string): Promise<MarketplaceApp[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("apps")
    .select(APP_SELECT)
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to list creator apps", error.message);
    return [];
  }

  return ((data ?? []) as AppRow[]).map(mapAppRow);
}
