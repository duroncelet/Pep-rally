"use client";

import { useEffect, useMemo, useState } from "react";
import { downloadMarkdown, markdownCell, safeFileName } from "../../download-markdown";
import { buildCustomizationKit } from "../../customization-kit";
import {readBrowserDraft,useBrowserDraft} from "../../browser-draft";
import OutcomePreview from "../../OutcomePreview";
import type {OutcomeDocument} from "../../outcome-document";
import { downloadOutcomePdf } from "../../download-pdf";
import AgenticPlanner from "./AgenticPlanner";
import SavedDraft from "./SavedDraft";
import MoneySummary from "./MoneySummary";
import TripTools, { BillSplitter } from "./TripTools";
import GeoInput from "./GeoInput";
import Suggestions from "./Suggestions";
import { destinationFor, settleBills, type SharedBill } from "./destinations";
import { unpickedSuggestions, type ResolvedPlace, type Suggestion } from "./planner";
import OrderList from "./OrderList";
import { analyzeItinerary, type EventRequirement } from "./schedule";
import { localShoppingLinks, type OrderItem } from "./shopping";
import Deposits from "./Deposits";
import DatePoll from "./DatePoll";
import RoomPlan from "./RoomPlan";
import { BRIDE_SHARE_LABELS, depositStatus, perPersonQuote, sharedCostPayers, type BrideShareRule, type DatePoll as DatePollData, type DepositRequest, type RoomAssignment } from "./money";
import { tripTotals } from "./budget";
import type { ItineraryArtifact } from "../../agentic/rally-runtime";

