// Farmers Market Morning Board — the printable board, from the vendor's inputs.
//
// Part 4 of the Nov 11, 2026 build (all-Rallies consumer audit, section 8).
// The generic workspace echoed crop names with generic verbs and computed no
// quantities — despite "Harvest quantities" being the first listed outcome.
// This module computes the board: per-crop harvest quantities from the
// vendor's own last-week tally, preorder reconciliation against the harvest,
// the morning timeline from the market's open time, and the pack checklist
// with weather gear.
//
// Sourcing, from the audit: vendors learn quantities from tally sheets —
// counting inventory, tallying sales on a clipboard, planning production
// from last market's sales + field notes (FIRSTHAND). The conversion
// formulas, 80% rule, and sell-through targets are UNVERIFIED vendor rules
// of thumb, so no formula recommends a quantity here: the suggested harvest
// is last week's sold plus a buffer the vendor enters herself, with the
// reasoning shown ("last week you sold 40 of 60"). Sell-through % is plain
// arithmetic on her numbers. The morning failure mode is forgetting one
// specific thing (FIRSTHAND: chair, cash bag, sign, canopy, charger), so
// the pack checklist is the fixed load-out list with checkoffs, and
// unchecked items stay prominent. Weather is planned for before leaving
// home (FIRSTHAND); the vendor enters the expected conditions and the board
// adds the matching gear reminders. The preorder pain is UNVERIFIED in the
// audit (no firsthand account of lost preorders could be opened), so no
// pain claim is made — the preorder section is reconciliation math on
// numbers the vendor entered. Live weather (the Garden Rally's weather tab
// exists in-repo and was not reused) and week-to-week memory (persistence,
// Part 1B B1's lane) are not built; both are flagged in the PR.
//
// Pure functions only — no React, no I/O — so the PDF packet (Part 1B, A6)
// can render the same board from farmersSections(). Money is integer cents
// throughout; quantities are whole units.

import type { ResultSection } from "./rally-results";

export type MarketCrop = { crop: string; unit: string; broughtLastWeek: number | null; soldLastWeek: number | null; extraBuffer: number | null; priceCents: number | null };
export type MarketPreorder = { label: string; crop: string; qty: number | null };
export type MarketStandZone = { zone: string; items: string };
export type MarketCondition = "rain" | "wind" | "heat" | "cold";

export type FarmersMarketInput = {
  marketDate: string;
  openTime: string;
  setupMinutes: number | null;
  loadMinutes: number | null;
  conditions: MarketCondition[];
  crops: MarketCrop[];
  preorders: MarketPreorder[];
  standZones: MarketStandZone[];
  packedItems: string[];
  customPackItems: string[];
};

/** The load-out list: firsthand items first, then the standing market kit. */
export const PACK_LIST = ["Chair", "Cash bag", "Sign", "Canopy", "Charger", "Canopy weights", "Bags", "Labels", "Cashless-payment backup", "Water", "Food-safety supplies"];

export const WEATHER_GEAR: Record<MarketCondition, { label: string; gear: string[] }> = {
  rain: { label: "Rain expected", gear: ["Rain cover for the table", "Tarps for boxes", "Towels"] },
  wind: { label: "Wind expected", gear: ["Extra canopy weights", "Clips for the sign and tablecloth"] },
  heat: { label: "Heat expected", gear: ["Extra water", "Cooler + ice for greens", "Shade cloth"] },
  cold: { label: "Cold expected", gear: ["Warm layers", "Gloves for handling produce"] },
};

export type CropComputed = {
  crop: string;
  unit: string;
  broughtLastWeek: number | null;
  soldLastWeek: number | null;
  leftover: number | null;
  sellThroughPct: number | null;
  suggested: number | null;
  preorderedQty: number;
  covered: boolean | null;
  shortBy: number;
  priceCents: number | null;
  preorderRevenueCents: number;
};

