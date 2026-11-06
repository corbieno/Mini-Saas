import { NextResponse } from "next/server";
import { updateCollaborationSettings } from "@/lib/data/collaborations";
import { ensureCreatorForUser, getAuthUser, getCreatorForUser } from "@/lib/data/creators";

export async function PATCH(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const creator = (await getCreatorForUser(user.id)) ?? (await ensureCreatorForUser(user));
  if (!creator) {
    return NextResponse.json({ error: "Could not load creator profile" }, { status: 500 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.suggestions_enabled !== "boolean") {
    return NextResponse.json({ error: "suggestions_enabled must be true or false" }, { status: 400 });
  }

  const result = await updateCollaborationSettings(creator.id, body.suggestions_enabled);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data });
}
