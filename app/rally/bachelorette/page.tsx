"use client";

import { useEffect, useMemo, useState } from "react";

type Guest = { id: string; name: string; contact: string; rsvp: "Yes" | "Maybe" | "No"; paid: number; needs: string };
type Task = { id: string; text: string; owner: string; done: boolean; due: string };
type Expense = { id: string; label: string; amount: number; paidBy: string };
type Event = { id: string; day: number; time: string; title: string; owner: string; bookingUrl?: string; status: "Idea" | "Shortlisted" | "Booked" };
type Message = { id: string; sender: string; body: string; time: string };
type Venue = { id: string; name: string; category: string; url: string; status: "Considering" | "Contacted" | "Reserved" };

const firstGuests: Guest[] = [{ id: "organizer", name: "Organizer", contact: "", rsvp: "Yes", paid: 0, needs: "" }];
const firstTasks: Task[] = [
  { id: "dates", text: "Confirm dates and bride’s non-negotiables", owner: "Organizer", done: false, due: "This week" },
  { id: "lodging", text: "Choose lodging and read the cancellation policy", owner: "Organizer", done: false, due: "Before deposits" },
  { id: "needs", text: "Collect dietary, accessibility, budget, and room needs", owner: "Organizer", done: false, due: "Before booking" },
  { id: "transport", text: "Plan airport and late-night transportation", owner: "Organizer", done: false, due: "Two weeks before" },
  { id: "emergency", text: "Share emergency contact and address with the group", owner: "Organizer", done: false, due: "Before arrival" },
];
const firstExpenses: Expense[] = [
  { id: "stay", label: "Lodging", amount: 0, paidBy: "Organizer" },
  { id: "food", label: "Meals + groceries", amount: 0, paidBy: "Organizer" },
  { id: "fun", label: "Activities", amount: 0, paidBy: "Organizer" },
  { id: "ride", label: "Transportation", amount: 0, paidBy: "Organizer" },
];

const vibePlans: Record<string, string[]> = {
  "Poolside & playful": ["Arrival + house orientation", "Pool morning + easy lunch", "Group activity or games", "Celebration dinner", "Slow brunch + departures"],
  "Foodie & fabulous": ["Arrival aperitivo", "Market or neighborhood food crawl", "Hands-on tasting or cooking class", "Chef dinner", "Bakery run + departures"],
  "Wellness & slow": ["Tea, arrival, and room settle-in", "Morning movement", "Spa or nature afternoon", "Garden dinner", "Restorative brunch + departures"],
  "Big night out": ["Arrival + glam plan", "Late brunch and recharge", "Dinner reservation", "Main night out + safe ride home", "Recovery breakfast + departures"],
  "Crafty & cozy": ["Arrival snacks + memory table", "Creative workshop", "Cozy dinner in", "Movie, games, and gifts", "Brunch + departures"],
};

