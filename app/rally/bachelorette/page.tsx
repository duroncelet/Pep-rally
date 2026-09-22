"use client";

import { useEffect, useMemo, useState } from "react";
import { downloadMarkdown, markdownCell, safeFileName } from "../../download-markdown";
import { buildCustomizationKit } from "../../customization-kit";
import AgenticPlanner from "./AgenticPlanner";
import TripTools, { BillSplitter } from "./TripTools";
import { destinations, destinationFor, settleBills, type SharedBill } from "./destinations";
import type { ItineraryArtifact } from "../../agentic/rally-runtime";

type Guest = { id: string; name: string; contact: string; rsvp: "Yes" | "Maybe" | "No"; paid: number; needs: string };
type Task = { id: string; text: string; owner: string; done: boolean; due: string };
type Expense = { id: string; label: string; amount: number; paidBy: string };
type Event = { id: string; day: number; time: string; title: string; owner: string; bookingUrl?: string; status: "Idea" | "Shortlisted" | "Booked" };
type Message = { id: string; sender: string; body: string; time: string };
type Venue = { id: string; name: string; category: string; url: string; status: "Considering" | "Contacted" | "Reserved" };
type StayOption = { id: string; name: string; kind: "Hotel" | "Airbnb" | "VRBO" | "Other"; total: number; bedrooms: number; cancellation: string; url: string; status: "Considering" | "Top choice" | "Booked" };

const packingSuggestions = [
  "Government ID + offline copies of travel details", "Medication and personal essentials", "Weather-ready layer or rain protection", "Comfortable walking shoes", "Dinner or venue dress-code outfit", "Swimsuit and cover-up if the stay has water access", "Phone charger and portable battery", "Reusable water bottle and sunscreen", "One shared item someone has claimed to bring", "A note for the bride"
];

function PackingSection({ packing, packedItems, onPacked, onChange, title, subtitle }: { packing: string[]; packedItems: string[]; onPacked: (items: string[]) => void; onChange: (items: string[]) => void; title: string; subtitle: string }) {
  const [custom, setCustom] = useState("");
  const [notice, setNotice] = useState("");
  const add = (item: string) => { const value = item.trim(); if (!value) return; if (packing.includes(value)) { setNotice("That item is already on your list."); return; } onChange([...packing, value]); setNotice(value + " added."); };
  const plainText = title + " — Packing list\n" + subtitle + "\n\n" + packing.map(item => (packedItems.includes(item) ? "✓ " : "□ ") + item).join("\n");
  function download() { downloadMarkdown(safeFileName(title) + "-packing.md", "# " + title + " — Packing\n\n" + subtitle + "\n\n" + packing.map(item => "- [" + (packedItems.includes(item) ? "x" : " ") + "] " + markdownCell(item)).join("\n")); }
  async function share() {
    try { if (navigator.share) await navigator.share({ title: title + " packing", text: plainText }); else { await navigator.clipboard.writeText(plainText); setNotice("Copied. Paste this packing list into your group chat."); } } catch { setNotice("Sharing was cancelled or unavailable. You can download the packing list instead."); }
  }
  return <section className="rally-content packing-section">
    <div className="rally-title"><div><small>PACKING + SAFETY</small><h2>Your group’s packing list.</h2><p>Choose suggestions or add your own. Share this list without including private budgets or notes.</p></div>
    <div className="rally-actions"><button onClick={share}>Share packing list</button><button onClick={download}>Download packing .md</button><button onClick={() => window.print()}>Print / save packing PDF</button></div></div>
    {notice && <p role="status" className="trip-notice">{notice}</p>}
    <form className="add-packing" onSubmit={e => { e.preventDefault(); add(custom); setCustom(""); }}><label>Add your own item<input required value={custom} onChange={e => setCustom(e.target.value)} placeholder="e.g. allergy-safe snacks"/></label><button type="submit">Add item</button></form>
    <div className="packing-list">{packing.length ? packing.map((item, index) => <label key={index}><input aria-label={"Packed " + item} type="checkbox" checked={packedItems.includes(item)} onChange={e => onPacked(e.target.checked ? [...packedItems, item] : packedItems.filter(v => v !== item))}/><input aria-label={"Packing item " + (index + 1)} value={item} onChange={e => { const value = e.target.value; onChange(packing.map((p, i) => i === index ? value : p)); if (packedItems.includes(item)) onPacked(packedItems.map(p => p === item ? value : p)); }}/><button type="button" aria-label={"Remove packing item " + (index + 1)} onClick={() => { onChange(packing.filter((_, i) => i !== index)); onPacked(packedItems.filter(p => p !== item)); }}>×</button></label>) : <p className="empty-state">Your list is empty. Add an item or choose a suggestion below.</p>}</div>
    <details className="packing-suggestions"><summary>Suggested essentials</summary><p>Choose what fits your itinerary and the forecast.</p><div>{packingSuggestions.filter(item => !packing.includes(item)).map(item => <button key={item} onClick={() => add(item)}>+ {item}</button>)}</div></details>
    <div className="packing-print"><small>PEP RALLY · PACKING CHECKLIST</small><h1>{title}</h1><p>{subtitle}</p><ul>{packing.map((item, index) => <li key={index}>{packedItems.includes(item) ? "☑" : "☐"} {item}</li>)}</ul><footer>Share this checklist with your group · Made with Pep Rally</footer></div>
  </section>;
}

