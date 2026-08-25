"use client";

import { useEffect, useState } from "react";

type Review = { id: string; reviewerName: string; rating: number; body: string };
type Stat = { runs: number; reviewCount: number; averageRating: number | null; reviews: Review[] };

const products = [
  {
    slug: "bachelorette-blueprint",
    title: "The Bachelorette Blueprint",
    eyebrow: "THE ONE-STOP PARTY PLANNER",
    image: "/rallies/bachelorette-pool.jpg",
    price: "$18",
    href: "/rally/bachelorette",
    blurb: "Plan the people, money, places, reservations, itinerary, décor, packing, and group updates—without running the weekend from twelve different apps.",
    included: ["Guest list + RSVPs", "Budget + payment requests", "Itinerary + reservations", "Group updates + chat", "Décor + packing lists", "Saved private workspace"],
    color: "coral",
  },
  {
    slug: "garden-planner",
    title: "The Little Garden Planner",
    eyebrow: "A FREE WEATHER-AWARE GARDEN PLAN",
    image: "/rallies/lush-garden.jpg",
    price: "Free",
    href: "/rally/garden",
    blurb: "Turn your actual space, sunlight, setup, location, and favorite crops into a garden plan you can use all season.",
    included: ["Rows, beds, pots, or indoor", "Visual growing layout", "Live seven-day weather", "Weather-aware care tasks", "Editable crop plan", "Garden journal"],
    color: "green",
  },
];

