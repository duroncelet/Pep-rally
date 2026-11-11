# Closing the launch journey

## Done in the product
- Search includes free planners and community listings.
- Account library and verified review eligibility read actual planner saves.
- Free planners have browser recovery and a read-only HTML / print-to-PDF outcome.
- Party export excludes private organizer information; balances are opt-in.
- Public paid checkout is closed; only explicitly allowlisted accounts can exercise Stripe test checkout.
- Support requests are stored privately in R2 under `support/<owner>/<date>/<reference>.json`.

## Required human / operational work before selling
1. Assign a support operator. Review the private R2 support prefix daily using the Cloudflare dashboard; contact the account email for follow-up. No email delivery or monitoring is implied by storing a request.
2. Choose one real outside creator; do not invent a listing or testimonial. Ask permission to pilot their app and agree responsibility for uptime, privacy, maintenance and support.
3. Have that creator publish a free working link. Test as a stranger on mobile and desktop: discover → open → enter inputs → finish → save/download → return. Record observed failures and fix them before inviting buyers.
4. Define purchase duration, usage limits, refund rules, creator payouts, legal terms, tax handling and access enforcement for externally hosted apps.
5. In an isolated test account, set PEP_RALLY_CHECKOUT_TESTERS to allowed user IDs. Exercise test payment success/cancel/failure, duplicate webhook, ownership checks and return visits. Never use live cards in sandbox.
6. Activate live payments only after those checks pass and appropriate Stripe onboarding is complete. The present route deliberately rejects live keys.

## Remaining product work (not claimed complete)
- Revocable public share links / guest collaboration (current sharing is an immutable URL-fragment snapshot or portable file; anyone with it can read it).
- Automatic app generation, sandboxed hosting and connector provisioning (current builder collects briefs).
- Automatic, authoritative zone/frost lookup and crop-spacing simulation (manual verified inputs remain the source).
- Multi-device save conflict handling and automatic account saves (browser recovery is not sync).
