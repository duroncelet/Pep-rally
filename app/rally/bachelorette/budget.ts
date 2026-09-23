type Guest = { rsvp: string; paid: number };
const positive = (n: number) => Number.isFinite(n) ? Math.max(0,n) : 0;
export function tripTotals(guests: Guest[], budget: number, request: number) {
  const active = guests.filter(g => g.rsvp !== "No");
  const collected = active.reduce((sum,g) => sum + positive(g.paid),0);
  return { participantCount:active.length, groupBudget:positive(budget)*active.length, collected, outstanding:Math.max(0,positive(request)*active.length-collected) };
}
