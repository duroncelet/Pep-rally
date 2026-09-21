"use client";
import { useState } from "react";
import { destinationFor, destinations, settleBills, splitBill, validTripDates, type SharedBill } from "./destinations";

type Props = { city: string; start: string; end: string; count: number; onCity: (city: string) => void; onDates: (start: string, end: string) => void; onAdd: (title: string, url: string, category: string) => void; onPack: (items: string[]) => void };
type Forecast = { updated?: string; error?: string; periods?: Array<{ name: string; date: string; temperature: number; unit: string; forecast: string; wind: string; rain: number | null }> };
type Concert = { id: string; name: string; url: string; date: string; time?: string; venue: string; status: string };

export default function TripTools({ city, start, end, count, onCity, onDates, onAdd, onPack }: Props) {
  const destination = destinationFor(city);
  const [weather, setWeather] = useState<Forecast | null>(null);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [eventBusy, setEventBusy] = useState(false);
  const [eventMessage, setEventMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [dinnerTime, setDinnerTime] = useState("19:00");
  const [dinnerDate, setDinnerDate] = useState(start);
  const [dinnerSize, setDinnerSize] = useState(Math.max(2, count));
  const [needs, setNeeds] = useState("");
  const [cityDraft, setCityDraft] = useState(city);
  const date = dinnerDate || start;
  const reservation = new URLSearchParams({ term: city, covers: String(dinnerSize), ...(date ? { dateTime: `${date}T${dinnerTime}` } : {}) });
  const inquiry = `Hello! We are planning a celebration dinner in ${city} for ${dinnerSize} people on ${date || "a date to be confirmed"} around ${dinnerTime}. Needs: ${needs || "we will confirm dietary and accessibility needs"}. Could you share availability, all-in price including tax/service/gratuity, deposit, cancellation deadline, seating arrangement, dress code, and whether separate checks are possible? Thank you!`;
  async function forecast() {
    setWeatherBusy(true); setWeather(null);
    try { const r = await fetch(`/api/party-weather?city=${encodeURIComponent(city)}`); setWeather(await r.json()); }
    catch { setWeather({ error: "Weather could not load. Use the official forecast link." }); }
    finally { setWeatherBusy(false); }
  }
  async function findConcerts() {
    setEventBusy(true); setConcerts([]); setEventMessage("");
    try {
      const r = await fetch(`/api/party-events?${new URLSearchParams({ city, start, end })}`);
      const data = await r.json();
      setConcerts(data.events || []); setEventMessage(data.error || (data.events?.length ? "Live Ticketmaster results. Availability and final prices are confirmed on Ticketmaster." : "No matching concerts returned. Try the provider search for more venues and categories."));
    } catch { setEventMessage("Events could not load. Search Ticketmaster below."); }
    finally { setEventBusy(false); }
  }
  const periods = weather?.periods?.filter(p => !start || !end || (p.date >= start && p.date <= end)) || [];
  const add = (name: string, url: string, category: string) => { onAdd(name, url, category); setNotice(`${name} added to Places. Review and confirm the booking there.`); };
  return <section className="rally-content trip-tools">
    <div className="workspace-intro"><div><small>DESTINATION GUIDE</small><h2>A weekend that fits your group.</h2><p>Start with a city. Then choose the actual places, check the weather and make the bookings.</p></div></div>
    <div className="destination-pills">{destinations.map(d => <button key={d.id} aria-pressed={destination?.id === d.id} onClick={() => { onCity(`${d.name}, ${d.state}`); setCityDraft(`${d.name}, ${d.state}`); setWeather(null); setConcerts([]); setEventMessage(""); }}>{d.name}</button>)}</div>
    <form className="trip-city-form" onSubmit={e => { e.preventDefault(); if (cityDraft.trim()) { onCity(cityDraft.trim()); setWeather(null); setConcerts([]); setEventMessage(""); } }}><label>Any city<input value={cityDraft} onChange={e => setCityDraft(e.target.value)} placeholder="e.g. Seattle, WA or Lisbon, Portugal" /></label><button type="submit">Use this city</button></form>
    <div className="trip-fields"><label>Arrival<input type="date" value={start} onChange={e => onDates(e.target.value, end)}/></label><label>Departure<input type="date" min={start} value={end} onChange={e => onDates(start, e.target.value)}/></label></div>
    {start && end && !validTripDates(start, end) && <p role="alert">Departure must follow arrival, with a trip no longer than 31 days.</p>}
    {notice && <p role="status" className="trip-notice">{notice}</p>}
    {destination ? <>
      <article className="destination-feature"><small>{destination.name}</small><h3>{destination.mood}</h3><p>{destination.area}</p><p>{destination.caution}</p><a href={destination.source} target="_blank" rel="noreferrer">Official visitor guide ↗</a><small>Ideas researched September 20, 2026 · not a quote or availability guarantee</small></article>
      <div className="trip-grid"><article><h3>One main activity. One backup.</h3><p><b>Start here:</b> {destination.activity}</p><p><b>If plans change:</b> {destination.backup}</p><button onClick={() => add(destination.activity, `https://www.google.com/maps/search/${encodeURIComponent(`${destination.activity} ${city}`)}`, "Activity")}>Shortlist this activity</button></article>
      <article><h3>Outfits without the pressure.</h3><p>{destination.outfit}</p><p>Pick an optional color palette, not a mandatory shopping list. Share venue dress codes and keep a wear-what-you-own option.</p><button onClick={() => { onPack([destination.outfit, "Weather-ready layer", "Venue dress-code check", "Comfortable backup shoes"]); setNotice("Outfit ideas added to Packing."); }}>Add to packing list</button></article></div>
    </> : <article className="destination-feature"><small>YOUR DESTINATION</small><h3>{city || "Any city"}</h3><p>Use this Rally for any destination. Pep Rally will build the planning scaffolding around your city: weather, dinner search, concerts, lodging, outfits, backups and a shared budget.</p><p>Featured cities have extra researched inspiration; custom cities stay flexible and link you to current providers.</p></article>}
    <article className="trip-card"><h3>Weather, not wishful thinking.</h3><p>Live forecasts cover roughly the next seven days—not a prediction for a trip months away. Check again before outdoor bookings and departure.</p><button disabled={!city || weatherBusy} onClick={forecast}>{weatherBusy ? "Checking forecast…" : "Check live weather"}</button>{destination && <a href={`https://forecast.weather.gov/MapClick.php?lat=${destination.lat}&lon=${destination.lon}`} target="_blank" rel="noreferrer">Official forecast and alerts ↗</a>}
      {weather?.error && <p role="alert">{weather.error}</p>}{weather?.periods && <><p>National Weather Service · updated {weather.updated ? new Date(weather.updated).toLocaleString() : "recently"}</p>{periods.length ? <div className="forecast-grid">{periods.map((p, i) => <article key={i}><b>{p.name} · {p.date}</b><strong>{p.temperature}°{p.unit}</strong><p>{p.forecast}</p><small>Wind {p.wind} · Rain chance {p.rain === null ? "not supplied" : `${p.rain}%`}</small></article>)}</div> : <p>Your dates are outside the available forecast. We won’t substitute today’s weather for your trip.</p>}</>}
    </article>
    <article className="trip-card"><h3>Get the whole group to dinner.</h3><p>{destination?.dinner ? `An idea to research: ${destination.dinner}. ` : ""}For a large party, ask about a group menu or private dining. A search is not a reservation.</p><div className="trip-fields"><label>Dinner date<input type="date" value={date} onChange={e => setDinnerDate(e.target.value)}/></label><label>Time<input type="time" value={dinnerTime} onChange={e => setDinnerTime(e.target.value)}/></label><label>Guests<input type="number" min="1" max="100" value={dinnerSize} onChange={e => setDinnerSize(Math.max(1, Math.min(100, Number(e.target.value))))}/></label></div><label>Dietary, seating or accessibility needs<textarea value={needs} onChange={e => setNeeds(e.target.value)} placeholder="Confirm privately with the group before sharing"/></label><div className="rally-actions"><a href={`https://www.opentable.com/s?${reservation}`} target="_blank" rel="noreferrer">Find tables on OpenTable ↗</a><button onClick={() => add(destination?.dinner || `${city} group dinner`, `https://www.opentable.com/s?${reservation}`, "Group dinner")}>Add dinner to shortlist</button></div><p>Confirm city, date, time and party size on OpenTable. Large groups may need to contact the restaurant directly.</p><details><summary>Your group-dinner inquiry</summary><p className="inquiry-copy">{inquiry}</p><a href={`mailto:?subject=${encodeURIComponent("Group dinner inquiry")}&body=${encodeURIComponent(inquiry)}`}>Open email draft</a></details><small>Reservations are completed with the restaurant or OpenTable; nothing is booked automatically.</small></article>
    <article className="trip-card"><h3>A concert for the weekend?</h3><p>Use your arrival and departure dates above. Check age restrictions, accessible seating, total ticket fees and the ride home before buying.</p><div className="rally-actions"><button disabled={eventBusy || !city || !validTripDates(start, end)} onClick={findConcerts}>{eventBusy ? "Finding concerts…" : "Find concerts for my dates"}</button><a href={`https://www.ticketmaster.com/search?q=${encodeURIComponent(city)}`} target="_blank" rel="noreferrer">Search Ticketmaster ↗</a></div><p role="status">{eventMessage}</p><div className="trip-grid">{concerts.map(c => <article key={c.id}><h4>{c.name}</h4><p>{c.date} · {c.time || "Time TBA"} · {c.venue}</p><small>{c.status}</small><div className="rally-actions"><a href={c.url} target="_blank" rel="noreferrer">Check tickets ↗</a><button onClick={() => add(`${c.name} — ${c.date}`, c.url, "Concert")}>Save to Places</button></div></article>)}</div></article>
  </section>;
}

export function BillSplitter({ guests, bills, onChange }: { guests: Array<{ id: string; name: string; rsvp: string }>; bills: SharedBill[]; onChange: (bills: SharedBill[]) => void }) {
  const active = guests.filter(g => g.rsvp !== "No");
  const [title, setTitle] = useState(""); const [amount, setAmount] = useState(""); const [payer, setPayer] = useState(active[0]?.id || "");
  const [excluded, setExcluded] = useState<string[]>([]); const [error, setError] = useState("");
  const name = (id: string) => guests.find(g => g.id === id)?.name || "Removed guest";
  const settlements = settleBills(bills);
  const usd = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return <article className="trip-card bill-splitter"><h3>Who owes whom?</h3><p>Log bills someone has actually paid, including tax and tip. Pick only the people sharing that bill; leave the bride unchecked if the group is treating her. This ledger is separate from the planned budget and group-fund contributions above.</p><form onSubmit={e => { e.preventDefault(); try { const participants = active.filter(g => !excluded.includes(g.id)).map(g => g.id); splitBill(Number(amount), participants); if (!active.some(g => g.id === payer) || !title.trim()) throw new Error("Choose a payer and name this bill."); onChange([...bills, { id: crypto.randomUUID(), title: title.trim(), amount: Math.round(Number(amount) * 100) / 100, paidBy: payer, participants }]); setTitle(""); setAmount(""); setError(""); } catch (err) { setError((err as Error).message); } }}><div className="trip-fields"><label>Bill<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Saturday dinner"/></label><label>Total including tax + tip ($)<input required type="number" min="0.01" max="1000000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}/></label><label>Paid by<select value={payer} onChange={e => setPayer(e.target.value)}>{active.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label></div><fieldset><legend>Split equally among</legend>{active.map(g => <label className="split-person" key={g.id}><input type="checkbox" checked={!excluded.includes(g.id)} onChange={e => setExcluded(e.target.checked ? excluded.filter(id => id !== g.id) : [...excluded, g.id])}/>{g.name}</label>)}</fieldset><button className="primary" disabled={!active.length}>Add paid bill</button>{error && <p role="alert">{error}</p>}</form>
    {bills.map(b => <div className="bill-row" key={b.id}><div><b>{b.title} · {usd(Math.round(b.amount * 100))}</b><p>Paid by {name(b.paidBy)} · shared by {b.participants.map(name).join(", ")}</p></div><button aria-label={`Remove bill ${b.title}`} onClick={() => onChange(bills.filter(item => item.id !== b.id))}>Remove</button></div>)}
    <h4>Suggested repayments</h4>{settlements.length ? settlements.map((s, i) => <p key={i}><b>{name(s.from)}</b> pays <b>{name(s.to)} {usd(s.cents)}</b></p>) : <p>{bills.length ? "These bills balance out." : "Add a paid bill to calculate exact shares."}</p>}<small>These are calculations, not transfers or bank confirmations. Send money using the recipient’s verified payment details. Repayments are not tracked automatically; download this record before clearing settled bills.</small>
  </article>;
}
