"use client";
import { useEffect, useRef, useState } from "react";
import type { ResolvedPlace } from "./planner";

// One location field: the buyer types a city, county, ZIP, or neighborhood
// and picks a real place from live matches. The input resolves to a place
// (name + coordinates), not a raw string — everything downstream keys off it.
// Typing without picking still works: the city string is kept and the place
// stays unresolved until a match is chosen.
export default function GeoInput({ value, place, onCity, onPlace }: {
  value: string;
  place: ResolvedPlace | null;
  onCity: (city: string) => void;
  onPlace: (place: ResolvedPlace | null) => void;
}) {
  const [options, setOptions] = useState<ResolvedPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2 || (place && place.label === query)) { setOptions([]); setOpen(false); return; }
    const id = ++requestId.current;
    setBusy(true); setLookupError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/party-geo?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (id !== requestId.current) return;
        if (!response.ok) { setLookupError(data.error || "Place lookup is unavailable."); setOptions([]); }
        else { setOptions(data.places || []); setOpen(true); }
      } catch {
        if (id === requestId.current) { setLookupError("Place lookup is unavailable right now."); setOptions([]); }
      } finally { if (id === requestId.current) setBusy(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, place]);

  return <div className="geo-input">
    <input
      aria-label="Destination"
      value={value}
      placeholder="City, county, ZIP, or neighborhood"
      autoComplete="off"
      role="combobox"
      aria-expanded={open}
      onChange={(e) => { onCity(e.target.value); if (place) onPlace(null); }}
      onFocus={() => { if (options.length) setOpen(true); }}
      onBlur={() => setTimeout(() => setOpen(false), 150)}
      onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
    />
    {busy && <small>Finding places…</small>}
    {place && <small className="geo-resolved">Resolved: {place.label} · {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}</small>}
    {lookupError && !place && <small>{lookupError}</small>}
    {open && options.length > 0 && <ul className="geo-options" role="listbox">
      {options.map((option) => <li key={option.id}><button type="button" onMouseDown={(e) => { e.preventDefault(); onPlace(option); onCity(option.label); setOptions([]); setOpen(false); }}>{option.label}</button></li>)}
    </ul>}
    {open && !options.length && !busy && value.trim().length >= 2 && <p className="geo-empty">No place matched “{value.trim()}”. Try a nearby city or a ZIP code — or keep typing, and the planner will use what you wrote.</p>}
  </div>;
}
