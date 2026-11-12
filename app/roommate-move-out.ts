// Roommate Move-Out Splitter — deposit math + condition record computation.
//
// Part 4 of the Nov 11, 2026 build (all-Rallies consumer audit, section 10).
// The buy trigger, in the audit's words: the buyer is buying proof, not a
// tool — a signed, dated, photo-backed move-out record every roommate
// acknowledged. The generic workspace assigned no person to anything, parsed
// no dollar amounts, and did no arithmetic at all. This module computes the
// money: the deposit split, deductions charged shared or per person, the
// final-month proration, sold-item proceeds, and the deposit-return deadline
// — plus the condition record's coverage (which rooms are documented) and
// the task list's state (who owes what, what's unassigned).
//
// Firsthand-grounded, from the audit (6 of 6 needs FIRSTHAND, Avvo/LawGuru):
// the deposit belongs to the lease, not to any one roommate, and stays with
// the landlord until everyone on the lease has moved out; joint and several
// liability means the internal split is unenforceable against the landlord
// (stated in the workspace, not hidden); documentation is what decides the
// dispute. State deposit-return deadlines vary (typically 14–45 days), so
// the deadline is computed from a number the buyer enters — no state's rule
// is invented. Day-proration is guide advice only in the audit, not
// firsthand: it is included as a plain day-count split the roommates agree
// to, with the formula shown, not as a legal rule. No photo upload exists
// (out of scope tonight); the record tracks which rooms have photos taken,
// it does not store them.
//
// Pure functions only — no React, no I/O — so the PDF packet (Part 1B, A6)
// can render the same agreement from roommateSections(). Money is integer
// cents throughout. The small money helpers are local to this module so
// each Part 4 PR stays independently mergeable.

import type { ResultSection } from "./rally-results";

export type LeaseStructure = "joint" | "individual" | "departing";
export type Roommate = { name: string };
export type Deduction = { label: string; cents: number | null; chargedTo: string };
export type SharedItem = { item: string; disposition: "keep" | "sell-split" | "sell-owner" | "donate" | "undecided"; owner: string; proceedsCents: number | null };
export type ConditionRoom = { room: string; note: string; photoTaken: boolean };
export type MoveOutTask = { task: string; assignee: string; done: boolean };

export type RoommateMoveOutInput = {
  roommates: Roommate[];
  leaseStructure: LeaseStructure;
  departingName: string;
  depositCents: number | null;
  deductions: Deduction[];
  monthlyRentCents: number | null;
  moveOutDate: string;
  stateDeadlineDays: number | null;
  sharedItems: SharedItem[];
  rooms: ConditionRoom[];
  tasks: MoveOutTask[];
  acknowledged: string[];
};

export type PersonSettlement = {
  name: string;
  depositShareCents: number;
  personalDeductionsCents: number;
  sharedDeductionsCents: number;
  proceedsCents: number;
  netCents: number;
  heldUntilLeaseEnd: boolean;
};

export type RoommateMoveOutComputed = {
  names: string[];
  totalDeductionsCents: number;
  refundableCents: number | null;
  settlements: PersonSettlement[];
  proratedRentCents: number | null;
  prorationLabel: string | null;
  depositDeadline: Date | null;
  roomsDocumented: number;
  roomsTotal: number;
  roomsMissingPhoto: string[];
  tasksDone: number;
  tasksTotal: number;
  unassignedTasks: string[];
  acknowledgedNames: string[];
  pendingNames: string[];
};

