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

  return <main className="consumer-home">
    <nav className="store-nav">
      <a href="#top" className="brand"><span className="brand-mark">P</span>Pep Rally</a>
      <div className="nav-links"><a href="#shop">Free case studies</a><a href="#how">How Pep Rally works</a><a href="/build">Build or upload</a><a href="#questions">Questions</a></div>
      <button className="nav-button" onClick={openLibrary}>My Rallies</button>
    </nav>

    {libraryOpen && <div className="checkout-shade" onClick={() => setLibraryOpen(false)}><section className="simple-library" onClick={(event) => event.stopPropagation()}><header><div><small>MY RALLIES</small><h2>Pick up where you left off.</h2></div><button aria-label="Close" onClick={() => setLibraryOpen(false)}>×</button></header>{libraryLoading ? <p>Opening your Rallies…</p> : library.length ? <div>{library.map((item) => <a key={item.id} href={item.toolSlug === "garden-planner" ? "/rally/garden" : "/rally/bachelorette"}><b>{item.title}</b><span>{item.summary}</span><em>Open →</em></a>)}</div> : <div className="empty-library"><b>No saved Rallies yet.</b><p>Try a free case study, build a mini-app here, or bring one you already made.</p></div>}</section></div>}

    <section className="shop-hero" id="top">
      <div className="shop-hero-copy"><span className="eyebrow">BUILD, TEST + SELL EVERYDAY MINI-APPS</span><h1>Useful little apps.<br/><em>Built from real life.</em></h1><p>Pep Rally helps people turn an everyday solution into a mini-app others can actually use. Build it here or bring something you already made—then add the connections, hosting, testing, and storefront needed to launch it.</p><div><a className="primary" href="/build">Build or upload a Rally</a><a className="text-button" href="#shop">Explore free case studies</a></div></div>
      <div className="shop-hero-images" aria-label="Free Bachelorette and garden Rally case studies"><figure><img src="/rallies/bachelorette-pool.jpg" alt="Friends planning a sunny weekend together"/><figcaption><b>Bachelorette Blueprint</b><span>FREE CASE STUDY · PEOPLE · MONEY · PLACES · PLANS</span></figcaption></figure><figure><img src="/rallies/lush-garden.jpg" alt="A lush raised-bed and container garden"/><figcaption><b>Little Garden Planner</b><span>FREE CASE STUDY · LAYOUT · WEATHER · CARE · NOTES</span></figcaption></figure></div>
    </section>

    <section className="consumer-proof"><span><b>Build here</b> or bring your own mini-app</span><span><b>Launch</b> a hosted, usable Rally</span><span><b>Connect</b> the hard parts once</span></section>

    <section className="storefront" id="shop"><header><small>FREE CASE STUDIES</small><h2>See what a Rally can become.</h2><p>These are examples—not the limits of Pep Rally. Open them to understand the standard: a focused mini-app that takes real inputs, produces a useful outcome, saves the work, and helps someone complete an everyday job.</p></header><div className="product-grid">{products.map((product) => { const stat = stats[product.slug] ?? { runs: 0, reviewCount: 0, averageRating: null, reviews: [] }; return <article className={`product-card ${product.color}`} key={product.slug}><div className="product-photo"><img src={product.image} alt=""/><span>{product.price}</span></div><div className="product-copy"><small>{product.eyebrow}</small><h3>{product.title}</h3><p>{product.blurb}</p><ul>{product.included.map((item) => <li key={item}>{item}</li>)}</ul><div className="product-stats"><span>{stat.runs} saved plan{stat.runs === 1 ? "" : "s"}</span><span>{stat.averageRating ? `★ ${stat.averageRating.toFixed(1)} from ${stat.reviewCount}` : "New · no reviews yet"}</span></div><a className="primary full center-link" href={product.href}>{product.slug === "garden-planner" ? "Try the free case study" : "Try the free case study"}</a></div></article>; })}</div></section>

    <section className="simple-how" id="how"><header><small>HOW PEP RALLY WORKS</small><h2>From “I made this for myself”<br/>to <em>“other people can use it.”</em></h2></header><div><article><b>01</b><h3>Bring the useful thing</h3><p>Start with an everyday problem you understand. Build the mini-app inside Pep Rally, or upload and link the version you already made.</p></article><article><b>02</b><h3>Add the hard parts</h3><p>Choose what it needs: accounts, payments, email, text, files, live data, calendars, maps, AI, or hosting.</p></article><article><b>03</b><h3>Test it with real people</h3><p>Share a working preview, watch where people get stuck, collect reviews and requests, and improve the outcome.</p></article><article><b>04</b><h3>Launch it as a Rally</h3><p>Publish a usable mini-app with a clear listing, price or free access, saved customer work, support, and an improvement history.</p></article></div></section>

    <section className="builder-invite"><div><small>TWO WAYS IN</small><h2>Build it here.<br/><em>Or bring it with you.</em></h2><p>You do not have to start over. Bring a live URL, code project, prototype, or working mini-site; or use Pep Rally to shape the first version from an idea. Either path should end with the same thing: a Rally people can open and use.</p><a className="primary" href="/build">Build or upload my Rally →</a></div><div className="builder-invite-list"><span><b>Build inside Pep Rally</b>Start with the person, problem, inputs, decisions, and useful outcome.</span><span><b>Upload what you made</b>Bring a site, mini-app, code project, or prototype without losing its identity.</span><span><b>Make it launchable</b>Add accounts, hosting, payments, messages, data, reviews, and support.</span><span><b>Reach the marketplace</b>Offer it free or paid, learn from usage, and publish improvements.</span></div></section>

    <section className="what-you-get"><div><small>THE OUTCOME</small><h2>A usable mini-app.<br/><em>Not just a file.</em></h2><p>A Rally is a hosted working product. A customer opens it, gives it real inputs, gets a useful result, saves their work, and returns to it. Downloads such as PDFs or Markdown can be included, but they are not the product.</p></div><div className="get-list"><span><b>For the person using it</b>A private, saved mini-app that helps complete a specific job—not a pile of setup instructions.</span><span><b>For the person who made it</b>A hosted product page, working access, free or paid distribution, usage signals, reviews, and a path to improve it.</span><span><b>For people who extend it</b>A simple version history and credit trail so useful adaptations can build on the original fairly.</span><span><b>For Pep Rally</b>A growing marketplace of trusted outcomes plus shared infrastructure builders should not have to reinvent.</span></div></section>

    <section className="connection-promise"><div><small>THE PEP RALLY CONNECTION LAYER</small><h2>The difficult integrations should become a platform benefit.</h2><p>Most everyday builders should not have to negotiate APIs, secure secret keys, configure webhooks, or rebuild checkout and messaging from scratch. Pep Rally’s long-term job is to make approved connections available across Rallies through direct integrations and provider partnerships.</p><a href="/connections">See what is connected, next, or partner-dependent →</a></div><div className="connection-cloud"><span>Stripe + payments</span><span>PayPal + money requests</span><span>Venmo + payment status</span><span>Email + text</span><span>Maps + reservations</span><span>Calendars + files</span><span>Weather + live data</span><span>AI + media</span><span>Hosting + accounts</span></div><p><b>Current truth:</b> some connections work now, some require the builder’s account, and others need a formal provider deal. Pep Rally will show that status plainly.</p></section>

    <section className="consumer-faq" id="questions"><header><small>PEP RALLY FAQ</small><h2>Before you build,<br/>buy, or upload.</h2></header><div><details open><summary>What exactly is Pep Rally?</summary><p>Pep Rally is a place to build, bring, test, host, discover, and sell mini-apps for everyday problems. It combines a builder, a marketplace, and a shared connection layer.</p></details><details><summary>What is a Rally?</summary><p>A Rally is the finished usable mini-app. It lives online, can save a person’s work, and helps them reach a clear outcome. It may also include files or downloads, but it is not merely a PDF, Markdown file, or code folder.</p></details><details><summary>Do I have to build it inside Pep Rally?</summary><p>No. Start inside Pep Rally if you only have an idea, or bring a site, mini-app, prototype, or code project you already made. Pep Rally should help make either version usable, testable, hostable, and sellable.</p></details><details><summary>What does someone get when they buy a Rally?</summary><p>They get access to the working mini-app and a private place for its saved results. The exact tools, exports, updates, and support are explained on that Rally’s listing before purchase.</p></details><details><summary>What does the person who uploads one get?</summary><p>They get a product listing, hosting path, free or paid access controls, customer usage signals, reviews, improvement requests, and eventually shared connections and partner benefits they would otherwise have to arrange alone.</p></details><details><summary>Will Pep Rally provide Stripe, messaging, APIs, and other connectors?</summary><p>That is a core part of the thesis. Pep Rally will build reusable connections where possible and pursue approved partnerships for payments, messaging, maps, reservations, data, AI, media, and hosting. Until a deal or connection is real, Pep Rally will label it as requiring an account, a handoff, or a future partnership.</p></details><details><summary>Why are the Bachelorette and Garden Rallies here?</summary><p>They are free case studies and marketing examples. They demonstrate the quality and usefulness expected from a Rally; they are not the definition or the boundary of Pep Rally.</p></details></div></section>

    <footer className="consumer-footer"><a href="#top" className="brand"><span className="brand-mark">P</span>Pep Rally</a><p>Useful little apps, built from real life.</p><div><a href="#shop">Case studies</a><a href="/build">Build or upload</a></div><span>Private preview</span></footer>
  </main>;
}
