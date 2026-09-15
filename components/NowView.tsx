"use client";

import type { RuntimeState, Task, WorkSession } from "@/lib/types";
import TimerCard from "@/components/TimerCard";
import TaskRow from "@/components/TaskRow";
import { sameLocalDay } from "@/lib/utils";

export default function NowView({ uid, tasks, sessions, runtime }: { uid: string; tasks: Task[]; sessions: WorkSession[]; runtime: RuntimeState }) {
  const activeTask = runtime.activeTaskId ? tasks.find((t) => t.id === runtime.activeTaskId) : undefined;
  const activeSession = runtime.activeSessionId ? sessions.find((s) => s.id === runtime.activeSessionId) : undefined;
  const today = tasks.filter((t) => sameLocalDay(t.scheduledStart) && !["done","dropped"].includes(t.status)).sort((a,b) => (a.scheduledStart?.getTime() || 0) - (b.scheduledStart?.getTime() || 0));
  const next = activeTask || today.find((t) => !t.currentSessionId) || tasks.filter((t) => ["planned","scheduled"].includes(t.status)).sort((a,b) => b.priority - a.priority)[0];
  const session = next?.id === activeTask?.id ? activeSession : undefined;
  const later = today.filter((t) => t.id !== next?.id).slice(0, 4);

  return (
    <div className="view-stack">
      {next ? <TimerCard uid={uid} task={next} session={session} /> : <section className="empty-state"><h2>No task is queued.</h2><p>Capture something above or plan an Inbox item. Command Center will keep the execution view deliberately sparse.</p></section>}
      {later.length ? <section><div className="section-heading"><h3>After this</h3><span>{later.length} scheduled</span></div><div className="list">{later.map((t) => <TaskRow key={t.id} uid={uid} task={t} compact />)}</div></section> : null}
    </div>
  );
}
