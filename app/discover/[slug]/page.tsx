import type { Metadata } from "next";
import { findConcept, rallyConcepts } from "../../catalog";
import PurchaseButton from "./PurchaseButton";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return rallyConcepts.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const rally = findConcept((await params).slug);
  if (!rally) return { title: "Rally · Pep Rally", robots: { index: false, follow: false } };
  return { title: `${rally.title} · Pep Rally`, description: rally.promise, openGraph: { title: `${rally.title} · Pep Rally`, description: rally.promise, images: [] }, twitter: { title: `${rally.title} · Pep Rally`, description: rally.promise, images: [] } };
}

export default async function RallyListingPage({ params }: PageProps) {
  const rally = findConcept((await params).slug);
  if (!rally) return <main className="concept-page"><nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a></nav><section className="concept-missing"><h1>This Rally moved.</h1><a href="/#marketplace">Browse the marketplace →</a></section></main>;

  return <main className={`concept-page concept-${rally.accent}`}>
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href="/#marketplace">Shop Rallies</a><a href="/library">My Rallies</a></div></nav>
    <header className="concept-hero">
      <div><span className="concept-category">{rally.category} · CONCEPT PREVIEW</span><h1>{rally.title}</h1><p>{rally.promise}</p><div className="concept-price"><b>${(rally.priceCents / 100).toFixed(0)}</b><span>Planned price · preview available now</span></div><div className="concept-actions"><PurchaseButton slug={rally.slug} priceCents={rally.priceCents}/></div></div>
      <aside><span>{rally.monogram}</span><small>THE OUTCOME</small><b>{rally.outcome[0]}</b><p>Try it with your own details. Paid access is not available yet.</p></aside>
    </header>

    <section className="concept-blueprint" id="outcome"><div><small>WHAT YOU GET</small><h2>What you’ll get</h2><p>Here’s what to bring and what you can make.</p></div><div className="concept-flow"><article><small>YOU BRING</small>{rally.inputs.map((item) => <span key={item}>{item}</span>)}</article><i>→</i><article><small>YOU LEAVE WITH</small>{rally.outcome.map((item) => <span key={item}>{item}</span>)}</article></div></section>

    <section className="concept-trust"><div><small>THE SAFETY LINE</small><h2>Useful, with your judgment still in charge.</h2><p>{rally.guardrail}</p></div><aside><b>Planned paid features</b><span>✓ The working mini-app</span><span>✓ Your private saved workspace</span><span>✓ The promised finished result</span><span>✓ Future updates to this Rally</span></aside></section>

    {rally.sourceNote && <section className="concept-source"><small>WHY THIS RALLY EXISTS</small><p>{rally.sourceNote}</p><a href="https://www.nclex.com/test-plans.page" target="_blank" rel="noreferrer">Review the official NCLEX test plan ↗</a></section>}


    <footer className="listing-footer"><span><b>Try first.</b> The working preview opens without sign-in.</span><span><b>Keep it.</b> Paid saving and downloads are not on sale yet. Free Rallies include downloads today.</span><div><a href="/policies">Refunds + privacy</a><a href="/support">Support</a><a href="/connections">Service status</a></div></footer>
  </main>;
}
