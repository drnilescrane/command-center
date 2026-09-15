import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { TaskStatus } from "@/lib/types";

function refs(uid: string) {
  return {
    tasks: adminDb.collection("users").doc(uid).collection("tasks"),
    sessions: adminDb.collection("users").doc(uid).collection("workSessions"),
    events: adminDb.collection("users").doc(uid).collection("taskEvents"),
    runtime: adminDb.collection("users").doc(uid).collection("state").doc("runtime"),
  };
}

export async function createTaskAsAssistant(uid: string, input: Record<string, unknown>) {
  const r = refs(uid);
  const taskRef = r.tasks.doc();
  const now = Timestamp.now();
  const data = {
    title: String(input.title || "").trim(),
    notes: input.notes ? String(input.notes) : "",
    status: (input.status as TaskStatus) || "inbox",
    priority: Math.min(4, Math.max(1, Number(input.priority || 2))),
    project: input.project ? String(input.project) : "",
    estimateMinutes: input.estimateMinutes ? Number(input.estimateMinutes) : null,
    dueAt: input.dueAt ? Timestamp.fromDate(new Date(String(input.dueAt))) : null,
    scheduledStart: input.scheduledStart ? Timestamp.fromDate(new Date(String(input.scheduledStart))) : null,
    scheduledEnd: input.scheduledEnd ? Timestamp.fromDate(new Date(String(input.scheduledEnd))) : null,
    followUpAt: input.followUpAt ? Timestamp.fromDate(new Date(String(input.followUpAt))) : null,
    waitingOn: input.waitingOn ? String(input.waitingOn) : "",
    actualMs: 0,
    rescheduleCount: 0,
    source: "assistant",
    createdAt: now,
    updatedAt: now,
  };
  await adminDb.runTransaction(async (tx) => {
    tx.set(taskRef, data);
    tx.set(r.events.doc(), { taskId: taskRef.id, type: "created", at: now, metadata: { source: "assistant" } });
  });
  return { id: taskRef.id, ...(serialize(data) as Record<string, unknown>) };
}

export async function listTasksAsAssistant(uid: string) {
  const snap = await refs(uid).tasks.get();
  return snap.docs.map((d) => ({ id: d.id, ...(serialize(d.data()) as Record<string, unknown>) }));
}

export async function getTodayAsAssistant(uid: string) {
  const [taskSnap, runtimeSnap] = await Promise.all([refs(uid).tasks.get(), refs(uid).runtime.get()]);
  const tasks = taskSnap.docs.map((d) => ({ id: d.id, ...(serialize(d.data()) as Record<string, unknown>) })) as Array<Record<string, unknown>>;
  const now = new Date();
  const today = tasks.filter((t) => {
    const scheduled = t.scheduledStart ? new Date(String(t.scheduledStart)) : null;
    const due = t.dueAt ? new Date(String(t.dueAt)) : null;
    const same = (d: Date | null) => !!d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    return same(scheduled) || same(due) || t.status === "in_progress";
  });
  const waiting = tasks.filter((t) => t.status === "waiting" || t.status === "blocked");
  return { runtime: serialize(runtimeSnap.data() || {}), today, waiting };
}

export async function assistantAction(uid: string, taskId: string, action: string, payload: Record<string, unknown>) {
  const r = refs(uid);
  const taskRef = r.tasks.doc(taskId);
  const now = Timestamp.now();
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) throw new Error("Task not found");
  const task = taskSnap.data() || {};
  const reason = payload.reason ? String(payload.reason) : undefined;

  if (action === "edit" || action === "schedule") {
    const patch: Record<string, unknown> = { updatedAt: now };
    const allowed = ["title", "notes", "project", "priority", "estimateMinutes", "waitingOn"];
    for (const key of allowed) if (payload[key] !== undefined) patch[key] = payload[key];
    for (const key of ["dueAt", "scheduledStart", "scheduledEnd", "followUpAt"]) {
      if (payload[key] !== undefined) patch[key] = payload[key] ? Timestamp.fromDate(new Date(String(payload[key]))) : FieldValue.delete();
    }
    if (payload.status) patch.status = payload.status;
    if (action === "schedule" && !payload.status) patch.status = "scheduled";
    if (action === "schedule" && payload.scheduledStart) {
      const oldStart = task.scheduledStart?.toMillis?.() ?? null;
      const newStart = new Date(String(payload.scheduledStart)).getTime();
      if (oldStart && Number.isFinite(newStart) && oldStart !== newStart) patch.rescheduleCount = FieldValue.increment(1);
    }
    await taskRef.update(patch);
    await r.events.doc().set({ taskId, type: action === "schedule" ? (task.scheduledStart ? "rescheduled" : "scheduled") : "edited", at: now, ...(reason ? { reason } : {}) });
    return { ok: true };
  }

  const statusMap: Record<string, TaskStatus> = {
    complete: "done",
    block: "blocked",
    defer: "deferred",
    wait: "waiting",
    drop: "dropped",
    plan: "planned",
  };
  const status = statusMap[action];
  if (!status) throw new Error(`Unsupported action: ${action}`);
  const update: Record<string, unknown> = { status, updatedAt: now, ...(reason ? { lastReason: reason } : {}) };
  if (status === "done") update.completedAt = now;
  if (status === "dropped") update.droppedAt = now;
  await adminDb.runTransaction(async (tx) => {
    tx.update(taskRef, update);
    tx.set(r.events.doc(), { taskId, type: action === "complete" ? "completed" : action, at: now, ...(reason ? { reason } : {}) });
  });
  return { ok: true };
}

function serialize(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = serialize(v);
    return out;
  }
  return value;
}
