"use client";

import {
  Timestamp,
  collection,
  deleteField,
  doc,
  increment,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { EventType, Priority, Task, TaskStatus, WorkSession } from "@/lib/types";

function paths(uid: string) {
  return {
    task: (id: string) => doc(db, "users", uid, "tasks", id),
    taskNew: () => doc(collection(db, "users", uid, "tasks")),
    session: (id: string) => doc(db, "users", uid, "workSessions", id),
    sessionNew: () => doc(collection(db, "users", uid, "workSessions")),
    eventNew: () => doc(collection(db, "users", uid, "taskEvents")),
    runtime: doc(db, "users", uid, "state", "runtime"),
  };
}

function eventPayload(taskId: string, type: EventType, reason?: string, metadata?: Record<string, unknown>) {
  return {
    taskId,
    type,
    at: Timestamp.now(),
    ...(reason ? { reason } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export async function captureTask(uid: string, title: string) {
  const p = paths(uid);
  const taskRef = p.taskNew();
  const eventRef = p.eventNew();
  const now = Timestamp.now();
  await runTransaction(db, async (tx) => {
    tx.set(taskRef, {
      title: title.trim(),
      status: "inbox",
      priority: 2,
      actualMs: 0,
      rescheduleCount: 0,
      source: "app",
      createdAt: now,
      updatedAt: now,
    });
    tx.set(eventRef, eventPayload(taskRef.id, "created"));
  });
  return taskRef.id;
}

export interface TaskPatch {
  title?: string;
  notes?: string;
  status?: TaskStatus;
  priority?: Priority;
  project?: string;
  estimateMinutes?: number | null;
  dueAt?: Date | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  followUpAt?: Date | null;
  waitingOn?: string;
  lastReason?: string;
}

export async function editTask(uid: string, task: Task, patch: TaskPatch, reason?: string) {
  const p = paths(uid);
  const taskRef = p.task(task.id);
  const eventRef = p.eventNew();
  const update: Record<string, unknown> = { updatedAt: Timestamp.now() };

  for (const [key, value] of Object.entries(patch)) {
    if (["dueAt", "scheduledStart", "scheduledEnd", "followUpAt"].includes(key)) {
      update[key] = value instanceof Date ? Timestamp.fromDate(value) : value == null ? deleteField() : value;
    } else if (value === undefined) {
      continue;
    } else if (value === "" || value === null) {
      update[key] = deleteField();
    } else {
      update[key] = value;
    }
  }

  const oldStart = task.scheduledStart?.getTime() || null;
  const newStart = patch.scheduledStart instanceof Date ? patch.scheduledStart.getTime() : patch.scheduledStart === null ? null : oldStart;
  const scheduleChanged = patch.scheduledStart !== undefined && newStart !== oldStart;
  if (scheduleChanged && oldStart !== null) update.rescheduleCount = increment(1);
  if (scheduleChanged && newStart !== null && !["done", "dropped", "blocked", "waiting"].includes(String(patch.status ?? task.status))) {
    update.status = "scheduled";
  }

  await runTransaction(db, async (tx) => {
    tx.update(taskRef, update);
    tx.set(
      eventRef,
      eventPayload(
        task.id,
        scheduleChanged ? (oldStart ? "rescheduled" : "scheduled") : "edited",
        reason,
        scheduleChanged ? { from: oldStart, to: newStart } : undefined,
      ),
    );
  });
}

export async function quickStatus(uid: string, task: Task, status: TaskStatus, reason?: string) {
  const p = paths(uid);
  const taskRef = p.task(task.id);
  const eventRef = p.eventNew();
  const now = Timestamp.now();
  const type: EventType = status === "done" ? "completed" : status === "blocked" ? "blocked" : status === "deferred" ? "deferred" : status === "waiting" ? "waiting" : status === "dropped" ? "dropped" : status === "planned" ? "planned" : "edited";
  const patch: Record<string, unknown> = {
    status,
    updatedAt: now,
    ...(reason ? { lastReason: reason } : {}),
  };
  if (status === "done") patch.completedAt = now;
  if (status === "dropped") patch.droppedAt = now;
  await runTransaction(db, async (tx) => {
    tx.update(taskRef, patch);
    tx.set(eventRef, eventPayload(task.id, type, reason));
  });
}

export async function startTask(uid: string, task: Task) {
  const p = paths(uid);
  const sessionRef = p.sessionNew();
  const eventRef = p.eventNew();
  const now = Timestamp.now();

  await runTransaction(db, async (tx) => {
    const runtime = await tx.get(p.runtime);
    const activeSessionId = runtime.data()?.activeSessionId;
    if (activeSessionId) throw new Error("Another task is already running. Pause or stop it first.");

    tx.set(sessionRef, {
      taskId: task.id,
      state: "running",
      startedAt: now,
      activeStartedAt: now,
      accumulatedMs: 0,
      interruptionCount: 0,
    });
    tx.update(p.task(task.id), {
      status: "in_progress",
      currentSessionId: sessionRef.id,
      updatedAt: now,
    });
    tx.set(p.runtime, { activeTaskId: task.id, activeSessionId: sessionRef.id, updatedAt: now }, { merge: true });
    tx.set(eventRef, eventPayload(task.id, "started"));
  });
}

export async function pauseTask(uid: string, task: Task, session: WorkSession, reason?: string) {
  if (session.state !== "running" || !session.activeStartedAt) return;
  const p = paths(uid);
  const eventRef = p.eventNew();
  const now = Timestamp.now();
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(p.session(session.id));
    const data = snap.data();
    if (!data || data.state !== "running" || !data.activeStartedAt) return;
    const segmentMs = now.toMillis() - data.activeStartedAt.toMillis();
    tx.update(p.session(session.id), {
      state: "paused",
      activeStartedAt: null,
      pausedAt: now,
      accumulatedMs: Number(data.accumulatedMs || 0) + Math.max(0, segmentMs),
      interruptionCount: increment(1),
      ...(reason ? { stopReason: reason } : {}),
    });
    tx.set(eventRef, eventPayload(task.id, "paused", reason));
  });
}

export async function resumeTask(uid: string, task: Task, session: WorkSession) {
  if (session.state !== "paused") return;
  const p = paths(uid);
  const eventRef = p.eventNew();
  const now = Timestamp.now();
  await runTransaction(db, async (tx) => {
    tx.update(p.session(session.id), {
      state: "running",
      activeStartedAt: now,
      pausedAt: null,
    });
    tx.set(eventRef, eventPayload(task.id, "resumed"));
  });
}

async function finishSession(
  uid: string,
  task: Task,
  session: WorkSession,
  state: "stopped" | "completed" | "blocked" | "deferred",
  reason?: string,
) {
  const p = paths(uid);
  const now = Timestamp.now();
  const eventRef = p.eventNew();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(p.session(session.id));
    const data = snap.data();
    if (!data || ["stopped", "completed", "blocked", "deferred"].includes(data.state)) return;
    let totalMs = Number(data.accumulatedMs || 0);
    if (data.state === "running" && data.activeStartedAt) {
      totalMs += Math.max(0, now.toMillis() - data.activeStartedAt.toMillis());
    }

    const nextTaskStatus: TaskStatus =
      state === "completed" ? "done" : state === "blocked" ? "blocked" : state === "deferred" ? "deferred" : task.scheduledStart ? "scheduled" : "planned";

    tx.update(p.session(session.id), {
      state,
      activeStartedAt: null,
      endedAt: now,
      accumulatedMs: totalMs,
      ...(reason ? { stopReason: reason } : {}),
    });

    const taskPatch: Record<string, unknown> = {
      status: nextTaskStatus,
      currentSessionId: null,
      actualMs: increment(totalMs),
      updatedAt: now,
      ...(reason ? { lastReason: reason } : {}),
    };
    if (state === "completed") taskPatch.completedAt = now;
    tx.update(p.task(task.id), taskPatch);
    tx.set(p.runtime, { activeTaskId: null, activeSessionId: null, updatedAt: now }, { merge: true });
    tx.set(eventRef, eventPayload(task.id, state === "completed" ? "completed" : state, reason, { focusedMs: totalMs }));
  });
}

export const stopTask = (uid: string, task: Task, session: WorkSession, reason?: string) => finishSession(uid, task, session, "stopped", reason);
export const completeTask = (uid: string, task: Task, session: WorkSession, reason?: string) => finishSession(uid, task, session, "completed", reason);
export const blockTask = (uid: string, task: Task, session: WorkSession, reason?: string) => finishSession(uid, task, session, "blocked", reason);
export const deferTask = (uid: string, task: Task, session: WorkSession, reason?: string) => finishSession(uid, task, session, "deferred", reason);

export async function addTaskNote(uid: string, taskId: string, note: string) {
  const p = paths(uid);
  await setDoc(p.eventNew(), eventPayload(taskId, "note", note));
  await updateDoc(p.task(taskId), { updatedAt: Timestamp.now() });
}
