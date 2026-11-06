import { NextResponse } from "next/server";
import { ensureCreatorForUser, getAuthUser, getCreatorForUser } from "@/lib/data/creators";
import { createCollaborationRequest, loadCollaborationOverview } from "@/lib/data/collaborations";

async function requireCreator() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const creator = (await getCreatorForUser(user.id)) ?? (await ensureCreatorForUser(user));
  if (!creator) {
    return NextResponse.json({ error: "Could not load creator profile" }, { status: 500 });
  }

  return creator;
}

export async function GET() {
  const creator = await requireCreator();
  if (creator instanceof NextResponse) {
    return creator;
  }

  const result = await loadCollaborationOverview(creator.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data });
}

export async function POST(request: Request) {
  const creator = await requireCreator();
  if (creator instanceof NextResponse) {
    return creator;
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const requesterAppId = typeof body.requester_app_id === "string" ? body.requester_app_id.trim() : "";
  const recipientAppId = typeof body.recipient_app_id === "string" ? body.recipient_app_id.trim() : "";
  const message = typeof body.message === "string" ? body.message : null;

  if (!requesterAppId || !recipientAppId) {
    return NextResponse.json({ error: "Choose both listings for the collaboration" }, { status: 400 });
  }

  const result = await createCollaborationRequest(creator.id, {
    requesterAppId,
    recipientAppId,
    message,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
