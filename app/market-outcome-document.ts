import type { RallyConcept } from "./catalog";
import type { WorkingResult } from "./rally-results";
import type { OutcomeDocument } from "./outcome-document";

// Part 1B, step B4: the working result as a shareable outcome document, for
// the mini-site-first catalog Rallies (Travel Proposal, Bid Compare). Same
// shape as the on-screen outcome: headline, summary, sections in order, plus
// the guardrail the workspace already shows.
//
// NOTE — twin module: Part 1B A6 (PR #16, branch feat/1b-pdf-first-rallies)
// adds app/market-outcome-pdf.ts with the same conversion plus PDF-only
// extras (the IEP letter draft, the Roommate sign-off lines). The two were
// built on parallel branches so each PR stays independently mergeable.
// After both merge, consolidate: keep the A6 module, delete this one, and
// repoint the B4 import. Do not let the two drift in the meantime.
export function marketOutcomeDocument(concept: RallyConcept, result: WorkingResult): OutcomeDocument {
  return {
    title: result.headline,
    subtitle: result.summary,
    sections: [
      ...result.sections.map((section) => ({
        heading: section.title,
        paragraphs: [...(section.intro ? [section.intro] : []), ...section.items],
      })),
      { heading: "Before using it", paragraphs: [concept.guardrail] },
    ],
  };
}

// Mini-site-first catalog Rallies: the outcome is shared with a client or a
// partner over days and weeks, so the workspace offers a shareable link.
// (The free originals share from their own workspaces; the PDF-first
// Rallies lead with the packet instead — see Part 1B A6.)
export const SHAREABLE_MARKET_SLUGS: ReadonlySet<string> = new Set([
  "travel-proposal-studio",
  "home-project-bid-compare",
]);
