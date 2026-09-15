"use client";
import type { Task } from "@/lib/types";
import TaskRow from "@/components/TaskRow";
export default function WaitingView({ uid, tasks }: { uid: string; tasks: Task[] }) {
  const items = tasks.filter((t) => ["waiting","blocked","deferred"].includes(t.status)).sort((a,b) => (a.followUpAt?.getTime() || Number.MAX_SAFE_INTEGER) - (b.followUpAt?.getTime() || Number.MAX_SAFE_INTEGER));
  return <section><div className="section-heading"><h3>Waiting / blocked</h3><span>{items.length}</span></div>{items.length ? <div className="list">{items.map((t) => <TaskRow uid={uid} task={t} key={t.id} allowStart={false} />)}</div> : <div className="empty-state small"><p>Nothing is waiting on someone else.</p></div>}</section>;
}
