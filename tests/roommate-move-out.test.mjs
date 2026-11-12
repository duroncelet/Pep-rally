import test from "node:test";
import assert from "node:assert/strict";

import { parseMoneyToCents, formatCents, splitEvenly, computeMoveOut, roommateSections, roommateHeadline } from "../app/roommate-move-out.ts";

const input = (overrides = {}) => ({
  roommates: [],
  leaseStructure: "joint",
  departingName: "",
  depositCents: null,
  deductions: [],
  monthlyRentCents: null,
  moveOutDate: "",
  stateDeadlineDays: null,
  sharedItems: [],
  rooms: [],
  tasks: [],
  acknowledged: [],
  ...overrides,
});

test("money parsing and even splits keep every cent accounted for", () => {
  assert.equal(parseMoneyToCents("$2,400"), 240_000);
  assert.equal(parseMoneyToCents(""), null);
  assert.equal(parseMoneyToCents("lots"), null);
  assert.equal(formatCents(-5_00), "-$5.00");
  assert.deepEqual(splitEvenly(100_000, 3), [33_334, 33_333, 33_333]);
  assert.deepEqual(splitEvenly(100_000, 3).reduce((a, b) => a + b, 0), 100_000);
});

test("deposit math splits the deposit, charges shared and personal deductions, and adds proceeds", () => {
  const computed = computeMoveOut(input({
    roommates: [{ name: "Ana" }, { name: "Bo" }],
    depositCents: 240_000,
    deductions: [
      { label: "Cleaning", cents: 15_000, chargedTo: "__shared__" },
      { label: "Broken shelf", cents: 8_000, chargedTo: "Bo" },
    ],
    sharedItems: [{ item: "Couch", disposition: "sell-split", owner: "", proceedsCents: 20_000 }],
  }));
  assert.equal(computed.totalDeductionsCents, 23_000);
  assert.equal(computed.refundableCents, 217_000);
  // Ana: $1,200 share − $75 shared cleaning + $100 proceeds = $1,225.
  assert.deepEqual(computed.settlements[0], { name: "Ana", depositShareCents: 120_000, personalDeductionsCents: 0, sharedDeductionsCents: 7_500, proceedsCents: 10_000, netCents: 122_500, heldUntilLeaseEnd: false });
  // Bo: $1,200 − $75 shared − $80 personal + $100 proceeds = $1,145.
  assert.equal(computed.settlements[1].netCents, 114_500);
});

test("a departing roommate's share is held until the lease ends", () => {
  const computed = computeMoveOut(input({
    roommates: [{ name: "Ana" }, { name: "Bo" }],
    leaseStructure: "departing",
    departingName: "Bo",
    depositCents: 200_000,
  }));
  assert.equal(computed.settlements[0].heldUntilLeaseEnd, false);
  assert.equal(computed.settlements[1].heldUntilLeaseEnd, true);
  const sections = roommateSections(input({
    roommates: [{ name: "Ana" }, { name: "Bo" }],
    leaseStructure: "departing",
    departingName: "Bo",
    depositCents: 200_000,
  }));
  assert.match(JSON.stringify(sections), /Held with the landlord until everyone on the lease has moved out/);
});

test("final-month rent prorates by days occupied over days in the month", () => {
  const computed = computeMoveOut(input({ monthlyRentCents: 240_000, moveOutDate: "2026-11-15" }));
  // $2,400 × 15 of 30 days = $1,200.
  assert.equal(computed.proratedRentCents, 120_000);
  assert.match(computed.prorationLabel, /\$2,400\.00 × 15 of 30 days in November/);
  const february = computeMoveOut(input({ monthlyRentCents: 280_000, moveOutDate: "2027-02-14" }));
  // $2,800 × 14 of 28 days = $1,400.
  assert.equal(february.proratedRentCents, 140_000);
});

test("deposit deadline is computed from the buyer-entered state deadline, never invented", () => {
  const computed = computeMoveOut(input({ moveOutDate: "2026-11-15", stateDeadlineDays: 21 }));
  assert.equal(computed.depositDeadline?.toISOString().slice(0, 10), "2026-12-06");
  assert.equal(computeMoveOut(input({ moveOutDate: "2026-11-15" })).depositDeadline, null);
});

test("condition record and task list report coverage and gaps", () => {
  const computed = computeMoveOut(input({
    roommates: [{ name: "Ana" }, { name: "Bo" }],
    rooms: [
      { room: "Kitchen", note: "Clean", photoTaken: true },
      { room: "Bathroom", note: "", photoTaken: false },
    ],
    tasks: [
      { task: "Return keys", assignee: "Ana", done: true },
      { task: "Clean oven", assignee: "", done: false },
    ],
    acknowledged: ["Ana"],
  }));
  assert.equal(computed.roomsDocumented, 1);
  assert.equal(computed.roomsTotal, 2);
  assert.deepEqual(computed.roomsMissingPhoto, ["Bathroom"]);
  assert.equal(computed.tasksDone, 1);
  assert.deepEqual(computed.unassignedTasks, ["Clean oven"]);
  assert.deepEqual(computed.acknowledgedNames, ["Ana"]);
  assert.deepEqual(computed.pendingNames, ["Bo"]);
});

test("no roommates and no deposit means no computed output", () => {
  assert.deepEqual(roommateSections(input()), []);
  const { summary } = roommateHeadline(input());
  assert.match(summary, /Add the roommates and the deposit/);
});

test("sections carry the joint-lease warning and the full record", () => {
  const sections = roommateSections(input({
    roommates: [{ name: "Ana" }, { name: "Bo" }],
    leaseStructure: "joint",
    depositCents: 240_000,
    deductions: [{ label: "Cleaning", cents: 15_000, chargedTo: "__shared__" }],
    moveOutDate: "2026-11-15",
    stateDeadlineDays: 21,
    rooms: [{ room: "Kitchen", note: "Clean", photoTaken: true }],
    sharedItems: [{ item: "Couch", disposition: "donate", owner: "", proceedsCents: null }],
    tasks: [{ task: "Return keys", assignee: "Ana", done: false }],
  }));
  assert.deepEqual(sections.map((section) => section.title), ["Deposit math", "Condition record", "Shared items", "Tasks and sign-off"]);
  const text = JSON.stringify(sections);
  assert.match(text, /Joint and several liability/);
  assert.match(text, /Expect the deposit back by December 6, 2026/);
  assert.match(text, /Couch — donate/);
});
