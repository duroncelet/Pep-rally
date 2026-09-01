"use client";

import { useEffect, useState } from "react";

type Review = { id: string; reviewerName: string; rating: number; body: string };
type Stat = { runs: number; reviewCount: number; averageRating: number | null; reviews: Review[] };
type CommunityListing = { id: string; name: string; creatorName: string; outcome: string; proof: string; accessModel: "free" | "paid"; priceCents: number; sourceUrl: string | null };

const products = [
  {
    slug: "bachelorette-blueprint",
    title: "The Bachelorette Blueprint",
    eyebrow: "THE ONE-STOP PARTY PLANNER",
    image: "/rallies/bachelorette-pool.jpg",
    price: "Free example",
    href: "/rally/bachelorette",
    blurb: "Plan the people, money, places, reservations, itinerary, décor, packing, and group updates—without running the weekend from twelve different apps.",
    included: ["Anonymous stay budget + lodging picker", "Guest list + RSVPs", "Budget + payment requests", "Itinerary + reservations", "Group updates + chat", "Décor + packing lists"],
    color: "coral",
  },
  {
    slug: "garden-planner",
    title: "The Little Garden Planner",
    eyebrow: "A FREE WEATHER-AWARE GARDEN PLAN",
    image: "/rallies/lush-garden.jpg",
    price: "Free example",
    href: "/rally/garden",
    blurb: "Turn your actual space, sunlight, setup, location, and favorite crops into a garden plan you can use all season.",
    included: ["Rows, beds, pots, or indoor", "Visual growing layout", "Live seven-day weather", "Weather-aware care tasks", "Editable crop plan", "Garden journal"],
    color: "green",
  },
];