export default function BacheloretteRally() {
  const [tab, setTab] = useState<"overview" | "setup" | "guests" | "chat" | "money" | "plan" | "places" | "decor" | "tasks" | "packing">("overview");
  const [brideName, setBrideName] = useState("The bride");
  const [city, setCity] = useState("Palm Springs, CA");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vibe, setVibe] = useState("Poolside & playful");
  const [brideTraits, setBrideTraits] = useState("Loves good food, sunshine, and a plan that does not feel over-scheduled.");
  const [mustAvoid, setMustAvoid] = useState("Embarrassing games and surprise costs");
  const [guests, setGuests] = useState(firstGuests);
  const [tasks, setTasks] = useState(firstTasks);
  const [expenses, setExpenses] = useState(firstExpenses);
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", sender: "Pep Rally", body: "Welcome! Use this room for decisions and updates that should not disappear in a text thread.", time: "Start here" }]);
  const [messageDraft, setMessageDraft] = useState("");
  const [packing, setPacking] = useState(["Government ID", "Trip outfit", "Dinner outfit", "Comfortable shoes", "Medication", "Reusable water bottle", "A note for the bride"]);
  const [perPerson, setPerPerson] = useState(450);
  const [paymentProvider, setPaymentProvider] = useState("PayPal.Me");
  const [paymentHandle, setPaymentHandle] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/party-hub"); const data = await response.json();
      if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
      const plan = data.plan;
      if (plan?.version === 3) {
        setBrideName(plan.brideName); setCity(plan.city); setStartDate(plan.startDate); setEndDate(plan.endDate); setVibe(plan.vibe); setBrideTraits(plan.brideTraits); setMustAvoid(plan.mustAvoid);
        setGuests(plan.guests); setTasks(plan.tasks); setExpenses(plan.expenses); setEvents(plan.events); setVenues(plan.venues); setMessages(plan.messages); setPacking(plan.packing); setPerPerson(plan.perPerson);
        setPaymentProvider(plan.paymentProvider); setPaymentHandle(plan.paymentHandle); setPaymentLink(plan.paymentLink);
      } else if (plan?.version === 2) {
        setGuests(plan.guests); setTasks(plan.tasks.map((task: Task) => ({ ...task, due: task.due || "This week" }))); setExpenses(plan.expenses); setEvents(plan.events.map((event: Event) => ({ ...event, status: event.status || "Idea" }))); setPacking(plan.packing); setPerPerson(plan.perPerson); setPaymentLink(plan.paymentLink || "");
      }
      setLoading(false);
    })();
  }, []);

  const partyName = `${brideName === "The bride" ? "The Bachelorette" : `${brideName}’s Bachelorette`}`;
  const groupBudget = perPerson * guests.filter((guest) => guest.rsvp !== "No").length;
  const collected = guests.reduce((sum, guest) => sum + Math.min(guest.paid, perPerson), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const outstanding = Math.max(0, groupBudget - collected);
  const confirmed = guests.filter((guest) => guest.rsvp === "Yes").length;
  const decisionsNeeded = tasks.filter((task) => !task.done).length + venues.filter((venue) => venue.status !== "Reserved").length;
  const updateText = `${partyName} update: ${city}, ${startDate || "dates coming soon"}. Your working share is $${perPerson}. ${outstanding ? `$${outstanding.toLocaleString()} is still outstanding across the group.` : "Group balances are currently settled."}`;

  const storeSearches = useMemo(() => {
    const query = encodeURIComponent(`${vibe} bachelorette ${city.split(",")[0]} decorations`);
    return [
      { name: "Etsy", note: "Creator-made décor, favors, and editable printables", url: `https://www.etsy.com/search?q=${query}` },
      { name: "Amazon", note: "Fast-shipping basics and group supplies", url: `https://www.amazon.com/s?k=${query}` },
      { name: "Google Shopping", note: "Compare options across stores", url: `https://www.google.com/search?tbm=shop&q=${query}` },
    ];
  }, [vibe, city]);

  async function save() {
    const response = await fetch("/api/party-hub", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ version: 3, brideName, city, startDate, endDate, vibe, brideTraits, mustAvoid, guests, tasks, expenses, events, venues, messages, packing, perPerson, paymentProvider, paymentHandle, paymentLink }) });
    if (response.status === 401) { const data = await response.json(); if (data.signIn) window.location.href = data.signIn; return; }
    if (response.ok) { setSaved(true); setTimeout(() => setSaved(false), 1600); }
  }

  function buildItinerary() {
    const blocks = vibePlans[vibe];
    setEvents(blocks.map((title, index) => ({ id: crypto.randomUUID(), day: index < 1 ? 1 : index < 4 ? 2 : 3, time: index === 0 ? "4:00 PM" : index === 1 ? "10:30 AM" : index === 2 ? "2:00 PM" : index === 3 ? "7:30 PM" : "10:30 AM", title, owner: guests[index % guests.length]?.name || "Organizer", status: "Idea" })));
  }

  function makeProviderLink() {
    const handle = paymentHandle.trim().replace(/^[@$]/, "");
    if (!handle) { setPaymentStatus("Add the organizer’s provider handle or paste an existing payment link."); return; }
    const amount = Math.max(0, perPerson);
    if (paymentProvider === "PayPal.Me") setPaymentLink(`https://www.paypal.com/paypalme/${handle}/${amount}USD`);
    else if (paymentProvider === "Cash App") setPaymentLink(`https://cash.app/$${handle}/${amount}`);
    else if (paymentProvider === "Venmo") setPaymentLink(`https://venmo.com/${handle}`);
    setPaymentStatus("Provider link ready. Payments are confirmed manually in the ledger.");
  }

  async function createStripeLink() {
    setPaymentStatus("Connecting to Stripe…");
    const response = await fetch("/api/payment-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: perPerson, title: `${partyName} group share` }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    if (response.ok) { setPaymentLink(data.url); setPaymentStatus("Live Stripe payment link created ✓"); }
    else setPaymentStatus(data.error || "Stripe could not create a link.");
  }

  if (loading) return <main className="rally-loading">Gathering your Rally…</main>;
  const nav = ["overview", "setup", "guests", "chat", "money", "plan", "places", "decor", "tasks", "packing"] as const;
  const owners = guests.length ? guests : firstGuests;

  return <main className="rally-room bach-room">
    <header className="rally-header bach-header"><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><small>BACHELORETTE BLUEPRINT · EXECUTABLE FULL WORKSPACE</small><h1>{partyName}</h1><p>{city} · {confirmed} confirmed · ${groupBudget.toLocaleString()} working budget</p></div><button className="primary" onClick={save}>{saved ? "Saved ✓" : "Save Rally"}</button></header>
    <nav className="rally-nav">{nav.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>

    {tab === "overview" && <section className="rally-content"><div className="rally-stats"><article><small>CONFIRMED</small><b>{confirmed}/{guests.length}</b><span>guests</span></article><article><small>COLLECTED</small><b>${collected.toLocaleString()}</b><span>${outstanding.toLocaleString()} remaining</span></article><article><small>DECISIONS</small><b>{decisionsNeeded}</b><span>need attention</span></article><article><small>PLANNED</small><b>${expenseTotal.toLocaleString()}</b><span>${Math.max(0, groupBudget - expenseTotal).toLocaleString()} cushion</span></article></div><div className="workspace-command-grid"><article className="command-main"><small>THE BRIEF</small><h2>{vibe}</h2><p>{brideTraits}</p><span>Skip: {mustAvoid}</span><button onClick={() => setTab("setup")}>Edit the brief →</button></article><article><small>NEXT RESERVATION</small><h3>{venues.find((venue) => venue.status !== "Reserved")?.name || "Add your first venue"}</h3><button onClick={() => setTab("places")}>Plan places →</button></article><article><small>GROUP UPDATE</small><p>{updateText}</p><div className="rally-actions"><a href={`mailto:?subject=${encodeURIComponent(partyName)}&body=${encodeURIComponent(updateText)}`}>Email</a><a href={`sms:?&body=${encodeURIComponent(updateText)}`}>Text</a></div></article><article><small>CHAT</small><h3>{messages.length} message{messages.length === 1 ? "" : "s"}</h3><p>Keep durable decisions beside the plan.</p><button onClick={() => setTab("chat")}>Open chat →</button></article></div></section>}

    {tab === "setup" && <section className="rally-content"><div className="workspace-intro"><div><small>PARTY BRIEF</small><h2>Tell the app who she is.</h2><p>The plan should feel like the bride—not a generic checklist wearing a sash.</p></div><div className="workspace-stamp"><b>{vibe}</b><span>{city}</span></div></div><div className="setup-grid"><label>Bride’s name<input value={brideName} onChange={(e) => setBrideName(e.target.value)} /></label><label>Destination<input value={city} onChange={(e) => setCity(e.target.value)} /></label><label>Arrival date<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label><label>Departure date<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label><label>Weekend energy<select value={vibe} onChange={(e) => setVibe(e.target.value)}>{Object.keys(vibePlans).map((name) => <option key={name}>{name}</option>)}</select></label><label>Working budget per person<input type="number" min="0" value={perPerson} onChange={(e) => setPerPerson(Number(e.target.value))} /></label><label className="full-field">What is the bride actually like?<textarea value={brideTraits} onChange={(e) => setBrideTraits(e.target.value)} /></label><label className="full-field">Hard no’s, boundaries, and accessibility needs<textarea value={mustAvoid} onChange={(e) => setMustAvoid(e.target.value)} /></label></div><button className="primary" onClick={() => { buildItinerary(); setTab("plan"); }}>Generate the working plan →</button></section>}

    {tab === "guests" && <section className="rally-content"><div className="rally-title"><div><small>GUESTS + RSVP</small><h2>Everyone, accounted for.</h2></div><button onClick={() => setGuests([...guests, { id: crypto.randomUUID(), name: "New guest", contact: "", rsvp: "Maybe", paid: 0, needs: "" }])}>+ Add guest</button></div><div className="rally-table"><div className="rally-row labels"><span>Name</span><span>Email or phone</span><span>RSVP</span><span>Needs</span><span></span></div>{guests.map((guest, index) => <div className="rally-row" key={guest.id}><input value={guest.name} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}/><input value={guest.contact} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, contact: e.target.value } : item))}/><select value={guest.rsvp} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, rsvp: e.target.value as Guest["rsvp"] } : item))}><option>Yes</option><option>Maybe</option><option>No</option></select><input placeholder="Dietary, access, room…" value={guest.needs} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, needs: e.target.value } : item))}/><button aria-label={`Remove ${guest.name}`} onClick={() => setGuests(guests.filter((item) => item.id !== guest.id))}>×</button></div>)}</div><div className="invite-box"><b>Invite message</b><p>Join {partyName} in {city}. Please confirm your RSVP, budget comfort, dietary needs, accessibility needs, and room preferences.</p><div className="rally-actions"><a href={`mailto:?subject=${encodeURIComponent(partyName)}&body=${encodeURIComponent(`Join ${partyName} in ${city}. Please reply with your RSVP, budget comfort, dietary needs, accessibility needs, and room preferences.`)}`}>Email invite</a><a href={`sms:?&body=${encodeURIComponent(`Join ${partyName} in ${city}. Please reply with your RSVP and any budget, dietary, accessibility, or room needs.`)}`}>Text invite</a></div><small>Private multi-user invite links are the next access milestone. Email and text actions work now.</small></div></section>}

    {tab === "chat" && <section className="rally-content"><div className="workspace-intro"><div><small>GROUP CHAT</small><h2>{partyName} chat</h2><p>Keep decisions attached to the actual plan. This private version stores the organizer’s durable message log.</p></div><div className="rally-actions"><a href="https://discord.com/app" target="_blank" rel="noreferrer">Open Discord ↗</a></div></div><div className="chat-room"><div className="chat-list">{messages.map((message) => <article key={message.id}><div><b>{message.sender}</b><small>{message.time}</small></div><p>{message.body}</p></article>)}</div><form onSubmit={(e) => { e.preventDefault(); if (!messageDraft.trim()) return; setMessages([...messages, { id: crypto.randomUUID(), sender: guests[0]?.name || "Organizer", body: messageDraft.trim(), time: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }]); setMessageDraft(""); }}><input aria-label="Write a message" value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} placeholder="Post an update or decision…"/><button className="primary">Send</button></form></div></section>}

    {tab === "money" && <section className="rally-content"><div className="workspace-intro"><div><small>MONEY</small><h2>Collect it. Track it. Reconcile it.</h2><p>Pep Rally tracks balances; the selected payment provider moves the funds securely.</p></div><label>Share per person<input type="number" min="0" value={perPerson} onChange={(e) => setPerPerson(Number(e.target.value))}/></label></div><div className="money-strip"><span>Group budget <b>${groupBudget.toLocaleString()}</b></span><span>Collected <b>${collected.toLocaleString()}</b></span><span>Outstanding <b>${outstanding.toLocaleString()}</b></span><span>Planned expenses <b>${expenseTotal.toLocaleString()}</b></span></div><div className="payment-connect"><div><label>Provider<select value={paymentProvider} onChange={(e) => setPaymentProvider(e.target.value)}><option>PayPal.Me</option><option>Cash App</option><option>Venmo</option><option>Stripe</option><option>Other link</option></select></label><label>{paymentProvider === "Other link" || paymentProvider === "Stripe" ? "Payment link" : "Organizer handle"}<input value={paymentProvider === "Other link" || paymentProvider === "Stripe" ? paymentLink : paymentHandle} onChange={(e) => paymentProvider === "Other link" || paymentProvider === "Stripe" ? setPaymentLink(e.target.value) : setPaymentHandle(e.target.value)} placeholder={paymentProvider === "PayPal.Me" ? "paypal.me name" : paymentProvider === "Cash App" ? "$cashtag" : paymentProvider === "Venmo" ? "@username" : "https://…"}/></label></div><div>{paymentProvider === "Stripe" ? <button onClick={createStripeLink}>Create Stripe payment link</button> : paymentProvider !== "Other link" && <button onClick={makeProviderLink}>Make request link</button>}{paymentLink && <a href={paymentLink} target="_blank" rel="noreferrer">Open payment request ↗</a>}</div><small>{paymentStatus || "Provider accounts and their terms apply. Mark payments received in the ledger below."}</small></div><div className="balance-list">{guests.map((guest, index) => <article key={guest.id}><div><b>{guest.name}</b><small>${Math.max(0, perPerson - guest.paid).toLocaleString()} remaining</small></div><label>Paid $<input type="number" min="0" max={perPerson} value={guest.paid} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, paid: Number(e.target.value) } : item))}/></label><div className="balance-meter"><i style={{ width: `${perPerson ? Math.min(100, guest.paid / perPerson * 100) : 0}%` }}/></div></article>)}</div><div className="rally-title compact"><div><small>EXPENSE PLAN</small><h3>What the group budget covers</h3></div><button onClick={() => setExpenses([...expenses, { id: crypto.randomUUID(), label: "New expense", amount: 0, paidBy: owners[0].name }])}>+ Add expense</button></div><div className="expense-list">{expenses.map((expense, index) => <div key={expense.id}><input value={expense.label} onChange={(e) => setExpenses(expenses.map((item, i) => i === index ? { ...item, label: e.target.value } : item))}/><label>$ <input type="number" value={expense.amount} onChange={(e) => setExpenses(expenses.map((item, i) => i === index ? { ...item, amount: Number(e.target.value) } : item))}/></label><select value={expense.paidBy} onChange={(e) => setExpenses(expenses.map((item, i) => i === index ? { ...item, paidBy: e.target.value } : item))}>{owners.map((guest) => <option key={guest.id}>{guest.name}</option>)}</select><button onClick={() => setExpenses(expenses.filter((item) => item.id !== expense.id))}>×</button></div>)}</div></section>}

    {tab === "plan" && <section className="rally-content"><div className="workspace-intro"><div><small>ITINERARY</small><h2>{events.length ? `${vibe}, with breathing room.` : "Generate a plan from the brief."}</h2><p>Every item can be edited, assigned, linked, and marked booked.</p></div><button onClick={buildItinerary}>{events.length ? "Regenerate from vibe" : "Generate itinerary"}</button></div><div className="event-list rich-events">{events.map((event, index) => <article key={event.id}><label>Day<input type="number" min="1" max="7" value={event.day} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, day: Number(e.target.value) } : item))}/></label><label>Time<input value={event.time} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, time: e.target.value } : item))}/></label><input className="event-name" value={event.title} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, title: e.target.value } : item))}/><select value={event.owner} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, owner: e.target.value } : item))}>{owners.map((guest) => <option key={guest.id}>{guest.name}</option>)}</select><select value={event.status} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, status: e.target.value as Event["status"] } : item))}><option>Idea</option><option>Shortlisted</option><option>Booked</option></select><button onClick={() => setEvents(events.filter((item) => item.id !== event.id))}>×</button></article>)}</div></section>}

    {tab === "places" && <section className="rally-content"><div className="workspace-intro"><div><small>PLACES + RESERVATIONS</small><h2>Search live. Save the real booking.</h2><p>Pep Rally opens current search and reservation results, then stores the venue and status in your plan.</p></div><button onClick={() => setVenues([...venues, { id: crypto.randomUUID(), name: "New venue", category: "Dinner", url: "", status: "Considering" }])}>+ Add venue</button></div><div className="place-search-grid">{["Brunch", "Celebration dinner", "Group activity", "Spa or wellness", "Nightlife", "Private chef"].map((category) => { const query = encodeURIComponent(`${category} in ${city} bachelorette group`); return <article key={category}><small>{category.toUpperCase()}</small><h3>{category} in {city.split(",")[0]}</h3><p>Search current options, availability, group policies, and recent reviews.</p><div><a href={`https://www.google.com/maps/search/${query}`} target="_blank" rel="noreferrer">Maps ↗</a>{category.includes("dinner") || category === "Brunch" ? <a href={`https://www.opentable.com/s?term=${query}`} target="_blank" rel="noreferrer">OpenTable ↗</a> : null}</div></article>; })}</div><div className="venue-list">{venues.length ? venues.map((venue, index) => <article key={venue.id}><input value={venue.name} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}/><input value={venue.category} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, category: e.target.value } : item))}/><input type="url" placeholder="Booking or venue URL" value={venue.url} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, url: e.target.value } : item))}/><select value={venue.status} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, status: e.target.value as Venue["status"] } : item))}><option>Considering</option><option>Contacted</option><option>Reserved</option></select>{venue.url ? <a href={venue.url} target="_blank" rel="noreferrer">Open ↗</a> : <span></span>}<button onClick={() => setVenues(venues.filter((item) => item.id !== venue.id))}>×</button></article>) : <p className="empty-state">No venues saved yet. Search above, then add the actual choice here.</p>}</div><p className="confidence-note">Direct booking inside Pep Rally requires an approved reservation-platform partnership. These links open the live provider so availability and policies remain current.</p></section>}

    {tab === "decor" && <section className="rally-content"><div className="workspace-intro"><div><small>DÉCOR + DETAILS</small><h2>{vibe}, without buying twelve versions of the same thing.</h2><p>Start from one visual direction, then save only what supports it.</p></div><div className="workspace-stamp"><b>{vibe}</b><span>{mustAvoid}</span></div></div><div className="decor-board"><article><small>COLOR DIRECTION</small><h3>{vibe === "Poolside & playful" ? "Coral · pink · citrus · cream" : vibe === "Wellness & slow" ? "Sage · sand · white · soft lilac" : vibe === "Big night out" ? "Black · silver · electric pink" : "Warm cream · blush · one bold accent"}</h3><p>Repeat the same palette across invitations, table details, and favors.</p></article><article><small>BUY LESS</small><ul><li>One welcome sign or printable</li><li>Reusable cups or name markers</li><li>A photo moment that fits the location</li><li>Useful welcome-bag items</li><li>Nothing the bride explicitly hates</li></ul></article></div><div className="store-grid">{storeSearches.map((store) => <a key={store.name} href={store.url} target="_blank" rel="noreferrer"><b>{store.name} ↗</b><span>{store.note}</span><small>Non-affiliate search for now</small></a>)}</div></section>}

    {tab === "tasks" && <section className="rally-content"><div className="rally-title"><div><small>TASKS</small><h2>No invisible labor.</h2></div><button onClick={() => setTasks([...tasks, { id: crypto.randomUUID(), text: "New task", owner: owners[0].name, done: false, due: "This week" }])}>+ Add task</button></div><div className="task-list">{tasks.map((task, index) => <article className={task.done ? "done" : ""} key={task.id}><button className="check" onClick={() => setTasks(tasks.map((item, i) => i === index ? { ...item, done: !item.done } : item))}>{task.done ? "✓" : ""}</button><input value={task.text} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, text: e.target.value } : item))}/><select value={task.owner} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, owner: e.target.value } : item))}>{owners.map((guest) => <option key={guest.id}>{guest.name}</option>)}</select><input value={task.due} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, due: e.target.value } : item))}/><button onClick={() => setTasks(tasks.filter((item) => item.id !== task.id))}>×</button></article>)}</div></section>}

    {tab === "packing" && <section className="rally-content"><div className="rally-title"><div><small>PACKING + SAFETY</small><h2>Everyone arrives ready.</h2></div><button onClick={() => setPacking([...packing, "New item"])}>+ Add item</button></div><div className="packing-list">{packing.map((item, index) => <label key={`${item}-${index}`}><input type="checkbox"/><input value={item} onChange={(e) => setPacking(packing.map((value, i) => i === index ? e.target.value : value))}/><button onClick={() => setPacking(packing.filter((_, i) => i !== index))}>×</button></label>)}</div><div className="safety-card"><b>One boring but essential checklist</b><p>Confirm the lodging address, emergency contact, transportation home, medication storage, accessibility needs, and who stays sober enough to handle a problem.</p></div></section>}
  </main>;
}
