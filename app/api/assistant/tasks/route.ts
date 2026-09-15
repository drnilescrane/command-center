import { NextResponse } from "next/server";
import { getOwnerUid, verifyAssistantRequest } from "@/lib/server/auth";
import { createTaskAsAssistant, listTasksAsAssistant } from "@/lib/server/task-service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { verifyAssistantRequest(request); return NextResponse.json({ tasks: await listTasksAsAssistant(await getOwnerUid()) }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Unauthorized" }, { status: 401 }); }
}
export async function POST(request: Request) {
  try { verifyAssistantRequest(request); const input = await request.json(); if (!String(input.title || "").trim()) return NextResponse.json({ error: "title is required" }, { status: 400 }); return NextResponse.json(await createTaskAsAssistant(await getOwnerUid(), input), { status: 201 }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Unauthorized" }, { status: 401 }); }
}
