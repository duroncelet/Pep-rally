import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { rallyConcepts } from "../app/catalog.ts";
import { createWorkingResult } from "../app/rally-results.ts";

// Regression test for the template-filler bug: a preview generated from blank
// inputs must never echo a form field label back as if it were the buyer's
// answer, substitute a generic phrase for a missing answer, or print a
// "Not answered" line. Sections with no user input are omitted or carry a
// neutral prompt to fill the input in.
const FORBIDDEN = [
  "the material you provide",
  "your timing and constraints",
  "your priorities",
  "the context you provided",
  "your first weak area",
  "your second weak area",
  "the hardest concept",
  "Not answered",
  "Not supplied yet",
];

function renderedText(result) {
  // Section titles are fixed template headings, not user answers, so the
  // label check covers only the headline, summary, and item text.
  return [result.headline, result.summary, ...result.sections.flatMap((section) => [section.intro ?? "", ...section.items])].join("\n");
}

for (const concept of rallyConcepts) {
  test(`blank preview for ${concept.slug} contains no filler`, () => {
    const result = createWorkingResult(concept, {});
    const text = renderedText(result);
    for (const label of concept.inputs) assert.ok(!text.includes(label), `${concept.slug} echoes input label: ${label}`);
    for (const phrase of FORBIDDEN) assert.ok(!text.includes(phrase), `${concept.slug} contains filler phrase: ${phrase}`);
    for (const section of result.sections) assert.ok(section.items.length > 0, `${concept.slug} has an empty section: ${section.title}`);
  });

  test(`whitespace-only preview for ${concept.slug} contains no filler`, () => {
    const answers = Object.fromEntries(concept.inputs.map((input) => [input, "   \n "]));
    const text = renderedText(createWorkingResult(concept, answers));
    for (const label of concept.inputs) assert.ok(!text.includes(label), `${concept.slug} echoes input label: ${label}`);
    for (const phrase of FORBIDDEN) assert.ok(!text.includes(phrase), `${concept.slug} contains filler phrase: ${phrase}`);
  });

  test(`partial preview for ${concept.slug} keeps only the answered input`, () => {
    const answers = { [concept.inputs[0]]: "Real answer here" };
    const result = createWorkingResult(concept, answers);
    const text = renderedText(result);
    assert.ok(text.includes("Real answer here"), `${concept.slug} drops the answered input`);
    for (const label of concept.inputs.slice(1)) assert.ok(!text.includes(label), `${concept.slug} echoes unanswered input label: ${label}`);
    for (const phrase of FORBIDDEN) assert.ok(!text.includes(phrase), `${concept.slug} contains filler phrase: ${phrase}`);
  });
}

test("customization kit lists only supplied context", async () => {
  // Source-level check: the kit is imported extensionless by the app, which
  // plain node cannot resolve, so verify the generator source directly.
  const kit = await readFile(new URL("../app/customization-kit.ts", import.meta.url), "utf8");
  assert.doesNotMatch(kit, /Not supplied yet/);
  assert.match(kit, /currentAnswers\[input\]\?\.trim\(\)/);
  assert.match(kit, /No context entered yet\. Fill in the inputs in the workspace before customizing\./);
});

test("workspace outcome download lists only supplied context", async () => {
  const workspace = await readFile(new URL("../app/rally/market/[slug]/RallyWorkspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(workspace, /Not answered/);
  assert.match(workspace, /answers\[item\]\?\.trim\(\)/);
  assert.match(workspace, /No context entered yet\. Fill in the inputs in the workspace to record what you brought\./);
});
