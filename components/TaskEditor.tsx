"use client";

import { useMemo, useState } from "react";
import type { Priority, Task, TaskStatus } from "@/lib/types";
import { editTask } from "@/lib/workspace";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/utils";
import { auth } from "@/lib/firebase/client";

export default function TaskEditor({ uid, task, onClose }: { uid: string; task: Task; onClose: () => void }) {
  const initial = useMemo(() => ({
    title: task.title,
    notes: task.notes || "",
    project: task.project || "",
    status: task.status,
    priority: task.priority,
    estimateMinutes: task.estimateMinutes ? String(task.estimateMinutes) : "",
    dueAt: toDateTimeLocal(task.dueAt),
    scheduledStart: toDateTimeLocal(task.scheduledStart),
    scheduledEnd: toDateTimeLocal(task.scheduledEnd),
    waitingOn: task.waitingOn || "",
    followUpAt: toDateTimeLocal(task.followUpAt),
  }), [task]);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((f) => ({ ...f, [key]: value })); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const scheduleChanged = form.scheduledStart !== initial.scheduledStart || form.scheduledEnd !== initial.scheduledEnd;
      const reason = scheduleChanged && task.scheduledStart ? window.prompt("Why is this moving?") || undefined : undefined;
      await editTask(uid, task, {
        title: form.title.trim(), notes: form.notes, project: form.project,
        status: form.status as TaskStatus, priority: Number(form.priority) as Priority,
        estimateMinutes: form.estimateMinutes ? Number(form.estimateMinutes) : null,
        dueAt: fromDateTimeLocal(form.dueAt), scheduledStart: fromDateTimeLocal(form.scheduledStart),
        scheduledEnd: fromDateTimeLocal(form.scheduledEnd), waitingOn: form.waitingOn,
        followUpAt: fromDateTimeLocal(form.followUpAt),
      }, reason);

      if (form.scheduledStart && form.scheduledEnd) {
        try {
          const token = await auth.currentUser?.getIdToken();
          if (token) await fetch("/api/calendar/sync-task", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ taskId: task.id }) });
        } catch { /* Calendar is optional until configured. */ }
      }
      onClose();
    } catch (e2) { setError(e2 instanceof Error ? e2.message : "Could not save"); } finally { setBusy(false); }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="sheet" onSubmit={save}>
        <div className="sheet-header"><h2>Edit task</h2><button type="button" className="text-button" onClick={onClose}>Close</button></div>
        <label>Title<input value={form.title} onChange={(e) => set("title", e.target.value)} required /></label>
        <label>Notes<textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></label>
        <div className="form-grid two">
          <label>Project<input value={form.project} onChange={(e) => set("project", e.target.value)} /></label>
          <label>Priority<select value={form.priority} onChange={(e) => set("priority", Number(e.target.value) as Priority)}><option value={1}>Low</option><option value={2}>Normal</option><option value={3}>High</option><option value={4}>Critical</option></select></label>
        </div>
        <div className="form-grid two">
          <label>Status<select value={form.status} onChange={(e) => set("status", e.target.value as TaskStatus)}>{["inbox","planned","scheduled","in_progress","waiting","blocked","deferred","done","dropped"].map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></label>
          <label>Estimate, minutes<input inputMode="numeric" type="number" min="1" max="1440" value={form.estimateMinutes} onChange={(e) => set("estimateMinutes", e.target.value)} /></label>
        </div>
        <div className="form-grid two">
          <label>Scheduled start<input type="datetime-local" value={form.scheduledStart} onChange={(e) => set("scheduledStart", e.target.value)} /></label>
          <label>Scheduled end<input type="datetime-local" value={form.scheduledEnd} onChange={(e) => set("scheduledEnd", e.target.value)} /></label>
        </div>
        <div className="form-grid two">
          <label>Due<input type="datetime-local" value={form.dueAt} onChange={(e) => set("dueAt", e.target.value)} /></label>
          <label>Follow up<input type="datetime-local" value={form.followUpAt} onChange={(e) => set("followUpAt", e.target.value)} /></label>
        </div>
        <label>Waiting on<input value={form.waitingOn} onChange={(e) => set("waitingOn", e.target.value)} placeholder="Person, team, vendor, dependency" /></label>
        {error && <p className="error-text">{error}</p>}
        <div className="sheet-actions"><button type="button" className="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
      </form>
    </div>
  );
}
