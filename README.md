# Pep Rally

Pep Rally is a two-sided marketplace for focused mini-apps that turn everyday inputs into finished outcomes. Customers can shop free or paid Rallies, use them as working apps, and keep saved results. Makers can build inside Pep Rally or bring an existing app, add the hard connections, and publish it.

## What is included

- Consumer marketplace and discovery pages
- Creator build-or-upload studio
- Bachelorette Blueprint and Little Garden Planner
- Customer library and saved workspaces
- D1-backed listings, plans, purchases, usage, and reviews
- R2-backed private creator uploads
- Open-Meteo weather integration
- Stripe test checkout and webhook fulfillment path
- Email, text, maps, reservation, payment-link, and calendar handoffs

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open the local address printed in the terminal.

To validate a production build:

```bash
npm test
```

## Optional private keys

Copy `.env.example` to `.env.local` and add only the services you want to test.

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
```

Never put live keys in source code or commit `.env.local`.

The Garden Planner uses Open-Meteo and does not require a weather API key. Database and private file storage are supplied by the hosted Pep Rally environment. The current private prototype uses host-provided ChatGPT identity headers; an independent public deployment should replace that layer with its own customer authentication.

## Important locations

- `app/page.tsx` — marketplace homepage
- `app/build/page.tsx` — creator studio
- `app/rally/bachelorette/page.tsx` — Bachelorette Blueprint
- `app/rally/garden/page.tsx` — Little Garden Planner
- `app/api/` — marketplace, storage, weather, checkout, and workspace endpoints
- `app/stripe.ts` — Stripe checkout verification and fulfillment
- `db/schema.ts` — application data model
- `drizzle/` — database migrations
- `app/globals.css` — Pep Rally visual system
- `tests/rendered-html.test.mjs` — product and build checks

## Deployment notes

This project is built with Next.js, React, Vinext, Cloudflare Workers, D1, R2, and Drizzle. Its current Sites configuration lives in `.openai/hosting.json`.

For a move to another host, retain the pages and visual system, then replace the platform-specific pieces deliberately:

1. Provision a SQL database and object storage.
2. Replace host-provided identity with the new host's authentication.
3. Add Stripe test credentials and register the webhook route.
4. Apply the Drizzle migrations.
5. Configure environment variables through the host's secret manager.
6. Run `npm test` before publishing.

See `Pep-Rally-Technical-Handoff.md` for the product contract, architecture, connector map, and representative code.
