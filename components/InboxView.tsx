"use client";
import type { Task } from "@/lib/types";
import TaskRow from "@/components/TaskRow";
export default function InboxView({ uid, tasks }: { uid: string; tasks: Task[] }) {
  const inbox = tasks.filter((t) => t.status === "inbox").sort((a,b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  return <section><div className="section-heading"><h3>Inbox</h3><span>{inbox.length} unprocessed</span></div>{inbox.length ? <div className="list">{inbox.map((t) => <TaskRow uid={uid} task={t} key={t.id} allowStart={false} />)}</div> : <div className="empty-state small"><p>Inbox is clear.</p></div>}</section>;
}
