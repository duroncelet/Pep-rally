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
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href="/#marketplace">Marketplace</a><a href="#reviews">Reviews</a><a href="/">My Rallies</a></div></nav>
    <header className="pdp-hero"><div className="pdp-photo"><img src={product.image} alt=""/><span>PEP RALLY ORIGINAL · {product.price.toUpperCase()}</span></div><div className="pdp-copy"><small>{product.eyebrow}</small><h1>{product.title}</h1><p>{product.blurb}</p><div className="pdp-price"><b>{product.price}</b><span>Working mini-app · saved workspace · updates included</span></div><a className="primary full center-link" href={product.appHref}>Open the free Rally →</a><div className="pdp-assurance"><span>✓ No payment required</span><span>✓ See permissions before saving</span><span>✓ Verified reviews only after use</span></div></div></header>

    <section className="pdp-outcome"><header><small>KNOW BEFORE YOU OPEN IT</small><h2>What you bring.<br/><em>What you leave with.</em></h2></header><div><article><small>YOU BRING</small>{product.inputs.map((item) => <span key={item}>{item}</span>)}</article><article><small>THE RALLY CREATES</small>{product.outputs.map((item) => <span key={item}>{item}</span>)}</article><article><small>DATA + PERMISSIONS</small>{product.permissions.map((item) => <span key={item}>{item}</span>)}</article></div></section>

    <section className="pdp-trust"><div><small>MADE BY PEP RALLY</small><h2>A complete example, not a sales mockup.</h2><p>The workspace opens, accepts real inputs, saves your work after sign-in, and returns a usable result. External bookings or money transfers stay in your control.</p><span>{product.version}</span></div><aside><b>Pep Rally buyer promise</b><p>A paid Rally should match its listing, open successfully, explain its permissions, and provide the promised outcome. If it does not, buyers can report it and request review under the marketplace refund policy.</p><a href="/connections">See connection and support status →</a></aside></section>

    <ReviewPanel slug={product.slug}/>

    <section className="pdp-adapt"><div><small>MAKE IT YOURS</small><h2>Know a better version?</h2><p>Start an adaptation with visible credit to this Rally. Add your expertise, test a new audience, and publish it as a distinct product.</p></div><a className="primary" href={`/build?adapt=${product.slug}`}>Adapt this Rally →</a></section>
  </main>;
}
