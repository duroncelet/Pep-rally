import type { RallyConcept } from "./catalog";

export type ResultSection = { title: string; intro?: string; items: string[] };
export type WorkingResult = { headline: string; summary: string; sections: ResultSection[] };

function answer(concept: RallyConcept, answers: Record<string, string>, index: number, fallback: string) {
  return answers[concept.inputs[index]]?.trim() || fallback;
}

function pieces(value: string) {
  return value.split(/\n|,|;/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
}

export function createWorkingResult(concept: RallyConcept, answers: Record<string, string>): WorkingResult {
  const first = answer(concept, answers, 0, "the material you provide");
  const second = answer(concept, answers, 1, "your timing and constraints");
  const third = answer(concept, answers, 2, "your priorities");

  switch (concept.slug) {
    case "nclex-study-sprint": {
      const weakAreas = pieces(third);
      return { headline: "Your seven-day NCLEX study sprint", summary: `A source-grounded review plan built around ${second}.`, sections: [
        { title: "Seven-day plan", items: ["Day 1 · Sort your notes by NCLEX client-needs category and mark uncertain claims.", `Day 2 · Active recall: ${weakAreas[0] || "your first weak area"}.`, `Day 3 · Practice and rationale review: ${weakAreas[1] || "your second weak area"}.`, "Day 4 · Mixed recall; log why every missed choice was tempting.", `Day 5 · Teach-back: ${weakAreas[2] || "the hardest concept"}.`, "Day 6 · Timed mixed set and targeted correction.", "Day 7 · Light recall, logistics, and rest plan."] },
        { title: "Flashcard queue", intro: "Turn statements from your own notes into question-first cards.", items: pieces(first).slice(0, 5).map((line) => `Front: What must I recall about “${line}”? · Back: verify against the uploaded source.`).concat(weakAreas.map((area) => `Explain ${area} without looking; then add the missing rationale.`)) },
        { title: "Missed-topic log", items: ["Question/topic", "My incorrect reasoning", "Correct principle + source", "What clue should change my answer next time?"] },
      ]};
    }
    case "clinical-rotation-pocket-prep":
      return { headline: "Your de-identified clinical shift prep", summary: `A practical prep and reflection loop for ${first}.`, sections: [
        { title: "Before the shift", items: [`Review unit basics for ${first}.`, `Bring the instructor requirements: ${third}.`, "Choose two observable learning goals.", "Prepare a blank, de-identified skills log."] },
        { title: "Questions to ask", items: pieces(second).map((goal) => `What would safe, supervised practice of “${goal}” look like today?`).concat(["What should I escalate immediately?", "What feedback should I request before leaving?"]) },
        { title: "After the shift", items: ["What did I observe or practice?", "What feedback changed my understanding?", "What should I review before the next shift?", "Confirm that no patient identifiers were recorded."] },
      ]};
    case "etsy-profit-pricing-desk":
      return { headline: "Your product pricing decision desk", summary: "A visible cost and margin worksheet—not a mystery price.", sections: [
        { title: "True-cost audit", items: pieces(first).map((item) => `Cost line: ${item}`).concat(["Add labor at a real hourly rate.", "Add packaging, spoilage, and rework."]) },
        { title: "Three scenarios", items: ["Floor price · covers every unit cost and fee, with no growth cushion.", `Target price · covers costs plus your stated margin: ${third}.`, "Premium price · adds room for wholesale, promotions, or higher-touch packaging."] },
        { title: "Before publishing", items: [`Verify current marketplace and payment assumptions: ${second}.`, "Check the final fee percentage against the live platform policy.", "Test whether shipping is included or charged separately.", "Record the final human-approved price and why."] },
      ]};
    case "flashcard-shop-studio":
      return { headline: "Your first flashcard mini-app", summary: `A reviewable study product for ${second}.`, sections: [
        { title: "Starter deck", items: pieces(first).slice(0, 6).map((line) => `Card: turn “${line}” into one answerable recall question; cite the original section on the back.`).concat(["Add one misconception card.", "Add one compare/contrast card."]) },
        { title: "Practice modes", items: ["Learn · reveal with source note", "Recall · type before reveal", "Shuffle · mix categories", "Missed cards · repeat after a delay"] },
        { title: "Sellable listing checklist", items: [`Audience and difficulty: ${second}.`, `Visual style and cadence: ${third}.`, "Show a five-card free sample.", "Confirm ownership of every source and image."] },
      ]};
    case "travel-proposal-studio":
      return { headline: "Your three-direction travel proposal", summary: `A client-ready comparison for ${first}.`, sections: [
        { title: "Direction 1 · Best value", items: [`Stay within ${second}.`, "Prioritize location and flexible cancellation.", "Include one signature experience; keep the rest easy to book."] },
        { title: "Direction 2 · Balanced", items: ["Trade a small budget increase for the strongest overall fit.", `Use the adviser shortlist: ${third}.`, "Show what is included and what still needs confirmation."] },
        { title: "Direction 3 · Signature", items: ["Lead with the most memorable stay or experience.", "Make the premium clear rather than hiding it.", "Recheck all live prices and availability before presenting."] },
      ]};
    case "farmers-market-morning-board":
      return { headline: "Your market-morning board", summary: `A weather-aware pack and stand plan for ${third}.`, sections: [
        { title: "Harvest and inventory", items: pieces(first).map((crop) => `Count, harvest, cool, label, and record: ${crop}`) },
        { title: "Preorders first", items: pieces(second).map((order) => `Separate and mark before open: ${order}`).concat(["Reconcile preorder quantity against available inventory."]) },
        { title: "Load-out and stand", items: [`Review forecast/location: ${third}.`, "Pack weights, bags, labels, cashless-payment backup, signage, shade/rain protection, water, and food-safety supplies.", "Place preorder pickup away from the main sales line.", "Record sell-through and leftovers before leaving."] },
      ]};
    case "iep-meeting-organizer":
      return { headline: "Your calm IEP meeting organizer", summary: "Questions, evidence, and follow-up organized for a productive meeting.", sections: [
        { title: "Meeting agenda", items: ["Confirm participants and purpose.", `Review current goals/documents: ${first}.`, `Share recent observations: ${second}.`, `Discuss family and student priorities: ${third}.`, "Record decisions, owners, and dates."] },
        { title: "Questions to bring", items: ["What progress data supports the current conclusion?", "Which supports are working, and in what settings?", "What will change, who will do it, and how will progress be measured?", "Which questions remain unanswered?"] },
        { title: "Follow-up record", items: ["Decision made", "Evidence referenced", "Person responsible", "Due date", "Document or service still needed"] },
      ]};
    case "roommate-move-out-splitter":
      return { headline: "Your roommate move-out agreement", summary: "A reviewable split of work, money, evidence, and deadlines.", sections: [
        { title: "People and shared items", items: pieces(first).map((item) => `Assign or decide: ${item}`) },
        { title: "Costs and chores", items: pieces(second).map((item) => `Review together: ${item}`).concat(["No payment request is sent until everyone sees the same total."]) },
        { title: "Evidence and sign-off", items: pieces(third).map((item) => `Document: ${item}`).concat(["Photograph each room after cleaning.", "Record key return and forwarding details.", "Have every roommate review the final summary."]) },
      ]};
    case "care-circle-coordinator":
      return { headline: "Your care-circle help plan", summary: "A shared, practical schedule built around what help is actually welcome.", sections: [
        { title: "Welcome help", items: pieces(first).map((need) => `Open need: ${need}`) },
        { title: "Assignments", items: pieces(second).map((person) => `Confirm date, task, and backup with: ${person}`).concat(["Leave unfilled needs visible; do not assume availability."]) },
        { title: "Communication plan", items: [`Use these preferences: ${third}.`, "Prepare one concise update for review.", "Keep private health details out unless explicitly needed and safely handled.", "Confirm who may receive updates."] },
      ]};
    case "home-project-bid-compare":
      return { headline: "Your normalized home-project bid comparison", summary: "A common frame for estimates that use different language.", sections: [
        { title: "Scope comparison", items: pieces(first).map((bid) => `Normalize labor, materials, allowances, exclusions, warranty, and timing for: ${bid}`) },
        { title: "Must-haves and budget", items: pieces(second).map((item) => `Required check: ${item}`).concat(["Separate base scope from options and allowances."]) },
        { title: "Questions before hiring", items: pieces(third).map((item) => `Ask each applicable contractor: ${item}`).concat(["Verify license and insurance.", "Confirm change-order and payment terms.", "Record the homeowner’s final decision and rationale."]) },
      ]};
    default:
      return { headline: `Your ${concept.title} outcome`, summary: concept.promise, sections: concept.outcome.map((title, index) => ({ title, items: [`Built from ${answer(concept, answers, index % concept.inputs.length, "the context you provided")}.`, "Review assumptions and add the missing detail before using it."] })) };
  }
}
