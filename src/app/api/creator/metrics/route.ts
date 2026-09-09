import { NextResponse } from "next/server";
import {
  ensureCreatorForUser,
  getAuthUser,
  getCreatorForUser,
  getCreatorMetrics,
  listCreatorInstalls,
  listCreatorPayouts,
} from "@/lib/data/creators";
import { listCreatorApps } from "@/lib/data/apps";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const creator = (await getCreatorForUser(user.id)) ?? (await ensureCreatorForUser(user));
  if (!creator) {
    return NextResponse.json({ error: "Could not load creator profile" }, { status: 500 });
  }

  const [metrics, apps, installs, payouts] = await Promise.all([
    getCreatorMetrics(),
    listCreatorApps(creator.id),
    listCreatorInstalls(creator.id),
    listCreatorPayouts(creator.id),
  ]);

  return NextResponse.json({
    creator,
    metrics,
    apps,
    installs,
    payouts,
  });
}
