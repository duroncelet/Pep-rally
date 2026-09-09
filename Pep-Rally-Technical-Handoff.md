# Pep Rally Technical Handoff

_Product definition, architecture, setup, and representative code for moving or continuing the MVP._

## 1. The product

Pep Rally is a marketplace where people buy and sell focused, working apps that turn real-life inputs into finished outcomes.

A Rally is not primarily a PDF, prompt, Markdown file, or folder of code. The customer gets:

1. The usable mini-app.
2. A private workspace for their information.
3. The finished result the app promises.
4. A way to save, share, export, book, message, pay, or otherwise act on that result.

The code in this package implements the current private MVP, including its consumer marketplace, maker studio, two free example Rallies, saved workspaces, uploads, weather, checkout, and reviews.

## 2. Technology

- Next.js 16 and React 19
- Vinext and Vite for a Cloudflare-compatible build
- Cloudflare Workers runtime
- Cloudflare D1 with Drizzle ORM
- Cloudflare R2 for private creator source uploads
- Stripe Checkout using direct HTTPS requests
- Open-Meteo for weather and geocoding
- Host-provided ChatGPT identity for the private prototype

## 3. How the pieces connect

```text
Customer or maker
       |
       v
Next/React pages
       |
       +--> Marketplace and Rally APIs --> D1 database
       +--> Creator uploads -----------> R2 storage
       +--> Checkout ------------------> Stripe
       +--> Garden weather ------------> Open-Meteo
       +--> Email/text/maps/calendar --> reviewed handoffs
```

The human stays in control of messages, reservations, payments, and high-stakes decisions.

## 4. Run it

```bash
npm install
npm run dev
```

Validate before publishing:

```bash
npm test
```

Optional local secrets:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
```

The Garden Planner's weather lookup does not require an API key.

## 5. File map

```text
app/
  page.tsx                         Marketplace homepage
  globals.css                     Full Pep Rally visual system
  build/page.tsx                  Build-or-upload creator studio
  library/page.tsx                Customer library
  rally/bachelorette/page.tsx     Free Bachelorette Blueprint
  rally/garden/page.tsx           Free Little Garden Planner
  shop/[slug]/                    Product listings and verified reviews
  discover/[slug]/                Researched ideas to build
  api/                             Server endpoints
  stripe.ts                       Checkout verification and fulfillment
db/
  schema.ts                       D1 data model
drizzle/                          Database migrations
public/                           Images and downloadable assets
tests/                            Product and build checks
```

## 6. Core outcome contract

The homepage encodes the standard every Rally must satisfy:

```tsx
<section className="outcome-standard">
  <article>
    <h3>Bring real context</h3>
    <p>Dates, notes, measurements, budget, constraints, or source material.</p>
  </article>
  <article>
    <h3>Get a first useful result</h3>
    <p>A plan, comparison, study system, calculation, shortlist, or decision draft.</p>
  </article>
  <article>
    <h3>Review and decide</h3>
    <p>Correct assumptions and keep important human judgment with the customer.</p>
  </article>
  <article>
    <h3>Use it outside the app</h3>
    <p>Save, share, export, or take the next real-world action.</p>
  </article>
</section>
```

## 7. Identity boundary

The private prototype receives identity from its current host. Protected endpoints use this helper pattern:

```ts
import { headers } from "next/headers";

