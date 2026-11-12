/** Format integer cents for buyer-visible prices without adding a second currency symbol. */
export function formatPrice(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new RangeError("Price must be non-negative integer cents.");
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
