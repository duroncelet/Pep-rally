"use client";

import { useMemo, useState } from "react";

const tools = [
  { icon: "🎉", tone: "coral", title: "The Bachelorette Blueprint", maker: "Maya Chen", tag: "Celebrations", price: 18, blurb: "A joyful, no-chaos weekend plan built by a maid of honor who learned the hard way.", rating: "4.9", uses: "183 rallies" },
  { icon: "🏡", tone: "yellow", title: "Renovation Reality Check", maker: "Theo James", tag: "Home", price: 24, blurb: "Turn contractor quotes into a clear budget, timeline, and list of questions to ask.", rating: "4.8", uses: "96 rallies" },
  { icon: "🌱", tone: "green", title: "Sunday Life Reset", maker: "Nia Brooks", tag: "Life admin", price: 12, blurb: "A gentle weekly reset for meals, errands, money, and the things living in your head.", rating: "4.9", uses: "241 rallies" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [destination, setDestination] = useState("Palm Springs");
  const [guests, setGuests] = useState(8);
  const [budget, setBudget] = useState(450);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const filtered = useMemo(() => tools.filter((tool) => `${tool.title} ${tool.tag} ${tool.blurb}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const selected = tools[active];

  return (
    <main>
      <nav>
        <a className="brand" href="#top"><span className="brand-mark">P</span>Pep Rally</a>
        <div className="nav-links"><a href="#marketplace">Explore</a><a href="#how">How it works</a><a href="#create">For creators</a></div>
        <button className="nav-button" onClick={() => document.querySelector("#marketplace")?.scrollIntoView({behavior:"smooth"})}>Join the rally <span>→</span></button>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow"><span>✦</span> Real solutions, made by real people</div>
        <h1>Useful little tools.<br/><em>Big life energy.</em></h1>
        <p className="hero-copy">Discover mini-apps built by people who&apos;ve already figured it out. Make them yours in a few clicks—no prompts, spreadsheets, or tech skills required.</p>
        <div className="hero-actions"><button className="primary" onClick={() => document.querySelector("#marketplace")?.scrollIntoView({behavior:"smooth"})}>Find your shortcut <span>→</span></button><button className="text-button" onClick={() => document.querySelector("#create")?.scrollIntoView({behavior:"smooth"})}>I made something useful <span>↗</span></button></div>
        <div className="hero-art" aria-hidden="true"><div className="sunburst">GOOD<br/>IDEAS<br/><b>INSIDE</b></div><div className="float-card c1"><span>🎂</span><b>Party planned</b><small>12 tasks · 0 group chats</small></div><div className="float-card c2"><span>✓</span><b>Sunday reset</b><small>You&apos;re ready for the week</small></div><div className="scribble">made with<br/>↘ <b>care</b></div></div>
      </section>

      <section className="ticker"><span>PLAN IT</span><b>✸</b><span>MAKE IT YOURS</span><b>✸</b><span>GET YOUR LIFE BACK</span><b>✸</b><span>PEP RALLY</span></section>

      <section className="market" id="marketplace">
        <div className="section-head"><div><p className="kicker">THE STARTING LINEUP</p><h2>Made for real life.</h2></div><label className="search"><span>⌕</span><input aria-label="Search mini-apps" value={query} onChange={e=>setQuery(e.target.value)} placeholder="What do you need help with?"/></label></div>
        <div className="cards">{filtered.map((tool) => { const i=tools.indexOf(tool); return <article className="tool-card" key={tool.title} onClick={()=>{setActive(i); document.querySelector("#preview")?.scrollIntoView({behavior:"smooth"})}}><div className={`tool-visual ${tool.tone}`}><span className="tool-icon">{tool.icon}</span><span className="tag">{tool.tag}</span><span className="peek">TRY IT ↗</span></div><div className="tool-body"><p className="maker">BY {tool.maker.toUpperCase()}</p><h3>{tool.title}</h3><p>{tool.blurb}</p><div className="tool-meta"><span>★ {tool.rating} · {tool.uses}</span><b>${tool.price}</b></div></div></article>})}</div>
      </section>

      <section className="preview" id="preview">
        <div className="preview-copy"><p className="kicker">TRY BEFORE YOU RALLY</p><h2>{selected.title}</h2><p>{selected.blurb}</p><div className="creator"><div className="avatar">{selected.maker.split(" ").map(n=>n[0]).join("")}</div><div><b>Made by {selected.maker}</b><span>Built from experience, tested with friends.</span></div></div><blockquote>“I wanted the fun parts to feel fun again—not like managing a tiny corporation in a group chat.”</blockquote></div>
        <div className="miniapp"><div className="mini-top"><span>{selected.icon}</span><div><b>Quick setup</b><small>Your plan updates as you type</small></div></div><label>Where are we going?<input value={destination} onChange={e=>setDestination(e.target.value)}/></label><div className="two"><label>People<input type="number" min="2" value={guests} onChange={e=>setGuests(+e.target.value)}/></label><label>Budget / person<input type="number" min="50" value={budget} onChange={e=>setBudget(+e.target.value)}/></label></div><div className="result"><span>YOUR RALLY PLAN</span><h4>{destination} for {guests}</h4><p>📍 3-day itinerary &nbsp; · &nbsp; 💸 ${budget*guests.toLocaleString()} group budget</p><div className="progress"><i style={{width:`${Math.min(92,48+guests*3)}%`}}/></div><small>Itinerary · budget · packing list · task tracker</small></div><button className="primary full" onClick={()=>setSaved(true)}>{saved ? "Added to your rally ✓" : `Make it mine · $${selected.price}`}</button></div>
      </section>

      <section className="how" id="how"><p className="kicker">HOW PEP RALLY WORKS</p><h2>Someone figured it out.<br/><em>Now you don&apos;t have to.</em></h2><div className="steps"><div><b>01</b><span>🔎</span><h3>Find your person</h3><p>Browse real solutions made by people who&apos;ve been exactly where you are.</p></div><div><b>02</b><span>✨</span><h3>Make it yours</h3><p>Answer a few simple questions. The tool adapts to your life, instantly.</p></div><div><b>03</b><span>🏁</span><h3>Go do the thing</h3><p>Use your personalized plan right here, whenever you need it.</p></div></div></section>

      <section className="creator-cta" id="create"><div><p className="kicker">CALLING ALL PROBLEM SOLVERS</p><h2>You made a thing.<br/>Let it help someone.</h2><p>Turn the clever tool you built for yourself into a useful mini-app others can rally around.</p></div><form onSubmit={e=>{e.preventDefault();setSubmitted(true)}}><label>Your name<input required placeholder="The human behind the idea"/></label><label>What did you make?<input required placeholder="A planner, calculator, guide…"/></label><button className="dark">{submitted ? "You’re on the list! ✦" : "Pitch your tool →"}</button><small>No code needed. We&apos;ll help shape it.</small></form></section>
      <footer><a className="brand" href="#top"><span className="brand-mark">P</span>Pep Rally</a><p>Useful things, made human.</p><div><a href="#marketplace">Explore</a><a href="#create">Create</a><a href="#">Instagram</a></div><span>© 2026 Pep Rally</span></footer>
    </main>
  );
}
