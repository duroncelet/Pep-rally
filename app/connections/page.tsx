"use client";

import { FormEvent, useEffect, useState } from "react";

type ConnectionState = { ready: boolean; note: string };
type ConnectionResponse = { checkedAt: string; connections: Record<string, ConnectionState> };

const liveConnections = [
  { id: "account", name: "Private accounts", use: "Give each organizer a private Rally and saved work.", label: "Included" },
  { id: "database", name: "Saved plans", use: "Keep guests, budgets, stays, messages, and itinerary changes.", label: "Included" },
  { id: "files", name: "Private files", use: "Upload source files, confirmations, lists, and creator materials.", label: "Included" },
  { id: "weather", name: "Live weather", use: "Power garden recommendations and weather-aware plans.", label: "No creator key" },
  { id: "maps", name: "Maps + live searches", use: "Open current lodging, restaurant, activity, and direction results.", label: "Safe handoff" },
  { id: "emailHandoff", name: "Email handoff", use: "Prepare an invitation or update for the organizer to review and send.", label: "Works today" },
  { id: "textHandoff", name: "Text handoff", use: "Prepare a group update in the organizer’s messaging app.", label: "Works today" },
  { id: "calendarExport", name: "Calendar export", use: "Download a calendar file without connecting an account.", label: "Works today" },
];

const accountConnections = [
  { id: "stripe", name: "Stripe", use: "Create secure payment links after a private merchant credential is added.", next: "Connect Pep Rally’s Stripe test account" },
  { id: "openai", name: "AI personalization", use: "Generate plans and summaries from Rally inputs with controlled usage.", next: "Connect a private OpenAI project key" },
  { id: "email", name: "Automatic email", use: "Send invitations, receipts, and reminders without opening another app.", next: "Choose an email delivery partner" },
  { id: "sms", name: "Automatic texting", use: "Send opted-in reminders and urgent group updates.", next: "Choose an SMS partner and consent flow" },
];

const partnerConnections = [
  { name: "Restaurant reservations", now: "Open a live booking search and save the confirmation.", deal: "Approved availability and booking access" },
  { name: "Hotel + rental inventory", now: "Search Hotels, Airbnb, and VRBO; compare saved options.", deal: "Inventory, pricing, affiliate attribution, and booking access" },
  { name: "Venmo + Cash App confirmation", now: "Create request handoffs and track balances manually.", deal: "Approved payment-status access" },
  { name: "Group travel protection", now: "Show a review checkpoint before nonrefundable booking.", deal: "Quoted coverage and purchase integration" },
];

