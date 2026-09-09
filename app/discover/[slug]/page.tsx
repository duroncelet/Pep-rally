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
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href="/#marketplace">Shop Rallies</a><a href={`/rally/market/${rally.slug}`}>Try it</a><a href="/library">My Rallies</a></div></nav>
    <header className="concept-hero">
      <div><span className="concept-category">{rally.category} · WORKING RALLY PREVIEW</span><h1>{rally.title}</h1><p>{rally.promise}</p><div className="concept-price"><b>${(rally.priceCents / 100).toFixed(0)}</b><span>Working app · saved workspace · updates included</span></div><div className="concept-actions"><PurchaseButton slug={rally.slug} priceCents={rally.priceCents}/><a href={`/rally/market/${rally.slug}`}>Try the working preview →</a></div></div>
      <aside><span>{rally.monogram}</span><small>THE OUTCOME</small><b>{rally.outcome[0]}</b><p>Bring your real context, get a first result, review it, and save the finished workspace. This preview is made by Pep Rally to demonstrate what a sellable creator listing can become.</p></aside>
    </header>

    <section className="concept-blueprint" id="outcome"><div><small>WHAT YOU GET</small><h2>Not instructions.<br/><em>The working outcome.</em></h2><p>A Rally should earn its price by helping you finish the job, not by handing you an empty template.</p></div><div className="concept-flow"><article><small>YOU BRING</small>{rally.inputs.map((item) => <span key={item}>{item}</span>)}</article><i>→</i><article><small>YOU LEAVE WITH</small>{rally.outcome.map((item) => <span key={item}>{item}</span>)}</article></div><a className="primary concept-preview-link" href={`/rally/market/${rally.slug}`}>Create a sample outcome →</a></section>

    <section className="concept-trust"><div><small>THE SAFETY LINE</small><h2>Useful, with your judgment still in charge.</h2><p>{rally.guardrail}</p></div><aside><b>Included with purchase</b><span>✓ The working mini-app</span><span>✓ Your private saved workspace</span><span>✓ The promised finished result</span><span>✓ Future updates to this Rally</span></aside></section>

    {rally.sourceNote && <section className="concept-source"><small>WHY THIS RALLY EXISTS</small><p>{rally.sourceNote}</p><a href="https://www.nclex.com/test-plans.page" target="_blank" rel="noreferrer">Review the official NCLEX test plan ↗</a></section>}

    <section className="concept-claim"><div><small>READY TO USE IT?</small><h2>This is cool.<br/><em>Make it yours.</em></h2><p>Pay once, open the working Rally, add your real information, and keep the result in My Rallies.</p><a className="creator-side-link" href={`/build?idea=${rally.slug}`}>Know this problem well? Build this Rally instead →</a></div><PurchaseButton slug={rally.slug} priceCents={rally.priceCents}/></section>
  </main>;
}
