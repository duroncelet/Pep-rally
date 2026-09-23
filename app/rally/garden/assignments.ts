/** One crop group per growing space; no invented crops or implied plant counts. */
export function gardenAssignments(crops: string[], count: number, choices: Record<number, string> = {}) {
  const selected = [...new Set(crops.filter(Boolean))];
  const slots = Array.from({ length: Number.isInteger(count) && count > 0 ? Math.min(count, 30) : 0 }, (_, i) =>
    Object.hasOwn(choices, i) ? (selected.includes(choices[i]) ? choices[i] : "") : (selected[i] || ""));
  return { slots, unassigned: selected.filter(crop => !slots.includes(crop)) };
}
