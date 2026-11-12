import type { RallyConcept } from "./catalog";

export type ResultSection = { title: string; intro?: string; items: string[] };
export type WorkingResult = { headline: string; summary: string; sections: ResultSection[] };

// Blank inputs stay blank: no generic phrase is ever substituted for a
// missing answer, so generated output never reads as if the buyer said it.
function answer(concept: RallyConcept, answers: Record<string, string>, index: number) {
  return answers[concept.inputs[index]]?.trim() ?? "";
}

function pieces(value: string) {
  return value.split(/\n|,|;/).map((item) => item.trim().replace(/^(and|or)\s+/i, "").replace(/[.]+$/, "")).filter(Boolean).slice(0, 8);
}

function sentence(value: string) { return value.trim().replace(/[.!?]+$/, ""); }

// A section with no usable items is dropped, so a blank input leaves no
// empty heading behind. Sections that keep generic structure use a neutral
// prompt to fill in the missing input instead of inventing an answer.
function finish(headline: string, summary: string, sections: ResultSection[]): WorkingResult {
  return { headline, summary, sections: sections.filter((section) => section.items.length > 0) };
}

export function createWorkingResult(concept: RallyConcept, answers: Record<string, string>): WorkingResult {
  const first = answer(concept, answers, 0);
  const second = answer(concept, answers, 1);
  const third = answer(concept, answers, 2);

  switch (concept.slug) {
    case "nclex-study-sprint": {
      const weakAreas = pieces(third);
      const recallDay = (day: number, label: string, area?: string) => area ? `Day ${day} · ${label}: ${area}.` : `Day ${day} · Add a topic you missed or feel unsure about to set the recall focus.`;
      const cards = pieces(first).slice(0, 5).map((line) => `Front: What must I recall about “${line}”? · Back: check the answer against your notes or an official source.`);
      const explainCards = weakAreas.map((area) => `Explain ${area} without looking; then add the missing rationale.`);
      return finish("Your seven-day NCLEX study sprint", second ? `A structured review plan built around ${sentence(second)}.` : "A structured seven-day review plan. Add your exam date and available study time to shape it around your schedule.", [
        { title: "Seven-day plan", items: ["Day 1 · Sort your notes by NCLEX client-needs category and mark uncertain claims.", recallDay(2, "Active recall", weakAreas[0]), recallDay(3, "Practice and rationale review", weakAreas[1]), "Day 4 · Mixed recall; log why every missed choice was tempting.", recallDay(5, "Teach-back", weakAreas[2]), "Day 6 · Timed mixed set and targeted correction.", "Day 7 · Light recall, logistics, and rest plan."] },
        { title: "Flashcard queue", intro: "Turn statements from your own notes into question-first cards.", items: cards.concat(explainCards) },
        { title: "Missed-topic log", items: ["Question/topic", "My incorrect reasoning", "Correct principle + source", "What clue should change my answer next time?"] },
      ]);
    }
    case "clinical-rotation-pocket-prep":
      return finish("Your de-identified clinical shift prep", first ? `A practical prep and reflection loop for ${first}.` : "A practical prep and reflection loop for your next shift. Add your unit type to make it specific.", [
        { title: "Before the shift", items: [first ? `Review unit basics for ${first}.` : "Add your unit type above to set the pre-shift review.", third ? `Bring the instructor requirements: ${third}.` : "Add your instructor checklist above to bring the right requirements.", "Choose two observable learning goals.", "Prepare a blank, de-identified skills log."] },
        { title: "Questions to ask", items: pieces(second).map((goal) => `What would safe, supervised practice of “${goal}” look like today?`).concat(["What should I escalate immediately?", "What feedback should I request before leaving?"]) },
        { title: "After the shift", items: ["What did I observe or practice?", "What feedback changed my understanding?", "What should I review before the next shift?", "Confirm that no patient identifiers were recorded."] },
      ]);
    case "etsy-profit-pricing-desk":
      return finish("Your product pricing decision desk", "A visible cost and margin worksheet—not a mystery price.", [
        { title: "True-cost audit", items: pieces(first).map((item) => `Cost line: ${item}`).concat(["Add labor at a real hourly rate.", "Add packaging, spoilage, and rework."]) },
        { title: "Three scenarios", items: ["Floor price · covers every unit cost and fee, with no growth cushion.", third ? `Target price · covers costs plus your stated margin: ${third}.` : "Target price · add your marketplace fees and target margin above to set it.", "Premium price · adds room for wholesale, promotions, or higher-touch packaging."] },
        { title: "Before publishing", items: [second ? `Verify current marketplace and payment assumptions: ${second}.` : "Verify current marketplace and payment assumptions before publishing.", "Check the final fee percentage against the live platform policy.", "Test whether shipping is included or charged separately.", "Record the final human-approved price and why."] },
      ]);
    case "flashcard-shop-studio":
      return finish("Your first flashcard mini-app", second ? `A reviewable study product for ${second}.` : "A reviewable study product. Add your audience and difficulty to shape it.", [
        { title: "Starter deck", items: pieces(first).slice(0, 6).map((line) => `Card: turn “${line}” into one answerable recall question; cite the original section on the back.`).concat(["Add one misconception card.", "Add one compare/contrast card."]) },
        { title: "Practice modes", items: ["Learn · reveal with source note", "Recall · type before reveal", "Shuffle · mix categories", "Missed cards · repeat after a delay"] },
        { title: "Sellable listing checklist", items: [second ? `Audience and difficulty: ${second}.` : "Add your audience and difficulty above to finish the listing checklist.", third ? `Visual style and cadence: ${third}.` : "Add your visual style and review cadence above to finish the listing checklist.", "Show a five-card free sample.", "Confirm ownership of every source and image."] },
      ]);
    case "travel-proposal-studio":
      return finish("Your three-direction travel proposal", first ? `A client-ready comparison for ${first}.` : "A client-ready comparison of three directions. Add your destination and dates to make it specific.", [
        { title: "Direction 1 · Best value", items: [second ? `Stay within ${second}.` : "Add your budget and traveler preferences above to set the value direction.", "Prioritize location and flexible cancellation.", "Include one signature experience; keep the rest easy to book."] },
        { title: "Direction 2 · Balanced", items: ["Trade a small budget increase for the strongest overall fit.", third ? `Use the adviser shortlist: ${third}.` : "Add your advisor hotel and activity shortlist above.", "Show what is included and what still needs confirmation."] },
        { title: "Direction 3 · Signature", items: ["Lead with the most memorable stay or experience.", "Make the premium clear rather than hiding it.", "Recheck all live prices and availability before presenting."] },
      ]);
    case "farmers-market-morning-board":
      return finish("Your market-morning board", third ? `A weather-aware pack and stand plan for ${third}.` : "A weather-aware pack and stand plan. Add your market location and forecast to make it specific.", [
        { title: "Harvest and inventory", items: pieces(first).map((crop) => `Count, harvest, cool, label, and record: ${crop}`) },
        { title: "Preorders first", items: pieces(second).map((order) => `Separate and mark before open: ${order}`).concat(["Reconcile preorder quantity against available inventory."]) },
        { title: "Load-out and stand", items: [third ? `Review forecast/location: ${third}.` : "Add your market location and forecast above to check conditions before load-out.", "Pack weights, bags, labels, cashless-payment backup, signage, shade/rain protection, water, and food-safety supplies.", "Place preorder pickup away from the main sales line.", "Record sell-through and leftovers before leaving."] },
      ]);
    case "iep-meeting-organizer":
      return finish("Your calm IEP meeting organizer", "Questions, evidence, and follow-up organized for a productive meeting.", [
        { title: "Meeting agenda", items: ["Confirm participants and purpose.", first ? `Review current goals/documents: ${first}.` : "Add your existing goals and documents above to review them here.", second ? `Share recent observations: ${second}.` : "Add your recent observations above to share them here.", third ? `Discuss family and student priorities: ${third}.` : "Add your questions and priorities above to discuss them here.", "Record decisions, owners, and dates."] },
        { title: "Questions to bring", items: ["What progress data supports the current conclusion?", "Which supports are working, and in what settings?", "What will change, who will do it, and how will progress be measured?", "Which questions remain unanswered?"] },
        { title: "Follow-up record", items: ["Decision made", "Evidence referenced", "Person responsible", "Due date", "Document or service still needed"] },
      ]);
    case "roommate-move-out-splitter":
      return finish("Your roommate move-out agreement", "A reviewable split of work, money, evidence, and deadlines.", [
        { title: "People and shared items", items: pieces(first).map((item) => `Assign or decide: ${item}`) },
        { title: "Costs and chores", items: pieces(second).map((item) => `Review together: ${item}`).concat(["No payment request is sent until everyone sees the same total."]) },
        { title: "Evidence and sign-off", items: pieces(third).map((item) => `Document: ${item}`).concat(["Photograph each room after cleaning.", "Record key return and forwarding details.", "Have every roommate review the final summary."]) },
      ]);
    case "care-circle-coordinator":
      return finish("Your care-circle help plan", "A shared, practical schedule built around what help is actually welcome.", [
        { title: "Welcome help", items: pieces(first).map((need) => `Open need: ${need}`) },
        { title: "Assignments", items: pieces(second).map((person) => `Confirm date, task, and backup with: ${person}`).concat(["Leave unfilled needs visible; do not assume availability."]) },
        { title: "Communication plan", items: [third ? `Use these preferences: ${third}.` : "Add your communication preferences above to set how updates go out.", "Prepare one concise update for review.", "Keep private health details out unless explicitly needed and safely handled.", "Confirm who may receive updates."] },
      ]);
    case "home-project-bid-compare":
      return finish("Your normalized home-project bid comparison", "A common frame for estimates that use different language.", [
        { title: "Scope comparison", items: pieces(first).map((bid) => `Normalize labor, materials, allowances, exclusions, warranty, and timing for: ${bid}`) },
        { title: "Must-haves and budget", items: pieces(second).map((item) => `Required check: ${item}`).concat(["Separate base scope from options and allowances."]) },
        { title: "Questions before hiring", items: pieces(third).map((item) => `Ask each applicable contractor: ${item}`).concat(["Verify license and insurance.", "Confirm change-order and payment terms.", "Record the homeowner’s final decision and rationale."]) },
      ]);
    default:
      return finish(`Your ${concept.title} outcome`, concept.promise, concept.outcome.map((title) => ({ title, items: [concept.inputs.some((input) => answers[input]?.trim()) ? "Built from the context you provided." : "Add your context above to build this section from your details.", "Review assumptions and add the missing detail before using it."] })));
  }
}
