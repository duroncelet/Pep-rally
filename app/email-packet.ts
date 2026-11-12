import { safeFileName } from "./download-markdown.ts";

// Part 1B, step D1: email the PDF packet.
//
// There is no email-sending service in this repo (no Resend/SendGrid/
// Mailgun, no mail binding) — the support flow uses the same mailto-draft
// pattern. So "email the PDF" downloads the packet and opens a prefilled
// email draft in the buyer's own mail client; she attaches the downloaded
// file. Server-side sending needs Kelly to choose a mail provider first —
// a named follow-up, not this step. See the D1 PR description.
export function packetEmailDraft(input: { to: string; title: string; shareUrl?: string }) {
  const to = input.to.trim();
  const title = input.title.trim();
  if (to.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Enter a valid email address.");
  if (!title || title.length > 160) throw new Error("Give the outcome a title under 160 characters.");
  const fileName = `${safeFileName(title)}.pdf`;
  const body = [
    `Hi — I'm sharing the packet for ${title}. Download the PDF, then attach it to this email.`,
    ...(input.shareUrl ? [``, `You can also read it online: ${input.shareUrl}`] : []),
    ``,
    `Made with Pep Rally.`,
  ].join("\n");
  return { mailto: `mailto:${to}?subject=${encodeURIComponent(`Your ${title} packet`)}&body=${encodeURIComponent(body)}`, fileName };
}
