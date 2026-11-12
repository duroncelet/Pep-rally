"use client";
import { useState } from "react";
import { categoryCards, groupSizeAdvice, suggestionFromEvent, type ResolvedPlace, type Suggestion, type TicketmasterEvent } from "./planner";

// Prescriptive suggestions, landing as a to-do list the buyer picks from.
// Nothing here books anything: picking moves a suggestion into the itinerary,
// skipping keeps it on the shortlist the packet preserves. Every suggestion
// carries a real source link — a suggestion without one does not ship.
export default function Suggestions({ city, place, start, end, count, vibe, suggestions, onSuggestions, onPick }: {
  city: string;
  place: ResolvedPlace | null;
  start: string;
  end: string;
  count: number;
  vibe: string;
  suggestions: Suggestion[];
  onSuggestions: (items: Suggestion[]) => void;
  onPick: (item: Suggestion) => void;
}) {
  const [liveEvents, setLiveEvents] = useState<TicketmasterEvent[] | null>(null);
  const [eventsBusy, setEventsBusy] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [needsCredential, setNeedsCredential] = useState(false);
  const [notice, setNotice] = useState("");
  const where = place?.label || city;
  const advice = groupSizeAdvice(count);

  async function checkWhatsOn() {
    setEventsBusy(true); setEventsError(""); setNeedsCredential(false); setLiveEvents(null);
    const params = new URLSearchParams({ start, end });
    if (place) { params.set("lat", String(place.latitude)); params.set("lon", String(place.longitude)); }
    else params.set("city", city);
    try {
      const response = await fetch(`/api/party-events?${params}`);
      const data = await response.json();
      if (!response.ok) { setEventsError(data.error || "Listings could not load."); setNeedsCredential(Boolean(data.needsCredential)); return; }
      setLiveEvents(data.events || []);
    } catch {
      setEventsError("Listings could not load right now. Use the Ticketmaster search below.");
    } finally { setEventsBusy(false); }
  }

  function addSuggestion(item: Suggestion) {
    if (suggestions.some((s) => s.url === item.url && s.title === item.title)) { setNotice("That suggestion is already on your to-do list."); return; }
    onSuggestions([...suggestions, item]);
    setNotice(`“${item.title}” added to your to-do list. Pick it to move it into the itinerary, or skip it to keep it on the shortlist.`);
  }

  function setStatus(id: string, status: Suggestion["status"]) {
    onSuggestions(suggestions.map((s) => s.id === id ? { ...s, status } : s));
  }

  const todo = suggestions.filter((s) => s.status === "todo");
  const picked = suggestions.filter((s) => s.status === "picked");
  const skipped = suggestions.filter((s) => s.status === "skipped");

  return <section className="rally-content suggestions-section">
    <div className="workspace-intro"><div><small>SUGGESTIONS · PICK WHAT FITS</small><h2>What to do that weekend.</h2><p>Real events and ideas for {where || "your destination"}{start ? `, ${start} to ${end}` : ""} — each with a source you can open. Nothing is booked for you; you pick what goes into the itinerary.</p></div></div>
    {notice && <p role="status" className="trip-notice">{notice}</p>}
    {advice.length > 0 && <div className="group-size-advice"><b>For a group of {count}:</b><ul>{advice.map((line, i) => <li key={i}>{line}</li>)}</ul></div>}

    <article className="trip-card"><h3>What’s on that weekend?</h3><p>Concerts, shows, sports, and comedy from Ticketmaster for your exact trip dates{place ? ` near ${place.label}` : ""}.</p>
      <button className="primary" disabled={!start || !end || !city.trim() || eventsBusy} onClick={checkWhatsOn}>{eventsBusy ? "Checking listings…" : "Check what’s on"}</button>
      {(!start || !end) && <p>Set arrival and departure dates in Trip details first — listings are searched for those exact dates.</p>}
      {eventsError && <p role="alert">{eventsError}</p>}
      {needsCredential && <p><a href={`https://www.ticketmaster.com/search?q=${encodeURIComponent(city)}`} target="_blank" rel="noreferrer">Search Ticketmaster ↗</a> — then save a show’s link in your places below.</p>}
      {liveEvents && !liveEvents.length && <p>Nothing turned up on Ticketmaster for those dates. That happens — the categories below still work, and it is worth checking again closer to the trip.</p>}
      {liveEvents && liveEvents.length > 0 && <div className="live-event-list">{liveEvents.map((event) => {
        const already = suggestions.some((s) => s.id === `tm-${event.id}`);
        return <article key={event.id}><div><b>{event.name}</b><span>{event.date || "Date on provider"}{event.time ? ` · ${event.time}` : ""}{event.venue ? ` · ${event.venue}` : ""}</span></div><a href={event.url} target="_blank" rel="noreferrer">Ticketmaster ↗</a><button disabled={already} onClick={() => { const item = suggestionFromEvent(event); if (item) addSuggestion(item); }}>{already ? "On your list ✓" : "Add to to-do list"}</button></article>;
      })}</div>}
    </article>

    <div className="category-grid">{categoryCards(where).map((card) => <article key={card.category} className="trip-card"><h3>{card.category}</h3><p>{card.blurb}</p><ul>{card.links.map((link) => {
      const already = suggestions.some((s) => s.url === link.url && s.title === link.label);
      return <li key={link.label}><a href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a><button disabled={already} onClick={() => addSuggestion({ id: crypto.randomUUID(), title: link.label, category: card.category, url: link.url, source: link.url.includes("google.com/maps") ? "Google Maps search" : link.url.includes("opentable.com") ? "OpenTable" : link.url.includes("reddit.com") ? "Reddit search" : "Web search", status: "todo" })}>{already ? "On your list ✓" : "Add"}</button></li>;
    })}</ul></article>)}
    <article className="trip-card"><h3>Downtime</h3><p>The slow morning, the pool afternoon, the thing nobody schedules but everybody needs. Firsthand advice is consistent: do not schedule a 9:00 AM brunch, and leave room for the itinerary to breathe.</p><p>Add a free-time block straight to your itinerary from the plan tab — downtime is a schedule choice, not a booking.</p></article></div>

    <div className="rally-title compact"><div><small>TO-DO LIST</small><h3>Your picks, in one place.</h3><p>Pick what goes into the itinerary. Skipped ideas stay on the shortlist — the packet keeps them so nothing is lost.</p></div></div>
    {!suggestions.length && <p className="empty-state">No suggestions saved yet. Check what’s on, or add an idea from the categories above.</p>}
    {todo.length > 0 && <div className="suggestion-list">{todo.map((s) => <article key={s.id}><div><b>{s.title}</b><span>{s.category} · {s.source}{s.date ? ` · ${s.date}` : ""}{s.venue ? ` · ${s.venue}` : ""}</span></div><a href={s.url} target="_blank" rel="noreferrer">Open source ↗</a><button className="primary" onClick={() => { onPick(s); setStatus(s.id, "picked"); }}>Pick for itinerary</button><button onClick={() => setStatus(s.id, "skipped")}>Skip</button></article>)}</div>}
    {picked.length > 0 && <details className="suggestion-group"><summary>In your itinerary ({picked.length})</summary><ul>{picked.map((s) => <li key={s.id}>{s.title} · <a href={s.url} target="_blank" rel="noreferrer">source ↗</a> <button onClick={() => setStatus(s.id, "todo")}>Move back to to-do</button></li>)}</ul></details>}
    {skipped.length > 0 && <details className="suggestion-group"><summary>Skipped — kept on the shortlist ({skipped.length})</summary><ul>{skipped.map((s) => <li key={s.id}>{s.title} · <a href={s.url} target="_blank" rel="noreferrer">source ↗</a> <button onClick={() => setStatus(s.id, "todo")}>Unskip</button></li>)}</ul></details>}
    <p className="confidence-note">Vibe: {vibe}. Suggestions respect your group size{place ? ` and your resolved place, ${place.label}` : ""}. Availability, prices, and policies live with the provider — open the source before you book.</p>
  </section>;
}
