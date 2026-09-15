"use client";

import { useEffect, useState } from "react";
import type { CalendarItem, Task } from "@/lib/types";
import TaskRow from "@/components/TaskRow";
import { auth } from "@/lib/firebase/client";
import { formatTime, sameLocalDay } from "@/lib/utils";

export default function TodayView({ uid, tasks }: { uid: string; tasks: Task[] }) {
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [calendarState, setCalendarState] = useState<"loading"|"ready"|"unavailable">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error();
        const res = await fetch("/api/calendar/today", { headers: { authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) { setCalendar(data.events || []); setCalendarState("ready"); }
      } catch { if (!cancelled) setCalendarState("unavailable"); }
    })();
    return () => { cancelled = true; };
  }, []);

  const scheduled = tasks.filter((t) => sameLocalDay(t.scheduledStart) && !["done","dropped"].includes(t.status)).sort((a,b) => (a.scheduledStart?.getTime() || 0) - (b.scheduledStart?.getTime() || 0));
  const due = tasks.filter((t) => sameLocalDay(t.dueAt) && !sameLocalDay(t.scheduledStart) && !["done","dropped"].includes(t.status));

  return (
    <div className="view-stack">
      <section>
        <div className="section-heading"><h3>Fixed commitments</h3><span>{calendarState === "ready" ? `${calendar.length}` : calendarState === "loading" ? "Loading…" : "Calendar setup pending"}</span></div>
        {calendarState === "ready" && calendar.length ? <div className="calendar-list">{calendar.map((e) => <div className="calendar-row" key={e.id}><div className="calendar-time">{e.allDay ? "All day" : formatTime(new Date(e.start))}</div><div><strong>{e.title}</strong>{e.location ? <div className="muted">{e.location}</div> : null}</div></div>)}</div> : null}
        {calendarState === "ready" && !calendar.length ? <p className="muted">No Google Calendar events returned for today.</p> : null}
        {calendarState === "unavailable" ? <p className="muted">The app is ready for Google Calendar, but the backend service account still needs calendar access. Tasks continue to work normally.</p> : null}
      </section>
      <section><div className="section-heading"><h3>Planned work</h3><span>{scheduled.length}</span></div>{scheduled.length ? <div className="list">{scheduled.map((t) => <TaskRow key={t.id} uid={uid} task={t} />)}</div> : <p className="muted">Nothing scheduled yet.</p>}</section>
      {due.length ? <section><div className="section-heading"><h3>Due today, not scheduled</h3><span>{due.length}</span></div><div className="list">{due.map((t) => <TaskRow key={t.id} uid={uid} task={t} />)}</div></section> : null}
    </div>
  );
}
