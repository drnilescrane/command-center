"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import CommandCenter from "@/components/CommandCenter";

const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL || "davenewbergai@gmail.com";

export default function AuthGate() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (next) => {
    if (next && next.email !== ownerEmail) {
      await signOut(auth);
      setError(`This Command Center is restricted to ${ownerEmail}.`);
      setUser(null);
      return;
    }
    setUser(next);
  }), []);

  async function login() {
    setError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code || "";
      if (code.includes("popup") || code.includes("operation-not-supported")) {
        await signInWithRedirect(auth, provider);
      } else {
        setError(e instanceof Error ? e.message : "Could not sign in.");
      }
    }
  }

  if (user === undefined) return <main className="auth-screen"><div className="auth-card"><p>Loading Command Center…</p></div></main>;
  if (!user) {
    return (
      <main className="auth-screen">
        <div className="auth-card">
          <div className="eyebrow">Private workspace</div>
          <h1>Command Center</h1>
          <p>Your tasks, actual work time, interruptions, waiting items and execution history in one place.</p>
          <button className="button primary wide" onClick={login}>Sign in with Google</button>
          {error && <p className="error-text">{error}</p>}
        </div>
      </main>
    );
  }
  return <CommandCenter user={user} />;
}
