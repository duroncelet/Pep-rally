import { rallyConcepts } from "./catalog.ts";
import { validateOutcomeDocument, type OutcomeDocument } from "./outcome-document.ts";

// Part 1B, step B1: persistence + public route for saved outcomes.
// Pure logic only — no database or auth imports — so the rules are unit
// testable (see tests/outcome-sharing.test.mjs). The route handlers in
// app/api/outcomes and the public page in app/s/[slug] are thin wrappers.

// Rallies that can own a shareable outcome: the two free originals plus the
// catalog, minus the three Kelly delisted Nov 11, 2026 (NCLEX Study Sprint,
// Care Circle Coordinator, Flashcard Shop Studio). Once the delisting PR
// merges, the exclusion below is redundant but harmless.
const DELISTED_SLUGS = new Set(["nclex-study-sprint", "care-circle-coordinator", "flashcard-shop-studio"]);
export const OUTCOME_RALLY_SLUGS: ReadonlySet<string> = new Set([
  "bachelorette-blueprint",
  "garden-planner",
  ...rallyConcepts.map((concept) => concept.slug).filter((slug) => !DELISTED_SLUGS.has(slug)),
]);

const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/O/1/l/I: links read aloud
export const OUTCOME_SLUG_LENGTH = 12;

// Unguessable by design: a public link is still a random token, never
// derived from the title or the owner, so private outcomes cannot be found
// by guessing. ~60 bits of entropy.
export function newOutcomeSlug(): string {
  const bytes = new Uint8Array(OUTCOME_SLUG_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length]).join("");
}

export function isValidOutcomeSlug(slug: unknown): slug is string {
  return typeof slug === "string" && slug.length === OUTCOME_SLUG_LENGTH && [...slug].every((char) => SLUG_ALPHABET.includes(char));
}

// The public-read rule, in one place: a stored row renders publicly only
// when the owner opted in (is_public = 1) AND the stored document still
// parses and validates. Anything else is indistinguishable from "no such
// link", so a private outcome never leaks its existence.
export function publicOutcomeFromRow(row: { document: string; isPublic: number } | null | undefined): OutcomeDocument | null {
  if (!row || row.isPublic !== 1) return null;
  try {
    const doc: unknown = JSON.parse(row.document);
    return validateOutcomeDocument(doc) ? doc : null;
  } catch {
    return null;
  }
}

export type SaveOutcomeBody = { id?: string; rallySlug: string; title: string; document: OutcomeDocument; isPublic: boolean };

export function validateSaveOutcomeBody(body: unknown): { ok: true; value: SaveOutcomeBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Send the outcome to save." };
  const input = body as Partial<SaveOutcomeBody>;
  if (input.id !== undefined && (typeof input.id !== "string" || !input.id || input.id.length > 64)) return { ok: false, error: "That saved outcome could not be found." };
  if (typeof input.rallySlug !== "string" || !OUTCOME_RALLY_SLUGS.has(input.rallySlug)) return { ok: false, error: "Choose a Rally that offers a shareable outcome." };
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 160) return { ok: false, error: "Give the outcome a title under 160 characters." };
  if (!validateOutcomeDocument(input.document)) return { ok: false, error: "This outcome cannot be saved yet." };
  if (input.isPublic !== undefined && typeof input.isPublic !== "boolean") return { ok: false, error: "Sharing must be on or off." };
  return { ok: true, value: { id: input.id, rallySlug: input.rallySlug, title: input.title.trim(), document: input.document, isPublic: input.isPublic ?? false } };
}

// Where "Make your own" on a public page leads: the free originals live on
// the shop pages, catalog Rallies on their discover listings.
export function rallyListingHref(rallySlug: string): string {
  if (rallySlug === "bachelorette-blueprint" || rallySlug === "garden-planner") return `/shop/${rallySlug}`;
  if (OUTCOME_RALLY_SLUGS.has(rallySlug)) return `/discover/${rallySlug}`;
  return "/";
}
