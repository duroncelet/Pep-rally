import type { OutcomeDocument } from "./outcome-document";

export type SavedOutcomeMeta = { id: string; slug: string; title: string; isPublic: boolean; updatedAt: string };
export type SaveOutcomeResult = { id: string; slug: string; url: string; isPublic: boolean };

async function readError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  return (data as { error?: string } | null)?.error || fallback;
}

// Save (or re-save) an outcome from a workspace. Pass the id from a previous
// save to keep the same share link; pass isPublic true only when the owner
// opts into sharing. Returns the public path (/s/<slug>) when shared.
export async function saveOutcome(input: { id?: string; rallySlug: string; title: string; document: OutcomeDocument; isPublic?: boolean }): Promise<SaveOutcomeResult> {
  const response = await fetch("/api/outcomes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  if (response.status === 401) {
    const data = await response.json().catch(() => null);
    if ((data as { signIn?: string } | null)?.signIn) window.location.href = (data as { signIn: string }).signIn;
    throw new Error("Sign in to save this outcome.");
  }
  if (!response.ok) throw new Error(await readError(response, "The outcome could not be saved."));
  return response.json();
}

// The owner's latest saved outcome for one Rally, if any.
export async function latestOutcome(rallySlug: string): Promise<SavedOutcomeMeta | null> {
  const response = await fetch(`/api/outcomes?rallySlug=${encodeURIComponent(rallySlug)}`);
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return (data as { outcome?: SavedOutcomeMeta | null } | null)?.outcome ?? null;
}
