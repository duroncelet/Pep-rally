# Two-artifact outcome — next workstream, not built this round

Existing implementation offers browser-printable results, portable HTML and immutable URL-fragment snapshots. It does not provide server-rendered downloadable PDF files or a revocable, account-owned shared mini-site. The distinction matters for buyer privacy and for sharing with nontechnical recipients.

Suggested next milestone: free Originals first, using the same validated result model for both outputs. Hosted pages require owner-scoped storage, unguessable share tokens, explicit share consent, revoke/delete, privacy-safe defaults, update semantics and abuse limits. PDF delivery needs a renderer, fonts/assets, multipage layout tests and a download endpoint with the same access policy. Do not publish guest contacts or private contribution preferences by default.

Rough engineering estimate (not a commitment): 1 day to settle sharing/privacy and output contracts; 2–3 days for storage/access/share/revoke; 1–2 days for PDF rendering and layouts; 1–2 days for cross-device, accessibility and adversarial tests. Total 5–8 engineering days for the two free Originals, assuming existing authentication/storage work and no new collaboration or paid-AI features. Each additional template needs separate outcome validation; do not advertise every catalog concept as complete.

Acceptance: buyer creates a real plan; downloadable PDF matches it; shared page opens signed out without exposing private fields; owner can revoke it; exports survive long text and mobile layouts. Review costs and retention before production. Requires a separately approved build/deployment workstream.
