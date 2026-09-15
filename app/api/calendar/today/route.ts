import { NextResponse } from "next/server";
import { verifyUserRequest } from "@/lib/server/auth";
import { listCalendarItems } from "@/lib/server/calendar";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await verifyUserRequest(request);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
    const events = await listCalendarItems(start, end);
    return NextResponse.json({ events });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Calendar unavailable" }, { status: 503 });
  }
}
