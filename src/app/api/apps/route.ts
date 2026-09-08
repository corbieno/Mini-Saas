import { NextResponse } from "next/server";
import { listApps } from "@/lib/data/apps";

export async function GET() {
  const data = await listApps();
  return NextResponse.json({ data });
}
