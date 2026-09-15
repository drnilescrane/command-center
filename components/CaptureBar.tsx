"use client";

import { useState } from "react";
import { captureTask } from "@/lib/workspace";

export default function CaptureBar({ uid }: { uid: string }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = title.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError("");
    try {
      await captureTask(uid, clean);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not capture task");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="capture" onSubmit={submit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Dump anything here. I’ll sort it later."
        aria-label="Capture a task"
      />
      <button className="button primary" disabled={!title.trim() || busy}>{busy ? "Adding…" : "Capture"}</button>
      {error && <span className="inline-error">{error}</span>}
    </form>
  );
}