export async function getChatGPTUser() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");

  if (!userId || !email) return null;
  return { userId, email };
}
```

When moving to Replit, Vercel, or another host, preserve the application-level user ID but replace this helper with that platform's authentication provider. Do not rewrite every feature separately.

## 8. Database and storage

`db/schema.ts` defines users' saved Rallies, party plans, garden plans, purchases, reviews, creator apps, events, and improvement requests. Routes obtain the Drizzle database through the D1 binding:

```ts
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) throw new Error("Database binding is unavailable");
  return drizzle(env.DB, { schema });
}
```

Creator project uploads are stored privately in R2 rather than exposed as public URLs:

```ts
const key = `creator-source/${user.userId}/${crypto.randomUUID()}-${safeName}`;
await env.ASSETS.put(key, file.stream(), {
  httpMetadata: { contentType: file.type || "application/octet-stream" },
  customMetadata: { owner: user.userId, originalName: file.name },
});
```

For another host, map D1 to Postgres or managed SQLite and map R2 to S3-compatible object storage. Apply every migration in `drizzle/` in order.

## 9. Stripe checkout

The MVP creates hosted Stripe Checkout sessions with test-mode credentials:

```ts
const params = new URLSearchParams();
params.set("mode", "payment");
params.set("success_url", input.successUrl);
params.set("cancel_url", input.cancelUrl);
params.set("customer_email", input.buyerEmail);
params.set("line_items[0][price_data][currency]", "usd");
params.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
params.set("line_items[0][price_data][product_data][name]", input.title);
params.set("line_items[0][quantity]", "1");

const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
  method: "POST",
  headers: {
    authorization: `Bearer ${secret}`,
    "content-type": "application/x-www-form-urlencoded",
  },
  body: params,
});
```

Access is unlocked only after the saved purchase matches the Stripe session and Stripe reports it as paid. The webhook route verifies Stripe's HMAC signature before fulfillment.

Before real marketplace payments, add Stripe Connect so each creator has a verified payout account and Pep Rally can collect its platform fee without acting as the merchant for every seller.

## 10. Weather without an API key

The Garden Planner geocodes the customer's location and requests forecast data from Open-Meteo:

```ts
const geocode = await fetch(
  `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`,
);

const forecast = await fetch(
  `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
  "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto",
);
```

Keep this server-side so the user sees a simple location field and the app owns error handling.

## 11. Connector philosophy

Pep Rally should own the difficult last mile while making permissions obvious.

| Capability | MVP behavior | Public-launch direction |
|---|---|---|
| Accounts | Host-provided ChatGPT identity | Pep Rally-owned authentication |
| Payments | Stripe test Checkout | Stripe Connect payouts and refunds |
| Email | Opens a reviewed draft | Transactional provider with consent |
| Text | Opens a reviewed draft | Messaging provider with consent |
| Weather | Live Open-Meteo data | Keep; add caching and monitoring |
| Maps and booking | Provider search handoffs | Partner booking APIs where valuable |
| Calendar | Downloadable ICS | Optional Google/Apple calendar connection |
| Files | Private R2 objects | Add scanning, limits, retention, and exports |
| AI | Key slot exists | Purpose-built assistance with evaluation and budgets |

## 12. Bachelorette Blueprint scope

The lead free Rally is a one-stop group-trip workspace with:

- Anonymous contribution limits
- Hotel, Airbnb, and VRBO comparisons
- Itinerary and vibe planning
- Restaurant, activity, and reservation handoffs
- Group chat plus coordinated email and text drafts
- Shared expenses and payment-request links
- Décor, packing, safety, notes, and calendar export

The important outcome is not “a planning template.” It is a group-aligned, budget-aware weekend plan people can act on.

## 13. Production checklist

- Replace prototype identity with independent accounts.
- Configure Stripe test keys and verified webhooks.
- Add Stripe Connect before creator payouts.
- Provision database and private object storage.
- Add upload scanning, size limits, and retention rules.
- Add moderation, support, refund, privacy, and marketplace policies.
- Add production email/text providers only with clear consent.
- Add error monitoring, rate limits, budgets, backups, and analytics.
- Test purchase, save, review, upload, and failure paths end to end.
- Keep secrets in the host's secret manager—never in the ZIP or source repository.

## 14. What is in the ZIP

The downloadable source ZIP contains the complete tracked project: pages, styles, server routes, schema, migrations, public assets, tests, configuration, this handoff, and the README. It deliberately excludes dependencies, build output, local databases, credentials, environment files, and Git history.

That makes the ZIP appropriate for importing into Replit or handing to another engineer. After import, follow the README and replace the hosting-specific identity, database, and file-storage layers as needed.
