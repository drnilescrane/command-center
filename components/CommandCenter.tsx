"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { signOut } from "firebase/auth";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { normalizeRuntime, normalizeSession, normalizeTask } from "@/lib/firestore-normalize";
import type { RuntimeState, Task, WorkSession } from "@/lib/types";
import CaptureBar from "@/components/CaptureBar";
import NowView from "@/components/NowView";
import TodayView from "@/components/TodayView";
import InboxView from "@/components/InboxView";
import WaitingView from "@/components/WaitingView";
import HistoryView from "@/components/HistoryView";
import PwaRegistration from "@/components/PwaRegistration";

type Tab = "now" | "today" | "inbox" | "waiting" | "history";

export default function CommandCenter({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>("now");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [runtime, setRuntime] = useState<RuntimeState>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let loadedTasks = false, loadedSessions = false, loadedRuntime = false;
    const check = () => { if (loadedTasks && loadedSessions && loadedRuntime) setReady(true); };
    const u1 = onSnapshot(collection(db, "users", user.uid, "tasks"), (snap) => { setTasks(snap.docs.map((d) => normalizeTask(d.id, d.data()))); loadedTasks = true; check(); }, (e) => setError(e.message));
    const u2 = onSnapshot(collection(db, "users", user.uid, "workSessions"), (snap) => { setSessions(snap.docs.map((d) => normalizeSession(d.id, d.data()))); loadedSessions = true; check(); }, (e) => setError(e.message));
    const u3 = onSnapshot(doc(db, "users", user.uid, "state", "runtime"), (snap) => { setRuntime(normalizeRuntime(snap.data())); loadedRuntime = true; check(); }, (e) => setError(e.message));
    return () => { u1(); u2(); u3(); };
  }, [user.uid]);

  const counts = useMemo(() => ({ inbox: tasks.filter((t) => t.status === "inbox").length, waiting: tasks.filter((t) => ["waiting","blocked","deferred"].includes(t.status)).length }), [tasks]);
  const date = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <main className="app-shell">
      <PwaRegistration />
      <header className="topbar">
        <div><div className="eyebrow">Command Center</div><h1>{date}</h1></div>
        <button className="text-button" onClick={() => signOut(auth)}>Sign out</button>
      </header>
      <CaptureBar uid={user.uid} />
      {error ? <div className="banner error-text">{error}</div> : null}
      {!ready ? <div className="loading">Loading your workspace…</div> : (
        <div className="content">
          {tab === "now" && <NowView uid={user.uid} tasks={tasks} sessions={sessions} runtime={runtime} />}
          {tab === "today" && <TodayView uid={user.uid} tasks={tasks} />}
          {tab === "inbox" && <InboxView uid={user.uid} tasks={tasks} />}
          {tab === "waiting" && <WaitingView uid={user.uid} tasks={tasks} />}
          {tab === "history" && <HistoryView uid={user.uid} tasks={tasks} />}
        </div>
      )}
      <nav className="bottom-nav" aria-label="Command Center sections">
        {(["now","today","inbox","waiting","history"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}><span>{item[0].toUpperCase()+item.slice(1)}</span>{item === "inbox" && counts.inbox ? <b>{counts.inbox}</b> : null}{item === "waiting" && counts.waiting ? <b>{counts.waiting}</b> : null}</button>)}
      </nav>
    </main>
  );
}
