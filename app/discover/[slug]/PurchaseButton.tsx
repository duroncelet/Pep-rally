"use client";

import { useState } from "react";

export default function PurchaseButton({ slug, priceCents }: { slug: string; priceCents: number }) {
  const [status, setStatus] = useState("");

  async function purchase() {
    setStatus("Opening secure checkout…");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conceptSlug: slug }),
    });
    const data = await response.json();
    if (response.status === 401 && data.signIn) {
      window.location.href = data.signIn;
      return;
    }
    if (response.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    setStatus(data.error ?? "Checkout could not be opened.");
  }

  return <div className="concept-buy"><button className="primary" onClick={purchase}>Get this Rally · ${(priceCents / 100).toFixed(0)}</button>{status && <small>{status}</small>}</div>;
}
