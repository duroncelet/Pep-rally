"use client";
import { useState } from "react";
import { depositShares, depositStatus, suggestedDeposit, unpaidPayers, BRIDE_SHARE_LABELS, type BrideShareRule, type DepositRequest } from "./money";

type GuestRef = { id: string; name: string; contact: string; rsvp: string };

// Deposit + collection workflow. The rule from the research: collect a
// 33–50% deposit BEFORE booking anything non-refundable. The planner is not
// a bank — this workflow exists so the organizer never has to float costs and
// chase people afterward. Nudges are drafts the organizer sends herself;
// nothing is sent automatically.
export default function Deposits({ deposits, guests, brideShare, partyName, paymentLink, lodgingCeiling, defaultPayerIds, onDeposits, onBrideShare }: {
  deposits: DepositRequest[];
  guests: GuestRef[];
  brideShare: BrideShareRule;
  partyName: string;
  paymentLink: string;
  lodgingCeiling: number;
  defaultPayerIds: string[];
  onDeposits: (items: DepositRequest[]) => void;
  onBrideShare: (rule: BrideShareRule) => void;
}) {
  const active = guests.filter((g) => g.rsvp !== "No");
  const [label, setLabel] = useState("");
  const [total, setTotal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const name = (id: string) => guests.find((g) => g.id === id)?.name || "Removed guest";

  function addDeposit() {
    const amount = Number(total);
    if (!label.trim()) { setError("Name this deposit — e.g. 'House deposit'."); return; }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) { setError("Enter a deposit total between $0.01 and $1,000,000."); return; }
    if (!active.length) { setError("Add guests before requesting a deposit."); return; }
    const payers = defaultPayerIds.length ? defaultPayerIds : active.map((g) => g.id);
    onDeposits([...deposits, { id: crypto.randomUUID(), label: label.trim(), total: Math.round(amount * 100) / 100, dueDate, payerIds: payers, paidIds: [] }]);
    setLabel(""); setTotal(""); setDueDate(""); setError(""); setNotice(`Deposit request added. Collect it before booking anything non-refundable.`);
  }

  function togglePaid(deposit: DepositRequest, guestId: string) {
    const paidIds = deposit.paidIds.includes(guestId) ? deposit.paidIds.filter((id) => id !== guestId) : [...deposit.paidIds, guestId];
    onDeposits(deposits.map((d) => d.id === deposit.id ? { ...d, paidIds } : d));
  }

  function nudgeText(deposit: DepositRequest, guestId: string) {
    const share = depositShares(deposit).find((s) => s.id === guestId);
    const amount = share ? `$${(share.cents / 100).toFixed(2)}` : "your share";
    return `Hi ${name(guestId)} — quick nudge: the ${deposit.label} deposit of ${amount} for ${partyName} is due ${deposit.dueDate || "soon"}.${paymentLink ? ` You can send it here: ${paymentLink}` : " Let the organizer know once you've sent it."} Thanks!`;
  }

  const statusLabel: Record<string, string> = { collected: "Collected ✓", overdue: "Overdue", "due-soon": "Due soon", upcoming: "Upcoming", "no-due-date": "No due date" };

  return <div className="deposits-section">
    <div className="rally-title compact"><div><small>DEPOSITS · COLLECT BEFORE YOU BOOK</small><h3>Deposits, not fronting.</h3><p>Collect a 33–50% deposit <b>before</b> booking anything non-refundable. The planner is not a bank: firsthand, the organizer often cannot float costs — and the person who fronts the money is the person chasing it afterward.</p></div></div>
    <label>Who pays for the bride?<select value={brideShare} onChange={(e) => onBrideShare(e.target.value as BrideShareRule)}>{(Object.keys(BRIDE_SHARE_LABELS) as BrideShareRule[]).map((rule) => <option key={rule} value={rule}>{BRIDE_SHARE_LABELS[rule]}</option>)}</select></label>
    <p className="confidence-note">Set the rule once, up front — the norm is unsettled, and the ambiguity is the fight. The New Orleans story is the warning: a $750 Venmo request on the way to the airport, never disclosed upfront. New deposits default to the payers this rule implies; adjust per deposit below.</p>
    {notice && <p role="status" className="trip-notice">{notice}</p>}
    <div className="trip-fields"><label>Deposit name<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. House deposit" /></label><label>Total to collect ($)<input type="number" min="0.01" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} /></label><label>Due date<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label></div>
    <div className="rally-actions"><button className="primary" onClick={addDeposit}>Add deposit request</button>{lodgingCeiling > 0 && <button onClick={() => { setTotal(String(suggestedDeposit(lodgingCeiling))); setLabel((v) => v || "House deposit"); }}>Quick-fill: 40% of lodging ceiling (${suggestedDeposit(lodgingCeiling).toLocaleString()})</button>}</div>
    {error && <p role="alert">{error}</p>}
    {!deposits.length && <p className="empty-state">No deposits yet. Add one for the house or the first non-refundable booking — then collect it before you book.</p>}
    {deposits.map((deposit) => {
      const shares = new Map(depositShares(deposit).map((s) => [s.id, s.cents]));
      const unpaid = unpaidPayers(deposit);
      const status = depositStatus(deposit, today);
      return <article key={deposit.id} className="deposit-card">
        <div className="deposit-head"><b>{deposit.label}</b><span>${deposit.total.toLocaleString()} total · due {deposit.dueDate || "no date set"}</span><em>{statusLabel[status]}</em><button aria-label={`Remove deposit ${deposit.label}`} onClick={() => onDeposits(deposits.filter((d) => d.id !== deposit.id))}>×</button></div>
        <div className="deposit-payers">{deposit.payerIds.map((id) => <label key={id}><input type="checkbox" checked={deposit.paidIds.includes(id)} onChange={() => togglePaid(deposit, id)} />{name(id)} · ${((shares.get(id) || 0) / 100).toFixed(2)}{deposit.paidIds.includes(id) ? " · paid ✓" : ""}</label>)}</div>
        {unpaid.length > 0 && <details className="chase-view"><summary>Who hasn’t paid ({unpaid.length}) — nudge drafts</summary><ul>{unpaid.map((id) => <li key={id}><b>{name(id)}</b> — ${((shares.get(id) || 0) / 100).toFixed(2)}<a href={`mailto:?subject=${encodeURIComponent(`${partyName} — ${deposit.label} deposit`)}&body=${encodeURIComponent(nudgeText(deposit, id))}`}>Email nudge</a><a href={`sms:?&body=${encodeURIComponent(nudgeText(deposit, id))}`}>Text nudge</a></li>)}</ul><small>Nudges are drafts you send yourself. Pep Rally does not message guests.</small></details>}
      </article>;
    })}
  </div>;
}
