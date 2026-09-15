import { markdownCell } from "./download-markdown";

type CustomizationKitInput = {
  title: string;
  promise: string;
  audience: string;
  inputs: readonly string[];
  outputs: readonly string[];
  guardrail: string;
  currentAnswers?: Record<string, string>;
};

export function buildCustomizationKit({ title, promise, audience, inputs, outputs, guardrail, currentAnswers = {} }: CustomizationKitInput) {
  return `# Customize ${title}

This is a portable, plain-Markdown customization brief. It has no tool-specific commands and can be used with ChatGPT, Claude, Gemini, Codex, Cursor, Replit Agent, or another AI builder that accepts text files.

## What this file is

- A product contract, your current context, and four ready-to-use prompts.
- Enough for an AI assistant to redesign the workflow, questions, output, or connection plan.
- Not the executable app code by itself. For a working code change, attach this file **and** the [Pep Rally source ZIP](https://pep-rally-mvp.kelzcore.chatgpt.site/downloads/Pep-Rally-Source.zip) to your AI builder.

## How to use it

1. Upload this Markdown file to the AI tool you prefer.
2. To change the working app, upload the source ZIP in the same conversation or project.
3. Replace the bracketed text in one prompt below, then send that prompt.
4. Ask the tool to show what it changed and test the complete customer outcome before you publish.
5. Never paste API keys or payment credentials into the prompt. Add secrets only through the host’s protected secret settings.

If your tool cannot accept ZIP files, unzip the source and upload the project folder or the relevant files. If you only want a customized plan or product brief—not code—this Markdown file is enough on its own.

## Current product contract

- **For:** ${markdownCell(audience)}
- **Promise:** ${markdownCell(promise)}
- **Required inputs:** ${inputs.map(markdownCell).join("; ")}
- **Finished outcome:** ${outputs.map(markdownCell).join("; ")}
- **Human safety line:** ${markdownCell(guardrail)}

## Context already entered

${inputs.map((input) => `- **${input}:** ${markdownCell(currentAnswers[input] || "Not supplied yet")}`).join("\n")}

## Portable starter prompt

> Read the attached Rally customization brief first. If source files are attached, inspect the existing application before changing it. Preserve the visual identity and the complete input → first result → review → save → export loop. Keep all important human approvals visible. Tell me what you plan to change, make the changes, test the finished customer outcome, and give me a short list of anything that still requires an account, API key, partner approval, or hosting setup. Do not turn the app into a landing page, a pile of instructions, or a chat-only experience.

## Prompt 1 — Change it for my exact situation

> Adapt this Rally for the following person and situation: [DESCRIBE THE PERSON, PROBLEM, AND MOMENT]. Preserve the existing visual identity and the complete input → first result → review → save → export loop. Explain which fields, calculations, output sections, and guardrails must change before editing. Do not replace the working app with a landing page or chat-only experience.

## Prompt 2 — Change the questions and finished result

> The customer should bring: [LIST THE REAL INPUTS]. They should leave with: [LIST THE FINISHED OUTCOME]. Update the Rally so it asks only for information needed to create that outcome, produces a useful first result immediately, lets the customer correct assumptions, saves their work, and exports a clean Markdown result. Include helpful empty, error, and partial-input states.

## Prompt 3 — Add a connection safely

> Add this outside service or live-data source: [SERVICE]. Treat it as reference, sync, draft, or action: [CHOOSE ONE]. State the source of truth, freshness, user permission, failure behavior, and expected operating cost. Keep credentials server-side. Require human confirmation before sending messages, booking, purchasing, moving money, or making a high-stakes decision. Do not claim the connection works until it is callable and tested.

## Prompt 4 — Test the customer outcome

> Test this Rally with one realistic case, one incomplete case, and one awkward edge case. Verify that the promised outcome can be completed, saved, reopened, and exported; that mobile use is practical; that links and connections go to the intended place; and that claims, numbers, and example data are labeled honestly. Fix blocking issues while preserving the Pep Rally look and feel.

## Expected handoff from the AI builder

- The updated working app or a clear implementation plan if no source was supplied.
- A list of changed files or product decisions.
- The realistic, incomplete, and awkward test results.
- A clear list of connections that are live, simulated, or still require setup.
- No secrets, invented reviews, fabricated usage, or untested “connected” claims.

## Decisions to make before customizing

1. Who has this problem repeatedly?
2. What exact job should be finished?
3. What workaround does this replace?
4. What real information must the customer provide?
5. What should the first useful result contain?
6. Which judgment or action must remain with the person?
7. What should be saved, shared, or downloaded?
8. Which outside service is essential rather than merely nice to have?

---
Generated by Pep Rally · portable customization kit
`;
}