export default function Home() {
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [library, setLibrary] = useState<Array<{ id: string; title: string; summary: string; toolSlug: string; inputs?: { accessUrl?: string } }>>([]);
  const [listings, setListings] = useState<CommunityListing[]>([]);
  const [marketStatus, setMarketStatus] = useState("");

  useEffect(() => {
    fetch("/api/marketplace").then((response) => response.ok ? response.json() : null).then((data) => { if (data) { setStats(data.stats ?? {}); setListings(data.listings ?? []); } });
  }, []);

  async function openLibrary() {
    setLibraryOpen(true); setLibraryLoading(true);
    const response = await fetch("/api/rallies"); const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setLibrary(data.rallies ?? []); setLibraryLoading(false);
  }

  async function buyListing(id: string) {
    setMarketStatus("Opening secure checkout…");
    const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ creatorAppId: id }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    if (response.ok && data.url) { window.location.href = data.url; return; }
    setMarketStatus(data.error ?? "Checkout could not be opened.");
  }

  return <main className="consumer-home">
    <nav className="store-nav">
      <a href="#top" className="brand"><span className="brand-mark">P</span>Pep Rally</a>
      <div className="nav-links"><a href="#marketplace">Shop Rallies</a><a href="#shop">Free examples</a><a href="/build">Sell your Rally</a><a href="#questions">Questions</a></div>
      <button className="nav-button" onClick={openLibrary}>My Rallies</button>
    </nav>

    {libraryOpen && <div className="checkout-shade" onClick={() => setLibraryOpen(false)}><section className="simple-library" onClick={(event) => event.stopPropagation()}><header><div><small>MY RALLIES</small><h2>Pick up where you left off.</h2></div><button aria-label="Close" onClick={() => setLibraryOpen(false)}>×</button></header>{libraryLoading ? <p>Opening your Rallies…</p> : library.length ? <div>{library.map((item) => <a key={item.id} href={item.inputs?.accessUrl || (item.toolSlug === "garden-planner" ? "/rally/garden" : "/rally/bachelorette")}><b>{item.title}</b><span>{item.summary}</span><em>Open →</em></a>)}</div> : <div className="empty-library"><b>No saved Rallies yet.</b><p>Shop the marketplace, try a free example, or publish something you made.</p></div>}</section></div>}

    <section className="shop-hero" id="top">
      <div className="shop-hero-copy"><span className="eyebrow">THE MARKETPLACE FOR EVERYDAY MINI-APPS</span><h1>Someone solved it.<br/><em>Now you can use it.</em></h1><p>Shop small, useful apps made by people who know the problem—or turn your own solution into a Rally and sell it here.</p><div><a className="primary" href="#marketplace">Shop Rallies</a><a className="text-button" href="/build">Sell something you made →</a></div></div>
      <div className="shop-hero-images" aria-label="Free Bachelorette and garden Rally case studies"><figure><img src="/rallies/bachelorette-pool.jpg" alt="Friends planning a sunny weekend together"/><figcaption><b>Bachelorette Blueprint</b><span>FREE CASE STUDY · PEOPLE · MONEY · PLACES · PLANS</span></figcaption></figure><figure><img src="/rallies/lush-garden.jpg" alt="A lush raised-bed and container garden"/><figcaption><b>Little Garden Planner</b><span>FREE CASE STUDY · LAYOUT · WEATHER · CARE · NOTES</span></figcaption></figure></div>
    </section>

    <section className="consumer-proof"><span><b>Discover</b> useful apps made by real people</span><span><b>Use</b> free or paid Rallies in one library</span><span><b>Sell</b> the solution you already made</span></section>

    <section className="community-marketplace" id="marketplace"><header><div><small>THE MARKETPLACE</small><h2>Small apps. Real outcomes.</h2><p>Made by people who found a better way to handle something—and decided to share it.</p></div><a href="/build">Sell your own Rally →</a></header>{listings.length ? <div className="community-grid">{listings.map((listing, index) => <article key={listing.id} className={`community-card tone-${index % 4}`}><div className="community-card-top"><span>Made by {listing.creatorName}</span><b>{listing.accessModel === "free" ? "Free" : `$${(listing.priceCents / 100).toFixed(0)}`}</b></div><div className="community-icon">{listing.name.slice(0, 1).toUpperCase()}</div><h3>{listing.name}</h3><p>{listing.outcome}</p><small>{listing.proof}</small>{listing.accessModel === "free" && listing.sourceUrl ? <a className="primary center-link" href={listing.sourceUrl} target="_blank" rel="noreferrer">Open free Rally →</a> : <button className="primary" onClick={() => buyListing(listing.id)}>Get this Rally · ${(listing.priceCents / 100).toFixed(0)}</button>}</article>)}</div> : <div className="marketplace-opening"><div><small>THE SHELF IS OPEN</small><h3>Your useful little app belongs here.</h3><p>Share a working mini-app, choose free or paid access, and give people a clear outcome they can use right away.</p><a className="primary center-link" href="/build">Publish a Rally →</a></div><div className="opening-steps"><span><b>1</b> Link or upload it</span><span><b>2</b> Show what it helps someone do</span><span><b>3</b> Set free or paid access</span></div></div>}{marketStatus && <p className="market-status">{marketStatus}</p>}</section>

    <section className="storefront" id="shop"><header><small>FREE PEP RALLY ORIGINALS</small><h2>Try one before you buy one.</h2><p>These two working examples are free. Open one, use the tools, and see exactly what a Rally feels like.</p></header><div className="product-grid">{products.map((product) => { const stat = stats[product.slug] ?? { runs: 0, reviewCount: 0, averageRating: null, reviews: [] }; return <article className={`product-card ${product.color}`} key={product.slug}><div className="product-photo"><img src={product.image} alt=""/><span>{product.price}</span></div><div className="product-copy"><small>{product.eyebrow}</small><h3>{product.title}</h3><p>{product.blurb}</p><ul>{product.included.map((item) => <li key={item}>{item}</li>)}</ul><div className="product-stats"><span>{stat.runs} saved plan{stat.runs === 1 ? "" : "s"}</span><span>{stat.averageRating ? `★ ${stat.averageRating.toFixed(1)} from ${stat.reviewCount}` : "New · no reviews yet"}</span></div><a className="primary full center-link" href={product.href}>Try the free Rally</a></div></article>; })}</div></section>

    <section className="simple-how" id="how"><header><small>HOW PEP RALLY WORKS</small><h2>From “I made this for myself”<br/>to <em>“other people can use it.”</em></h2></header><div><article><b>01</b><h3>Bring the useful thing</h3><p>Start with an everyday problem you understand. Build the mini-app inside Pep Rally, or upload and link the version you already made.</p></article><article><b>02</b><h3>Add the hard parts</h3><p>Choose what it needs: accounts, payments, email, text, files, live data, calendars, maps, AI, or hosting.</p></article><article><b>03</b><h3>Test it with real people</h3><p>Share a working preview, watch where people get stuck, collect reviews and requests, and improve the outcome.</p></article><article><b>04</b><h3>Launch it as a Rally</h3><p>Publish a usable mini-app with a clear listing, price or free access, saved customer work, support, and an improvement history.</p></article></div></section>

    <section className="builder-invite"><div><small>TWO WAYS IN</small><h2>Build it here.<br/><em>Or bring it with you.</em></h2><p>You do not have to start over. Bring a live URL, code project, prototype, or working mini-site; or use Pep Rally to shape the first version from an idea. Either path should end with the same thing: a Rally people can open and use.</p><a className="primary" href="/build">Build or upload my Rally →</a></div><div className="builder-invite-list"><span><b>Build inside Pep Rally</b>Start with the person, problem, inputs, decisions, and useful outcome.</span><span><b>Upload what you made</b>Bring a site, mini-app, code project, or prototype without losing its identity.</span><span><b>Make it launchable</b>Add accounts, hosting, payments, messages, data, reviews, and support.</span><span><b>Reach the marketplace</b>Offer it free or paid, learn from usage, and publish improvements.</span></div></section>

    <section className="what-you-get"><div><small>THE OUTCOME</small><h2>A usable mini-app.<br/><em>Not just a file.</em></h2><p>A Rally is a hosted working product. A customer opens it, gives it real inputs, gets a useful result, saves their work, and returns to it. Downloads such as PDFs or Markdown can be included, but they are not the product.</p></div><div className="get-list"><span><b>For the person using it</b>A private, saved mini-app that helps complete a specific job—not a pile of setup instructions.</span><span><b>For the person who made it</b>A hosted product page, working access, free or paid distribution, usage signals, reviews, and a path to improve it.</span><span><b>For people who extend it</b>A simple version history and credit trail so useful adaptations can build on the original fairly.</span><span><b>For Pep Rally</b>A growing marketplace of trusted outcomes plus shared infrastructure builders should not have to reinvent.</span></div></section>

    <section className="consumer-faq" id="questions"><header><small>PEP RALLY FAQ</small><h2>Buy something useful.<br/>Sell what you know.</h2></header><div><details open><summary>What exactly is Pep Rally?</summary><p>Pep Rally is a marketplace for focused mini-apps that solve everyday problems. Shop something useful, or publish a solution you made yourself.</p></details><details><summary>What is a Rally?</summary><p>A Rally is the working mini-app you open and use. It can remember your work, produce a useful result, and include files or downloads when they help.</p></details><details><summary>Do I have to build it inside Pep Rally?</summary><p>No. Build from an idea inside Pep Rally, link a mini-app that is already live, or upload an existing project for hosting.</p></details><details><summary>What do I get when I buy one?</summary><p>You get access to the working Rally and keep it in your library. The listing explains its tools, outputs, updates, and support before you buy.</p></details><details><summary>What do I get when I sell one?</summary><p>You get a marketplace listing, free or paid access, a buyer library, usage signals, reviews, improvement requests, and a place to publish new versions.</p></details><details><summary>What can I add to a Rally?</summary><p>Depending on the app, a Rally can include accounts, payments, messages, files, maps, calendars, live information, AI, exports, reviews, and saved customer progress.</p></details><details><summary>Why are the Bachelorette and Garden Rallies here?</summary><p>They are free Pep Rally Originals. Use them to see what a complete Rally feels like before shopping or publishing your own.</p></details></div></section>

    <footer className="consumer-footer"><a href="#top" className="brand"><span className="brand-mark">P</span>Pep Rally</a><p>Useful little apps, made by real people.</p><div><a href="#marketplace">Shop</a><a href="/build">Sell your Rally</a></div><span>Private preview</span></footer>
  </main>;
}
