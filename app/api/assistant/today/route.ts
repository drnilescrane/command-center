import { NextResponse } from "next/server";
import { getOwnerUid, verifyAssistantRequest } from "@/lib/server/auth";
import { getTodayAsAssistant } from "@/lib/server/task-service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { verifyAssistantRequest(request); return NextResponse.json(await getTodayAsAssistant(await getOwnerUid())); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Unauthorized" }, { status: 401 }); }
}
