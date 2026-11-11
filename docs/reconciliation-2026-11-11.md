# November 11 baseline reconciliation

## Verified today

- GitHub main and Muse's fix/price-double-dollar both resolve to 4c1b4dfcab3aebb3846d16043fd37a64ecc05263 (September 22). Neither branch contains the newer local changes.
- The newer source lives in this local site directory. It was left uncommitted, not placed in a separate application repository.
- wrangler.jsonc targets Cloudflare Worker pep-rally, peprally.fun and www.peprally.fun, D1 pep-rally and R2 pep-rally-uploads. Production HTTP responses identify Cloudflare and Vinext; /support responds with the app, unlike GitHub main which has no support route.
- September 28 QA records document deploying newer planner/search/share/support work. The previously recorded deployment ID is 9dcf4a7e-3f30-48a8-ace6-bf3b3c139967. This historical ID is NOT independently reverified today.
- Cloudflare deployment inventory could not be read: the saved authorization expired. Exact correspondence between today's live bundle and any local source snapshot remains unverified. Do not redeploy main to resolve this.

## What this branch preserves

This is a recovery baseline, not a claim that every change is deployed. It preserves prior planner grids, journals, calendars, shared snapshots and portable outcomes; free-Rally search; account library integration; support storage; bounded template runtime; tests; and subsequent local checkout safeguards. The latter were not deployed in the prior work session.

Payment safeguards fail closed, separate test/live entitlements and restrict checkout to explicitly enabled catalog products. No settings are changed by this PR. No charges, refunds, migrations or deployments were performed during reconciliation.

## Review brief reconciliation

- Price formatting: owned by Muse; no new price fix in this branch. Pre-existing edits touching listing files must be considered before Muse rebases.
- NCLEX honesty and blank-input filler: inspect against this baseline in separate PRs, not the September snapshot.
- Support: route and authenticated storage already exist. A public email and signed-out contact path still need verification. support@peprally.fun is named by the brief but mailbox operation has not been confirmed.
- Search: free Originals are already indexed locally; avoid rebuilding the feature from stale findings.
- Garden weather: re-evaluate current location refresh and probability logic before fixing.
- Two artifacts: printable browser output and portable HTML/shared URL snapshots already exist. They are not server-generated PDFs or revocable, hosted buyer workspaces. Keep the latter as a separate workstream.

## Gates before follow-on changes or release

1. Restore Cloudflare authorization through the owner login flow and read deployment metadata. Confirm active source/version before deployment.
2. Review this recovery PR and align Muse with the branch. Do not automatically merge or push to main.
3. Keep checkout closed/test-only pending owner activation and policy/support validation. Per-run budget enforcement must be deployed and verified before paid inference or the public API.
4. The runtime budget SQL migration was previously reported to fail on remote application; local tests do not prove production enforcement. Do not apply it blindly.
5. Open one separate PR per remaining verified task. Do not start the new two-artifact workstream in this round.