type Guest = { id: string; name: string; contact: string; rsvp: "Yes" | "Maybe" | "No"; paid: number; needs: string };
type Task = { id: string; text: string; owner: string; done: boolean; due: string };
type Expense = { id: string; label: string; amount: number; paidBy: string };
type Event = { id: string; day: number; time: string; title: string; owner: string; bookingUrl?: string; note?:string; estimatedCost?:number; status: "Idea" | "Shortlisted" | "Booked"; required?: EventRequirement };
type Message = { id: string; sender: string; body: string; time: string };
type Venue = { id: string; name: string; category: string; url: string; status: "Considering" | "Contacted" | "Reserved" };
type StayOption = { id: string; name: string; kind: "Hotel" | "Airbnb" | "VRBO" | "Other"; total: number; bedrooms: number; cancellation: string; url: string; status: "Considering" | "Top choice" | "Booked" };
type HouseHub = { wifi: string; doorCode: string; checkIn: string; checkOut: string; propertyManager: string; flightsNote: string; uberPlan: string };
const emptyHouseHub: HouseHub = { wifi: "", doorCode: "", checkIn: "", checkOut: "", propertyManager: "", flightsNote: "", uberPlan: "" };

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
  const [plannerMode, setPlannerMode] = useState<"organizer" | "bride">("organizer");
  const [groupSignedUp, setGroupSignedUp] = useState("");
  const [brideEnvisions, setBrideEnvisions] = useState("");
  const [houseHub, setHouseHub] = useState<HouseHub>(emptyHouseHub);
  const [orderList, setOrderList] = useState<OrderItem[]>([]);
  const [guests, setGuests] = useState(firstGuests);
  const [tasks, setTasks] = useState(firstTasks);
  const [expenses, setExpenses] = useState(firstExpenses);
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [place, setPlace] = useState<ResolvedPlace | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [packing, setPacking] = useState<string[]>([]);
  const [perPerson, setPerPerson] = useState(450);
  const [contributionTarget, setContributionTarget] = useState(0);
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
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [brideShare, setBrideShare] = useState<BrideShareRule>("group-covers");
  const [datePoll, setDatePoll] = useState<DatePollData>({ options: [], votes: {} });
  const [rooms, setRooms] = useState<RoomAssignment[]>([]);
  const [fundHolder,setFundHolder]=useState("");
  const [bills, setBills] = useState<SharedBill[]>([]);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<"checking" | "guest" | "signed-in">("checking");
  const [signInPath, setSignInPath] = useState("/sign-in?redirect_url=%2Frally%2Fbachelorette");

  const [draftOwner,setDraftOwner]=useState("");
  const [shareBalances,setShareBalances]=useState(false);
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
      setDraftOwner(data.ownerId || "guest");
      const recovery=readBrowserDraft("bachelorette",data.ownerId || "guest",data.updatedAt);
      const plan = pending ? JSON.parse(pending) : recovery || data.plan;
      if (pending) setNotice("Your draft is restored. Save Rally to keep these changes in your account.");
      if (plan) { setWorkspaceReady(true); setPackedItems(plan.packedItems || []); }
      if (plan?.version === 7 || plan?.version === 6 || plan?.version === 5 || plan?.version === 4 || plan?.version === 3) {
        setContributionTarget(plan.contributionTarget ?? 0); setBrideName(plan.brideName); setCity(plan.city); setStartDate(plan.startDate); setEndDate(plan.endDate); setVibe(plan.vibe); setBrideTraits(plan.brideTraits); setMustAvoid(plan.mustAvoid);
        setGuests(plan.guests); setTasks(plan.tasks); setExpenses(plan.expenses); setEvents(plan.events); setVenues(plan.venues); setMessages(plan.messages); setPacking(plan.packing); setPerPerson(plan.perPerson);
        setPaymentProvider(plan.paymentProvider); setPaymentHandle(plan.paymentHandle); setPaymentLink(plan.paymentLink);
        if (plan.version >= 4) {
          setBills(plan.bills ?? []); setFundHolder(plan.fundHolder || "");
          setStayBudgetHigh(plan.stayBudgetHigh ?? 4000); setStayNights(plan.stayNights ?? 3); setStayBedrooms(plan.stayBedrooms ?? 3); setStayMustHaves(plan.stayMustHaves ?? "");
          setBudgetResponses(plan.budgetResponses ?? []); setStayOptions(plan.stayOptions ?? []);
        }
        if (plan.version >= 7) {
          setPlace(plan.place || null); setSuggestions(plan.suggestions || []);
          setPlannerMode(plan.plannerMode === "bride" ? "bride" : "organizer"); setGroupSignedUp(plan.groupSignedUp || ""); setBrideEnvisions(plan.brideEnvisions || "");
          setHouseHub({ ...emptyHouseHub, ...(plan.houseHub || {}) }); setOrderList(plan.orderList || []);
          setEvents((plan.events || []).map((e: Event) => ({ ...e, required: e.required || "required" as const })));
          setDeposits(plan.deposits || []); setBrideShare(plan.brideShare || "group-covers");
          setDatePoll(plan.datePoll || { options: [], votes: {} }); setRooms(plan.rooms || []);
        }
      } else if (plan?.version === 2) {
        setGuests(plan.guests); setTasks(plan.tasks.map((task: Task) => ({ ...task, due: task.due || "This week" }))); setExpenses(plan.expenses); setEvents(plan.events.map((event: Event) => ({ ...event, status: event.status || "Idea" }))); setPacking(plan.packing); setPerPerson(plan.perPerson); setPaymentLink(plan.paymentLink || "");
      }
      setLoading(false);
      } catch { setAuthState("guest"); setLoading(false); setSaveError("Your saved plan could not load. Refresh before editing an existing plan."); }
    })();
  }, []);

  const partyName = `${brideName === "The bride" ? "The Bachelorette" : `${brideName}’s Bachelorette`}`;
  const { groupBudget, participantCount, collected, outstanding } = tripTotals(guests, perPerson, contributionTarget);
  const expenseTotal = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const confirmed = guests.filter((guest) => guest.rsvp === "Yes").length;
  const decisionsNeeded = tasks.filter((task) => !task.done).length + venues.filter((venue) => venue.status !== "Reserved").length;
  const configured = brideName !== "The bride" || Boolean(startDate) || guests.length > 1;
  const updateText = configured ? `${partyName} update: ${city}, ${startDate || "dates coming soon"}. The estimated spending limit is ${perPerson} per person; the agreed contribution request is ${contributionTarget}. ${outstanding ? `$${outstanding.toLocaleString()} is still outstanding across the group.` : "No requested contributions remain. Paid bills are tracked separately."}` : "Set up the bride, dates, and guest list to create a group update.";
  const sortedBudgetResponses = [...budgetResponses].sort((a, b) => a - b);
  const medianContribution = sortedBudgetResponses.length ? sortedBudgetResponses.length % 2 ? sortedBudgetResponses[Math.floor(sortedBudgetResponses.length / 2)] : Math.round((sortedBudgetResponses[sortedBudgetResponses.length / 2 - 1] + sortedBudgetResponses[sortedBudgetResponses.length / 2]) / 2) : 0;
  const lodgingCeiling = Math.min(groupBudget, stayBudgetHigh, ...(budgetResponses.length ? [Math.min(...budgetResponses) * budgetResponses.length] : []));
  const lodgingPerNight = stayNights ? Math.round(lodgingCeiling / stayNights) : lodgingCeiling;
  const scheduleWarnings = analyzeItinerary(events);
  const brideGuestId = guests.find((g) => g.name.trim().toLowerCase() === brideName.trim().toLowerCase())?.id || null;
  const activeGuestIds = guests.filter((g) => g.rsvp !== "No").map((g) => g.id);
  const defaultPayerIds = sharedCostPayers(brideShare, activeGuestIds, brideGuestId);
  const anyDepositCollected = deposits.some((d) => depositStatus(d, new Date().toISOString().slice(0, 10)) === "collected");
  const sharedQuote = perPersonQuote(expenseTotal, defaultPayerIds.length);

  const storeSearches = useMemo(() => {
    const query = encodeURIComponent(`${vibe} bachelorette ${city.split(",")[0]} decorations`);
    return [
      { name: "Etsy", note: "Creator-made décor, favors, and editable printables", url: `https://www.etsy.com/search?q=${query}` },
      { name: "Amazon", note: "Fast-shipping basics and group supplies", url: `https://www.amazon.com/s?k=${query}` },
      { name: "Google Shopping", note: "Compare options across stores", url: `https://www.google.com/search?tbm=shop&q=${query}` },
    ];
  }, [vibe, city]);

  function snapshot() { return { version: 7, fundHolder, contributionTarget, packedItems, bills, brideName, city, place, suggestions, startDate, endDate, vibe, brideTraits, mustAvoid, plannerMode, groupSignedUp, brideEnvisions, houseHub, orderList, deposits, brideShare, datePoll, rooms, guests, tasks, expenses, events, venues, messages, packing, perPerson, paymentProvider, paymentHandle, paymentLink, stayBudgetHigh, stayNights, stayBedrooms, stayMustHaves, budgetResponses, stayOptions }; }
  const backup=useBrowserDraft("bachelorette",draftOwner,snapshot(),!loading&&workspaceReady);
  const guestName=(id:string)=>guests.find(g=>g.id===id)?.name||"Former guest";
  const weekendDocument:OutcomeDocument={title:partyName,subtitle:`${city} · ${startDate||"Dates to confirm"} — ${endDate}`,sections:[
    {heading:"The weekend",columns:["Day","Time","Plan","Est. each (USD)","Status"],rows:[...events].sort((a,b)=>a.day-b.day).map(e=>[`Day ${e.day}`,e.time,e.title+(e.note ? ` — ${e.note}` : ""),e.estimatedCost ? `$${e.estimatedCost.toFixed(2)}` : "—",e.status])},
    {heading:"Stay shortlist",paragraphs:stayOptions.length?stayOptions.map(s=>`${s.name} · ${s.status} · $${s.total.toFixed(2)} USD total · ${s.url}\n${s.cancellation}`):["No stay chosen yet. The organizer will share confirmed details."]},
    {heading:"Packing",paragraphs:packing.length?packing.map(p=>"☐ "+p):["Packing list coming soon."]},
    ...(shareBalances?[{heading:"Suggested repayments",paragraphs:[...settleBills(bills, fundHolder ? guests.filter(g=>g.id!==fundHolder&&g.paid>0).map(g=>({from:g.id,to:fundHolder,cents:Math.round(g.paid*100)})):[]).map(s=>`${guestName(s.from)} pays ${guestName(s.to)} $${(s.cents/100).toFixed(2)} USD`),"These are calculated suggestions, not bank confirmations. Recorded contributions are included only when a fund holder has been selected."]}]:[]),
  ]};
  const packetDocument:OutcomeDocument={...weekendDocument,sections:[
    {heading:"Weekend brief",paragraphs:[`Destination: ${city}. Dates: ${startDate || "To be decided"} to ${endDate || "To be decided"}.`, `Vibe: ${vibe}. Bride: ${brideTraits || "Not recorded"}. Needs and hard no's: ${mustAvoid || "Not recorded"}.`]},
    ...weekendDocument.sections.slice(0,2),
    {heading:"Budget and contributions",paragraphs:[`Estimated spending limit per person: $${perPerson.toFixed(2)}. Working group budget: $${groupBudget.toFixed(2)}.`, `Agreed contribution per person: $${contributionTarget.toFixed(2)}. Recorded: $${collected.toFixed(2)}. Requested contributions remaining: $${outstanding.toFixed(2)}.`, `Planned expenses: $${expenseTotal.toFixed(2)}. These are organizer records, not payment confirmations.`],columns:["Expense","Amount (USD)","Paid by"],rows:expenses.map(e=>[e.label,`$${Number(e.amount||0).toFixed(2)}`,e.paidBy])},
    {heading:"Bill split suggestions",paragraphs:[...settleBills(bills,fundHolder?guests.filter(g=>g.id!==fundHolder&&g.paid>0).map(g=>({from:g.id,to:fundHolder,cents:Math.round(g.paid*100)})):[]).map(s=>`${guestName(s.from)} pays ${guestName(s.to)} $${(s.cents/100).toFixed(2)} USD`),"Calculated suggestions only. Confirm each bill and payment with the group before settling."]},
    {heading:"Group and RSVP",columns:["Guest","RSVP"],rows:guests.map(g=>[g.name,g.rsvp])},
    {heading:"Packing list",paragraphs:packing.length?packing.map(p=>`${packedItems.includes(p)?"Packed":"To pack"}: ${p}`):["No packing items yet."]},
    {heading:"Before you send or book",paragraphs:["Confirm dates, actual availability, total prices, accessibility, cancellation policies, and each person's consent. No booking or transfer is made by this packet."]},
  ]};
  async function downloadPacket(){try{await downloadOutcomePdf(packetDocument);}catch(e){setNotice((e as Error).message);}}
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
    setCity(answers.city); setVibe(answers.vibe); setPerPerson(artifact.totalPerPerson); setStayBudgetHigh(Math.round(artifact.totalPerPerson * Number(answers.headcount) * .4));
    const dayCount = Math.max(1, Math.min(32, 1 + Math.round((Date.parse(answers.endDate) - Date.parse(answers.startDate)) / 86400000)));
    const days = dayCount === 1 ? [artifact.days[1]] : dayCount === 2
      ? [artifact.days[0], { ...artifact.days[1], items: [...artifact.days[1].items, { time: "Time TBD", title: "Departures", note: "", estimatedCost: 0 }] }]
      : [artifact.days[0], artifact.days[1], ...Array.from({ length: dayCount - 3 }, () => ({ label: "Open day", items: [{ time: "Flexible", title: "Free time — add an activity if you like", note: "", estimatedCost: 0 }] })), artifact.days[2]];
    setEvents(days.flatMap((day, dayIndex) => day.items.map(item => ({ id: crypto.randomUUID(), day: dayIndex + 1, time: item.time, title: item.title, note:item.note, estimatedCost:item.estimatedCost, owner: guests[0]?.name || "Organizer", status: "Idea" as const }))));
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
    const markdown = `# ${partyName}\n\n> A working Bachelorette plan made with Pep Rally. Review bookings, balances, accessibility needs, and provider policies before sending or paying.\n\n## Weekend brief\n\n- **Destination:** ${markdownCell(city)}\n- **Dates:** ${markdownCell(startDate || "To be decided")} to ${markdownCell(endDate || "To be decided")}\n- **Vibe:** ${markdownCell(vibe)}\n- **The bride:** ${markdownCell(brideTraits)}\n- **Hard no's / needs:** ${markdownCell(mustAvoid)}\n\n## Money snapshot\n\n- **Estimated spending limit per person:** $${perPerson.toLocaleString()}\n- **Working group budget:** $${groupBudget.toLocaleString()}\n- **Agreed contribution per person:** ${contributionTarget.toLocaleString()}\n\n- **Contributions recorded:** ${collected.toLocaleString()}\n- **Requested contributions remaining:** $${outstanding.toLocaleString()}\n- **Planned expenses:** $${expenseTotal.toLocaleString()}\n- **Payment option:** ${markdownCell(paymentLink || `${paymentProvider}${paymentHandle ? ` · ${paymentHandle}` : " · not connected"}`)}\n\n## Guests\n\n| Guest | RSVP | Paid | Needs |\n|---|---|---:|---|\n${guests.map((guest) => `| ${markdownCell(guest.name)} | ${guest.rsvp} | $${guest.paid.toLocaleString()} | ${markdownCell(guest.needs)} |`).join("\n")}\n\n## Lodging guardrail\n\n- **Comfort responses:** ${budgetResponses.length || "None yet"}\n- **Median comfortable share:** ${medianContribution ? `$${medianContribution.toLocaleString()}` : "Not calculated"}\n- **Total lodging ceiling:** $${lodgingCeiling.toLocaleString()}\n- **Nights / bedrooms:** ${stayNights} nights · ${stayBedrooms} bedrooms\n- **Must-haves:** ${markdownCell(stayMustHaves)}\n\n| Stay | Type | Total | Bedrooms | Status | Link |\n|---|---|---:|---:|---|---|\n${stayOptions.length ? stayOptions.map((stay) => `| ${markdownCell(stay.name)} | ${stay.kind} | $${stay.total.toLocaleString()} | ${stay.bedrooms} | ${stay.status} | ${markdownCell(stay.url)} |`).join("\n") : "| No stays shortlisted yet | — | — | — | — | — |"}\n\n## Deposits

${deposits.length ? deposits.map((d) => `- ${markdownCell(d.label)}: $${d.total.toLocaleString()} total, due ${markdownCell(d.dueDate) || "no date set"} — paid by ${d.paidIds.length} of ${d.payerIds.length} payers`).join("\n") : "No deposit requests yet."}

Bride-share rule: ${markdownCell(BRIDE_SHARE_LABELS[brideShare])}

## Rooms

${rooms.length ? rooms.map((r) => `- ${markdownCell(r.label)} (${r.beds} beds): ${r.occupantIds.map((id) => markdownCell(guests.find((g) => g.id === id)?.name || "Removed guest")).join(", ") || "nobody assigned yet"}${r.note ? ` — ${markdownCell(r.note)}` : ""}`).join("\n") : "No rooms assigned yet."}

## Itinerary\n\n| Day | Time | Plan | Owner | Status |\n|---:|---|---|---|---|\n${events.length ? events.map((event) => `| ${event.day} | ${markdownCell(event.time)} | ${markdownCell(event.title)} | ${markdownCell(event.owner)} | ${event.status} |`).join("\n") : "| — | — | Generate the working plan in the Rally | Organizer | Next step |"}\n\n## Suggestion shortlist

Ideas the group considered but did not pick for the itinerary — kept so nothing is lost.

${unpickedSuggestions(suggestions).length ? unpickedSuggestions(suggestions).map((s) => `- ${markdownCell(s.title)} (${markdownCell(s.category)}, ${markdownCell(s.source)}) — ${markdownCell(s.url)}`).join("\n") : "No unpicked suggestions yet."}

## Places and reservations\n\n| Place | Category | Status | Link |\n|---|---|---|---|\n${venues.length ? venues.map((venue) => `| ${markdownCell(venue.name)} | ${markdownCell(venue.category)} | ${venue.status} | ${markdownCell(venue.url)} |`).join("\n") : "| No places saved yet | — | — | — |"}\n\n## House hub

- **Wifi:** ${markdownCell(houseHub.wifi) || "Not recorded"}
- **Door / lock code:** ${markdownCell(houseHub.doorCode) || "Not recorded"}
- **Check-in / check-out:** ${markdownCell(houseHub.checkIn) || "—"} / ${markdownCell(houseHub.checkOut) || "—"}
- **Property manager:** ${markdownCell(houseHub.propertyManager) || "Not recorded"}
- **Flights + arrivals:** ${markdownCell(houseHub.flightsNote) || "Not recorded"}
- **Uber / ride plan:** ${markdownCell(houseHub.uberPlan) || "Not recorded"}

## Expense plan\n\n| Expense | Amount | Paid by |\n|---|---:|---|\n${expenses.map((expense) => `| ${markdownCell(expense.label)} | $${expense.amount.toLocaleString()} | ${markdownCell(expense.paidBy)} |`).join("\n")}\n\n## Tasks\n\n${tasks.map((task) => `- [${task.done ? "x" : " "}] ${markdownCell(task.text)} — ${markdownCell(task.owner)}, ${markdownCell(task.due)}`).join("\n")}\n\n## Packing\n\n${packing.map((item) => `- [${packedItems.includes(item) ? "x" : " "}] ${markdownCell(item)}`).join("\n")}\n\n## Organizer notes\n\nThese are organizer notes exported from Pep Rally, not a shared live chat.\n\n${messages.map((message) => `- **${markdownCell(message.sender)}** (${markdownCell(message.time)}): ${markdownCell(message.body)}`).join("\n")}\n\n## Ready-to-send update\n\n${updateText}\n\n---\nCreated with Pep Rally · ${new Date().toLocaleDateString()} · ${activeGuests.length} active guest${activeGuests.length === 1 ? "" : "s"}\n`;
    const name = (id: string) => markdownCell(guests.find(g => g.id === id)?.name || "Removed guest");
    const billMarkdown = `\n## Paid bills (separate from planned budget)\n\n${bills.map(b => `- ${markdownCell(b.title)}: ${b.amount.toFixed(2)} paid by ${name(b.paidBy)}; split among ${b.participants.map(name).join(", ")}`).join("\n")}\n\n## Suggested repayments\n\n${settleBills(bills, fundHolder ? guests.filter(g=>g.id!==fundHolder&&g.paid>0).map(g=>({from:g.id,to:fundHolder,cents:Math.round(g.paid*100)})):[]).map(s => `- ${name(s.from)} pays ${name(s.to)} ${(s.cents / 100).toFixed(2)}`).join("\n") || "No repayments calculated."}\n\nConfirm transfers manually; these are not bank records.\n`;
    downloadMarkdown(`${safeFileName(partyName)}-plan.md`, markdown + billMarkdown + "\n## Activity notes and estimates\n\n" + events.map(e=>`- ${markdownCell(e.title)}: ${markdownCell(e.note || "")} · Estimated per person: ${e.estimatedCost || 0}`).join("\n"));
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

  function recordExpense(expense:Expense) {
    const payer=guests.find(g=>g.name===expense.paidBy);
    const participants=guests.filter(g=>g.rsvp!=="No").map(g=>g.id);
    if(!payer || !participants.length || !Number.isFinite(expense.amount) || expense.amount<=0 || expense.amount>1000000){setNotice("Set a positive amount and choose a payer before recording a paid bill.");return;}
    if(bills.some(b=>b.id==="expense-"+expense.id))return;
    setBills([...bills,{id:"expense-"+expense.id,title:expense.label,amount:Math.round(expense.amount*100)/100,paidBy:payer.id,participants}]);
    setNotice("Paid bill recorded for the current group. If it needs a different split, remove that bill and add it with the correct participants below.");
  }
  function makeProviderLink() {
    const handle = paymentHandle.trim().replace(/^[@$]/, "");
    if (!handle) { setPaymentStatus("Add the organizer’s provider handle or paste an existing payment link."); return; }
    const amount = Math.max(0, contributionTarget);
    if (!amount) { setPaymentStatus("Set an agreed contribution amount before making a request link."); return; }
    if (paymentProvider === "PayPal.Me") setPaymentLink(`https://www.paypal.com/paypalme/${handle}/${amount}USD`);
    else if (paymentProvider === "Cash App") setPaymentLink(`https://cash.app/$${handle}/${amount}`);
    else if (paymentProvider === "Venmo") setPaymentLink(`https://venmo.com/${handle}`);
    setPaymentStatus("Provider link ready. Payments are confirmed manually in the ledger.");
  }


  if (loading) return <main className="rally-loading">Gathering your Rally…</main>;
  const nav = ["plan", "guests", "money", "packing"] as const;
  const activeNav = ["setup","stay","destination"].includes(tab) ? "plan" : tab === "chat" ? "guests" : tab;
  const labels: Record<string, string> = { plan: "Your weekend", setup: "Trip details", guests: "People", money: "Budget & bills", stay: "Stay", destination: "Explore & book", packing: "Packing", chat: "Notes & sharing" };
  const owners = guests.length ? guests : firstGuests;

  return <main className="rally-room bach-room">
    <header className="rally-header photo-rally-header bach-header"><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div className="rally-header-copy"><small>BACHELORETTE BLUEPRINT</small><h1>{partyName}</h1><p>The people, plans and split bills—all in one place.</p></div><figure className="rally-cover"><img src="/rallies/bachelorette-pool.jpg" alt="Friends relaxing together beside a sunny pool"/><figcaption><b>Free Rally</b><span>Plan here; review before you send or book</span></figcaption></figure><div className="rally-header-actions" hidden={!workspaceReady}>{authState === "guest" ? <button className="primary" onClick={() => keepThisRally()}>Sign in to save</button> : <button className="primary" onClick={save}>{saved ? "Saved ✓" : "Save Rally"}</button>}</div></header>
    {authState === "guest" && <div className="guest-preview-note"><span>Free to use. No account needed to start. Your draft is backed up on this browser. Sign in to save across devices. Avoid shared devices for private details.</span></div>}
    {saveError && <p role="alert" className="trip-notice">{saveError}</p>}
    {!workspaceReady && <AgenticPlanner onApply={applyItinerary}/>}
    {!workspaceReady && <SavedDraft onApply={applyItinerary}/>}
    {workspaceReady && <>
    <nav className="rally-nav">{nav.map((item) => <button key={item} className={activeNav === item ? "active" : ""} onClick={() => { setTab(item); setNotice(""); }}>{labels[item]}</button>)}</nav>
    {activeNav === "plan" && <div className="weekend-toolbar"><span>{city}{startDate ? ` · ${startDate}–${endDate}` : ""}</span><details key={tab}><summary>Plan tools</summary><div>{(["plan","stay","destination","setup"] as const).filter(key => key !== tab).map(key => <button key={key} onClick={() => setTab(key)}>{({plan:"Back to itinerary",stay:"Find a stay",destination:"Find places & activities",setup:"Edit trip details"})[key]}</button>)}</div></details></div>}
    {activeNav === "guests" && <div className="rally-subnav"><button onClick={() => setTab("guests")}>Guest list</button><button onClick={() => setTab("chat")}>Organizer notes</button></div>}
    {notice && <p role="status" className="trip-notice">{notice}</p>}


    {tab === "destination" && <TripTools key={city} city={city} start={startDate} end={endDate} count={guests.filter(g => g.rsvp !== "No").length} onCity={setCity} onDates={(start, end) => { setStartDate(start); setEndDate(end); }} onAdd={(name, url, category) => { setVenues(items => items.some(v => v.name === name && v.url === url) ? items : [...items, { id: crypto.randomUUID(), name, url, category, status: "Considering" }]); setNotice(`${name} saved. Your shortlist is below.`); }} onPack={items => { setPacking(current => [...new Set([...current, ...items])]); setTab("packing"); setNotice("Added to your packing list. Edit or remove anything here."); }} onPlaces={() => document.getElementById("saved-places")?.scrollIntoView({ behavior: "smooth" })} onPacking={() => setTab("packing")} onEditDetails={() => setTab("setup")}/>}
    {tab === "destination" && <Suggestions city={city} place={place} start={startDate} end={endDate} count={guests.filter(g => g.rsvp !== "No").length} vibe={vibe} suggestions={suggestions} onSuggestions={setSuggestions} onPick={(item) => { setEvents([...events, { id: crypto.randomUUID(), day: 1, time: item.time || "Time TBD", title: item.title, bookingUrl: item.url, note: item.venue ? `${item.venue}${item.date ? ` · ${item.date}` : ""}` : item.date || "", owner: owners[0].name, status: "Shortlisted" }]); setNotice(`“${item.title}” is in your itinerary. Set its day and time on the plan tab.`); }} />}
    {tab === "setup" && <section className="rally-content"><div className="workspace-intro"><div><small>PARTY BRIEF</small><h2>Tell the app who she is.</h2><p>The plan should feel like the bride—not a generic checklist wearing a sash.</p></div><div className="workspace-stamp"><b>{vibe}</b><span>{city}</span></div></div><div className="setup-grid"><label>Bride’s name<input value={brideName} onChange={(e) => setBrideName(e.target.value)} /></label><label>Destination<GeoInput value={city} place={place} onCity={setCity} onPlace={setPlace} /></label><label>Arrival date<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label><label>Departure date<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label><label>Weekend energy<select value={vibe} onChange={(e) => setVibe(e.target.value)}>{Object.keys(vibePlans).map((name) => <option key={name}>{name}</option>)}</select></label><label>Working budget per person<input type="number" min="0" value={perPerson} onChange={(e) => setPerPerson(Number(e.target.value))} /></label><label className="full-field">What is the bride actually like?<textarea value={brideTraits} onChange={(e) => setBrideTraits(e.target.value)} /></label><label className="full-field">Hard no’s, boundaries, and accessibility needs<textarea value={mustAvoid} onChange={(e) => setMustAvoid(e.target.value)} /></label><label>Who is planning this trip?<select value={plannerMode} onChange={(e) => setPlannerMode(e.target.value as "organizer" | "bride")}><option value="organizer">An organizer / maid of honor, for the bride</option><option value="bride">The bride, planning her own</option></select></label><p className="full-field planner-mode-note">{plannerMode === "bride" ? "Bride-as-planner is common — about as common as the maid of honor planning it. The failure mode is a rigid schedule the group experiences as being held to the bride's every preference. Keep one main activity per day, label the rest optional, and leave room to move things around." : "Firsthand accounts say the bride plans her own bachelorette about as often as the maid of honor does. If that is this trip, switch the mode above — the planning advice changes."}</p><label className="full-field">What the group signed up for<textarea value={groupSignedUp} onChange={(e) => setGroupSignedUp(e.target.value)} placeholder="e.g. a relaxed weekend, one big night out, home by midnight Saturday" /></label><label className="full-field">What the bride envisions<textarea value={brideEnvisions} onChange={(e) => setBrideEnvisions(e.target.value)} placeholder="e.g. every meal together, matching outfits, a packed Saturday" /></label><p className="full-field planner-mode-note">The expectation gap is the real failure mode: when what the group signed up for and what the bride envisions do not match, the weekend breaks. Write both down, compare them, and talk about the gap before anyone books.</p></div><DatePoll poll={datePoll} guests={guests} onPoll={setDatePoll} onUseWeekend={(start, end) => { setStartDate(start); setEndDate(end); setStayNights(Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86400000))); }} /><button className="primary" onClick={() => setTab("plan")}>Back to your weekend →</button></section>}

    {tab === "guests" && <section className="rally-content"><div className="rally-title"><div><small>GUESTS + RSVP</small><h2>Everyone, accounted for.</h2></div><button onClick={() => setGuests([...guests, { id: crypto.randomUUID(), name: "New guest", contact: "", rsvp: "Maybe", paid: 0, needs: "" }])}>+ Add guest</button></div><div className="rally-table"><div className="rally-row labels"><span>Name</span><span>Email or phone</span><span>RSVP</span><span>Needs</span><span></span></div>{guests.map((guest, index) => <div className="rally-row" key={guest.id}><input value={guest.name} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}/><input value={guest.contact} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, contact: e.target.value } : item))}/><select value={guest.rsvp} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, rsvp: e.target.value as Guest["rsvp"] } : item))}><option>Yes</option><option>Maybe</option><option>No</option></select><input placeholder="Dietary, access, room…" value={guest.needs} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, needs: e.target.value } : item))}/><button aria-label={`Remove ${guest.name}`} onClick={() => setGuests(guests.filter((item) => item.id !== guest.id))}>×</button></div>)}</div><div className="invite-box"><b>Invite message</b><p>Join {partyName} in {city}. Please confirm your RSVP, budget comfort, dietary needs, accessibility needs, and room preferences.</p><div className="rally-actions"><a href={`mailto:?subject=${encodeURIComponent(partyName)}&body=${encodeURIComponent(`Join ${partyName} in ${city}. Please reply with your RSVP, budget comfort, dietary needs, accessibility needs, and room preferences.`)}`}>Email invite</a><a href={`sms:?&body=${encodeURIComponent(`Join ${partyName} in ${city}. Please reply with your RSVP and any budget, dietary, accessibility, or room needs.`)}`}>Text invite</a></div><small>Private multi-user invite links are the next access milestone. Email and text actions work now.</small></div></section>}

    {tab === "stay" && <section className="rally-content"><div className="workspace-intro"><div><small>STAY</small><h2>Pick a place everyone can afford.</h2><p>Collect the comfort number before anyone falls in love with a house. Use the lowest stated comfort amount as the equal-share ceiling, so no one is priced out.</p></div><button onClick={() => setStayOptions([...stayOptions, { id: crypto.randomUUID(), name: "New stay", kind: "Hotel", total: 0, bedrooms: stayBedrooms, cancellation: "Check before booking", url: "", status: "Considering" }])}>+ Add a stay</button></div><div className="stay-planner-grid"><article className="budget-pulse"><small>BUDGET COMFORT CHECK</small><h3>What can each person comfortably contribute to lodging?</h3><p>Amounts have no names attached, but are visible to anyone using this organizer workspace.</p><form onSubmit={(event) => { event.preventDefault(); if (budgetDraft <= 0) return; setBudgetResponses([...budgetResponses, budgetDraft]); setBudgetDraft(450); }}><label>My maximum lodging share<div><span>$</span><input aria-label="Anonymous maximum lodging contribution" type="number" min="1" value={budgetDraft} onChange={(event) => setBudgetDraft(Number(event.target.value))}/></div></label><button className="primary">Add budget amount</button></form><div className="anonymous-responses">{budgetResponses.length ? budgetResponses.map((amount, index) => <span key={`${amount}-${index}`}><b>Anonymous {index + 1}</b>${amount.toLocaleString()}<button aria-label={`Remove anonymous response ${index + 1}`} onClick={() => setBudgetResponses(budgetResponses.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>) : <em>No responses yet. Pass this screen around or privately record each reply.</em>}</div><p className="privacy-note">Record replies here yourself. This is not an anonymous guest survey; anyone with access to your workspace can see these amounts.</p></article><article className="stay-guardrails"><small>SEARCH GUARDRAILS</small><h3>Your lodging ceiling</h3><div className="stay-math"><span><b>${lodgingCeiling.toLocaleString()}</b>total stay</span><span><b>${lodgingPerNight.toLocaleString()}</b>per night</span><span><b>{budgetResponses.length || "—"}</b>anonymous replies</span><span><b>{medianContribution ? `$${medianContribution.toLocaleString()}` : "—"}</b>median share</span></div><label>Lodging allocation $<input type="number" min="0" value={stayBudgetHigh} onChange={(event) => setStayBudgetHigh(Number(event.target.value))}/></label><div className="stay-fields"><label>Nights<input type="number" min="1" value={stayNights} onChange={(event) => setStayNights(Number(event.target.value))}/></label><label>Bedrooms<input type="number" min="1" value={stayBedrooms} onChange={(event) => setStayBedrooms(Number(event.target.value))}/></label></div><label>Must-haves<textarea value={stayMustHaves} onChange={(event) => setStayMustHaves(event.target.value)}/></label><small className="math-note">Starts at 40% of your estimated trip budget; adjust it here. Comfort replies can lower the ceiling. Until everyone replies, this is provisional.</small></article></div><div className="stay-search-grid">{[{ name: "Hotels", note: "Compare current hotel rates and locations", url: `https://www.google.com/travel/search?q=${encodeURIComponent(`hotels in ${city}`)}` }, { name: "Airbnb", note: "Search whole homes for the group", url: `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?checkin=${startDate}&checkout=${endDate}&adults=${Math.max(1, participantCount)}` }, { name: "VRBO", note: "Compare vacation rentals and policies", url: `https://www.vrbo.com/searchResults.html?destination=${encodeURIComponent(city)}&startDate=${startDate}&endDate=${endDate}` }].map((provider) => <a key={provider.name} href={provider.url} target="_blank" rel="noreferrer"><small>LIVE SEARCH</small><b>{provider.name} ↗</b><span>{provider.note}</span><em>Planning ceiling: ${lodgingCeiling.toLocaleString()} total · {stayBedrooms} bedrooms</em></a>)}</div><div className="rally-title compact"><div><small>SHORTLIST</small><h3>Compare the real options</h3></div></div><div className="stay-shortlist">{stayOptions.length ? stayOptions.map((option, index) => <article key={option.id}><input aria-label="Stay name" value={option.name} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))}/><select aria-label="Stay type" value={option.kind} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.target.value as StayOption["kind"] } : item))}><option>Hotel</option><option>Airbnb</option><option>VRBO</option><option>Other</option></select><label>Total $<input type="number" min="0" value={option.total} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, total: Number(event.target.value) } : item))}/></label><label>Bedrooms<input type="number" min="0" value={option.bedrooms} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, bedrooms: Number(event.target.value) } : item))}/></label><input aria-label="Cancellation terms" placeholder="Cancellation terms" value={option.cancellation} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, cancellation: event.target.value } : item))}/><input aria-label="Booking link" type="url" placeholder="Booking link" value={option.url} onChange={(event) => setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))}/><select aria-label="Stay status" value={option.status} onChange={(event) => { const next = event.target.value as StayOption["status"]; if (next === "Booked" && !anyDepositCollected) setNotice("No deposit is fully collected yet. Collect a 33–50% deposit before booking anything non-refundable — see Deposits on the Budget & bills tab."); setStayOptions(stayOptions.map((item, itemIndex) => itemIndex === index ? { ...item, status: next } : item)); }}><option>Considering</option><option>Top choice</option><option>Booked</option></select><div className="stay-option-actions"><span>{participantCount && option.total ? `$${Math.ceil(option.total / participantCount).toLocaleString()} each` : "Add total to compare"}</span>{option.url && <a href={option.url} target="_blank" rel="noreferrer">Open ↗</a>}<button aria-label={`Remove ${option.name}`} onClick={() => setStayOptions(stayOptions.filter((item) => item.id !== option.id))}>×</button></div></article>) : <p className="empty-state">Search live listings above, then add the real options here to compare them side by side.</p>}</div><RoomPlan rooms={rooms} guests={guests} onRooms={setRooms} /><p className="confidence-note">Pep Rally does not receive private budget answers from lodging sites or book on your behalf. Provider availability, fees, rules, and cancellation terms remain the source of truth.</p></section>}

    {tab === "chat" && <section className="rally-content"><div className="workspace-intro"><div><small>ORGANIZER NOTES</small><h2>Keep the decisions together.</h2><p>This is your private notes log. Notes are included in the plan download; send group messages through your usual chat app.</p></div></div><div className="chat-room"><div className="chat-list">{messages.map((message) => <article key={message.id}><div><b>{message.sender}</b><small>{message.time}</small></div><p>{message.body}</p></article>)}</div><form onSubmit={(e) => { e.preventDefault(); if (!messageDraft.trim()) return; setMessages([...messages, { id: crypto.randomUUID(), sender: guests[0]?.name || "Organizer", body: messageDraft.trim(), time: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }]); setMessageDraft(""); }}><input aria-label="Write a message" value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} placeholder="Post an update or decision…"/><button className="primary">Add note</button></form></div></section>}

    {tab === "money" && <section className="rally-content"><div className="workspace-intro"><div><small>MONEY</small><h2>Plan spending. Track actual payments.</h2><p>Pep Rally tracks balances; the selected payment provider moves the funds securely.</p></div><label>Estimated budget per person<input type="number" min="0" value={perPerson} onChange={(e) => setPerPerson(Number(e.target.value))}/></label></div><div className="money-strip"><span>Estimated group budget <b>${groupBudget.toLocaleString()}</b></span><span>Contributions recorded <b>${collected.toLocaleString()}</b></span><span>Requested contributions remaining <b>${outstanding.toLocaleString()}</b></span><span>Planned expenses <b>${expenseTotal.toLocaleString()}</b></span></div><h3>Group contributions</h3><p>Optional: agree a contribution with the group before requesting it. This is separate from your spending estimate and the paid-bill splitter below.</p><label>Agreed contribution per person $<input type="number" min="0" value={contributionTarget} onChange={e => setContributionTarget(Math.max(0, Number(e.target.value)))}/></label><div className="payment-connect"><div><label>Provider<select value={paymentProvider} onChange={(e) => setPaymentProvider(e.target.value)}><option>PayPal.Me</option><option>Cash App</option><option>Venmo</option><option>Other link</option></select></label><label>{paymentProvider === "Other link" || paymentProvider === "Stripe" ? "Payment link" : "Organizer handle"}<input value={paymentProvider === "Other link" || paymentProvider === "Stripe" ? paymentLink : paymentHandle} onChange={(e) => paymentProvider === "Other link" || paymentProvider === "Stripe" ? setPaymentLink(e.target.value) : setPaymentHandle(e.target.value)} placeholder={paymentProvider === "PayPal.Me" ? "paypal.me name" : paymentProvider === "Cash App" ? "$cashtag" : paymentProvider === "Venmo" ? "@username" : "https://…"}/></label></div><div>{paymentProvider === "Stripe" ? <span>Use a payment link owned by the actual recipient.</span> : paymentProvider !== "Other link" && <button onClick={makeProviderLink}>Make request link</button>}{paymentLink && <a href={paymentLink} target="_blank" rel="noreferrer">Open payment request ↗</a>}</div><small>{paymentStatus || "Provider accounts and their terms apply. Mark payments received in the ledger below."}</small></div><div className="balance-list">{guests.map((guest, index) => guest.rsvp !== "No" && <article key={guest.id}><div><b>{guest.name}</b><small>${Math.max(0, contributionTarget - guest.paid).toLocaleString()} of requested contribution remaining</small></div><label>Paid $<input type="number" min="0" value={guest.paid} onChange={(e) => setGuests(guests.map((item, i) => i === index ? { ...item, paid: Number(e.target.value) } : item))}/></label><div className="balance-meter"><i style={{ width: `${contributionTarget ? Math.min(100, guest.paid / contributionTarget * 100) : 0}%` }}/></div></article>)}</div><Deposits deposits={deposits} guests={guests} brideShare={brideShare} partyName={partyName} paymentLink={paymentLink} lodgingCeiling={lodgingCeiling} defaultPayerIds={defaultPayerIds} onDeposits={setDeposits} onBrideShare={setBrideShare} /><p className="confidence-note">Shared-cost quote under the bride-share rule: ${sharedQuote.toLocaleString()} per paying guest on $${expenseTotal.toLocaleString()} of planned expenses{brideGuestId ? "" : " — add the bride to the guest list under her exact name to apply the rule to her share."}</p><div className="rally-title compact"><div><small>EXPENSE PLAN</small><h3>What the group budget covers</h3></div><button onClick={() => setExpenses([...expenses, { id: crypto.randomUUID(), label: "New expense", amount: 0, paidBy: owners[0].name }])}>+ Add expense</button></div><div className="expense-list">{expenses.map((expense, index) => <div key={expense.id}><input value={expense.label} onChange={(e) => setExpenses(expenses.map((item, i) => i === index ? { ...item, label: e.target.value } : item))}/><label>$ <input type="number" value={expense.amount} onChange={(e) => setExpenses(expenses.map((item, i) => i === index ? { ...item, amount: Number(e.target.value) } : item))}/></label><select value={expense.paidBy} onChange={(e) => setExpenses(expenses.map((item, i) => i === index ? { ...item, paidBy: e.target.value } : item))}>{owners.map((guest) => <option key={guest.id}>{guest.name}</option>)}</select><button disabled={bills.some(b=>b.id==="expense-"+expense.id)} onClick={()=>recordExpense(expense)}>{bills.some(b=>b.id==="expense-"+expense.id)?"Paid bill recorded":"Record as paid"}</button><button onClick={() => setExpenses(expenses.filter((item) => item.id !== expense.id))}>×</button></div>)}</div><MoneySummary guests={guests} bills={bills} planned={expenseTotal} fundHolder={fundHolder} onFundHolder={setFundHolder}/><BillSplitter guests={guests} bills={bills} transfers={fundHolder ? guests.filter(g=>g.id!==fundHolder&&g.paid>0).map(g=>({from:g.id,to:fundHolder,cents:Math.round(g.paid*100)})):[]} onChange={setBills}/></section>}

    {tab === "plan" && <section className="rally-content"><div className="workspace-intro"><div><h2>Your itinerary</h2><p>Start with these suggestions. Open an activity to make it yours.</p></div><div className="rally-actions"><button onClick={() => setEvents([...events, { id: crypto.randomUUID(), day: 1, time: "12:00 PM", title: "", owner: owners[0].name, status: "Idea", required: "required" }])}>+ Add activity</button><button className="primary" onClick={downloadPacket}>Download PDF packet</button><button onClick={downloadOutcome}>Download Markdown</button></div></div>{scheduleWarnings.length > 0 && <div className="schedule-warnings" role="status"><b>Schedule check — over-scheduling is the most common itinerary failure.</b><ul>{scheduleWarnings.flatMap(({ warnings }) => warnings).map((warning, i) => <li key={i}>{warning.message}</li>)}</ul></div>}<div className="event-list rich-events">{events.map((event, index) => <details className="weekend-card" key={event.id}><summary><span>{startDate ? new Date(Date.parse(startDate + "T12:00:00") + (event.day - 1) * 86400000).toLocaleDateString(undefined, { weekday:"long", month:"short", day:"numeric" }) : `Day ${event.day}`} · {event.time}</span><strong>{event.title || "New activity"}</strong><small>{event.status} · {event.required === "optional" ? "Optional" : "Must-do"} · Edit</small></summary><article><label>Day<input type="number" min="1" max="32" value={event.day} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, day: Number(e.target.value) } : item))}/></label><label>Time<input value={event.time} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, time: e.target.value } : item))}/></label><input aria-label="Activity name" placeholder="Your activity" className="event-name" value={event.title} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, title: e.target.value } : item))}/><select value={event.owner} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, owner: e.target.value as Event["owner"] } : item))}>{owners.map((guest) => <option key={guest.id}>{guest.name}</option>)}</select><select value={event.status} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, status: e.target.value as Event["status"] } : item))}><option>Idea</option><option>Shortlisted</option><option>Booked</option></select><label>Must-do or optional?<select value={event.required || "required"} onChange={(e) => setEvents(events.map((item, i) => i === index ? { ...item, required: e.target.value as EventRequirement } : item))}><option value="required">Must-do</option><option value="optional">Optional — the group can skip it</option></select></label><label>Activity notes<textarea value={event.note||""} onChange={e=>setEvents(events.map((item,i)=>i===index?{...item,note:e.target.value}:item))}/></label><label>Estimated cost per person ($)<input type="number" min="0" step="0.01" value={event.estimatedCost??0} onChange={e=>setEvents(events.map((item,i)=>i===index?{...item,estimatedCost:Math.max(0,Number(e.target.value))}:item))}/></label>{event.bookingUrl && <a href={event.bookingUrl} target="_blank" rel="noreferrer">Venue ↗</a>}<button aria-label={`Remove ${event.title || "activity"}`} onClick={() => setEvents(events.filter((item) => item.id !== event.id))}>×</button></article></details>)}</div></section>}

    {tab === "destination" && <section className="rally-content" id="saved-places"><div className="workspace-intro"><div><small>PLACES + RESERVATIONS</small><h2>Your saved places.</h2><p>Add your own venue or keep an idea from above. Once you choose it, add it to your itinerary.</p></div><button onClick={() => setVenues([...venues, { id: crypto.randomUUID(), name: "New venue", category: "Dinner", url: "", status: "Considering" }])}>+ Add venue</button></div><div className="venue-list">{venues.length ? venues.map((venue, index) => <article key={venue.id}><input aria-label="Place name" value={venue.name} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}/><input aria-label="Place category" value={venue.category} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, category: e.target.value } : item))}/><input type="url" placeholder="Booking or venue URL" value={venue.url} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, url: e.target.value } : item))}/><select value={venue.status} onChange={(e) => setVenues(venues.map((item, i) => i === index ? { ...item, status: e.target.value as Venue["status"] } : item))}><option>Considering</option><option>Contacted</option><option>Reserved</option></select><button onClick={() => { if (events.some(e => e.title.trim().toLowerCase() === venue.name.trim().toLowerCase())) setEvents(events.map(e => e.title.trim().toLowerCase() === venue.name.trim().toLowerCase() ? { ...e, bookingUrl: venue.url, status: venue.status === "Reserved" ? "Booked" : "Shortlisted" } : e)); else setEvents([...events, { id: crypto.randomUUID(), day: 1, time: "Time TBD", title: venue.name, bookingUrl: venue.url, owner: owners[0].name, status: venue.status === "Reserved" ? "Booked" : "Shortlisted" }]); setTab("plan"); setNotice(`${venue.name} added. Set the day and time below.`); }}>Add to itinerary</button>{venue.url ? <a href={venue.url} target="_blank" rel="noreferrer">Open ↗</a> : <span></span>}<button onClick={() => setVenues(venues.filter((item) => item.id !== venue.id))}>×</button></article>) : <p className="empty-state">No venues saved yet. Search above, then add the actual choice here.</p>}</div><p className="confidence-note">Direct booking inside Pep Rally requires an approved reservation-platform partnership. These links open the live provider so availability and policies remain current.</p></section>}

    {tab === "packing" && <details className="rally-content optional-shopping"><summary>Optional décor & shopping</summary><div className="workspace-intro"><div><small>SHOPPING</small><h2>Find optional decorations and favors.</h2><p>Destination planning holds the schedule and places. This tab is only for optional décor, favors and shopping.</p></div></div><div className="decor-board"><article><small>KEEP IT EDITABLE</small><h3>Choose one visual direction</h3><p>Use the bride’s vibe as a filter, then save only what supports the location, budget and group.</p></article><article><small>BUY LESS</small><ul><li>One welcome sign or printable</li><li>Reusable cups or name markers</li><li>A photo moment that fits the location</li><li>Useful welcome-bag items</li><li>Nothing the bride explicitly hates</li></ul></article></div><div className="store-grid">{storeSearches.map((store) => <a key={store.name} href={store.url} target="_blank" rel="noreferrer"><b>{store.name} ↗</b><span>{store.note}</span><small>Non-affiliate search for now</small></a>)}</div><div className="workspace-intro"><div><small>LOCAL SHOPPING</small><h3>Near the rental.</h3><p>Every firsthand weekend starts with an arrival-day run: groceries, drinks, and supplies for the house.</p></div></div><div className="store-grid">{localShoppingLinks(city).map((shop) => <a key={shop.label} href={shop.url} target="_blank" rel="noreferrer"><b>{shop.label} ↗</b><span>{shop.note}</span></a>)}</div><OrderList items={orderList} guestCount={guests.filter(g => g.rsvp !== "No").length} onChange={setOrderList} /></details>}

    {tab === "plan" && <section className="rally-content"><label><input type="checkbox" checked={shareBalances} onChange={e=>setShareBalances(e.target.checked)}/> Include names and calculated repayments in the shared plan</label></section>}
    {tab === "plan" && <OutcomePreview document={weekendDocument} label="Share the weekend" privacy="Preview before sending. Guest contacts, private needs, organizer notes and individual comfort budgets are excluded."/>}
    {workspaceReady && <p className="trip-notice" role="status">{backup.status} <a href="/library">My Rallies</a></p>}
    {tab === "plan" && <details className="rally-content"><summary>Planning checklist</summary><div className="rally-title"><div><small>TASKS</small><h2>No invisible labor.</h2></div><button onClick={() => setTasks([...tasks, { id: crypto.randomUUID(), text: "New task", owner: owners[0].name, done: false, due: "This week" }])}>+ Add task</button></div><div className="task-list">{tasks.map((task, index) => <article className={task.done ? "done" : ""} key={task.id}><button className="check" onClick={() => setTasks(tasks.map((item, i) => i === index ? { ...item, done: !item.done } : item))}>{task.done ? "✓" : ""}</button><input value={task.text} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, text: e.target.value } : item))}/><select value={task.owner} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, owner: e.target.value } : item))}>{owners.map((guest) => <option key={guest.id}>{guest.name}</option>)}</select><input value={task.due} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, due: e.target.value } : item))}/><button onClick={() => setTasks(tasks.filter((item) => item.id !== task.id))}>×</button></article>)}</div></details>}
    {tab === "plan" && <details className="rally-content"><summary>House hub — the shared note, in one place</summary><div className="rally-title"><div><small>HOUSE INFO</small><h2>Everything the group needs at the house.</h2><p>The firsthand fix for the itinerary getting lost in the group chat: one shared note with the house codes, flights, and ride plan. This is the checklist for what the trip HQ holds.</p></div></div><div className="setup-grid"><label>Wifi network + password<input value={houseHub.wifi} onChange={(e) => setHouseHub({ ...houseHub, wifi: e.target.value })} /></label><label>Door / lock code<input value={houseHub.doorCode} onChange={(e) => setHouseHub({ ...houseHub, doorCode: e.target.value })} /></label><label>Check-in<input value={houseHub.checkIn} onChange={(e) => setHouseHub({ ...houseHub, checkIn: e.target.value })} placeholder="e.g. Friday 4:00 PM" /></label><label>Check-out<input value={houseHub.checkOut} onChange={(e) => setHouseHub({ ...houseHub, checkOut: e.target.value })} placeholder="e.g. Sunday 11:00 AM" /></label><label className="full-field">Property manager / maintenance contact<textarea value={houseHub.propertyManager} onChange={(e) => setHouseHub({ ...houseHub, propertyManager: e.target.value })} placeholder="Name + phone — the first call if something breaks on arrival" /></label><label className="full-field">Flights + arrivals<textarea value={houseHub.flightsNote} onChange={(e) => setHouseHub({ ...houseHub, flightsNote: e.target.value })} placeholder="Who lands when — match arrival times for shared rides" /></label><label className="full-field">Uber / ride plan<textarea value={houseHub.uberPlan} onChange={(e) => setHouseHub({ ...houseHub, uberPlan: e.target.value })} placeholder="e.g. always 3 XLs for 14 — 2 groups of 5 + a group of 4" /></label></div><p className="confidence-note">House codes are sensitive: share the trip HQ link only with the group, and keep this out of screenshots posted anywhere public.</p></details>}

    {tab === "packing" && <PackingSection packing={packing} packedItems={packedItems} onPacked={setPackedItems} onChange={setPacking} title={partyName} subtitle={`${city} · ${startDate} to ${endDate}`}/>}
    {tab === "chat" && <section className="rally-content"><button className="primary" onClick={downloadOutcome}>Download weekend plan</button></section>}
    {tab === "plan" && <details className="rally-content"><summary>Downloads & saved drafts</summary><p>Take your trip details and customization prompts to another AI tool.</p><button onClick={downloadCustomization}>Download customization prompts .md</button><SavedDraft onApply={applyItinerary}/></details>}
    </>}
  </main>;
}