export function parseMoneyToCents(value: string): number | null {
  const cleaned = value.trim().replace(/^\$/, "").replace(/,/g, "").trim();
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 100_000_000_00) return null;
  return cents;
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}${(Math.abs(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}`;
}

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) return null;
  return date;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
}

/** Split integer cents as evenly as possible; leftover cents go to the earliest names, in order. */
export function splitEvenly(cents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function computeMoveOut(input: RoommateMoveOutInput): RoommateMoveOutComputed {
  const names = input.roommates.map((roommate) => roommate.name.trim()).filter(Boolean);
  const count = names.length;
  const pricedDeductions = input.deductions.filter((row) => row.label.trim() && row.cents !== null);
  const totalDeductionsCents = pricedDeductions.reduce((sum, row) => sum + (row.cents ?? 0), 0);
  const refundableCents = input.depositCents === null ? null : input.depositCents - totalDeductionsCents;

  const depositShares = input.depositCents === null || count === 0 ? [] : splitEvenly(input.depositCents, count);
  const sharedDeductions = pricedDeductions.filter((row) => !row.chargedTo.trim() || row.chargedTo === "__shared__");
  const sharedTotal = sharedDeductions.reduce((sum, row) => sum + (row.cents ?? 0), 0);
  const sharedShares = count === 0 ? [] : splitEvenly(sharedTotal, count);
  const soldSplit = input.sharedItems.filter((row) => row.disposition === "sell-split" && row.proceedsCents !== null);
  const soldSplitTotal = soldSplit.reduce((sum, row) => sum + (row.proceedsCents ?? 0), 0);
  const proceedsShares = count === 0 ? [] : splitEvenly(soldSplitTotal, count);

  const settlements: PersonSettlement[] = names.map((name, index) => {
    const personalDeductionsCents = pricedDeductions
      .filter((row) => row.chargedTo.trim() && row.chargedTo !== "__shared__" && row.chargedTo === name)
      .reduce((sum, row) => sum + (row.cents ?? 0), 0);
    const ownerProceeds = input.sharedItems
      .filter((row) => row.disposition === "sell-owner" && row.owner === name && row.proceedsCents !== null)
      .reduce((sum, row) => sum + (row.proceedsCents ?? 0), 0);
    const proceedsCents = (proceedsShares[index] ?? 0) + ownerProceeds;
    const depositShareCents = depositShares[index] ?? 0;
    const sharedDeductionsCents = sharedShares[index] ?? 0;
    return {
      name,
      depositShareCents,
      personalDeductionsCents,
      sharedDeductionsCents,
      proceedsCents,
      netCents: depositShareCents - personalDeductionsCents - sharedDeductionsCents + proceedsCents,
      heldUntilLeaseEnd: input.leaseStructure === "departing" && input.departingName.trim() === name,
    };
  });

  // Final-month proration: rent × days occupied ÷ days in the move-out month.
  // A plain day-count split the roommates agree to — the formula is shown
  // with the number, and it is not presented as a legal rule.
  let proratedRentCents: number | null = null;
  let prorationLabel: string | null = null;
  const moveOut = parseDateInput(input.moveOutDate);
  if (moveOut && input.monthlyRentCents !== null) {
    const year = moveOut.getUTCFullYear();
    const month = moveOut.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const daysOccupied = moveOut.getUTCDate();
    proratedRentCents = Math.round((input.monthlyRentCents * daysOccupied) / daysInMonth);
    prorationLabel = `${formatCents(input.monthlyRentCents)} × ${daysOccupied} of ${daysInMonth} days in ${moveOut.toLocaleDateString("en-US", { timeZone: "UTC", month: "long" })}`;
  }

  const depositDeadline = moveOut && input.stateDeadlineDays !== null && input.stateDeadlineDays > 0
    ? new Date(moveOut.getTime() + input.stateDeadlineDays * 86_400_000)
    : null;

  const rooms = input.rooms.filter((row) => row.room.trim());
  const tasks = input.tasks.filter((row) => row.task.trim());
  const acknowledgedNames = input.acknowledged.filter((name) => names.includes(name));
  return {
    names,
    totalDeductionsCents,
    refundableCents,
    settlements,
    proratedRentCents,
    prorationLabel,
    depositDeadline,
    roomsDocumented: rooms.filter((row) => row.photoTaken).length,
    roomsTotal: rooms.length,
    roomsMissingPhoto: rooms.filter((row) => !row.photoTaken).map((row) => row.room.trim()),
    tasksDone: tasks.filter((row) => row.done).length,
    tasksTotal: tasks.length,
    unassignedTasks: tasks.filter((row) => !row.assignee.trim()).map((row) => row.task.trim()),
    acknowledgedNames,
    pendingNames: names.filter((name) => !acknowledgedNames.includes(name)),
  };
}

/** Computed outcome sections, shared by the workspace and the PDF packet (Part 1B, A6). */
export function roommateSections(input: RoommateMoveOutInput): ResultSection[] {
  const computed = computeMoveOut(input);
  const sections: ResultSection[] = [];
  if (computed.names.length === 0 && input.depositCents === null) return sections;

  const moneyItems: string[] = [];
  if (input.depositCents !== null) {
    moneyItems.push(`Deposit held: ${formatCents(input.depositCents)}.`);
    moneyItems.push(`Deductions: ${formatCents(computed.totalDeductionsCents)}${computed.totalDeductionsCents === 0 ? " (none entered)" : ""}.`);
    if (computed.refundableCents !== null) moneyItems.push(`Refundable after deductions: ${formatCents(computed.refundableCents)}.`);
  }
  for (const person of computed.settlements) {
    const bits = [`deposit share ${formatCents(person.depositShareCents)}`];
    if (person.sharedDeductionsCents > 0) bits.push(`shared deductions −${formatCents(person.sharedDeductionsCents)}`);
    if (person.personalDeductionsCents > 0) bits.push(`charged to them −${formatCents(person.personalDeductionsCents)}`);
    if (person.proceedsCents > 0) bits.push(`sold-item proceeds +${formatCents(person.proceedsCents)}`);
    const held = person.heldUntilLeaseEnd ? " Held with the landlord until everyone on the lease has moved out — the deposit belongs to the lease, not to any one roommate." : "";
    moneyItems.push(`${person.name}: ${bits.join(", ")} = ${formatCents(person.netCents)} back.${held}`);
  }
  if (input.leaseStructure === "joint") moneyItems.push("Joint lease: this split is between roommates only. Joint and several liability means it is unenforceable against the landlord — the landlord can pursue any roommate for the whole amount.");
  if (computed.proratedRentCents !== null && computed.prorationLabel) moneyItems.push(`Final month, prorated by days occupied: ${formatCents(computed.proratedRentCents)} (${computed.prorationLabel}). A day-count split you agree to — not a legal rule.`);
  if (computed.depositDeadline) moneyItems.push(`Expect the deposit back by ${formatDateShort(computed.depositDeadline)} (${input.stateDeadlineDays} days after move-out, per the deadline you entered — check your lease or state law).`);
  if (moneyItems.length) sections.push({ title: "Deposit math", items: moneyItems });

  const rooms = input.rooms.filter((row) => row.room.trim());
  if (rooms.length) {
    sections.push({
      title: "Condition record",
      intro: `Documented ${computed.roomsDocumented} of ${computed.roomsTotal} rooms with photos.${computed.roomsMissingPhoto.length ? ` Still missing photos: ${computed.roomsMissingPhoto.join(", ")}.` : ""}`,
      items: rooms.map((row) => `${row.room.trim()}: ${row.note.trim() || "No note."} ${row.photoTaken ? "Photo taken." : "No photo yet."}`),
    });
  }

  const items = input.sharedItems.filter((row) => row.item.trim());
  if (items.length) {
    const labels: Record<SharedItem["disposition"], string> = { keep: "keep", "sell-split": "sell, split the proceeds", "sell-owner": "sell, proceeds to the owner", donate: "donate", undecided: "undecided" };
    sections.push({ title: "Shared items", items: items.map((row) => `${row.item.trim()} — ${labels[row.disposition]}${row.owner.trim() ? ` (${row.owner.trim()})` : ""}${row.proceedsCents !== null ? `, ${formatCents(row.proceedsCents)}` : ""}.`) });
  }

  const tasks = input.tasks.filter((row) => row.task.trim());
  if (tasks.length) {
    sections.push({
      title: "Tasks and sign-off",
      intro: `${computed.tasksDone} of ${computed.tasksTotal} tasks done.${computed.unassignedTasks.length ? ` Unassigned: ${computed.unassignedTasks.join(", ")}.` : ""} Reviewed by: ${computed.acknowledgedNames.length ? computed.acknowledgedNames.join(", ") : "nobody yet"}.${computed.pendingNames.length ? ` Still to review: ${computed.pendingNames.join(", ")}.` : " Everyone has reviewed it."}`,
      items: tasks.map((row) => `${row.done ? "Done" : "Open"} — ${row.task.trim()}${row.assignee.trim() ? ` (${row.assignee.trim()})` : " (unassigned)"}.`),
    });
  }
  return sections;
}

export function roommateHeadline(input: RoommateMoveOutInput): { headline: string; summary: string } {
  const computed = computeMoveOut(input);
  if (computed.refundableCents !== null && computed.names.length) {
    return {
      headline: "Your deposit, defended.",
      summary: `${formatCents(computed.refundableCents)} refundable after ${formatCents(computed.totalDeductionsCents)} in deductions, split across ${computed.names.length} roommate${computed.names.length === 1 ? "" : "s"}.`,
    };
  }
  return { headline: "Your deposit, defended.", summary: "Add the roommates and the deposit to see the split — and the record every roommate reviews." };
}
