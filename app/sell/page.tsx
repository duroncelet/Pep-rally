"use client";

import { useState } from "react";

export default function SellPage() {
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setStatus("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/creator-apps", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), problem: form.get("problem"), outcome: form.get("outcome"), proof: form.get("proof"), accessModel: "paid", price: Number(form.get("price") || 0), sourceType: "guided", builderSpec: form.get("method") }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setSaving(false); setStatus(response.ok ? "Saved. We’ll review your planner idea and follow up." : data.error ?? "Could not save your idea.");
  }
  return <main className="sell-page"><nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><a href="/">Back to the shop</a></nav><section><div><small>SELL A PLANNER</small><h1>Turn the way you do something into something other people can use.</h1><p>Tell us what you help people finish, what already works, and what the buyer should have when they’re done.</p></div><form onSubmit={submit}><label>Planner name<input name="name" required placeholder="The thing people already ask you for"/></label><label>What problem does it solve?<textarea name="problem" required placeholder="People struggle with…"/></label><label>What will the buyer finish or accomplish?<textarea name="outcome" required placeholder="By the end, they will have…"/></label><label>How do you do it today?<textarea name="method" required placeholder="First I ask… then I…"/></label><label>Why do you know this works?<textarea name="proof" required placeholder="I’ve used it with…"/></label><label>Possible price<input name="price" type="number" min="0" defaultValue="18"/></label><button className="dark" disabled={saving}>{saving ? "Saving…" : "Send my idea"}</button>{status && <p>{status}</p>}</form></section></main>;
}
