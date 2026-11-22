"use client";

import { useState, type FormEvent } from "react";

const copy = {
  buyer: {
    heading: "Paid Rallies aren’t on sale yet.",
    description: "Leave your email for first access when they open, plus launch updates.",
    button: "Get first access",
    success: "You're on the list. You'll get first access when paid Rallies open, plus launch updates.",
  },
  creator: {
    heading: "Want to sell a Rally?",
    description: "Leave your email for creator updates, including when paid listings open.",
    button: "Join the creator waitlist",
    success: "You're on the creator waitlist. We'll email you when paid listings open.",
  },
};

const fallbackError = "Something went wrong — try again in a minute.";

export default function WaitlistForm({ audience }: { audience: keyof typeof copy }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const { heading, description, button, success } = copy[audience];

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source: "homepage", audience }),
      });
      if (response.status === 201) {
        setDone(success);
      } else if (response.status === 409) {
        setDone("You're already on the list.");
      } else {
        const data = await response.json().catch(() => ({})) as { error?: string };
        setError(data.error || fallbackError);
      }
    } catch {
      setError(fallbackError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="waitlist-band">
      <div>
        <b>{heading}</b>
        <p>{description}</p>
      </div>
      {!done && (
        <form onSubmit={join} aria-label={audience === "creator" ? "Creator waitlist" : "Paid Rallies waitlist"}>
          <label>
            Email address
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>{busy ? "Joining…" : button}</button>
          <div role="status" className="waitlist-error">{error}</div>
        </form>
      )}
      <div role="status" className="waitlist-done">{done}</div>
    </div>
  );
}
