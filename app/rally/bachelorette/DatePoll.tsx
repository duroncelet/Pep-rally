"use client";
import { useState } from "react";
import { pollTally, pollWinner, type DatePoll } from "./money";

type GuestRef = { id: string; name: string; rsvp: string };

// Date polling: 2–3 candidate weekends, availability votes recorded by the
// organizer (Kat's method: 3 weekends that work for the bride, pick the one
// that works for the majority). There is no multi-user access yet, so the
// organizer records each guest's reply here — the same pattern as the
// anonymous budget-comfort collection.
export default function DatePoll({ poll, guests, onPoll, onUseWeekend }: {
  poll: DatePoll;
  guests: GuestRef[];
  onPoll: (poll: DatePoll) => void;
  onUseWeekend: (start: string, end: string) => void;
}) {
  const active = guests.filter((g) => g.rsvp !== "No");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const name = (id: string) => guests.find((g) => g.id === id)?.name || "Removed guest";
  const tally = pollTally(poll);
  const winner = pollWinner(poll);

  function addOption() {
    if (poll.options.length >= 3) { setError("Three candidate weekends is the max — more options stall the decision."); return; }
    if (!start || !end || end < start) { setError("Pick a valid weekend: an arrival date and a departure date after it."); return; }
    if (poll.options.some((o) => o.start === start && o.end === end)) { setError("That weekend is already a candidate."); return; }
    onPoll({ options: [...poll.options, { id: crypto.randomUUID(), start, end, label: label.trim() || `${start} to ${end}` }], votes: poll.votes });
    setStart(""); setEnd(""); setLabel(""); setError("");
  }

  function toggleVote(optionId: string, guestId: string) {
    const current = poll.votes[optionId] || [];
    const votes = { ...poll.votes, [optionId]: current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId] };
    onPoll({ ...poll, votes });
  }

  return <div className="date-poll">
    <div className="rally-title compact"><div><small>DATE POLLING</small><h3>Pick the weekend the most people can make.</h3><p>Dates are the hardest thing to agree on. Offer 2–3 weekends that work for the bride, record who can make each one, and pick the majority — instead of typing dates in and hoping.</p></div></div>
    {notice && <p role="status" className="trip-notice">{notice}</p>}
    {poll.options.length < 3 && <><div className="trip-fields"><label>Candidate arrival<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label><label>Candidate departure<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label><label>Label (optional)<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. The long weekend" /></label></div><button onClick={addOption}>Add candidate weekend</button></>}
    {error && <p role="alert">{error}</p>}
    {!poll.options.length && <p className="empty-state">No candidate weekends yet. Add the weekends that work for the bride first.</p>}
    {tally.map(({ option, count, voterIds }) => <article key={option.id} className="poll-option">
      <div><b>{option.label}</b><span>{option.start} to {option.end} · {count} of {active.length} can make it{winner?.id === option.id ? " · leading ✓" : ""}</span><button aria-label={`Remove candidate ${option.label}`} onClick={() => { const votes = { ...poll.votes }; delete votes[option.id]; onPoll({ options: poll.options.filter((o) => o.id !== option.id), votes }); }}>×</button></div>
      <div className="poll-votes">{active.map((guest) => <label key={guest.id}><input type="checkbox" checked={voterIds.includes(guest.id)} onChange={() => toggleVote(option.id, guest.id)} />{guest.name}</label>)}</div>
      <button className="primary" onClick={() => { onUseWeekend(option.start, option.end); setNotice(`Trip dates set to ${option.start} – ${option.end}.`); }}>Use this weekend</button>
    </article>)}
    {winner && <p className="confidence-note">Leading weekend: {winner.label} ({winner.start} to {winner.end}). Ties break to the earliest start date. {tally.length > 1 && `Guests who cannot make it: ${active.filter((g) => !(poll.votes[winner.id] || []).includes(g.id)).map((g) => name(g.id)).join(", ") || "none"}.`}</p>}
  </div>;
}
