import type { Metadata } from "next";
import { findOriginal, originals } from "../../originals";
import ReviewPanel from "./ReviewPanel";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return originals.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = findOriginal((await params).slug);
  if (!product) return { title: "Rally · Pep Rally", robots: { index: false, follow: false } };
  return {
    title: `${product.title} · Pep Rally`, description: product.blurb,
    openGraph: { title: `${product.title} · Pep Rally`, description: product.blurb, images: [product.image] },
    twitter: { title: `${product.title} · Pep Rally`, description: product.blurb, images: [product.image] },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const product = findOriginal((await params).slug);
  if (!product) return <main className="pdp-page"><nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a></nav><section className="concept-missing"><h1>This Rally moved.</h1><a href="/">Back to Pep Rally →</a></section></main>;

  return <main className={`pdp-page pdp-${product.color}`}>
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href="/#marketplace">Marketplace</a><a href="#reviews">Reviews</a><a href="/library">My Rallies</a></div></nav>
    <header className="pdp-hero"><div className="pdp-photo"><img src={product.image} alt=""/><span>PEP RALLY ORIGINAL · {product.price.toUpperCase()}</span></div><div className="pdp-copy"><small>{product.eyebrow}</small><h1>{product.title}</h1><p>{product.blurb}</p><div className="pdp-price"><b>{product.price}</b><span>Working mini-app · saved workspace · updates included</span></div><a className="primary full center-link" href={product.appHref}>{product.slug === "garden-planner" ? "Plan my garden →" : "Plan your weekend →"}</a><div className="pdp-assurance"><span>✓ No payment required</span><span>✓ See permissions before saving</span><span>✓ Verified reviews only after use</span></div></div></header>

    <section className="pdp-outcome"><header><small>KNOW BEFORE YOU OPEN IT</small><h2>What you bring.<br/><em>What you leave with.</em></h2></header><div><article><small>YOU BRING</small>{product.inputs.map((item) => <span key={item}>{item}</span>)}</article><article><small>THE RALLY CREATES</small>{product.outputs.map((item) => <span key={item}>{item}</span>)}</article><article><small>DATA + PERMISSIONS</small>{product.permissions.map((item) => <span key={item}>{item}</span>)}</article></div></section>

    <section className="pdp-trust"><div><small>MADE BY PEP RALLY</small><h2>Made for real-life planning.</h2><p>{product.slug === "garden-planner" ? "Choose your crops and growing spaces, adjust their assignments, and use the forecast to plan this week’s care. Confirm varieties and planting dates locally." : "Build the weekend plan and track shared bills. Booking and payment links open the provider; guest replies and payments are recorded by the organizer."} Download your plan freely, or sign in to save progress.</p><span>{product.version}</span></div><aside><b>Pep Rally buyer promise</b><p>Try this Rally free. You decide which outside links to open and what to share.</p><a href="/policies">Read support, refund, and privacy terms →</a></aside></section>

    <ReviewPanel slug={product.slug}/>

    <section className="pdp-finish"><div><small>READY TO FINISH SOMETHING?</small><h2>Open the working app.</h2><p>Bring your real details, review the result, and keep the finished workspace in My Rallies.</p></div><a className="primary" href={product.appHref}>{product.slug === "garden-planner" ? "Plan my garden →" : "Plan your weekend →"}</a></section>
  </main>;
}
