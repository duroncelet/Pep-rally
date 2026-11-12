// Local shopping + the shoppable Amazon order list (Part 3, Phase 1). The
// order list is curated from firsthand accounts — Kat's Amazon tie-dye kit,
// Ashley's floaties and gift-bag contents — and is distinct from the packing
// checklist: these are things to order and ship to the rental, not things to
// pack. Every link is a live Amazon search for the item type, never an
// invented product listing.

export type OrderItem = {
  id: string;
  label: string;
  note: string;
  url: string;
  qty: number;
  ordered: boolean;
  perGuest: boolean;
};

function amazonSearch(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
}

const ORDER_LIST: Array<{ label: string; note: string; query: string; perGuest: boolean }> = [
  { label: "Tie-dye kit + white bandanas", note: "Pool activity — far cheaper than custom T-shirts (Kat, Hamptons).", query: "tie dye kit white bandanas bulk", perGuest: false },
  { label: "Pool floaties", note: "The group photo prop that actually gets used.", query: "pool floaties adults bulk", perGuest: false },
  { label: "Koozies / can coolers", note: "One per guest for the welcome bag.", query: "koozies bulk blank", perGuest: true },
  { label: "Canvas tote bags", note: "The welcome bag itself — one per guest.", query: "canvas tote bags bulk blank", perGuest: true },
  { label: "Turkish towels", note: "Pool and beach days; doubles as a favor.", query: "turkish towels bulk", perGuest: true },
  { label: "Mini sunscreen bottles", note: "One per guest so nobody has to share.", query: "mini sunscreen bottles travel bulk", perGuest: true },
  { label: "Claw clips", note: "Small, useful, and always forgotten.", query: "claw clips bulk", perGuest: true },
  { label: "Hand fans", note: "Ashley's word: 'a LIFESAVER' in the heat.", query: "hand fans bulk wedding", perGuest: true },
  { label: "Eye masks", note: "For the morning after the big night.", query: "sleep eye masks bulk", perGuest: true },
  { label: "Heart sunglasses", note: "The group photo look (Kat, Hamptons).", query: "heart sunglasses bulk party", perGuest: true },
  { label: "Face masks", note: "Welcome-bag filler that gets used, not binned.", query: "sheet face masks bulk", perGuest: true },
  { label: "Throwaway boat sunglasses", note: "Cheap pairs for the boat day — nobody loses good ones.", query: "cheap sunglasses bulk party", perGuest: true },
  { label: "Balloon garland + decorations", note: "One visual direction for the house, not five.", query: "bachelorette balloon garland kit", perGuest: false },
  { label: "Packing tape + scissors", note: "Ashley's MOH, in all caps: 'DON'T FORGET TAPE/SCISSORS.'", query: "packing tape scissors set", perGuest: false },
  { label: "Electrolyte packets", note: "Liquid IV + Motrin before bed is the firsthand recovery plan.", query: "liquid iv electrolyte packets", perGuest: false },
];

// Per-guest items default to the headcount; shared items default to 1. The
// organizer edits quantities — these are starting points, not a cart.
export function defaultOrderList(guestCount: number): OrderItem[] {
  const count = Math.max(1, Math.min(100, Math.floor(guestCount) || 1));
  return ORDER_LIST.map((item, index) => ({
    id: `order-${index}`,
    label: item.label,
    note: item.note,
    url: amazonSearch(item.query),
    qty: item.perGuest ? count : 1,
    ordered: false,
    perGuest: item.perGuest,
  }));
}

export type LocalShopLink = { label: string; note: string; url: string };

// Local shopping near the trip location (Kelly, Nov 11): the nearest liquor
// store and a Party City-type place for decorations and supplies, plus the
// grocery run every firsthand account involves on arrival. Live map searches,
// not invented storefronts.
export function localShoppingLinks(city: string): LocalShopLink[] {
  const where = city.trim() || "your destination";
  const maps = (query: string) => `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  return [
    { label: "Liquor store near the rental", note: "The arrival-day stock-up: booze and mixers for the house.", url: maps(`liquor store ${where}`) },
    { label: "Party supply store", note: "Decorations and supplies — the Party City-type run.", url: maps(`party supply store ${where}`) },
    { label: "Grocery store", note: "Every firsthand weekend starts with a grocery run for the house.", url: maps(`grocery store ${where}`) },
  ];
}
