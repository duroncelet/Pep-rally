"use client";
import { useState } from "react";

const SUPPORT_EMAIL = "support@peprally.fun";

export default function SupportForm({ rally: initialRally = "" }: { rally?: string }) {
  const [email, setEmail] = useState("");
  const [rally, setRally] = useState(initialRally);
  const [message, setMessage] = useState("");

  function openEmailDraft(event: React.FormEvent) {
    event.preventDefault();
    const subject = rally.trim()
      ? `Pep Rally support request — ${rally.trim()}`
      : "Pep Rally support request";
    const body = [
      `From: ${email.trim()}`,
      rally.trim() ? `Rally: ${rally.trim()}` : "",
      "",
      message.trim(),
    ]
      .filter((line) => line !== "")
      .join("\n");
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form onSubmit={openEmailDraft}>
      <div className="setup-grid">
        <label>
          Your email
          <input
            type="email"
            required
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <label>
          Rally name or page URL <span>(optional)</span>
          <input
            type="text"
            maxLength={200}
            value={rally}
            onChange={(e) => setRally(e.target.value)}
            placeholder="e.g. Bachelorette in Palm Springs"
          />
        </label>
        <label className="full-field">
          What happened?
          <textarea
            required
            minLength={12}
            maxLength={4000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what broke, what was misleading, or what went wrong."
          />
        </label>
      </div>
      <button className="primary" type="submit">
        Open email to support
      </button>
      <p>
        This opens your email app with a draft addressed to {SUPPORT_EMAIL}. No
        sign-in needed. Do not include passwords, payment details, or private
        guest information.
      </p>
    </form>
  );
}