export type FarmersMarketComputed = {
  crops: CropComputed[];
  totalSuggested: number;
  totalPreordered: number;
  totalPreorderRevenueCents: number;
  arriveBy: string | null;
  startLoading: string | null;
  packMissing: string[];
  weatherGear: string[];
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

export function parseWholeNumber(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const num = Number(cleaned);
  return Number.isSafeInteger(num) && num >= 0 && num <= 1_000_000 ? num : null;
}

function parseTimeMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatTimeMinutes(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) return null;
  return date;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function computeFarmersBoard(input: FarmersMarketInput): FarmersMarketComputed {
  const crops: CropComputed[] = input.crops
    .filter((row) => row.crop.trim())
    .map((row) => {
      const preorderedQty = input.preorders
        .filter((order) => order.crop.trim().toLowerCase() === row.crop.trim().toLowerCase() && order.qty !== null)
        .reduce((sum, order) => sum + (order.qty ?? 0), 0);
      const leftover = row.broughtLastWeek !== null && row.soldLastWeek !== null ? row.broughtLastWeek - row.soldLastWeek : null;
      const sellThroughPct = row.broughtLastWeek !== null && row.broughtLastWeek > 0 && row.soldLastWeek !== null
        ? Math.round((row.soldLastWeek / row.broughtLastWeek) * 100)
        : null;
      // Suggested harvest: what sold last week, plus the vendor's own buffer.
      // No rule-of-thumb formula — the vendor's tally is the whole basis.
      const suggested = row.soldLastWeek !== null ? row.soldLastWeek + (row.extraBuffer ?? 0) : null;
      const covered = suggested === null ? null : suggested >= preorderedQty;
      return {
        crop: row.crop.trim(),
        unit: row.unit.trim() || "units",
        broughtLastWeek: row.broughtLastWeek,
        soldLastWeek: row.soldLastWeek,
        leftover,
        sellThroughPct,
        suggested,
        preorderedQty,
        covered,
        shortBy: suggested === null ? 0 : Math.max(0, preorderedQty - suggested),
        priceCents: row.priceCents,
        preorderRevenueCents: row.priceCents !== null ? row.priceCents * preorderedQty : 0,
      };
    });

  const openMinutes = parseTimeMinutes(input.openTime);
  const arriveBy = openMinutes !== null && input.setupMinutes !== null
    ? formatTimeMinutes(openMinutes - input.setupMinutes)
    : null;
  const startLoading = openMinutes !== null && input.setupMinutes !== null && input.loadMinutes !== null
    ? formatTimeMinutes(openMinutes - input.setupMinutes - input.loadMinutes)
    : null;

  const weatherGear = input.conditions.flatMap((condition) => WEATHER_GEAR[condition].gear);
  return {
    crops,
    totalSuggested: crops.reduce((sum, crop) => sum + (crop.suggested ?? 0), 0),
    totalPreordered: crops.reduce((sum, crop) => sum + crop.preorderedQty, 0),
    totalPreorderRevenueCents: crops.reduce((sum, crop) => sum + crop.preorderRevenueCents, 0),
    arriveBy,
    startLoading,
    packMissing: PACK_LIST.filter((item) => !input.packedItems.includes(item)),
    weatherGear,
  };
}

/** Computed outcome sections, shared by the workspace and the PDF packet (Part 1B, A6). */
export function farmersSections(input: FarmersMarketInput): ResultSection[] {
  const computed = computeFarmersBoard(input);
  const sections: ResultSection[] = [];
  const marketDate = parseDateInput(input.marketDate);

  const harvestItems: string[] = [];
  for (const crop of computed.crops) {
    const lastWeek = crop.broughtLastWeek !== null && crop.soldLastWeek !== null
      ? ` Last week: sold ${crop.soldLastWeek} of ${crop.broughtLastWeek} (${crop.sellThroughPct}% sell-through, ${crop.leftover} brought home).`
      : "";
    const buffer = crop.suggested !== null && crop.soldLastWeek !== null && crop.suggested > crop.soldLastWeek
      ? `, plus your ${crop.suggested - crop.soldLastWeek} ${crop.unit} buffer`
      : "";
    harvestItems.push(crop.suggested !== null
      ? `Pick ${crop.suggested} ${crop.unit} of ${crop.crop}${buffer}.${lastWeek}`
      : `${crop.crop}: add last week's sold count to get a harvest number.`);
  }
  if (harvestItems.length) sections.push({ title: "Harvest quantities", intro: marketDate ? `For ${formatDateShort(marketDate)} — from your own tally, not a formula.` : "From your own tally, not a formula.", items: harvestItems });

  const preorderItems: string[] = [];
  for (const crop of computed.crops) {
    if (crop.preorderedQty === 0) continue;
    const revenue = crop.priceCents !== null ? ` (${formatCents(crop.preorderRevenueCents)} in preorders)` : "";
    preorderItems.push(crop.suggested === null
      ? `${crop.crop}: ${crop.preorderedQty} ${crop.unit} preordered — no harvest number yet — add last week's sold count to reconcile these preorders.${revenue}`
      : crop.covered
        ? `${crop.crop}: ${crop.preorderedQty} ${crop.unit} preordered — covered by the ${crop.suggested} ${crop.unit} harvest.${revenue}`
        : `${crop.crop}: ${crop.preorderedQty} ${crop.unit} preordered — short by ${crop.shortBy} ${crop.unit}. Pick more or confirm what you can fill.${revenue}`);
  }
  const unknownPreorders = input.preorders.filter((order) => order.label.trim() && !computed.crops.some((crop) => crop.crop.toLowerCase() === order.crop.trim().toLowerCase()));
  for (const order of unknownPreorders) preorderItems.push(`Preorder “${order.label.trim()}” names “${order.crop.trim()}”, which has no harvest row — add the crop to reconcile it.`);
  if (preorderItems.length) sections.push({ title: "Preorders", items: preorderItems });

  const packItems = PACK_LIST.map((item) => `${input.packedItems.includes(item) ? "Packed" : "Still to pack"} — ${item}.`);
  for (const gear of computed.weatherGear) packItems.push(`Weather gear — ${gear}.`);
  for (const custom of input.customPackItems) if (custom.trim()) packItems.push(`Custom — ${custom.trim()}.`);
  sections.push({
    title: "Packing checklist",
    intro: computed.packMissing.length ? `Still to pack: ${computed.packMissing.join(", ")}. The morning fails on the one forgotten thing — check the list before you leave.` : "Everything on the load-out list is packed.",
    items: packItems,
  });

  const zones = input.standZones.filter((row) => row.zone.trim());
  if (zones.length) sections.push({ title: "Stand plan", items: zones.map((row) => `${row.zone.trim()}: ${row.items.trim() || "Nothing assigned yet."}`) });

  const timelineItems: string[] = [];
  if (computed.startLoading) timelineItems.push(`Start loading: ${computed.startLoading}.`);
  if (computed.arriveBy) timelineItems.push(`Arrive at the market: ${computed.arriveBy} (${input.setupMinutes} minutes to set up before open).`);
  if (input.openTime.trim()) timelineItems.push(`Market opens: ${formatTimeMinutes(parseTimeMinutes(input.openTime) ?? 0)}.`);
  timelineItems.push("Preorder pickup away from the main sales line.");
  timelineItems.push("Record sell-through and leftovers before leaving — next week's board is built from this week's tally.");
  if (timelineItems.length > 2) sections.push({ title: "Morning timeline", items: timelineItems });
  return sections;
}

export function farmersHeadline(input: FarmersMarketInput): { headline: string; summary: string } {
  const computed = computeFarmersBoard(input);
  const marketDate = parseDateInput(input.marketDate);
  const when = marketDate ? ` for ${formatDateShort(marketDate)}` : "";
  if (computed.crops.length) {
    return {
      headline: "Saturday's board.",
      summary: `Your morning board${when}: ${computed.totalSuggested} ${computed.totalSuggested === 1 ? "unit" : "units"} to harvest across ${computed.crops.length} ${computed.crops.length === 1 ? "crop" : "crops"}${computed.totalPreordered ? `, ${computed.totalPreordered} preordered` : ""}${computed.packMissing.length ? `, ${computed.packMissing.length} pack items still unchecked` : ""}.`,
    };
  }
  return { headline: "Saturday's board.", summary: "Add a crop with last week's tally to build the board." };
}
