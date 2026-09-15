"use client";
import type { Task } from "@/lib/types";
import TaskRow from "@/components/TaskRow";

export default function HistoryView({ uid, tasks }: { uid: string; tasks: Task[] }) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const done30 = tasks.filter((t) => t.status === "done" && (t.completedAt?.getTime() || 0) >= cutoff);
  const focusedMs = done30.reduce((sum,t) => sum + (t.actualMs || 0), 0);
  const estimated = done30.filter((t) => t.estimateMinutes && t.actualMs);
  const accuracy = estimated.length ? Math.round(estimated.reduce((sum,t) => sum + ((t.actualMs || 0) / 60000) / (t.estimateMinutes || 1), 0) / estimated.length * 100) : null;
  const moved = done30.reduce((sum,t) => sum + (t.rescheduleCount || 0), 0);
  const completionHours = done30.reduce<Record<number,number>>((acc,t) => { if (t.completedAt) acc[t.completedAt.getHours()] = (acc[t.completedAt.getHours()] || 0) + 1; return acc; }, {});
  const bestHour = Object.entries(completionHours).sort((a,b) => b[1]-a[1])[0]?.[0];
  const history = tasks.filter((t) => ["done","dropped"].includes(t.status)).sort((a,b) => (b.completedAt?.getTime() || b.droppedAt?.getTime() || 0) - (a.completedAt?.getTime() || a.droppedAt?.getTime() || 0)).slice(0,50);

  return <div className="view-stack"><section><div className="section-heading"><h3>Last 30 days</h3><span>Behavioral baseline</span></div><div className="metric-grid"><div className="metric"><strong>{done30.length}</strong><span>completed</span></div><div className="metric"><strong>{Math.round(focusedMs/3600000*10)/10}h</strong><span>focused time</span></div><div className="metric"><strong>{accuracy ? `${accuracy}%` : "—"}</strong><span>actual vs estimate</span></div><div className="metric"><strong>{moved}</strong><span>reschedules</span></div><div className="metric"><strong>{bestHour !== undefined ? new Intl.DateTimeFormat(undefined,{hour:"numeric"}).format(new Date(2020,0,1,Number(bestHour))) : "—"}</strong><span>most completions</span></div></div><p className="muted metrics-note">As usage accumulates, this becomes the data I can use to learn which task types, time windows and meeting loads actually work for you.</p></section><section><div className="section-heading"><h3>Recent history</h3><span>{history.length}</span></div><div className="list">{history.map((t) => <TaskRow key={t.id} uid={uid} task={t} allowStart={false} compact />)}</div></section></div>;
}