export default function ConnectionsPage() {
  const [data, setData] = useState<ConnectionResponse | null>(null);
  const [status, setStatus] = useState("Checking the live Pep Rally setup…");
  const [weatherLocation, setWeatherLocation] = useState("Palm Springs, CA");
  const [weatherResult, setWeatherResult] = useState("");
  const [uploadResult, setUploadResult] = useState("");
  const [checkoutResult, setCheckoutResult] = useState("");

  useEffect(() => {
    fetch("/api/connections").then(async (response) => {
      const body = await response.json();
      if (response.status === 401 && body.signIn) { window.location.href = body.signIn; return; }
      if (!response.ok) throw new Error(body.error || "Connection check failed");
      setData(body); setStatus("Live setup checked");
    }).catch(() => setStatus("The live setup could not be checked right now."));
  }, []);

  async function testWeather(event: FormEvent) {
    event.preventDefault(); setWeatherResult("Checking live weather…");
    const response = await fetch(`/api/garden-weather?location=${encodeURIComponent(weatherLocation)}`);
    const body = await response.json();
    setWeatherResult(response.ok ? `${Math.round(body.current.temperature_2m)}${body.currentUnits.temperature_2m} in ${body.place.name} · live from ${body.source}` : body.error || "Weather test failed");
  }

  async function testUpload(file: File | null) {
    if (!file) return;
    setUploadResult("Uploading privately…");
    const form = new FormData(); form.set("source", file);
    const response = await fetch("/api/creator-source", { method: "POST", body: form });
    const body = await response.json();
    setUploadResult(response.ok ? `${body.name} saved privately ✓` : body.error || "Upload test failed");
  }

  function downloadCalendar() {
    const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pep Rally//Connection Test//EN", "BEGIN:VEVENT", "UID:pep-rally-test@pep-rally", "DTSTAMP:20260831T120000Z", "DTSTART:20260918T230000Z", "DTEND:20260919T000000Z", "SUMMARY:Bachelorette weekend begins", "DESCRIPTION:Calendar export created by Pep Rally.", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/calendar" }));
    link.download = "pep-rally-connection-test.ics"; link.click(); URL.revokeObjectURL(link.href);
  }

  async function testCheckout() {
    setCheckoutResult("Opening secure Stripe test checkout…");
    const response = await fetch("/api/checkout", { method: "POST" });
    const body = await response.json();
    if (response.status === 401 && body.signIn) { window.location.href = body.signIn; return; }
    if (response.ok && body.url) { window.location.href = body.url; return; }
    setCheckoutResult(body.error || "Checkout could not be opened.");
  }

  return <main className="connections-page">
    <nav className="store-nav"><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div className="nav-links"><a href="/build">Build</a><a href="#working">Working now</a><a href="#accounts">Needs an account</a><a href="#partners">Partner deals</a></div><a className="nav-button center-link" href="/rally/bachelorette">Bachelorette example</a></nav>

    <header className="connections-hero"><div><small>PEP RALLY CONNECTION CENTER</small><h1>The hard parts,<br/><em>made visible.</em></h1><p>See what genuinely works today, what needs one private account, and where Pep Rally needs a provider partnership. No pretend connections.</p><span className="connection-check"><i className={data ? "ready" : ""}/>{status}</span></div><aside><b>For the Bachelorette Blueprint</b><p>The first complete connection loop is: private workspace → anonymous inputs → live searches → payment handoff → reviewed messages → calendar and itinerary outputs.</p><a href="/rally/bachelorette">Open the Rally →</a></aside></header>

    <section className="connection-section" id="working"><header><small>WORKING NOW</small><h2>Real connections we can use today.</h2><p>These are either built into Pep Rally or use a transparent handoff to a customer-controlled app.</p></header><div className="connection-card-grid">{liveConnections.map((connection) => { const state = data?.connections[connection.id]; return <article key={connection.id}><div><span className={`status-dot ${state?.ready ? "ready" : "checking"}`}/><small>{state ? state.ready ? "LIVE" : "UNAVAILABLE" : "CHECKING"}</small><em>{connection.label}</em></div><h3>{connection.name}</h3><p>{connection.use}</p><b>{state?.note || "Checking live setup…"}</b></article>; })}</div><div className="connection-tests"><article><small>LIVE TEST</small><h3>Weather lookup</h3><form onSubmit={testWeather}><input aria-label="Weather test location" value={weatherLocation} onChange={(event) => setWeatherLocation(event.target.value)}/><button>Test weather</button></form><p>{weatherResult || "Uses the same live weather connection as the Garden Planner."}</p></article><article><small>LIVE TEST</small><h3>Private file storage</h3><label className="file-test">Choose a TXT, CSV, JSON, Markdown, or ZIP file<input type="file" accept=".txt,.csv,.json,.md,.zip" onChange={(event) => testUpload(event.target.files?.[0] || null)}/></label><p>{uploadResult || "Nothing is uploaded until you choose a file."}</p></article><article><small>LIVE TEST</small><h3>Calendar file</h3><button onClick={downloadCalendar}>Download test event</button><p>Creates an .ics file that can be opened in most calendar apps.</p></article></div></section>

    <section className="connection-section account-section" id="accounts"><header><small>NEEDS ONE PRIVATE ACCOUNT</small><h2>Built, but not secretly pretending.</h2><p>A ChatGPT plugin can help operate a provider during development. The customer-facing Rally still needs a separately authorized runtime connection.</p></header><div className="account-connection-list">{accountConnections.map((connection) => { const state = data?.connections[connection.id]; const known = connection.id === "stripe" || connection.id === "openai"; return <article key={connection.id}><div><span className={`status-dot ${state?.ready ? "ready" : ""}`}/><small>{known && state?.ready ? "CONNECTED" : "NOT CONNECTED"}</small></div><h3>{connection.name}</h3><p>{connection.use}</p><b>Next: {connection.next}</b>{known && <em>{state?.note || "Checking private setup…"}</em>}</article>; })}</div><div className="stripe-proof"><div><small>END-TO-END PAYMENT PROOF</small><h3>Pay → verify → save → unlock</h3><p>A $1 Stripe test-mode checkout proves the complete customer outcome. Stripe verifies payment on the server; Pep Rally records it and unlocks a saved executable Bachelorette workspace exactly once.</p><em>No real money moves. This button refuses live Stripe keys.</em></div><button className="primary" disabled={!data?.connections.stripe?.ready} onClick={testCheckout}>{data?.connections.stripe?.ready ? "Run $1 test checkout →" : "Add Stripe test key first"}</button>{checkoutResult && <b>{checkoutResult}</b>}</div><p className="secret-rule"><b>Private-key rule:</b> credentials belong in Pep Rally’s protected server settings—not in creator forms, browser code, prompts, or uploaded files.</p></section>

    <section className="connection-section partner-section" id="partners"><header><small>DEALS PEP RALLY SHOULD MAKE</small><h2>Partnerships turn handoffs into completion.</h2><p>Until access is approved, Pep Rally should open the trusted provider and save the result. A partnership can later keep that step inside the Rally.</p></header><div className="partner-table"><div className="partner-row labels"><span>Capability</span><span>Safe version now</span><span>What a deal unlocks</span></div>{partnerConnections.map((connection) => <div className="partner-row" key={connection.name}><b>{connection.name}</b><span>{connection.now}</span><span>{connection.deal}</span></div>)}</div></section>

    <section className="connection-principle"><small>THE RULE</small><h2>ChatGPT helps build and operate.<br/><em>Pep Rally must own the customer connection.</em></h2><p>Official OpenAI guidance confirms that ChatGPT Work can use files, plugins, approved tools, and scheduled tasks. Those capabilities help us create and maintain Pep Rally; they do not automatically grant every published Rally runtime access to those services.</p><a href="/build" className="primary">Choose connections for a build →</a></section>
  </main>;
}
