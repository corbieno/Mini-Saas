import { NextResponse } from "next/server";
import { transitionCollaboration } from "@/lib/data/collaborations";
import { ensureCreatorForUser, getAuthUser, getCreatorForUser } from "@/lib/data/creators";
import type { CollaborationAction } from "@/lib/types";

const ACTIONS: CollaborationAction[] = ["accept", "decline", "withdraw", "end"];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const creator = (await getCreatorForUser(user.id)) ?? (await ensureCreatorForUser(user));
  if (!creator) {
    return NextResponse.json({ error: "Could not load creator profile" }, { status: 500 });
  }

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Collaboration request not found" }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  if (typeof action !== "string" || !ACTIONS.includes(action as CollaborationAction)) {
    return NextResponse.json({ error: "Action must be accept, decline, withdraw, or end" }, { status: 400 });
  }

  const result = await transitionCollaboration(creator.id, id, action as CollaborationAction);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data });
}
