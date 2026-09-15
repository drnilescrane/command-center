"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { quickStatus, startTask } from "@/lib/workspace";
import { formatDateTime, formatTime, priorityLabel } from "@/lib/utils";
import TaskEditor from "@/components/TaskEditor";

export default function TaskRow({ uid, task, allowStart = true, compact = false }: { uid: string; task: Task; allowStart?: boolean; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<void>) { setBusy(true); setError(""); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); } finally { setBusy(false); } }

  return (
    <article className={`task-row ${compact ? "compact" : ""}`}>
      <div className="task-main">
        <div className="task-title-line"><strong>{task.title}</strong><span className={`priority p${task.priority}`}>{priorityLabel(task.priority)}</span></div>
        <div className="task-subline">
          {task.scheduledStart ? <span>{formatTime(task.scheduledStart)}{task.scheduledEnd ? `–${formatTime(task.scheduledEnd)}` : ""}</span> : null}
          {task.project ? <span>{task.project}</span> : null}
          {task.estimateMinutes ? <span>{task.estimateMinutes} min est.</span> : null}
          {task.waitingOn ? <span>Waiting on {task.waitingOn}</span> : null}
          {task.followUpAt ? <span>Follow up {formatDateTime(task.followUpAt)}</span> : null}
          {task.rescheduleCount ? <span>Moved {task.rescheduleCount}×</span> : null}
        </div>
        {task.lastReason ? <div className="reason">{task.lastReason}</div> : null}
        {error && <div className="inline-error">{error}</div>}
      </div>
      <div className="row-actions">
        {allowStart && !task.currentSessionId && !["done","dropped","blocked","waiting"].includes(task.status) ? <button className="button small primary" disabled={busy} onClick={() => run(() => startTask(uid, task))}>Start</button> : null}
        {task.status === "inbox" ? <button className="button small" disabled={busy} onClick={() => run(() => quickStatus(uid, task, "planned"))}>Plan</button> : null}
        {task.status === "blocked" || task.status === "waiting" || task.status === "deferred" ? <button className="button small" disabled={busy} onClick={() => run(() => quickStatus(uid, task, "planned", "Ready to resume"))}>Ready</button> : null}
        {!task.currentSessionId && !["done","dropped"].includes(task.status) ? <button className="button small success" disabled={busy} onClick={() => run(() => quickStatus(uid, task, "done"))}>Done</button> : null}
        <button className="button small" onClick={() => setEditing(true)}>Edit</button>
      </div>
      {editing && <TaskEditor uid={uid} task={task} onClose={() => setEditing(false)} />}
    </article>
  );
}
