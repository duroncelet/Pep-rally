const technicalHandoff = `# Pep Rally Technical Handoff

## 1. Product

Pep Rally is a two-sided marketplace for focused, working mini-apps. A customer receives the usable app, a private workspace, the finished outcome it promises, and practical exports or next actions. Markdown, PDF, calendar, CSV, and source files support the app; they are not the product by themselves.

## 2. Production architecture

- Next.js 16, React 19, Vinext, and Vite
- Cloudflare Workers at peprally.fun
- Cloudflare D1 for plans, purchases, reviews, and creator listings
- Private Cloudflare R2 storage for creator uploads
- Clerk for Pep Rally-owned email and Google accounts
- Stripe Checkout in test mode, with verified webhook fulfillment
- Open-Meteo for weather and geocoding without an API key

The original ChatGPT-hosted prototype remains available as a fallback during migration, but production identity and data belong to Pep Rally's own services.

## 3. Core outcome contract

Every Rally must accept real context, produce a useful first result, allow human review, and support a real-world next action.

\`\`\`tsx
<Outcome>
  <BringRealContext />
  <ProduceUsefulResult />
  <ReviewAndDecide />
  <SaveShareExportOrAct />
</Outcome>
\`\`\`

## 4. Identity boundary

Clerk is centralized behind the application's identity helper. Public browsing and free Rally previews require no account. Saving, downloading, buying, reviewing, uploading, and publishing require a signed-in Pep Rally user. The helper returns only the ID, primary email, and display name needed by the application.

## 5. Data and files

The D1 schema and ordered migrations live in \`db/\` and \`drizzle/\`. The \`DB\` binding is reserved for D1. Static site assets use \`ASSETS\`; private creator uploads use the separate \`RALLY_UPLOADS\` R2 binding so public assets and customer files cannot collide.

## 6. Stripe checkout

Checkout is enabled only when Cloudflare has a Stripe test secret. Purchase access is fulfilled only after Stripe reports the Checkout Session as paid. The webhook endpoint verifies the Stripe signature before updating entitlement. Stripe Connect is required before real creator payouts.

## 7. Deployment

1. Keep all secrets in Cloudflare's encrypted secret store.
2. Apply every D1 migration in order.
3. Run \`pnpm test\` and \`pnpm run deploy:dry\`.
4. Deploy to the Workers staging address and smoke-test public and protected routes.
5. Publish to \`peprally.fun\` only after staging passes.

## 8. Human-control rule

Pep Rally may draft messages, compare choices, calculate estimates, and prepare booking or payment handoffs. The customer reviews and approves messages, reservations, payments, and high-stakes decisions.
`;

export async function GET() {
  return new Response(technicalHandoff, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": 'attachment; filename="Pep-Rally-Technical-Handoff.md"',
      "cache-control": "public, max-age=300",
    },
  });
}
