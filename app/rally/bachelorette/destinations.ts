export const destinations = [
  { id: "palm-springs", name: "Palm Springs", state: "CA", lat: 33.8303, lon: -116.5453, aliases: ["palm springs"], mood: "Pool days, desert color, slow mornings", area: "Compare downtown Palm Springs with nearby resort towns; check driving distances before booking.", activity: "Pool afternoon with a reserved day pass", backup: "Spa afternoon or an indoor creative workshop", dinner: "Lulu California Bistro", outfit: "Citrus or pink linen, a swimsuit and cover-up; comfortable sandals and an evening layer.", caution: "Keep outdoor plans flexible in heat. Confirm rental occupancy, noise rules, pool access and all fees directly.", source: "https://www.visitgreaterpalmsprings.com/weddings/bachelorette-parties/" },
  { id: "nashville", name: "Nashville", state: "TN", lat: 36.1627, lon: -86.7816, aliases: ["nashville", "nash"], mood: "Live music and a dressed-up night out", area: "Choose lodging around the actual venues, not just a Nashville mailing address; plan a pickup spot away from crowds.", activity: "Cumberland River group cruise", backup: "An indoor live-music performance", dinner: "Nashville group dinner", outfit: "Denim, a favorite statement piece and broken-in boots or sneakers; no new boots required.", caution: "Check age rules, boarding time, weather cancellation and transport before paying for a group cruise.", source: "https://www.visitmusiccity.com/nashville-businesses/pontoon-saloon/7654" },
  { id: "new-orleans", name: "New Orleans", state: "LA", lat: 29.9511, lon: -90.0715, aliases: ["new orleans", "nola"], mood: "Jazz, long brunches and a little sparkle", area: "Keep meals and music geographically close; arrange a safe ride back rather than assuming everyone will walk.", activity: "Jazz brunch and a neighborhood stroll", backup: "An indoor jazz set", dinner: "Jack Rose", outfit: "A breathable colorful outfit, comfortable walking shoes, an optional sparkle accessory and a rain layer.", caution: "Check dress codes, age requirements and group menus. Build in indoor breaks and a weather backup.", source: "https://www.neworleans.com/weddings/blog/post/the-perfect-itinerary-for-your-new-orleans-bachelorette-party/" },
  { id: "austin", name: "Austin", state: "TX", lat: 30.2672, lon: -97.7431, aliases: ["austin"], mood: "Pool time, good food and live music", area: "Compare downtown, South Congress and East Austin against your chosen restaurants and shows.", activity: "A pool afternoon followed by live music", backup: "An indoor show or spa visit", dinner: "Geraldine’s", outfit: "Relaxed separates, an optional western accent, swimwear and shoes you can walk in.", caution: "Check major-event dates before deposits. Confirm boat or pool policies, transportation and weather cancellation.", source: "https://www.austintexas.org/austin-insider-blog/blog/post/bachelorette-weekend/" },
  { id: "chicago", name: "Chicago", state: "IL", lat: 41.8781, lon: -87.6298, aliases: ["chicago"], mood: "City dinners, river views and a night out", area: "Compare River North and West Loop with your shortlist; allow travel time between dinner and the show.", activity: "A river outing and celebration dinner", backup: "An indoor performance or museum visit", dinner: "Chicago group dinner", outfit: "A dinner outfit with a jacket, comfortable city shoes and a warmer layer for the waterfront.", caution: "Choose outdoor plans only after checking conditions. Confirm boat season, cancellation rules and restaurant dress codes.", source: "https://www.choosechicago.com/blog/dining/4-hip-fun-flirty-chicago-bachelorette-party-ideas/" },
] as const;

export function destinationFor(city: string) {
  const normalized = city.trim().toLowerCase().split(",")[0].trim();
  return destinations.find(d => d.aliases.some(alias => normalized === alias || normalized === d.id));
}

export type SharedBill = { id: string; title: string; amount: number; paidBy: string; participants: string[] };
export type Settlement = { from: string; to: string; cents: number };

// Integer cents preserve the full total, even when it cannot divide evenly.
export function splitBill(amount: number, participants: string[]) {
  const ids = [...new Set(participants)];
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000 || !ids.length) throw new Error("Add a positive total and at least one participant.");
  const cents = Math.round(amount * 100);
  return ids.map((id, index) => ({ id, cents: Math.floor(cents / ids.length) + (index < cents % ids.length ? 1 : 0) }));
}

export function settleBills(bills: SharedBill[]): Settlement[] {
  const balances = new Map<string, number>();
  for (const bill of bills) {
    const shares = splitBill(bill.amount, bill.participants);
    balances.set(bill.paidBy, (balances.get(bill.paidBy) || 0) + Math.round(bill.amount * 100));
    for (const share of shares) balances.set(share.id, (balances.get(share.id) || 0) - share.cents);
  }
  const debtors = [...balances].filter(([, n]) => n < 0).map(([id, n]) => ({ id, cents: -n }));
  const creditors = [...balances].filter(([, n]) => n > 0).map(([id, n]) => ({ id, cents: n }));
  const result: Settlement[] = [];
  for (const debtor of debtors) for (const creditor of creditors) {
    const cents = Math.min(debtor.cents, creditor.cents);
    if (cents) result.push({ from: debtor.id, to: creditor.id, cents });
    debtor.cents -= cents; creditor.cents -= cents;
  }
  return result;
}

export function validTripDates(start: string, end: string) {
  const valid = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  return valid(start) && valid(end) && end >= start && (Date.parse(end) - Date.parse(start)) / 86400000 <= 31;
}
