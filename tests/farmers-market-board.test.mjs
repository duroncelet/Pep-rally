import test from "node:test";
import assert from "node:assert/strict";

import { parseMoneyToCents, parseWholeNumber, formatCents, formatTimeMinutes, computeFarmersBoard, farmersSections, farmersHeadline, PACK_LIST, WEATHER_GEAR } from "../app/farmers-market-board.ts";

const input = (overrides = {}) => ({
  marketDate: "",
  openTime: "",
  setupMinutes: null,
  loadMinutes: null,
  conditions: [],
  crops: [],
  preorders: [],
  standZones: [],
  packedItems: [],
  customPackItems: [],
  ...overrides,
});

test("parsing accepts buyer-typed numbers and rejects the rest", () => {
  assert.equal(parseMoneyToCents("$4.50"), 450);
  assert.equal(parseWholeNumber("40"), 40);
  assert.equal(parseWholeNumber(""), null);
  assert.equal(parseWholeNumber("4.5"), null);
  assert.equal(parseWholeNumber("-3"), null);
  assert.equal(formatCents(450), "$4.50");
  assert.equal(formatTimeMinutes(300), "5:00 AM");
  assert.equal(formatTimeMinutes(780), "1:00 PM");
  assert.equal(formatTimeMinutes(0), "12:00 AM");
});

test("suggested harvest is last week's sold plus the vendor's own buffer — no formula", () => {
  const computed = computeFarmersBoard(input({
    crops: [
      { crop: "Kale", unit: "bunches", broughtLastWeek: 60, soldLastWeek: 40, extraBuffer: 0, priceCents: 400 },
      { crop: "Tomatoes", unit: "lbs", broughtLastWeek: 50, soldLastWeek: 45, extraBuffer: 5, priceCents: null },
    ],
  }));
  // Kale: pick 40, not 60 — because 20 came home last week.
  assert.equal(computed.crops[0].suggested, 40);
  assert.equal(computed.crops[0].leftover, 20);
  assert.equal(computed.crops[0].sellThroughPct, 67);
  assert.equal(computed.crops[1].suggested, 50);
  assert.equal(computed.totalSuggested, 90);
});

test("preorder reconciliation shows covered and short crops, with revenue", () => {
  const computed = computeFarmersBoard(input({
    crops: [
      { crop: "Kale", unit: "bunches", broughtLastWeek: 60, soldLastWeek: 40, extraBuffer: 0, priceCents: 400 },
      { crop: "Eggs", unit: "dozen", broughtLastWeek: 10, soldLastWeek: 8, extraBuffer: 0, priceCents: 900 },
    ],
    preorders: [
      { label: "Maya", crop: "Kale", qty: 12 },
      { label: "Sam", crop: "Eggs", qty: 10 },
    ],
  }));
  assert.equal(computed.crops[0].covered, true);
  assert.equal(computed.crops[0].preorderRevenueCents, 4800);
  assert.equal(computed.crops[1].covered, false);
  assert.equal(computed.crops[1].shortBy, 2);
  assert.equal(computed.totalPreordered, 22);
  assert.equal(computed.totalPreorderRevenueCents, 4800 + 9000);
});

test("morning timeline is computed back from the open time", () => {
  const computed = computeFarmersBoard(input({ openTime: "08:00", setupMinutes: 60, loadMinutes: 45 }));
  assert.equal(computed.arriveBy, "7:00 AM");
  assert.equal(computed.startLoading, "6:15 AM");
  const early = computeFarmersBoard(input({ openTime: "07:00", setupMinutes: 90, loadMinutes: 60 }));
  assert.equal(early.arriveBy, "5:30 AM");
  assert.equal(early.startLoading, "4:30 AM");
});

test("pack list carries the firsthand load-out items, with gaps flagged", () => {
  assert.ok(PACK_LIST.includes("Chair"));
  assert.ok(PACK_LIST.includes("Cash bag"));
  assert.ok(PACK_LIST.includes("Sign"));
  assert.ok(PACK_LIST.includes("Canopy"));
  assert.ok(PACK_LIST.includes("Charger"));
  const computed = computeFarmersBoard(input({ packedItems: ["Chair", "Cash bag"], conditions: ["rain"] }));
  assert.ok(computed.packMissing.includes("Canopy"));
  assert.deepEqual(computed.weatherGear, ["Rain cover for the table", "Tarps for boxes", "Towels"]);
  assert.deepEqual(WEATHER_GEAR.wind.gear, ["Extra canopy weights", "Clips for the sign and tablecloth"]);
});

test("sections carry harvest, preorders, pack list, stand plan, and timeline", () => {
  const sections = farmersSections(input({
    marketDate: "2026-11-14",
    openTime: "08:00",
    setupMinutes: 60,
    loadMinutes: 45,
    crops: [{ crop: "Kale", unit: "bunches", broughtLastWeek: 60, soldLastWeek: 40, extraBuffer: 0, priceCents: 400 }],
    preorders: [{ label: "Maya", crop: "Kale", qty: 12 }],
    standZones: [{ zone: "Table 1", items: "Kale, eggs" }],
    packedItems: ["Chair"],
  }));
  assert.deepEqual(sections.map((section) => section.title), ["Harvest quantities", "Preorders", "Packing checklist", "Stand plan", "Morning timeline"]);
  const text = JSON.stringify(sections);
  assert.match(text, /Pick 40 bunches of Kale\. Last week: sold 40 of 60 \(67% sell-through, 20 brought home\)/);
  assert.match(text, /Kale: 12 bunches preordered — covered by the 40 bunches harvest\. \(\$48\.00 in preorders\)/);
  assert.match(text, /Start loading: 6:15 AM/);
  assert.match(text, /Still to pack: Cash bag, Sign, Canopy, Charger/);
});

test("a preorder with no last-week tally is not reconciled — never 'short by 0'", () => {
  const computed = computeFarmersBoard(input({
    crops: [{ crop: "Quokka greens", unit: "bunches", broughtLastWeek: null, soldLastWeek: null, extraBuffer: 0, priceCents: 400 }],
    preorders: [{ label: "Maya", crop: "Quokka greens", qty: 5 }],
  }));
  assert.equal(computed.crops[0].suggested, null);
  assert.equal(computed.crops[0].covered, null);
  const sections = farmersSections(input({
    crops: [{ crop: "Quokka greens", unit: "bunches", broughtLastWeek: null, soldLastWeek: null, extraBuffer: 0, priceCents: 400 }],
    preorders: [{ label: "Maya", crop: "Quokka greens", qty: 5 }],
  }));
  const text = JSON.stringify(sections);
  assert.match(text, /Quokka greens: 5 bunches preordered — no harvest number yet — add last week's sold count to reconcile these preorders/);
  assert.doesNotMatch(text, /short by 0/);
});

test("a preorder naming a crop with no harvest row is flagged, not dropped", () => {
  const sections = farmersSections(input({
    crops: [{ crop: "Kale", unit: "bunches", broughtLastWeek: 60, soldLastWeek: 40, extraBuffer: 0, priceCents: null }],
    preorders: [{ label: "Sam", crop: "Honey", qty: 2 }],
  }));
  assert.match(JSON.stringify(sections), /names “Honey”, which has no harvest row/);
});

test("blank inputs produce the pack list only — no invented quantities", () => {
  const sections = farmersSections(input());
  assert.deepEqual(sections.map((section) => section.title), ["Packing checklist"]);
  const { summary } = farmersHeadline(input());
  assert.match(summary, /Add a crop with last week's tally/);
});
