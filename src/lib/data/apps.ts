import { LISTING_IMAGES_BUCKET, isMissingListingImageColumn } from "@/lib/listing-images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMarketplaceProvider, PUBLIC_APP_STATUSES, type MarketplaceApp } from "@/lib/types";

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
  cover_image_path?: string | null;
  gallery_image_paths?: string[] | null;
  creators: CreatorJoin;
};

const APP_SELECT_LEGACY = `
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

const APP_SELECT = `
  ${APP_SELECT_LEGACY},
  cover_image_path,
  gallery_image_paths
`;

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Strip characters that break PostgREST `or=` comma syntax. */
function sanitizeSearchTerm(value: string) {
  return value.replace(/[,()]/g, " ").replace(/%/g, "").trim();
}

function marketplaceSearchOrFilter(rawQuery: string) {
  const search = sanitizeSearchTerm(rawQuery);
  if (!search) {
    return null;
  }
  const quotedTag = `"${search.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return [
    `title.ilike.%${search}%`,
    `summary.ilike.%${search}%`,
    `category.ilike.%${search}%`,
    `tags.cs.{${quotedTag}}`,
  ].join(",");
}

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
    cover_image_path: row.cover_image_path ?? null,
    cover_image_url: null,
    gallery_images: (row.gallery_image_paths ?? [])
      .filter((path): path is string => typeof path === "string" && path.length > 0)
      .map((path) => ({ path, url: null })),
  };
}

type AppQuery = PromiseLike<{ data: unknown; error: { message: string } | null }>;

async function selectApps(run: (select: string) => AppQuery) {
  const first = await run(APP_SELECT);
  if (first.error && isMissingListingImageColumn(first.error.message)) {
    console.warn("Listing image columns are missing. Apply supabase/migrations/20261110153000_listing_images.sql.");
    return run(APP_SELECT_LEGACY);
  }
  return first;
}

async function attachListingImageUrls(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  apps: MarketplaceApp[],
) {
  const paths = [
    ...new Set(
      apps.flatMap((app) => [app.cover_image_path, ...app.gallery_images.map((image) => image.path)].filter((path): path is string => Boolean(path))),
    ),
  ];
  if (paths.length === 0) return apps;

  const urls = new Map<string, string>();
  try {
    for (let index = 0; index < paths.length; index += 100) {
      const batch = paths.slice(index, index + 100);
      const { data, error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).createSignedUrls(batch, SIGNED_URL_TTL_SECONDS);
      if (error) {
        console.warn("Failed to sign listing images", error.message);
        continue;
      }
      for (const item of data ?? []) {
        if (item.path && item.signedUrl && !item.error) {
          urls.set(item.path, item.signedUrl);
        }
      }
    }
  } catch (error) {
    console.warn("Failed to sign listing images", error);
    return apps;
  }

  return apps.map((app) => ({
    ...app,
    cover_image_url: app.cover_image_path ? (urls.get(app.cover_image_path) ?? null) : null,
    gallery_images: app.gallery_images.map((image) => ({
      ...image,
      url: urls.get(image.path) ?? null,
    })),
  }));
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

  const { data, error } = await selectApps((select) => {
    let query = supabase.from("apps").select(select).order("featured", { ascending: false }).order("created_at", {
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
      if (isMarketplaceProvider(category)) {
        query = query.contains("tags", [category]);
      } else {
        query = query.eq("category", category);
      }
    }

    const search = filters.query?.trim();
    if (search) {
      const clause = marketplaceSearchOrFilter(search);
      if (clause) {
        query = query.or(clause);
      }
    }

    if (filters.featured) {
      query = query.eq("featured", true);
    }

    return query;
  });
  if (error) {
    console.warn("Failed to list apps", error.message);
    return [];
  }

  return attachListingImageUrls(supabase, ((data ?? []) as AppRow[]).map(mapAppRow));
}

export async function getAppBySlug(slug: string): Promise<MarketplaceApp | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await selectApps((select) => supabase.from("apps").select(select).eq("slug", slug).maybeSingle());
  if (error) {
    console.warn("Failed to load app", error.message);
    return null;
  }

  if (!data) return null;
  const [app] = await attachListingImageUrls(supabase, [mapAppRow(data as AppRow)]);
  return app ?? null;
}

export async function listCreatorApps(creatorId: string): Promise<MarketplaceApp[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await selectApps((select) =>
    supabase.from("apps").select(select).eq("creator_id", creatorId).order("created_at", { ascending: false }),
  );

  if (error) {
    console.warn("Failed to list creator apps", error.message);
    return [];
  }

  return attachListingImageUrls(supabase, ((data ?? []) as AppRow[]).map(mapAppRow));
}
