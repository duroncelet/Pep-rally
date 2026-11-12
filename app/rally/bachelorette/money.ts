// Phase 2 money + logistics: deposits, date polling, the bride-share rule,
// and room assignments. Pure functions, unit tested.
//
// The research's #1 money finding: collect a 33–50% deposit BEFORE booking
// anything non-refundable. The planner is not a bank — firsthand, the
// organizer often CANNOT float costs (the WeddingWire MOH is a stay-at-home
// mom with "zero funds"; the NYC bridesmaid is still waiting on a cabin
// deposit reimbursement). The workflow here is collect-before-booking, not
// front-and-reimburse.

export type DepositRequest = {
  id: string;
  label: string;
  total: number;
  dueDate: string;
  payerIds: string[];
  paidIds: string[];
  note?: string;
};

export type DepositStatus = "collected" | "overdue" | "due-soon" | "upcoming" | "no-due-date";

export function unpaidPayers(deposit: DepositRequest): string[] {
  const paid = new Set(deposit.paidIds);
  return deposit.payerIds.filter((id) => !paid.has(id));
}

// Per-payer shares in integer cents, so the total is preserved exactly.
// Same remainder rule as splitBill in destinations.ts (kept local so this
// module stays importable by the node --test suite, which needs explicit
// file extensions the bundler does not).
export function depositShares(deposit: DepositRequest): Array<{ id: string; cents: number }> {
  const ids = [...new Set(deposit.payerIds)];
  if (!Number.isFinite(deposit.total) || deposit.total <= 0 || !ids.length) return [];
  const cents = Math.round(deposit.total * 100);
  return ids.map((id, index) => ({ id, cents: Math.floor(cents / ids.length) + (index < cents % ids.length ? 1 : 0) }));
}

export function depositStatus(deposit: DepositRequest, today: string): DepositStatus {
  if (deposit.payerIds.length > 0 && unpaidPayers(deposit).length === 0) return "collected";
  if (!deposit.dueDate) return "no-due-date";
  if (deposit.dueDate < today) return "overdue";
  const daysLeft = Math.round((Date.parse(deposit.dueDate) - Date.parse(today)) / 86400000);
  return daysLeft <= 7 ? "due-soon" : "upcoming";
}

// The guide range is 33–50%; 40% is the suggested default.
export function suggestedDeposit(total: number, percent = 0.4): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.round(total * percent * 100) / 100;
}

export type BrideShareRule = "group-covers" | "bride-pays-travel" | "bride-pays-own";

export const BRIDE_SHARE_LABELS: Record<BrideShareRule, string> = {
  "group-covers": "The group covers the bride — she pays nothing",
  "bride-pays-travel": "The bride pays her own travel; the group covers her share of the rest",
  "bride-pays-own": "The bride pays her own way, like everyone else",
};

// Who pays shared costs under the rule. The bride is identified by matching
// her name to the guest list; with no match, nobody is excluded and the UI
// says so. Under "bride pays own travel", shared-cost payers are the same as
// group-covers — the difference is travel, which is a separate line.
export function sharedCostPayers(rule: BrideShareRule, guestIds: string[], brideGuestId: string | null): string[] {
  if (rule === "bride-pays-own" || !brideGuestId) return [...guestIds];
  return guestIds.filter((id) => id !== brideGuestId);
}

export function perPersonQuote(total: number, payerCount: number): number {
  if (!Number.isFinite(total) || total <= 0 || payerCount <= 0) return 0;
  return Math.ceil((total / payerCount) * 100) / 100;
}

// Date polling: 2–3 candidate weekends, availability votes recorded by the
// organizer (Kat's method: 3 weekends that work for the bride, pick the one
// that works for the majority). Votes are guest ids per option.
export type DatePollOption = { id: string; start: string; end: string; label: string };
export type DatePoll = { options: DatePollOption[]; votes: Record<string, string[]> };

export function pollTally(poll: DatePoll): Array<{ option: DatePollOption; count: number; voterIds: string[] }> {
  return poll.options.map((option) => ({
    option,
    voterIds: [...new Set(poll.votes[option.id] || [])],
    count: new Set(poll.votes[option.id] || []).size,
  }));
}

// Most votes wins; ties break to the earliest start date.
export function pollWinner(poll: DatePoll): DatePollOption | null {
  const tally = pollTally(poll);
  if (!tally.length) return null;
  const sorted = [...tally].sort((a, b) => b.count - a.count || a.option.start.localeCompare(b.option.start));
  return sorted[0].count > 0 ? sorted[0].option : null;
}

// Room and bed assignments — a fairness flashpoint, not a minor detail (the
// New Orleans story: five women, two beds, no pullouts, and no transparency
// about who got the best room). The fix is visibility: who sleeps where, in
// the open, with a note naming the best room.
export type RoomAssignment = { id: string; label: string; beds: number; note: string; occupantIds: string[] };

export function roomWarnings(room: RoomAssignment): string[] {
  const warnings: string[] = [];
  if (room.beds <= 0) warnings.push(`“${room.label}” has no beds listed yet.`);
  else if (room.occupantIds.length > room.beds * 2) {
    warnings.push(`“${room.label}” has ${room.occupantIds.length} people for ${room.beds} bed${room.beds === 1 ? "" : "s"} — more than two per bed. Say so before anyone arrives.`);
  }
  return warnings;
}

export function unassignedGuests(rooms: RoomAssignment[], guestIds: string[]): string[] {
  const assigned = new Set(rooms.flatMap((r) => r.occupantIds));
  return guestIds.filter((id) => !assigned.has(id));
}
