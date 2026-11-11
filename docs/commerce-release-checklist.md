# Commerce release checklist

Checkout defaults to closed. The Bachelorette Blueprint and Little Garden Planner remain free. Third-party checkout is disabled until creator payouts and access delivery have their own implementation.

## Owner decisions required

- Provide a monitored support email and the companion policies.md. Review actual refund, privacy, delivery and support promises before approving policies.
- Pick a catalog Rally that passes an end-to-end outcome test. Do not enable sales for unfinished concepts.
- Rotate any secret keys previously shared in conversation. Store replacements only in Cloudflare secrets.

## Controlled verification

Configuration names below are server settings, not values to paste into public code.

1. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET for the same Stripe environment. Register /api/stripe/webhook for checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded and charge.dispute.created.
2. Set PEP_RALLY_PAID_SLUGS to only reviewed catalog slugs and PEP_RALLY_CHECKOUT_TESTERS to the owner's Clerk user ID.
3. Use PEP_RALLY_COMMERCE_MODE=test first. Confirm retrying a checkout does not duplicate the order, success unlocks the right account, and another account cannot access it.
4. Before real-money verification, publish approved policies and the support address. Set PEP_RALLY_SUPPORT_EMAIL, PEP_RALLY_SUPPORT_READY=true and PEP_RALLY_POLICIES_APPROVED=true only after those steps are complete.
5. Switch Stripe secrets to live and mode to live-verification. Only named testers can check out. The owner completes a real purchase, verifies the receipt, downloads the outcome, then issues a refund in Stripe Dashboard. Confirm access is revoked and an old payment notification does not restore it. Test purchases do not unlock live entitlements.
6. Enable Stripe's customer receipt settings and verify delivery, rather than assuming a checkout email field sends a receipt. The success page also exposes Stripe's hosted receipt when available.
7. Only after those checks, deliberately change mode to live. Set mode to off to close new purchases without removing existing live entitlements.

## Separate gates still outstanding

- This code is not proof of a live purchase, refund or delivered email. Those require owner-operated verification.
- Support form storage is not a monitored inbox or an email notification service.
- Public API/MCP and paid model generation remain blocked until deployed per-run budget enforcement, metering and the kill switch are verified. Template-only generation must not be represented as paid AI execution.
- Test payment helpers and a successful build do not substitute for full Stripe webhook integration tests.

References: [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [idempotency](https://docs.stripe.com/api/idempotent_requests), [refunds](https://docs.stripe.com/refunds), [receipts](https://docs.stripe.com/receipts).
