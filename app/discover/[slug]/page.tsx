import type { Metadata } from "next";
import { findConcept, rallyConcepts } from "../../catalog";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return rallyConcepts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const concept = findConcept((await params).slug);
  if (!concept) return { title: "Rally idea · Pep Rally", robots: { index: false, follow: false } };
  return {
    title: `${concept.title} · Pep Rally`,
    description: concept.promise,
    openGraph: { title: `${concept.title} · Pep Rally`, description: concept.promise, images: [] },
    twitter: { title: `${concept.title} · Pep Rally`, description: concept.promise, images: [] },
  };
}

export default async function ConceptPage({ params }: PageProps) {
  const concept = findConcept((await params).slug);
  if (!concept) return <main className="concept-page"><nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a></nav><section className="concept-missing"><h1>This Rally idea moved.</h1><a href="/#marketplace">Browse the marketplace →</a></section></main>;

  return <main className={`concept-page concept-${concept.accent}`}>
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href="/#marketplace">Browse ideas</a><a href={`/build?adapt=${concept.slug}`}>Build this Rally</a></div></nav>
    <header className="concept-hero">
      <div><span className="concept-category">{concept.category} · RALLY IDEA</span><h1>{concept.title}</h1><p>{concept.promise}</p><div className="concept-actions"><a className="primary" href={`/build?adapt=${concept.slug}`}>Build this idea →</a><a href="#blueprint">See how it would work ↓</a></div></div>
      <aside><span>{concept.monogram}</span><small>BEST MADE BY</small><b>{concept.maker}</b><p>This is a researched product direction, not a finished listing. A knowledgeable creator can claim it, shape it, and publish the working version.</p></aside>
    </header>

    <section className="concept-blueprint" id="blueprint">
      <div><small>THE PERSON</small><h2>{concept.forWhom}</h2><p>A strong Rally starts with a recognizable moment and ends with something the person can actually use.</p></div>
      <div className="concept-flow"><article><small>THEY BRING</small>{concept.inputs.map((item) => <span key={item}>{item}</span>)}</article><i>→</i><article><small>THE RALLY CREATES</small>{concept.outcome.map((item) => <span key={item}>{item}</span>)}</article></div>
    </section>

    <section className="concept-trust">
      <div><small>THE SAFETY LINE</small><h2>Useful without pretending to know too much.</h2><p>{concept.guardrail}</p></div>
      <aside><b>Before this can be sold</b><span>✓ A working demo with a realistic input</span><span>✓ Clear data and permission disclosure</span><span>✓ A first-use test by someone in the audience</span><span>✓ Support, update, and refund expectations</span></aside>
    </section>

    {concept.sourceNote && <section className="concept-source"><small>WHY THIS IDEA IS HERE</small><p>{concept.sourceNote}</p><a href="https://www.nclex.com/test-plans.page" target="_blank" rel="noreferrer">Review the official NCLEX test plan ↗</a></section>}

    <section className="concept-claim"><div><small>KNOW THIS PROBLEM?</small><h2>Make the version only you could make.</h2><p>Pep Rally starts the product brief. You bring the lived experience, trusted material, and judgment that make it worth using.</p></div><a className="primary" href={`/build?adapt=${concept.slug}`}>Start with this blueprint →</a></section>
  </main>;
}