const firstGuests: Guest[] = [{ id: "organizer", name: "Organizer", contact: "", rsvp: "Yes", paid: 0, needs: "" }];
const firstTasks: Task[] = [
  { id: "dates", text: "Confirm dates and bride’s non-negotiables", owner: "Organizer", done: false, due: "This week" },
  { id: "lodging", text: "Choose lodging and read the cancellation policy", owner: "Organizer", done: false, due: "Before deposits" },
  { id: "needs", text: "Collect dietary, accessibility, budget, and room needs", owner: "Organizer", done: false, due: "Before booking" },
  { id: "transport", text: "Plan airport and late-night transportation", owner: "Organizer", done: false, due: "Two weeks before" },
  { id: "dinner", text: "Confirm group menu, allergies, deposit, tax/tip and cancellation deadline", owner: "Organizer", done: false, due: "Before dinner deposit" },
  { id: "outfits", text: "Share optional outfit themes and venue dress codes; no required purchases", owner: "Organizer", done: false, due: "Two weeks before" },
  { id: "weather", text: "Check forecast and alerts; confirm an indoor backup", owner: "Organizer", done: false, due: "One week before + departure" },
  { id: "tickets", text: "Confirm concert date, age limits, seats together and all-in ticket price", owner: "Organizer", done: false, due: "Before ticket purchase" },
  { id: "settle", text: "Record paid bills and agree who covers the bride before splitting", owner: "Organizer", done: false, due: "Before deposits + after trip" },
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
  const [tab, setTab] = useState<"overview" | "destination" | "setup" | "guests" | "stay" | "chat" | "money" | "plan" | "places" | "decor" | "tasks" | "packing">("plan");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [packedItems, setPackedItems] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [brideName, setBrideName] = useState("The bride");
  const [city, setCity] = useState("Palm Springs, CA");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vibe, setVibe] = useState("Poolside & playful");
  const [brideTraits, setBrideTraits] = useState("");
  const [mustAvoid, setMustAvoid] = useState("");
  const [guests, setGuests] = useState(firstGuests);
  const [tasks, setTasks] = useState(firstTasks);
  const [expenses, setExpenses] = useState(firstExpenses);
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [packing, setPacking] = useState<string[]>([]);
  const [perPerson, setPerPerson] = useState(450);
  const [paymentProvider, setPaymentProvider] = useState("PayPal.Me");
  const [paymentHandle, setPaymentHandle] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [stayBudgetHigh, setStayBudgetHigh] = useState(4000);
  const [stayNights, setStayNights] = useState(3);
  const [stayBedrooms, setStayBedrooms] = useState(3);
  const [stayMustHaves, setStayMustHaves] = useState("Pool, shared gathering space, flexible cancellation");
  const [budgetDraft, setBudgetDraft] = useState(450);
  const [budgetResponses, setBudgetResponses] = useState<number[]>([]);
  const [stayOptions, setStayOptions] = useState<StayOption[]>([]);
  const [bills, setBills] = useState<SharedBill[]>([]);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<"checking" | "guest" | "signed-in">("checking");
  const [signInPath, setSignInPath] = useState("/sign-in?redirect_url=%2Frally%2Fbachelorette");

  useEffect(() => {
    (async () => {
      try {
      const response = await fetch("/api/party-hub"); const data = await response.json();
      if (response.status === 401 && data.signIn) {
        setAuthState("guest"); setSignInPath(data.signIn);
      }
      if (!response.ok && response.status !== 401) throw new Error("load");
      if (response.ok) setAuthState("signed-in");
      const pending = sessionStorage.getItem("pep-rally-bach-signin-draft");
      const plan = pending ? JSON.parse(pending) : data.plan;
      if (pending) setNotice("Your draft is restored. Save Rally to keep these changes in your account.");
      if (plan) { setWorkspaceReady(true); setPackedItems(plan.packedItems || []); }
      if (plan?.version === 5 || plan?.version === 4 || plan?.version === 3) {
        setBrideName(plan.brideName); setCity(plan.city); setStartDate(plan.startDate); setEndDate(plan.endDate); setVibe(plan.vibe); setBrideTraits(plan.brideTraits); setMustAvoid(plan.mustAvoid);
        setGuests(plan.guests); setTasks(plan.tasks); setExpenses(plan.expenses); setEvents(plan.events); setVenues(plan.venues); setMessages(plan.messages); setPacking(plan.packing); setPerPerson(plan.perPerson);
        setPaymentProvider(plan.paymentProvider); setPaymentHandle(plan.paymentHandle); setPaymentLink(plan.paymentLink);
        if (plan.version >= 4) {
          setBills(plan.bills ?? []);
          setStayBudgetHigh(plan.stayBudgetHigh ?? 4000); setStayNights(plan.stayNights ?? 3); setStayBedrooms(plan.stayBedrooms ?? 3); setStayMustHaves(plan.stayMustHaves ?? "");
          setBudgetResponses(plan.budgetResponses ?? []); setStayOptions(plan.stayOptions ?? []);
        }
      } else if (plan?.version === 2) {
        setGuests(plan.guests); setTasks(plan.tasks.map((task: Task) => ({ ...task, due: task.due || "This week" }))); setExpenses(plan.expenses); setEvents(plan.events.map((event: Event) => ({ ...event, status: event.status || "Idea" }))); setPacking(plan.packing); setPerPerson(plan.perPerson); setPaymentLink(plan.paymentLink || "");
      }
      setLoading(false);
      } catch { setAuthState("guest"); setLoading(false); setSaveError("Your saved plan could not load. Refresh before editing an existing plan."); }
    })();
  }, []);

  const partyName = `${brideName === "The bride" ? "The Bachelorette" : `${brideName}’s Bachelorette`}`;
  const groupBudget = perPerson * guests.filter((guest) => guest.rsvp !== "No").length;
  const collected = guests.filter(guest => guest.rsvp !== "No").reduce((sum, guest) => sum + Math.min(guest.paid, perPerson), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const outstanding = Math.max(0, groupBudget - collected);
  const confirmed = guests.filter((guest) => guest.rsvp === "Yes").length;
  const decisionsNeeded = tasks.filter((task) => !task.done).length + venues.filter((venue) => venue.status !== "Reserved").length;
  const configured = brideName !== "The bride" || Boolean(startDate) || guests.length > 1;
  const updateText = configured ? `${partyName} update: ${city}, ${startDate || "dates coming soon"}. Your working share is $${perPerson}. ${outstanding ? `$${outstanding.toLocaleString()} is still outstanding across the group.` : "Group balances are currently settled."}` : "Set up the bride, dates, and guest list to create a group update.";
  const sortedBudgetResponses = [...budgetResponses].sort((a, b) => a - b);
  const medianContribution = sortedBudgetResponses.length ? sortedBudgetResponses.length % 2 ? sortedBudgetResponses[Math.floor(sortedBudgetResponses.length / 2)] : Math.round((sortedBudgetResponses[sortedBudgetResponses.length / 2 - 1] + sortedBudgetResponses[sortedBudgetResponses.length / 2]) / 2) : 0;
  const lodgingCeiling = budgetResponses.length ? Math.min(stayBudgetHigh, Math.min(...budgetResponses) * budgetResponses.length) : stayBudgetHigh;
  const lodgingPerNight = stayNights ? Math.round(lodgingCeiling / stayNights) : lodgingCeiling;

  const storeSearches = useMemo(() => {
    const query = encodeURIComponent(`${vibe} bachelorette ${city.split(",")[0]} decorations`);
    return [
      { name: "Etsy", note: "Creator-made décor, favors, and editable printables", url: `https://www.etsy.com/search?q=${query}` },
      { name: "Amazon", note: "Fast-shipping basics and group supplies", url: `https://www.amazon.com/s?k=${query}` },
      { name: "Google Shopping", note: "Compare options across stores", url: `https://www.google.com/search?tbm=shop&q=${query}` },
    ];
  }, [vibe, city]);

  function snapshot() { return { version: 5, packedItems, bills, brideName, city, startDate, endDate, vibe, brideTraits, mustAvoid, guests, tasks, expenses, events, venues, messages, packing, perPerson, paymentProvider, paymentHandle, paymentLink, stayBudgetHigh, stayNights, stayBedrooms, stayMustHaves, budgetResponses, stayOptions }; }
  async function save() {
    setSaveError("");
    try {
    const response = await fetch("/api/party-hub", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(snapshot()) });
    if (response.status === 401) { const data = await response.json(); if (data.signIn) keepThisRally(data.signIn); return; }
    if (response.ok) { sessionStorage.removeItem("pep-rally-bach-signin-draft"); setSaved(true); setTimeout(() => setSaved(false), 1600); }
    else setSaveError("Your plan could not be saved. Download a copy and try again.");
    } catch { setSaveError("Connection interrupted. Your edits are still on this screen; try Save again."); }
  }

  function keepThisRally(path = signInPath) { try { sessionStorage.setItem("pep-rally-bach-signin-draft", JSON.stringify(snapshot())); window.location.href = path; } catch { setSaveError("Your browser could not preserve the draft. Download your plan before signing in."); } }

  function applyItinerary(artifact: ItineraryArtifact, answers: Record<string, string>) {
    if (answers.startDate && answers.endDate) {
      setStartDate(answers.startDate); setEndDate(answers.endDate);
      setStayNights(Math.max(1, Math.round((Date.parse(answers.endDate) - Date.parse(answers.startDate)) / 86400000)));
    }
    setBrideName(answers.bride || "The bride"); setWorkspaceReady(true);
    setCity(answers.city); setVibe(answers.vibe); setPerPerson(artifact.totalPerPerson);
    const dayCount = Math.max(1, Math.min(32, 1 + Math.round((Date.parse(answers.endDate) - Date.parse(answers.startDate)) / 86400000)));
    const days = dayCount === 1 ? [artifact.days[1]] : dayCount === 2
      ? [artifact.days[0], { ...artifact.days[1], items: [...artifact.days[1].items, { time: "Time TBD", title: "Departures", note: "", estimatedCost: 0 }] }]
      : [artifact.days[0], artifact.days[1], ...Array.from({ length: dayCount - 3 }, () => ({ label: "Open day", items: [{ time: "Flexible", title: "Free time — add an activity if you like", note: "", estimatedCost: 0 }] })), artifact.days[2]];
    setEvents(days.flatMap((day, dayIndex) => day.items.map(item => ({ id: crypto.randomUUID(), day: dayIndex + 1, time: item.time, title: item.title, owner: guests[0]?.name || "Organizer", status: "Idea" as const }))));
    if (guests.length === 1 && guests[0].id === "organizer") setGuests([guests[0], ...Array.from({ length: Math.max(0, Math.min(100, Number(answers.headcount)) - 1) }, (_, i) => ({ id: crypto.randomUUID(), name: `Guest ${i + 2}`, contact: "", rsvp: "Maybe" as const, paid: 0, needs: "" }))]);
    setTab("plan");
    setTimeout(() => document.querySelector(".rally-nav")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function buildItinerary() {
    const destination = destinationFor(city);
    const blocks = [...vibePlans[vibe]];
    if (destination) { blocks[2] = destination.activity; blocks[3] = `Celebration dinner — research ${destination.dinner}`; }
    setEvents(blocks.map((title, index) => ({ id: crypto.randomUUID(), day: index < 1 ? 1 : index < 4 ? 2 : 3, time: index === 0 ? "4:00 PM" : index === 1 ? "10:30 AM" : index === 2 ? "2:00 PM" : index === 3 ? "7:30 PM" : "10:30 AM", title, owner: guests[index % guests.length]?.name || "Organizer", status: "Idea" })));
  }

  function downloadOutcome() {
    const activeGuests = guests.filter((guest) => guest.rsvp !== "No");
    const markdown = `# ${partyName}\n\n> A working Bachelorette plan made with Pep Rally. Review bookings, balances, accessibility needs, and provider policies before sending or paying.\n\n## Weekend brief\n\n- **Destination:** ${markdownCell(city)}\n- **Dates:** ${markdownCell(startDate || "To be decided")} to ${markdownCell(endDate || "To be decided")}\n- **Vibe:** ${markdownCell(vibe)}\n- **The bride:** ${markdownCell(brideTraits)}\n- **Hard no's / needs:** ${markdownCell(mustAvoid)}\n\n## Money snapshot\n\n- **Working share per person:** $${perPerson.toLocaleString()}\n- **Working group budget:** $${groupBudget.toLocaleString()}\n- **Collected:** $${collected.toLocaleString()}\n- **Outstanding:** $${outstanding.toLocaleString()}\n- **Planned expenses:** $${expenseTotal.toLocaleString()}\n- **Payment option:** ${markdownCell(paymentLink || `${paymentProvider}${paymentHandle ? ` · ${paymentHandle}` : " · not connected"}`)}\n\n## Guests\n\n| Guest | RSVP | Paid | Needs |\n|---|---|---:|---|\n${guests.map((guest) => `| ${markdownCell(guest.name)} | ${guest.rsvp} | $${guest.paid.toLocaleString()} | ${markdownCell(guest.needs)} |`).join("\n")}\n\n## Lodging guardrail\n\n- **Comfort responses:** ${budgetResponses.length || "None yet"}\n- **Median comfortable share:** ${medianContribution ? `$${medianContribution.toLocaleString()}` : "Not calculated"}\n- **Total lodging ceiling:** $${lodgingCeiling.toLocaleString()}\n- **Nights / bedrooms:** ${stayNights} nights · ${stayBedrooms} bedrooms\n- **Must-haves:** ${markdownCell(stayMustHaves)}\n\n| Stay | Type | Total | Bedrooms | Status | Link |\n|---|---|---:|---:|---|---|\n${stayOptions.length ? stayOptions.map((stay) => `| ${markdownCell(stay.name)} | ${stay.kind} | $${stay.total.toLocaleString()} | ${stay.bedrooms} | ${stay.status} | ${markdownCell(stay.url)} |`).join("\n") : "| No stays shortlisted yet | — | — | — | — | — |"}\n\n## Itinerary\n\n| Day | Time | Plan | Owner | Status |\n|---:|---|---|---|---|\n${events.length ? events.map((event) => `| ${event.day} | ${markdownCell(event.time)} | ${markdownCell(event.title)} | ${markdownCell(event.owner)} | ${event.status} |`).join("\n") : "| — | — | Generate the working plan in the Rally | Organizer | Next step |"}\n\n## Places and reservations\n\n| Place | Category | Status | Link |\n|---|---|---|---|\n${venues.length ? venues.map((venue) => `| ${markdownCell(venue.name)} | ${markdownCell(venue.category)} | ${venue.status} | ${markdownCell(venue.url)} |`).join("\n") : "| No places saved yet | — | — | — |"}\n\n## Expense plan\n\n| Expense | Amount | Paid by |\n|---|---:|---|\n${expenses.map((expense) => `| ${markdownCell(expense.label)} | $${expense.amount.toLocaleString()} | ${markdownCell(expense.paidBy)} |`).join("\n")}\n\n## Tasks\n\n${tasks.map((task) => `- [${task.done ? "x" : " "}] ${markdownCell(task.text)} — ${markdownCell(task.owner)}, ${markdownCell(task.due)}`).join("\n")}\n\n## Packing\n\n${packing.map((item) => `- [${packedItems.includes(item) ? "x" : " "}] ${markdownCell(item)}`).join("\n")}\n\n## Organizer notes\n\nThese are organizer notes exported from Pep Rally, not a shared live chat.\n\n${messages.map((message) => `- **${markdownCell(message.sender)}** (${markdownCell(message.time)}): ${markdownCell(message.body)}`).join("\n")}\n\n## Ready-to-send update\n\n${updateText}\n\n---\nCreated with Pep Rally · ${new Date().toLocaleDateString()} · ${activeGuests.length} active guest${activeGuests.length === 1 ? "" : "s"}\n`;
    const name = (id: string) => markdownCell(guests.find(g => g.id === id)?.name || "Removed guest");
    const billMarkdown = `\n## Paid bills (separate from planned budget)\n\n${bills.map(b => `- ${markdownCell(b.title)}: ${b.amount.toFixed(2)} paid by ${name(b.paidBy)}; split among ${b.participants.map(name).join(", ")}`).join("\n")}\n\n## Suggested repayments\n\n${settleBills(bills).map(s => `- ${name(s.from)} pays ${name(s.to)} ${(s.cents / 100).toFixed(2)}`).join("\n") || "No repayments calculated."}\n\nConfirm transfers manually; these are not bank records.\n`;
    downloadMarkdown(`${safeFileName(partyName)}-plan.md`, markdown + billMarkdown);
  }

  function downloadCustomization() {
    const markdown = buildCustomizationKit({
      title: "The Bachelorette Blueprint",
      promise: "Turn a group’s people, budgets, preferences, places, and responsibilities into a weekend plan everyone can act on.",
      audience: "A bachelorette organizer coordinating a real group trip",
      inputs: ["Destination and dates", "Guest list and needs", "Private budget comfort", "Bride’s vibe and boundaries", "Lodging, places, and expenses"],
      outputs: ["A realistic shared budget", "A lodging ceiling and shortlist", "A day-by-day itinerary", "Assignments, payment requests, group updates, and a portable plan"],
      guardrail: "Guests decide what they can contribute. The organizer reviews every message, booking, purchase, and payment request.",
      currentAnswers: { "Destination and dates": `${city} · ${startDate || "dates undecided"} to ${endDate || "dates undecided"}`, "Guest list and needs": guests.map((guest) => `${guest.name}: ${guest.rsvp}${guest.needs ? `, ${guest.needs}` : ""}`).join("; "), "Private budget comfort": budgetResponses.length ? `${budgetResponses.length} replies; $${medianContribution} median` : "Not collected yet", "Bride’s vibe and boundaries": `${vibe}; ${brideTraits}; avoid ${mustAvoid}`, "Lodging, places, and expenses": `${stayOptions.length} stays; ${venues.length} places; $${expenseTotal} planned` },
    });
    downloadMarkdown("bachelorette-blueprint-customization-kit.md", markdown);
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


  if (loading) return <main className="rally-loading">Gathering your Rally…</main>;
  const nav = ["plan", "setup", "guests", "money", "stay", "destination", "packing", "chat"] as const;
  const labels: Record<string, string> = { plan: "Your weekend", setup: "Trip details", guests: "Guests", money: "Budget & bills", stay: "Stay", destination: "Explore & book", packing: "Packing", chat: "Notes & sharing" };
  const owners = guests.length ? guests : firstGuests;

  return <main className="rally-room bach-room">
    <header className="rally-header photo-rally-header bach-header"><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div className="rally-header-copy"><small>BACHELORETTE BLUEPRINT</small><h1>{partyName}</h1><p>The people, plans and split bills—all in one place.</p></div><figure className="rally-cover"><img src="/rallies/bachelorette-pool.jpg" alt="Friends relaxing together beside a sunny pool"/><figcaption><b>Free Rally</b><span>Plan here; review before you send or book</span></figcaption></figure><div className="rally-header-actions" hidden={!workspaceReady}>{authState === "guest" ? <button className="primary" onClick={() => keepThisRally()}>Sign in to save</button> : <button className="primary" onClick={save}>{saved ? "Saved ✓" : "Save Rally"}</button>}</div></header>
    {authState === "guest" && <div className="guest-preview-note"><span>Free to use. No account needed to start. Unsaved work stays here until you leave or refresh.</span></div>}
    {saveError && <p role="alert" className="trip-notice">{saveError}</p>}
    {!workspaceReady && <AgenticPlanner onApply={applyItinerary}/>}
    {workspaceReady && <>
    <nav className="rally-nav">{nav.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setNotice(""); }}>{labels[item]}</button>)}</nav>
    {notice && <p role="status" className="trip-notice">{notice}</p>}


    {tab === "destination" && <TripTools key={city} city={city} start={startDate} end={endDate} count={guests.filter(g => g.rsvp !== "No").length} onCity={setCity} onDates={(start, end) => { setStartDate(start); setEndDate(end); }} onAdd={(name, url, category) => { setVenues(items => items.some(v => v.name === name && v.url === url) ? items : [...items, { id: crypto.randomUUID(), name, url, category, status: "Considering" }]); setNotice(`${name} saved. Your shortlist is below.`); }} onPack={items => { setPacking(current => [...new Set([...current, ...items])]); setTab("packing"); setNotice("Added to your packing list. Edit or remove anything here."); }} onPlaces={() => document.getElementById("saved-places")?.scrollIntoView({ behavior: "smooth" })} onPacking={() => setTab("packing")} onEditDetails={() => setTab("setup")}/>}
    {tab === "setup" && <section className="rally-content"><div className="workspace-intro"><div><small>PARTY BRIEF</small><h2>Tell the app who she is.</h2><p>The plan should feel like the bride—not a generic checklist wearing a sash.</p></div><div className="workspace-stamp"><b>{vibe}</b><span>{city}</span></div></div><div className="setup-grid"><label>Bride’s name<input value={brideName} onChange={(e) => setBrideName(e.target.value)} /></label><label>Destination<input list="bach-destinations" value={city} onChange={(e) => setCity(e.target.value)} /><datalist id="bach-destinations">{destinations.map(d => <option key={d.id} value={`${d.name}, ${d.state}`}/>)}</datalist></label><label>Arrival date<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label><label>Departure date<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label><label>Weekend energy<select value={vibe} onChange={(e) => setVibe(e.target.value)}>{Object.keys(vibePlans).map((name) => <option key={name}>{name}</option>)}</select></label><label>Working budget per person<input type="number" min="0" value={perPerson} onChange={(e) => setPerPerson(Number(e.target.value))} /></label><label className="full-field">What is the bride actually like?<textarea value={brideTraits} onChange={(e) => setBrideTraits(e.target.value)} /></label><label className="full-field">Hard no’s, boundaries, and accessibility needs<textarea value={mustAvoid} onChange={(e) => setMustAvoid(e.target.value)} /></label></div><button className="primary" onClick={() => setTab("plan")}>Back to your weekend →</button></section>}

    {tab === "guests" && <section className="rally-content"><div className="rally-title"><div><small>GUESTS + RSVP</small><h2>Everyone, accounted for.</h2></div><button onClick={() => setGuests([...guests, { id: crypto.randomUUID(), name: "New guest", contact: "", rsvp: "Maybe", paid: 0, needs: "" }])}>+ Add guest</button></div><div className="rally-table"><div className="rally-row labels"><span>Name</span><span>Email or phone</span><span>RSVP</span><span>Needs</span><span></span></div>{guests.map((guest, index) => <div className="rally-row" key={guest.id}><input value={guest.name} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}/><input value={guest.contact} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, contact: e.target.value } : item))}/><select value={guest.rsvp} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, rsvp: e.target.value as Guest["rsvp"] } : item))}><option>Yes</option><option>Maybe</option><option>No</option></select><input placeholder="Dietary, access, room…" value={guest.needs} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, needs: e.target.value } : item))}/><button aria-label={`Remove ${guest.name}`} onClick={() => setGuests(guests.filter((item) => item.id !== guest.id))}>×</button></div>)}</div><div className="invite-box"><b>Invite message</b><p>Join {partyName} in {city}. Please confirm your RSVP, budget comfort, dietary needs, accessibility needs, and room preferences.</p><div className="rally-actions"><a href={`mailto:?subject=${encodeURIComponent(partyName)}&body=${encodeURIComponent(`Join ${partyName} in ${city}. Please reply with your RSVP, budget comfort, dietary needs, accessibility needs, and room preferences.`)}`}>Email invite</a><a href={`sms:?&body=${encodeURIComponent(`Join ${partyName} in ${city}. Please reply with your RSVP and any budget, dietary, accessibility, or room needs.`)}`}>Text invite</a></div><small>Private multi-user invite links are the next access milestone. Email and text actions work now.</small></div></section>}

    {tab === "stay" && <section className="rally-content"><div className="workspace-intro"><div><small>STAY</small><h2>Pick a place everyone can afford.</h2><p>Collect the comfort number before anyone falls in love with a house. Use the lowest stated comfort amount as the equal-share ceiling, so no one is priced out.</p></div><button onClick={() => setStayOptions([...stayOptions, { id: crypto.randomUUID(), name: "New stay", kind: "Hotel", total: 0, bedrooms: stayBedrooms, cancellation: "Check before booking", url: "", status: "Considering" }])}>+ Add a stay</button></div><div className="stay-planner-grid"><article className="budget-pulse"><small>BUDGET COMFORT CHECK</small><h3>What can each person comfortably contribute to lodging?</h3><p>Amounts have no names attached, but are visible to anyone using this organizer workspace.</p><form onSubmit={(event) => { event.preventDefault(); if (budgetDraft <= 0) return; setBudgetResponses([...budgetResponses, budgetDraft]); setBudgetDraft(450); }}><label>My maximum lodging share<div><span>$</span><input aria-label="Anonymous maximum lodging contribution" type="number" min="1" value={budgetDraft} onChange={(event) => setBudgetDraft(Number(event.target.value))}/></div></label><button className="primary">Add budget amount</button></form><div className="anonymous-responses">{budgetResponses.length ? budgetResponses.map((amount, index) => <span key={`${amount}-${index}`}><b>Anonymous {index + 1}</b>${amount.toLocaleString()}<button aria-label={`Remove anonymous response ${index + 1}`} onClick={() => setBudgetResponses(budgetResponses.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>) : <em>No responses yet. Pass this screen around or privately record each reply.</em>}</div><p className="privacy-note">This free private preview keeps anonymous amounts inside the organizer’s workspace. A shareable guest link is the next access step.</p></article><article className="stay-guardrails"><small>SEARCH GUARDRAILS</small><h3>Your lodging ceiling</h3><div className="stay-math"><span><b>${lodgingCeiling.toLocaleString()}</b>total stay</span><span><b>${lodgingPerNight.toLocaleString()}</b>per night</span><span><b>{budgetResponses.length || "—"}</b>anonymous replies</span><span><b>{medianContribution ? `$${medianContribution.toLocaleString()}` : "—"}</b>median share</span></div><label>Organizer’s absolute high end $<input type="number" min="0" value={stayBudgetHigh} onChange={(event) => setStayBudgetHigh(Number(event.target.value))}/></label><div className="stay-fields"><label>Nights<input type="number" min="1" value={stayNights} onChange={(event) => setStayNights(Number(event.target.value))}/></label><label>Bedrooms<input type="number" min="1" value={stayBedrooms} onChange={(event) => setStayBedrooms(Number(event.target.value))}/></label></div><label>Must-haves<textarea value={stayMustHaves} onChange={(event) => setStayMustHaves(event.target.value)}/></label><small className="math-note">Ceiling = the lower of the organizer’s high end or lowest comfort × replies. Confirm everyone has replied.</small></article></div><div className="stay-search-grid">{[{ name: "Hotels", note: "Compare current hotel rates and locations", url: `https://www.google.com/travel/search?q=${encodeURIComponent(`hotels in ${city}`)}` }, { name: "Airbnb", note: "Search whole homes for the group", url: `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?checkin=${startDate}&checkout=${endDate}&adults=${Math.max(1, confirmed)}` }, { name: "VRBO", note: "Compare vacation rentals and policies", url: `https://www.vrbo.com/searchResults.html?destination=${encodeURIComponent(city)}&startDate=${startDate}&endDate=${endDate}` }].map((provider) => <a key={provider.name} href={provider.url} target="_blank" rel="noreferrer"><small>LIVE SEARCH</small><b>{provider.name} ↗</b><span>{provider.note}</span><em>Use up to ${lodgingCeiling.toLocaleString()} total · {stayBedrooms} bedrooms</em></a>)}</div><div className="rally-title compact"><div><small>SHORTLIST</small><h3>Compare the real options</h3></div></div><div className="stay-shortlist">{stayOptions.length ? stayOptions.map((option, index) => <article key={option.id}><input aria-label="Stay name" value={option.name} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))}/><select aria-label="Stay type" value={option.kind} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.target.value as StayOption["kind"] } : item))}><option>Hotel</option><option>Airbnb</option><option>VRBO</option><option>Other</option></select><label>Total $<input type="number" min="0" value={option.total} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, total: Number(event.target.value) } : item))}/></label><label>Bedrooms<input type="number" min="0" value={option.bedrooms} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, bedrooms: Number(event.target.value) } : item))}/></label><input aria-label="Cancellation terms" placeholder="Cancellation terms" value={option.cancellation} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, cancellation: event.target.value } : item))}/><input aria-label="Booking link" type="url" placeholder="Booking link" value={option.url} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))}/><select aria-label="Stay status" value={option.status} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, status: event.target.value as StayOption["status"] } : item))}><option>Considering</option><option>Top choice</option><option>Booked</option></select><div className="stay-option-actions"><span>{confirmed && option.total ? `$${Math.ceil(option.total / confirmed).toLocaleString()} each` : "Add total to compare"}</span>{option.url && <a href={option.url} target="_blank" rel="noreferrer">Open ↗</a>}<button aria-label={`Remove ${option.name}`} onClick={() => setStayOptions(stayOptions.filter((item) => item.id !== option.id))}>×</button></div></article>) : <p className="empty-state">Search live listings above, then add the real options here to compare them side by side.</p>}</div><p className="confidence-note">Pep Rally does not receive private budget answers from lodging sites or book on your behalf. Provider availability, fees, rules, and cancellation terms remain the source of truth.</p></section>}

    {tab === "chat" && <section className="rally-content"><div className="workspace-intro"><div><small>ORGANIZER NOTES</small><h2>Keep the decisions together.</h2><p>This is your private notes log. Notes are included in the plan download; send group messages through your usual chat app.</p></div></div><div className="chat-room"><div className="chat-list">{messages.map((message) => <article key={message.id}><div><b>{message.sender}</b><small>{message.time}</small></div><p>{message.body}</p></article>)}</div><form onSubmit={(e) => { e.preventDefault(); if (!messageDraft.trim()) return; setMessages([...messages, { id: crypto.randomUUID(), sender: guests[0]?.name || "Organizer", body: messageDraft.trim(), time: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }]); setMessageDraft(""); }}><input aria-label="Write a message" value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} placeholder="Post an update or decision…"/><button className="primary">Add note</button></form></div></section>}

    {tab === "money" && <section className="rally-content"><div className="workspace-intro"><div><small>MONEY</small><h2>Collect it. Track it. Reconcile it.</h2><p>Pep Rally tracks balances; the selected payment provider moves the funds securely.</p></div><label>Share per person<input type="number" min="0" value={perPerson} onChange={(e) => setPerPerson(Number(e.target.value))}/></label></div><div className="money-strip"><span>Group budget <b>${groupBudget.toLocaleString()}</b></span><span>Collected <b>${collected.toLocaleString()}</b></span><span>Outstanding <b>${outstanding.toLocaleString()}</b></span><span>Planned expenses <b>${expenseTotal.toLocaleString()}</b></span></div><div className="payment-connect"><div><label>Provider<select value={paymentProvider} onChange={(e) => setPaymentProvider(e.target.value)}><option>PayPal.Me</option><option>Cash App</option><option>Venmo</option><option>Other link</option></select></label><label>{paymentProvider === "Other link" || paymentProvider === "Stripe" ? "Payment link" : "Organizer handle"}<input value={paymentProvider === "Other link" || paymentProvider === "Stripe" ? paymentLink : paymentHandle} onChange={(e) => paymentProvider === "Other link" || paymentProvider === "Stripe" ? setPaymentLink(e.target.value) : setPaymentHandle(e.target.value)} placeholder={paymentProvider === "PayPal.Me" ? "paypal.me name" : paymentProvider === "Cash App" ? "$cashtag" : paymentProvider === "Venmo" ? "@username" : "https://…"}/></label></div><div>{paymentProvider === "Stripe" ? <span>Use a payment link owned by the actual recipient.</span> : paymentProvider !== "Other link" && <button onClick={makeProviderLink}>Make request link</button>}{paymentLink && <a href={paymentLink} target="_blank" rel="noreferrer">Open payment request ↗</a>}</div><small>{paymentStatus || "Provider accounts and their terms apply. Mark payments received in the ledger below."}</small></div><div className="balance-list">{guests.map((guest, index) => <article key={guest.id}><div><b>{guest.name}</b><small>${Math.max(0, perPerson - guest.paid).toLocaleString()} remaining</small></div><label>Paid $<input type="number" min="0" max={perPerson} value={guest.paid} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, paid: Number(e.target.value) } : item))}/></label><div className="balance-meter"><i style={{ width: `${perPerson ? Math.min(100, guest.paid / perPerson * 100) : 0}%` }}/></div></article>)}</div><div className="rally-title compact"><div><small>EXPENSE PLAN</small><h3>What the group budget covers</h3></div><button onClick={() => setExpenses([...expenses, { id: crypto.randomUUID(), label: "New expense", amount: 0, paidBy: owners[0].name }])}>+ Add expense</button></div><div className="expense-list">{expenses.map((expense, index) => <div key={expense.id}><input value={expense.label} onChange={(e) => setExpenses(expenses.map((item, i) => i === index ? { ...item, label: e.target.value } : item))}/><label>$ <input type="number" value={expense.amount} onChange={(e) => setExpenses(expenses.map((item, i) => i === index ? { ...item, amount: Number(e.target.value) } : item))}/></label><select value={expense.paidBy} onChange={(e) => setExpenses(expenses.map((item, i) => i === index ? { ...item, paidBy: e.target.value } : item))}>{owners.map((guest) => <option key={guest.id}>{guest.name}</option>)}</select><button onClick={() => setExpenses(expenses.filter((item) => item.id !== expense.id))}>×</button></div>)}</div><BillSplitter guests={guests} bills={bills} onChange={setBills}/></section>}

    {tab === "plan" && <section className="rally-content"><div className="workspace-intro"><div><small>ITINERARY</small><h2>{events.length ? `${vibe}, with breathing room.` : "Generate a plan from the brief."}</h2><p>Your draft is ready. Rename guests, choose actual places and adjust these suggestions to fit the group.</p></div><div className="rally-actions"><button onClick={() => setEvents([...events, { id: crypto.randomUUID(), day: 1, time: "12:00 PM", title: "", owner: owners[0].name, status: "Idea" }])}>+ Add your own activity</button><button onClick={() => setTab("destination")}>Explore places →</button></div></div><div className="event-list rich-events">{events.map((event, index) => <article key={event.id}><label>Day<input type="number" min="1" max="32" value={event.day} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, day: Number(e.target.value) } : item))}/></label><label>Time<input value={event.time} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, time: e.target.value } : item))}/></label><input aria-label="Activity name" placeholder="Your activity" className="event-name" value={event.title} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, title: e.target.value } : item))}/><select value={event.owner} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, owner: e.target.value } : item))}>{owners.map((guest) => <option key={guest.id}>{guest.name}</option>)}</select><select value={event.status} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, status: e.target.value as Event["status"] } : item))}><option>Idea</option><option>Shortlisted</option><option>Booked</option></select>{event.bookingUrl && <a href={event.bookingUrl} target="_blank" rel="noreferrer">Venue ↗</a>}<button aria-label={`Remove ${event.title || "activity"}`} onClick={() => setEvents(events.filter((item) => item.id !== event.id))}>×</button></article>)}</div></section>}

    {tab === "destination" && <section className="rally-content" id="saved-places"><div className="workspace-intro"><div><small>PLACES + RESERVATIONS</small><h2>Your saved places.</h2><p>Add your own venue or keep an idea from above. Once you choose it, add it to your itinerary.</p></div><button onClick={() => setVenues([...venues, { id: crypto.randomUUID(), name: "New venue", category: "Dinner", url: "", status: "Considering" }])}>+ Add venue</button></div><div className="venue-list">{venues.length ? venues.map((venue, index) => <article key={venue.id}><input aria-label="Place name" value={venue.name} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}/><input aria-label="Place category" value={venue.category} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, category: e.target.value } : item))}/><input type="url" placeholder="Booking or venue URL" value={venue.url} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, url: e.target.value } : item))}/><select value={venue.status} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, status: e.target.value as Venue["status"] } : item))}><option>Considering</option><option>Contacted</option><option>Reserved</option></select><button onClick={() => { if (events.some(e => e.title.trim().toLowerCase() === venue.name.trim().toLowerCase())) setEvents(events.map(e => e.title.trim().toLowerCase() === venue.name.trim().toLowerCase() ? { ...e, bookingUrl: venue.url, status: venue.status === "Reserved" ? "Booked" : "Shortlisted" } : e)); else setEvents([...events, { id: crypto.randomUUID(), day: 1, time: "Time TBD", title: venue.name, bookingUrl: venue.url, owner: owners[0].name, status: venue.status === "Reserved" ? "Booked" : "Shortlisted" }]); setTab("plan"); setNotice(`${venue.name} added. Set the day and time below.`); }}>Add to itinerary</button>{venue.url ? <a href={venue.url} target="_blank" rel="noreferrer">Open ↗</a> : <span></span>}<button onClick={() => setVenues(venues.filter((item) => item.id !== venue.id))}>×</button></article>) : <p className="empty-state">No venues saved yet. Search above, then add the actual choice here.</p>}</div><p className="confidence-note">Direct booking inside Pep Rally requires an approved reservation-platform partnership. These links open the live provider so availability and policies remain current.</p></section>}

    {tab === "packing" && <details className="rally-content optional-shopping"><summary>Optional décor & shopping</summary><div className="workspace-intro"><div><small>SHOPPING</small><h2>Find optional decorations and favors.</h2><p>Destination planning holds the schedule and places. This tab is only for optional décor, favors and shopping.</p></div></div><div className="decor-board"><article><small>KEEP IT EDITABLE</small><h3>Choose one visual direction</h3><p>Use the bride’s vibe as a filter, then save only what supports the location, budget and group.</p></article><article><small>BUY LESS</small><ul><li>One welcome sign or printable</li><li>Reusable cups or name markers</li><li>A photo moment that fits the location</li><li>Useful welcome-bag items</li><li>Nothing the bride explicitly hates</li></ul></article></div><div className="store-grid">{storeSearches.map((store) => <a key={store.name} href={store.url} target="_blank" rel="noreferrer"><b>{store.name} ↗</b><span>{store.note}</span><small>Non-affiliate search for now</small></a>)}</div></details>}

    {tab === "plan" && <details className="rally-content"><summary>Planning checklist</summary><div className="rally-title"><div><small>TASKS</small><h2>No invisible labor.</h2></div><button onClick={() => setTasks([...tasks, { id: crypto.randomUUID(), text: "New task", owner: owners[0].name, done: false, due: "This week" }])}>+ Add task</button></div><div className="task-list">{tasks.map((task, index) => <article className={task.done ? "done" : ""} key={task.id}><button className="check" onClick={() => setTasks(tasks.map((item, i) => i === index ? { ...item, done: !item.done } : item))}>{task.done ? "✓" : ""}</button><input value={task.text} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, text: e.target.value } : item))}/><select value={task.owner} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, owner: e.target.value } : item))}>{owners.map((guest) => <option key={guest.id}>{guest.name}</option>)}</select><input value={task.due} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, due: e.target.value } : item))}/><button onClick={() => setTasks(tasks.filter((item) => item.id !== task.id))}>×</button></article>)}</div></details>}

    {tab === "packing" && <PackingSection packing={packing} packedItems={packedItems} onPacked={setPackedItems} onChange={setPacking} title={partyName} subtitle={`${city} · ${startDate} to ${endDate}`}/>}
    {(tab === "plan" || tab === "chat") && <details className="rally-content"><summary>Download & customize</summary><p>Take your plan with you, or download prompts to customize it in another AI tool.</p><div className="rally-actions"><button onClick={downloadOutcome}>Download my plan .md</button><button onClick={downloadCustomization}>Customize this Rally .md</button></div></details>}
    </>}
  </main>;
}
