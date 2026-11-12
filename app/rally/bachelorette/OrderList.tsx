"use client";
import { useState } from "react";
import { defaultOrderList, type OrderItem } from "./shopping";

// The shoppable Amazon order list: decorations, supplies, and group gear to
// order and ship to the rental. Distinct from the packing checklist (things
// to bring). Items come from firsthand accounts; every link is a live Amazon
// search for the item type, never an invented product.
export default function OrderList({ items, guestCount, onChange }: {
  items: OrderItem[];
  guestCount: number;
  onChange: (items: OrderItem[]) => void;
}) {
  const [custom, setCustom] = useState("");
  const [notice, setNotice] = useState("");
  const orderedCount = items.filter((i) => i.ordered).length;

  function addCustom() {
    const label = custom.trim();
    if (!label) return;
    if (items.some((i) => i.label.toLowerCase() === label.toLowerCase())) { setNotice("That item is already on your order list."); return; }
    onChange([...items, { id: crypto.randomUUID(), label, note: "Added by the organizer.", url: `https://www.amazon.com/s?k=${encodeURIComponent(label)}`, qty: 1, ordered: false, perGuest: false }]);
    setCustom(""); setNotice(`${label} added.`);
  }

  return <div className="order-list">
    <div className="workspace-intro"><div><small>ORDER LIST · SHIP TO THE RENTAL</small><h3>Order it, don’t pack it.</h3><p>Decorations, supplies, and group gear to order ahead and ship to the rental — separate from what each guest packs. {items.length ? `${orderedCount} of ${items.length} ordered.` : ""}</p></div></div>
    {notice && <p role="status" className="trip-notice">{notice}</p>}
    {!items.length && <><p className="empty-state">No order list yet. Start from the firsthand-tested list below, or add your own items.</p><button className="primary" onClick={() => onChange(defaultOrderList(guestCount))}>Start from the starter list</button></>}
    {items.length > 0 && <>
      <div className="order-rows">{items.map((item, index) => <article key={item.id}><label><input type="checkbox" checked={item.ordered} onChange={(e) => onChange(items.map((it, i) => i === index ? { ...it, ordered: e.target.checked } : it))} /><b>{item.label}</b></label><span>{item.note}</span><label>Qty <input type="number" min="1" max="200" value={item.qty} onChange={(e) => onChange(items.map((it, i) => i === index ? { ...it, qty: Math.max(1, Math.min(200, Number(e.target.value) || 1)) } : it))} /></label><a href={item.url} target="_blank" rel="noreferrer">Find on Amazon ↗</a><button aria-label={`Remove ${item.label}`} onClick={() => onChange(items.filter((_, i) => i !== index))}>×</button></article>)}</div>
      <p className="confidence-note">Links open Amazon search results for the item type — compare real listings there. Pep Rally does not order anything for you.</p>
    </>}
    <form className="add-packing" onSubmit={(e) => { e.preventDefault(); addCustom(); }}><label>Add your own item<input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. disposable cameras" /></label><button type="submit">Add item</button></form>
  </div>;
}
