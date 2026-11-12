"use client";
import { useState } from "react";
import { roomWarnings, unassignedGuests, type RoomAssignment } from "./money";

type GuestRef = { id: string; name: string; rsvp: string };

// Room and bed assignments: who sleeps where, in the open. The New Orleans
// story is the failure mode — five women, two beds, no pullouts, and the
// maid of honor quietly taking the good room. Transparency about who gets
// the best room is the fix, so each room carries a note naming what it is.
export default function RoomPlan({ rooms, guests, onRooms }: {
  rooms: RoomAssignment[];
  guests: GuestRef[];
  onRooms: (rooms: RoomAssignment[]) => void;
}) {
  const active = guests.filter((g) => g.rsvp !== "No");
  const [label, setLabel] = useState("");
  const [beds, setBeds] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const name = (id: string) => guests.find((g) => g.id === id)?.name || "Removed guest";
  const unassigned = unassignedGuests(rooms, active.map((g) => g.id));

  function addRoom() {
    if (!label.trim()) { setError("Name the room — e.g. 'Master bedroom'."); return; }
    onRooms([...rooms, { id: crypto.randomUUID(), label: label.trim(), beds: Math.max(0, beds), note: note.trim(), occupantIds: [] }]);
    setLabel(""); setBeds(1); setNote(""); setError("");
  }

  function toggleOccupant(room: RoomAssignment, guestId: string) {
    // One guest, one room: moving someone out of their current room first.
    const cleared = rooms.map((r) => ({ ...r, occupantIds: r.occupantIds.filter((id) => id !== guestId) }));
    const updated = cleared.map((r) => r.id === room.id && !room.occupantIds.includes(guestId) ? { ...r, occupantIds: [...r.occupantIds, guestId] } : r);
    onRooms(updated);
  }

  return <div className="room-plan">
    <div className="rally-title compact"><div><small>ROOMS + BEDS</small><h3>Who sleeps where.</h3><p>Bed assignments are a fairness flashpoint. Decide them in the open, name the best room, and say plainly when a room is crowded — before anyone arrives.</p></div></div>
    <div className="trip-fields"><label>Room name<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Master bedroom" /></label><label>Beds<input type="number" min="0" max="20" value={beds} onChange={(e) => setBeds(Number(e.target.value))} /></label><label>What is this room? (note)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. best room — ensuite, king bed" /></label></div>
    <button onClick={addRoom}>Add room</button>
    {error && <p role="alert">{error}</p>}
    {!rooms.length && <p className="empty-state">No rooms yet. Add the rooms from the listing, then assign each guest to one.</p>}
    {rooms.map((room) => <article key={room.id} className="room-card">
      <div><b>{room.label}</b><span>{room.beds} bed{room.beds === 1 ? "" : "s"} · {room.occupantIds.length} sleeping here{room.note ? ` · ${room.note}` : ""}</span><button aria-label={`Remove room ${room.label}`} onClick={() => onRooms(rooms.filter((r) => r.id !== room.id))}>×</button></div>
      {roomWarnings(room).map((warning, i) => <p key={i} role="alert">{warning}</p>)}
      <div className="room-occupants">{active.map((guest) => <label key={guest.id}><input type="checkbox" checked={room.occupantIds.includes(guest.id)} onChange={() => toggleOccupant(room, guest.id)} />{guest.name}</label>)}</div>
    </article>)}
    {rooms.length > 0 && <p className="confidence-note">{unassigned.length ? `Not assigned yet: ${unassigned.map(name).join(", ")}.` : "Everyone has a room."}</p>}
  </div>;
}
