import type { Timestamp } from "firebase/firestore";
import type { Task, WorkSession, RuntimeState, TaskEvent } from "@/lib/types";

function date(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as Timestamp).toDate === "function") return (value as Timestamp).toDate();
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function normalizeTask(id: string, raw: Record<string, unknown>): Task {
  return {
    id,
    title: String(raw.title || "Untitled"),
    notes: raw.notes ? String(raw.notes) : undefined,
    status: (raw.status as Task["status"]) || "inbox",
    priority: (Number(raw.priority || 2) as Task["priority"]),
    project: raw.project ? String(raw.project) : undefined,
    people: Array.isArray(raw.people) ? raw.people.map(String) : undefined,
    estimateMinutes: raw.estimateMinutes == null ? undefined : Number(raw.estimateMinutes),
    actualMs: Number(raw.actualMs || 0),
    dueAt: date(raw.dueAt),
    scheduledStart: date(raw.scheduledStart),
    scheduledEnd: date(raw.scheduledEnd),
    followUpAt: date(raw.followUpAt),
    waitingOn: raw.waitingOn ? String(raw.waitingOn) : undefined,
    rescheduleCount: Number(raw.rescheduleCount || 0),
    currentSessionId: raw.currentSessionId ? String(raw.currentSessionId) : null,
    calendarEventId: raw.calendarEventId ? String(raw.calendarEventId) : null,
    source: (raw.source as Task["source"]) || "app",
    createdAt: date(raw.createdAt),
    updatedAt: date(raw.updatedAt),
    completedAt: date(raw.completedAt),
    droppedAt: date(raw.droppedAt),
    lastReason: raw.lastReason ? String(raw.lastReason) : undefined,
  };
}

export function normalizeSession(id: string, raw: Record<string, unknown>): WorkSession {
  return {
    id,
    taskId: String(raw.taskId || ""),
    state: (raw.state as WorkSession["state"]) || "stopped",
    startedAt: date(raw.startedAt),
    activeStartedAt: date(raw.activeStartedAt),
    pausedAt: date(raw.pausedAt),
    endedAt: date(raw.endedAt),
    accumulatedMs: Number(raw.accumulatedMs || 0),
    interruptionCount: Number(raw.interruptionCount || 0),
    stopReason: raw.stopReason ? String(raw.stopReason) : undefined,
  };
}

export function normalizeEvent(id: string, raw: Record<string, unknown>): TaskEvent {
  return {
    id,
    taskId: String(raw.taskId || ""),
    type: raw.type as TaskEvent["type"],
    at: date(raw.at),
    reason: raw.reason ? String(raw.reason) : undefined,
    metadata: (raw.metadata as Record<string, unknown>) || undefined,
  };
}

export function normalizeRuntime(raw?: Record<string, unknown>): RuntimeState {
  return {
    activeTaskId: raw?.activeTaskId ? String(raw.activeTaskId) : null,
    activeSessionId: raw?.activeSessionId ? String(raw.activeSessionId) : null,
    updatedAt: date(raw?.updatedAt),
  };
}
