"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { rallyConcepts } from "./catalog";
import { originals } from "./originals";
import { matchesRally } from "./market-search";
import { formatPrice } from "./format-price";

type Review = { id: string; reviewerName: string; rating: number; body: string };
type Stat = { runs: number; reviewCount: number; averageRating: number | null; reviews: Review[] };
type CommunityListing = { id: string; name: string; creatorName: string; outcome: string; proof: string; accessModel: "free" | "paid"; priceCents: number; sourceUrl: string | null };

export default function Home() {
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [listings, setListings] = useState<CommunityListing[]>([]);
  const [marketStatus, setMarketStatus] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState("");
  const [waitlistError, setWaitlistError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...new Set([...rallyConcepts.map((item) => item.category), "Garden", "Community"])], []);
  const visibleRallies = rallyConcepts.filter(r=>matchesRally({title:r.title,category:r.category,keywords:r.forWhom+" "+r.promise},search,category));
  const visibleOriginals = originals.filter(r=>matchesRally({title:r.title,category:r.slug==="garden-planner"?"Garden":"Plan",keywords:r.blurb+" "+r.included.join(" ")},search,category));
  const visibleListings = listings.filter(r=>matchesRally({title:r.name,category:"Community",keywords:r.creatorName+" "+r.outcome},search,category));

  useEffect(() => {
    fetch("/api/marketplace").then((response) => response.ok ? response.json() : null).then((data) => { if (data) { setStats(data.stats ?? {}); setListings(data.listings ?? []); } else setMarketStatus("Community listings and reviews could not load. The free apps are still available."); }).catch(()=>setMarketStatus("Community listings and reviews could not load. Refresh to retry."));
  }, []);

  async function joinWaitlist(event: FormEvent) {
    event.preventDefault();
    if (waitlistBusy) return;
    setWaitlistBusy(true);
    setWaitlistError("");
    try {
      const response = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: waitlistEmail, source: "homepage" }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (response.status === 201) setWaitlistDone("You're on the list. You'll get first access when paid Rallies open, plus launch updates.");
      else if (response.status === 409) setWaitlistDone("You're already on the list.");
      else if (response.status === 422) setWaitlistError("Enter a valid email address.");
      else setWaitlistError(data.error || "Something went wrong — try again in a minute.");
    } catch {
      setWaitlistError("Something went wrong — try again in a minute.");
    } finally {
      setWaitlistBusy(false);
    }
  }

  return <main className="consumer-home">
    <nav className="store-nav"><a href="#top" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div className="nav-links"><a href="#marketplace">Shop Rallies</a><a href="#free">Try free</a><a href="#creators">Sell your Rally</a><a href="#faq">FAQ</a></div><div className="store-nav-actions"><a className="nav-signup" href="/sign-up">Sign up</a><a className="nav-button center-link" href="/library">My Rallies</a></div></nav>

    <section className="shop-hero" id="top"><div className="shop-hero-copy"><span className="eyebrow">THE MARKETPLACE FOR EVERYDAY MINI-APPS</span><h1>Small apps.<br/><em>Real outcomes.</em></h1><p>Find a Rally for what’s on your list. Plan a weekend, organize your garden, or tackle something new—with an app made by someone who gets it.</p><div><a className="primary" href="#marketplace">Shop Rallies</a><a className="secondary" href="#creators">Sell your Rally →</a></div></div><div className="shop-hero-images home-feature-photo"><img src="/rallies/bachelorette-pool.jpg" alt="Friends enjoying a sunny weekend together"/></div></section>



    <section className="storefront" id="marketplace"><div className="discovery-tools"><label><span>Search all Rallies</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try garden, bachelorette, nursing, pricing…"/></label><div>{categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div></div><div id="free"/><header><small>FREE · READY TO USE</small><h2>Start with something free.</h2><p>Make a plan you can use and download. No account needed.</p></header><div className="product-grid">{visibleOriginals.map((product) => { const stat = stats[product.slug]; return <article className={`product-card ${product.color}`} key={product.slug}><div className="product-photo"><img src={product.image} alt=""/><span>{product.price}</span></div><div className="product-copy"><small>{product.eyebrow}</small><h3>{product.title}</h3><p>{product.blurb}</p>{stat && <div className="product-stats"><span>{stat.runs} saved plan{stat.runs === 1 ? "" : "s"}</span><span>{stat.averageRating ? `★ ${stat.averageRating.toFixed(1)} from ${stat.reviewCount}` : "New · no reviews yet"}</span></div>}<a className="primary full center-link" href={product.appHref}>Open free Rally →</a><a href={`/shop/${product.slug}`}>What’s included + reviews</a></div></article>; })}</div></section>

    <section className="creator-path" id="creators"><div><small>FOR PEOPLE WHO MAKE THINGS</small><h2>Do you have something you want to sell?<br/><em>Publish a Rally.</em></h2><p>Bring a working app and publish a free listing. Have an idea instead? Start a build brief and prepare the working version in your studio.</p><a className="primary center-link" href="/build">Publish a Rally →</a></div></section>

    <section className="community-marketplace" id="more-rallies"><header><div><small>EXPLORE THE MARKETPLACE</small><h2>What’s on your list?</h2><p>Free Rallies are ready to use. Paid access is not on sale yet; explore the other previews below.</p></div></header>{visibleListings.length > 0 && <><div className="ready-divider"><span>FROM PEP RALLY CREATORS</span><p>Explore apps shared by the community.</p></div><div className="community-grid">{visibleListings.map((listing, index) => <article key={listing.id} className={`community-card tone-${index % 4}`}><div className="community-card-top"><span>Made by {listing.creatorName}</span><b>{listing.accessModel === "free" ? "Free" : formatPrice(listing.priceCents)}</b></div><div className="community-icon">{listing.name.slice(0, 1).toUpperCase()}</div><h3>{listing.name}</h3><p>{listing.outcome}</p><small>{listing.proof}</small>{listing.accessModel === "free" && listing.sourceUrl ? <a className="primary center-link" href={listing.sourceUrl} target="_blank" rel="noreferrer">Open free Rally →</a> : <span>Paid access coming later</span>}<p>Hosted and supported by the creator.</p><a href={`/support?rally=${encodeURIComponent(listing.name)}`}>Report a problem</a></article>)}</div></>}<div className="ready-divider"><span>PREVIEWS TO EXPLORE</span><p>Try a preview. Each listing explains what’s included.</p></div><div className="idea-grid">{visibleRallies.map((rally) => <a href={`/discover/${rally.slug}`} className={`idea-card idea-${rally.accent}`} key={rally.slug}><div><span>{rally.monogram}</span><small>{rally.category} · Concept preview</small></div><h3>{rally.title}</h3><p>{rally.promise}</p><b>View Rally →</b></a>)}</div>{!visibleRallies.length && !visibleOriginals.length && !visibleListings.length && <div className="no-ideas"><b>No exact match yet.</b><p>Try a different search or category.</p><button onClick={()=>{setSearch("");setCategory("All");}}>Show all Rallies</button></div>}{marketStatus && <p className="market-status">{marketStatus}</p>}<div className="waitlist-band"><div><b>Paid Rallies aren’t on sale yet.</b><p>Leave your email for first access when they open, plus launch updates.</p></div>{waitlistDone ? <p role="status" className="waitlist-done">{waitlistDone}</p> : <form onSubmit={joinWaitlist}><label>Email address<input type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={waitlistEmail} onChange={(event) => setWaitlistEmail(event.target.value)} /></label><button className="primary" disabled={waitlistBusy}>{waitlistBusy ? "Joining…" : "Get first access"}</button>{waitlistError && <p role="status" className="waitlist-error">{waitlistError}</p>}</form>}</div></section>


    <section className="consumer-faq" id="faq"><header><small>PEP RALLY FAQ</small><h2>FAQ</h2></header><div><details><summary>What exactly is Pep Rally?</summary><p>Pep Rally is a place to find small, working apps for everyday jobs: planning a weekend, organizing a garden, pricing what you sell. Each one was made by someone who solved that problem for themselves. Use one for what is on your list, or publish and sell one you made.</p></details><details><summary>What do I get when I pay?</summary><p>Paid access is not on sale yet. The free apps give you a working workspace, a downloadable result, and prompts for customization. Future paid listings will explain exactly what is included.</p></details><details><summary>Can I try a Rally first?</summary><p>Yes. Free Rallies and paid previews open without sign-in. Free examples include downloads without sign-in. Sign in to save progress across devices.</p></details><details><summary>How do creators make money?</summary><p>You can publish a free working app today. Paid selling is not available yet; fees and payout terms will be shown before you enable it.</p></details><details><summary>Do I have to build it inside Pep Rally?</summary><p>No. Link a working mini-app to publish a free listing. You can also save a build brief or upload a project for review; these paths do not automatically build or host an app.</p></details><details><summary>Why do I sign in?</summary><p>Sign in to keep your Rallies and return to saved progress. You do not need an account to try the free examples or download their plans.</p></details></div></section>

    <footer className="consumer-footer"><a href="#top" className="brand"><span className="brand-mark">P</span>Pep Rally</a><p>Working apps, made by people who know the problem.</p><div><a href="#marketplace">Shop Rallies</a><a href="#creators">Sell your Rally</a><a href="/policies">Trust + policies</a><a href="/support">Support</a></div><span>Open. Finish. Keep.</span></footer>
  </main>;
}
