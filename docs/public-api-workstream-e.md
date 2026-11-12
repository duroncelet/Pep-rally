# Public API — implementation decisions

Status: blocked from release until shared runtime B and enforcement C pass integration tests. No public routes or paid generation are enabled by this change.

## Contract amendments to draft v0.1

- Enforce one owner/account monthly ceiling plus optional tighter per-key ceilings. Creating keys never increases the account allowance. Use UTC billing months.
- Reserve a conservative upper bound atomically before every billable operation. Include outstanding reservations when enforcing caps. Reconcile verified usage afterward; unknown outcomes retain the reservation pending reconciliation. Use integer microcents internally and expose aggregate cents only to the owner.
- Provider adapters must bound input, output, tool use, retries and pricing before dispatch. Reject unpriced or unbounded operations. The ledger alone is not a provider cost guarantee.
- Idempotency identity is owner + key + method + canonical endpoint + client UUID. Store a canonical body hash; a mismatched body returns 409. Concurrent identical requests share one operation. Keep records for at least 24 hours; do not re-execute while an operation is pending.
- Generate each artifact export once per artifact version. Cache downloads. PDF generation is subject to both session and account caps, not exempt from account accounting. Advertise only formats that actually exist.
- Webhooks include unique event ID and signed timestamp alongside raw-body authentication. Reject stale signatures; receivers deduplicate events. Validate resolved destinations and redirects against private/reserved networks on each delivery. Provide secret rotation, endpoint deletion, delivery status, and authenticated owner management.
- Public rally descriptions expose an allowlisted listing contract, never executable instructions or raw specs. Apply allowlists recursively to drafts, errors, artifacts and provenance.
- A session creation that only initializes state returns 201; asynchronous generation returns 202. Do not acknowledge background work without durable dispatch. Infrastructure failures before a session exists return sanitized 503 with a request ID, not a fictional fallback artifact.
- Cancellation, revocation, and the global switch block the next operation; an already dispatched operation must reconcile its reservation. Fallback preserves existing work. Expiry must not strand unaccounted in-flight work.
- Full mode stays disabled until entitlement consumption is atomic and tested. Preview limits apply to the owner as well as the key to prevent key farming.
- No claims about provider training, third-party connector compatibility, or supported PDF delivery until verified for the actual deployment.

## Build and release order

1. Budget ledger and failure tests (initial migration and local SQLite tests added).
2. Durable owner-scoped sessions, shared input validation, versioned artifacts, atomic transition/idempotency records, and dispatch/recovery worker.
3. Bachelorette adapter and web integration, preserving guest preview and current design. Template generation must remain identified as such; no paid model enabled implicitly.
4. Provider cost adapter, reservation/reconciliation, kill-switch/revocation integration, concurrent D1 integration tests, crash recovery, and expiry handling.
5. REST authentication, hashed keys, account/key limits, entitlements, owner-isolation tests and staging quickstart.
6. Webhook delivery and MCP through the same service, never loopback HTTP or a second meter.
7. End-to-end staging and red-team checks before explicitly enabling public access.

## Current implementation boundary

### Shared planner session slice (September 23)

Implemented locally: `/api/runs` uses Clerk ownership, validates a complete answer set, persists a deterministic starting draft, supports latest-draft retrieval and Markdown downloads, and limits revisions to three with optimistic version checks. Session creation deduplicates owner/request IDs and rejects changed answers. The Bachelorette intake uses this endpoint for signed-in users; guests use the same validation/generator locally. A collapsed saved-draft control requires explicit confirmation before replacing workspace details. Existing editable workspace saving is unchanged.

This is not the v1 public API contract: no bearer keys, asynchronous generation, per-answer persistence, expiry, public idempotent revision replay, or paid inference. Draft generation costs zero and does not call a model. Apply migration `0012_planner_runs.sql` before deploying this client; otherwise signed-in generation will return a safe unavailable error. Migration 0011 is still separate and default-off. Local build and unit/storage tests pass; authenticated browser and deployed D1 integration remain release checks. Neither migration has been applied to production in this pass.

`0011_runtime_budget_ledger.sql` is an unapplied foundation, not deployed enforcement. It guards per-session spend, account spend, steps, tools, stop state and a default-off switch within an atomic database insert. Settlement is one-way and cannot exceed the reservation. It is not yet wired to a provider or the website, and does not yet implement per-key limits, sessions API, expiry, queueing, or reconciliation recovery. Production remains unchanged.
