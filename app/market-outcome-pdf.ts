import type { RallyConcept } from "./catalog";
import type { WorkingResult } from "./rally-results";
import type { OutcomeDocument } from "./outcome-document";

// Part 1B, step A6: the PDF-first Rallies. Per the outcome-model rule, these
// Rallies lead with the designed packet — the document you hand someone, file
// away, or print — while the mini-site stays secondary or private.
export const PDF_FIRST_SLUGS = [
  "iep-meeting-organizer",
  "roommate-move-out-splitter",
  "etsy-profit-pricing-desk",
  "clinical-rotation-pocket-prep",
  "farmers-market-morning-board",
  "home-project-bid-compare",
] as const;

// PDF-only structural extras, keyed by Rally. These are blank scaffolding the
// buyer completes (signature lines, a letter draft with bracketed blanks) —
// never invented facts — and they serve the spec's named contents: the IEP
// follow-up letter and the roommate signed agreement. Everything on screen
// still appears in the packet; see tests/market-outcome-pdf.test.mjs.
function pdfExtras(slug: string): OutcomeDocument["sections"] {
  if (slug === "iep-meeting-organizer") {
    return [{
      heading: "Follow-up letter draft",
      paragraphs: [
        "Dear [team member or school contact],",
        "Thank you for meeting on [date] to discuss [student name]'s IEP. I am writing to confirm what we agreed: [decisions from the follow-up record above, in your own words].",
        "Please let me know if anything here does not match your notes, and the date by which the agreed steps will be in place. Thank you, [your name] · [phone or email]",
        "Fill in the bracketed blanks before sending. Keep a copy with the meeting record.",
      ],
    }];
  }
  if (slug === "roommate-move-out-splitter") {
    return [{
      heading: "Sign-off",
      paragraphs: [
        "Each roommate signs below once everyone has reviewed the same final summary. A signature confirms the split, the deposit math, and the condition record above.",
        "Name: ______________________  Signature: ______________________  Date: __________",
        "Name: ______________________  Signature: ______________________  Date: __________",
        "Name: ______________________  Signature: ______________________  Date: __________",
        "Name: ______________________  Signature: ______________________  Date: __________",
      ],
    }];
  }
  return [];
}

// The packet mirrors the on-screen working result exactly: same headline,
// same summary, same sections in the same order, plus the guardrail the
// workspace already shows as "Before you use it". A buyer comparing the PDF
// against the screen sees the same outcome.
export function marketOutcomeDocument(concept: RallyConcept, result: WorkingResult): OutcomeDocument {
  return {
    title: result.headline,
    subtitle: result.summary,
    sections: [
      ...result.sections.map((section) => ({
        heading: section.title,
        paragraphs: [...(section.intro ? [section.intro] : []), ...section.items],
      })),
      ...pdfExtras(concept.slug),
      { heading: "Before using it", paragraphs: [concept.guardrail] },
    ],
  };
}
