import { NextResponse } from "next/server";
import { getOwnerUid, verifyAssistantRequest } from "@/lib/server/auth";
import { assistantAction } from "@/lib/server/task-service";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { verifyAssistantRequest(request); const { id } = await params; const body = await request.json(); if (!body.action) return NextResponse.json({ error: "action is required" }, { status: 400 }); return NextResponse.json(await assistantAction(await getOwnerUid(), id, String(body.action), body)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Action failed" }, { status: 400 }); }
}
