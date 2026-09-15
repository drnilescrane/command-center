import { NextResponse } from "next/server";
import { verifyUserRequest } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { upsertTaskCalendarEvent } from "@/lib/server/calendar";
import type { Task } from "@/lib/types";

export const runtime = "nodejs";

function date(v: unknown) { return v && typeof (v as { toDate?: () => Date }).toDate === "function" ? (v as { toDate: () => Date }).toDate() : null; }

export async function POST(request: Request) {
  try {
    const decoded = await verifyUserRequest(request);
    const { taskId } = await request.json();
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    const ref = adminDb.collection("users").doc(decoded.uid).collection("tasks").doc(String(taskId));
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const raw = snap.data() || {};
    const task: Task = { id: snap.id, title: String(raw.title || "Task"), status: (raw.status || "planned") as Task["status"], priority: (raw.priority || 2) as Task["priority"], notes: raw.notes || "", scheduledStart: date(raw.scheduledStart), scheduledEnd: date(raw.scheduledEnd), calendarEventId: raw.calendarEventId || null };
    const calendarEventId = await upsertTaskCalendarEvent(task);
    await ref.update({ calendarEventId });
    return NextResponse.json({ ok: true, calendarEventId });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Could not sync calendar" }, { status: 503 }); }
}