export default function Home() {
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [opening, setOpening] = useState(false);
  const [status, setStatus] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [library, setLibrary] = useState<Array<{ id: string; title: string; summary: string; toolSlug: string }>>([]);

  useEffect(() => {
    fetch("/api/marketplace").then((response) => response.ok ? response.json() : null).then((data) => data && setStats(data.stats ?? {}));
  }, []);

  async function openLibrary() {
    setLibraryOpen(true); setLibraryLoading(true);
    const response = await fetch("/api/rallies"); const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setLibrary(data.rallies ?? []); setLibraryLoading(false);
  }

  async function openBachelorette() {
    setOpening(true); setStatus("Opening your private workspace…");
    const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toolSlug: "bachelorette-blueprint", title: "My bachelorette weekend", inputs: { destination: "Palm Springs", guests: 1, budget: 450, tripDays: 3, vibe: "Poolside & playful" }, summary: "Private Bachelorette Blueprint workspace" }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    if (response.ok) window.location.href = "/rally/bachelorette";
    else { setOpening(false); setStatus(data.error ?? "Could not open the workspace."); }
  }

  return <main className="consumer-home">
    <nav className="store-nav">
      <a href="#top" className="brand"><span className="brand-mark">P</span>Pep Rally</a>
      <div className="nav-links"><a href="#shop">Shop planners</a><a href="#how">How it works</a><a href="/build">Build your own</a><a href="#questions">Questions</a></div>
      <button className="nav-button" onClick={openLibrary}>My planners</button>
    </nav>

    {libraryOpen && <div className="checkout-shade" onClick={() => setLibraryOpen(false)}><section className="simple-library" onClick={(event) => event.stopPropagation()}><header><div><small>MY PLANNERS</small><h2>Pick up where you left off.</h2></div><button aria-label="Close" onClick={() => setLibraryOpen(false)}>×</button></header>{libraryLoading ? <p>Opening your planners…</p> : library.length ? <div>{library.map((item) => <a key={item.id} href={item.toolSlug === "garden-planner" ? "/rally/garden" : "/rally/bachelorette"}><b>{item.title}</b><span>{item.summary}</span><em>Open →</em></a>)}</div> : <div className="empty-library"><b>No saved planners yet.</b><p>Start with the free Garden Planner or open the Bachelorette Blueprint.</p></div>}</section></div>}

    <section className="shop-hero" id="top">
      <div className="shop-hero-copy"><span className="eyebrow">PLANS YOU CAN ACTUALLY USE</span><h1>Plan the thing.<br/><em>Enjoy the thing.</em></h1><p>Pep Rally gives you a ready-to-use workspace for the plans that usually end up scattered across notes, spreadsheets, group chats, and twenty open tabs.</p><div><a className="primary" href="#shop">See the planners</a><button className="text-button" onClick={openLibrary}>Open my saved plans</button></div></div>
      <div className="shop-hero-images" aria-label="Bachelorette and garden planning workspaces"><figure><img src="/rallies/bachelorette-pool.jpg" alt="Friends planning a sunny weekend together"/><figcaption><b>Weekend handled.</b><span>People · money · places · plans</span></figcaption></figure><figure><img src="/rallies/lush-garden.jpg" alt="A lush raised-bed and container garden"/><figcaption><b>Garden growing.</b><span>Layout · weather · care · notes</span></figcaption></figure></div>
    </section>

    <section className="consumer-proof"><span><b>2</b> working planners</span><span><b>Private</b> saved workspaces</span><span><b>Useful</b> from the first five minutes</span></section>

    <section className="storefront" id="shop"><header><small>CHOOSE YOUR PLAN</small><h2>What are we getting done?</h2><p>Each planner opens as a private workspace. Answer a few questions, get a useful starting plan, then edit and use it as life happens.</p></header><div className="product-grid">{products.map((product) => { const stat = stats[product.slug] ?? { runs: 0, reviewCount: 0, averageRating: null, reviews: [] }; return <article className={`product-card ${product.color}`} key={product.slug}><div className="product-photo"><img src={product.image} alt=""/><span>{product.price}</span></div><div className="product-copy"><small>{product.eyebrow}</small><h3>{product.title}</h3><p>{product.blurb}</p><ul>{product.included.map((item) => <li key={item}>{item}</li>)}</ul><div className="product-stats"><span>{stat.runs} saved plan{stat.runs === 1 ? "" : "s"}</span><span>{stat.averageRating ? `★ ${stat.averageRating.toFixed(1)} from ${stat.reviewCount}` : "New · no reviews yet"}</span></div>{product.slug === "bachelorette-blueprint" ? <><button className="primary full" onClick={openBachelorette} disabled={opening}>{opening ? "Opening…" : "Get the Blueprint · $18"}</button><small className="demo-note">Private preview: test checkout, no charge yet.</small></> : <a className="primary full center-link" href={product.href}>Start my free garden plan</a>}</div></article>; })}</div>{status && <p className="store-status">{status}</p>}</section>

    <section className="simple-how" id="how"><header><small>HOW IT WORKS</small><h2>From “where do I start?”<br/>to <em>“done.”</em></h2></header><div><article><b>01</b><h3>Tell it what’s real</h3><p>Your dates, people, budget, space, sunlight, location, preferences, and constraints.</p></article><article><b>02</b><h3>Get a working plan</h3><p>Not a blank template—a useful first version already shaped around your situation.</p></article><article><b>03</b><h3>Use it as you go</h3><p>Make decisions, track progress, save changes, and return whenever you need it.</p></article></div></section>

    <section className="builder-invite"><div><small>HAVE YOUR OWN IDEA?</small><h2>You bring the useful idea.<br/><em>We help it work.</em></h2><p>Build the first version inside Pep Rally, then add the pieces that usually stop people: payments, messages, accounts, live data, hosting, and a place to sell it.</p><a className="primary" href="/build">Build my own planner →</a></div><div className="builder-invite-list"><span><b>Start with the outcome</b>Who is it for, and what will they have when they’re done?</span><span><b>Shape the experience</b>Choose the questions, steps, tools, and final result.</span><span><b>Add what it needs</b>Payments, email, texts, maps, weather, calendars, files, or AI.</span><span><b>Test before you launch</b>Invite a small group, see where they get stuck, and improve it.</span></div></section>

    <section className="what-you-get"><div><small>WHAT YOU’RE BUYING</small><h2>A workspace.<br/><em>Not another PDF.</em></h2><p>Your planner lives online and remembers your work. It combines the plan, the tools, and the running details in one place.</p></div><div className="get-list"><span><b>Your private workspace</b>Saved to your account so you can come back anytime.</span><span><b>A personalized starting plan</b>Built from your answers instead of generic advice.</span><span><b>Tools for doing the job</b>Budgets, lists, weather, reservations, messages, tasks, and notes where they belong.</span><span><b>Useful ways to take it with you</b>Share links, email, text, calendar, and printable options where they make sense.</span></div></section>

    <section className="consumer-faq" id="questions"><header><small>GOOD QUESTIONS</small><h2>Before you start.</h2></header><div><details open><summary>Is this an app or a download?</summary><p>It’s a small private web app. You use it in your browser, it saves your work, and it can send or export useful pieces when you need them.</p></details><details><summary>Will it make every decision for me?</summary><p>No. It gives you a strong starting point, keeps the details organized, and shows you what needs attention. You stay in control.</p></details><details><summary>Does Pep Rally move group money?</summary><p>The Bachelorette Blueprint tracks balances and creates or stores payment-request links. PayPal, Cash App, Venmo, Stripe, or your chosen provider securely moves the funds.</p></details><details><summary>Does the Garden Planner replace local advice?</summary><p>No. It uses your setup and live weather to make the plan more useful, but local planting dates, soil safety, and region-specific guidance should still be checked locally.</p></details></div></section>

    <footer className="consumer-footer"><a href="#top" className="brand"><span className="brand-mark">P</span>Pep Rally</a><p>Plans you can actually use—or build yourself.</p><div><a href="#shop">Shop</a><a href="/build">Build your own</a></div><span>Private preview</span></footer>
  </main>;
}
