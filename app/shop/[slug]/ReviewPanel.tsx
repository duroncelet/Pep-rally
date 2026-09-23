"use client";

import { useEffect, useState } from "react";

type Review = { id: string; reviewerName: string; rating: number; body: string };

export default function ReviewPanel({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [runs, setRuns] = useState(0);
  const [average, setAverage] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");

  async function refresh() {
    const response = await fetch("/api/marketplace");
    const data = await response.json();
    const stat = data.stats?.[slug];
    if (stat) { setReviews(stat.reviews ?? []); setRuns(stat.runs ?? 0); setAverage(stat.averageRating ?? null); }
  }

  useEffect(() => { refresh(); }, [slug]);

  async function submitReview(event: React.FormEvent) {
    event.preventDefault(); setStatus("Saving…");
    const response = await fetch("/api/marketplace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toolSlug: slug, rating, review: body }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setStatus(response.ok ? "Your verified review is live ✓" : data.error ?? "Your review could not be saved.");
    if (response.ok) { setBody(""); await refresh(); }
  }

  return <section className="pdp-reviews" id="reviews"><header><div><small>VERIFIED AFTER USE</small><h2>{average ? `★ ${average.toFixed(1)}` : "New · No reviews yet"}</h2><p>{runs} saved workspace{runs === 1 ? "" : "s"} · Reviews can only be left after someone saves and uses this Rally.</p></div></header><div className="review-layout"><div>{reviews.length ? reviews.map((review) => <article key={review.id}><span>{"★".repeat(review.rating)}</span><p>{review.body}</p><small>{review.reviewerName} · verified user</small></article>) : <div className="review-empty"><p>Reviews from people who have used this Rally will appear here.</p></div>}</div><details><summary>Used this Rally? Write a review</summary><form onSubmit={submitReview}><b>Used this Rally?</b><p>Tell the next person what worked and what did not.</p><label>Rating<select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><label>Your review<textarea minLength={12} maxLength={500} value={body} onChange={(event) => setBody(event.target.value)} placeholder="What outcome did it help you reach?"/></label><button className="primary" disabled={body.trim().length < 12}>Post verified review</button>{status && <small>{status}</small>}</form></details></div></section>;
}
