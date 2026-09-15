"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task, WorkSession } from "@/lib/types";
import { blockTask, completeTask, deferTask, pauseTask, resumeTask, startTask, stopTask } from "@/lib/workspace";
import { formatDuration } from "@/lib/utils";

export default function TimerCard({ uid, task, session }: { uid: string; task: Task; session?: WorkSession }) {
  const [tick, setTick] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.state !== "running") return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session?.state]);

  const elapsed = useMemo(() => {
    if (!session) return task.actualMs || 0;
    const base = session.accumulatedMs || 0;
    if (session.state === "running" && session.activeStartedAt) return base + Math.max(0, tick - session.activeStartedAt.getTime());
    return base;
  }, [session, tick, task.actualMs]);

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); } finally { setBusy(false); }
  }

  function ask(label: string) {
    return window.prompt(label) || undefined;
  }

  return (
    <section className="now-card">
      <div className="now-meta">
        <span className="status-pill">{task.project || "Current task"}</span>
        {task.estimateMinutes ? <span className="muted">Estimate {task.estimateMinutes} min</span> : null}
      </div>
      <h2>{task.title}</h2>
      {task.notes ? <p className="task-notes">{task.notes}</p> : null}
      <div className="timer" aria-live="polite">{formatDuration(elapsed)}</div>
      <div className="timer-actions">
        {!session && <button className="button primary jumbo" disabled={busy} onClick={() => run(() => startTask(uid, task))}>Start</button>}
        {session?.state === "running" && <button className="button primary jumbo" disabled={busy} onClick={() => run(() => pauseTask(uid, task, session, ask("Optional: why are you pausing?")))}>Pause</button>}
        {session?.state === "paused" && <button className="button primary jumbo" disabled={busy} onClick={() => run(() => resumeTask(uid, task, session))}>Resume</button>}
        {session && ["running", "paused"].includes(session.state) && (
          <>
            <button className="button success" disabled={busy} onClick={() => run(() => completeTask(uid, task, session))}>Complete</button>
            <button className="button" disabled={busy} onClick={() => run(() => stopTask(uid, task, session, ask("Why are you stopping for now?")))}>Stop</button>
            <button className="button" disabled={busy} onClick={() => run(() => blockTask(uid, task, session, ask("What is blocking this?")))}>Blocked</button>
            <button className="button" disabled={busy} onClick={() => run(() => deferTask(uid, task, session, ask("Why are we moving this?")))}>Defer</button>
          </>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
