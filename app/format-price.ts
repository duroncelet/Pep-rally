// One shared price formatter for every visitor-facing price in the app.
//
// Prices are stored as integer cents (e.g. 1400) and must always render as
// dollars with cents (1400 -> "$14.00"). Every render site imports this
// instead of hand-rolling `$${(cents / 100).toFixed(0)}`, which drifted into
// bare numbers ("14") on some pages and "$14" on others.
export function formatPrice(priceCents: number): string {
  return (priceCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
