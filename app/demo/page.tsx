import Link from "next/link";

const stops = [
  { number: "01", time: "45 sec", title: "Frame the marketplace", body: "Start with the buyer: every Rally is a working mini-app with a clear finish line—not a folder of prompts or setup instructions.", href: "/", action: "Open the storefront" },
  { number: "02", time: "2 min", title: "Finish a Bachelorette plan", body: "Set the destination and vibe, collect budget comfort, shortlist a stay, build the itinerary, and download the finished plan.", href: "/rally/bachelorette", action: "Run the Bachelorette Rally" },
  { number: "03", time: "1 min", title: "Use live garden data", body: "Change the growing setup and crops, load the live forecast, inspect the layout, and keep the plan as Markdown.", href: "/rally/garden", action: "Run the Garden Rally" },
  { number: "04", time: "45 sec", title: "Show another outcome", body: "Open a paid marketplace preview, add a real constraint, create the first result, and show the save and download actions.", href: "/discover/nclex-study-sprint", action: "Open a marketplace preview" },
  { number: "05", time: "30 sec", title: "Turn makers into sellers", body: "Show how someone can build inside Pep Rally or bring an existing mini-app, define the outcome, add connections, and publish it.", href: "/build", action: "Open the creator studio" },
];

export default function DemoPage() {
  return <main className="demo-page">
    <nav><Link href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</Link><a className="nav-button center-link" href="/api/demo-brief">Download demo brief .md</a></nav>
    <header><small>TONIGHT&apos;S GUIDED DEMO</small><h1>Five minutes.<br/><em>Two real outcomes.</em></h1><p>Use this page as your presenter view. Each stop opens the actual private prototype, and both free examples end in a downloadable result.</p><div className="demo-promise"><span><b>The app</b> is what the buyer gets</span><span><b>The outcome</b> is what the buyer finishes</span><span><b>The export</b> lets them keep and share it</span></div></header>
    <section className="demo-route"><div className="demo-route-head"><div><small>THE RUN OF SHOW</small><h2>Click straight through.</h2></div><p>Best path: storefront → Bachelorette → download → garden → marketplace preview → creator studio.</p></div>{stops.map((stop) => <article key={stop.number}><div className="demo-number">{stop.number}</div><div><small>{stop.time}</small><h3>{stop.title}</h3><p>{stop.body}</p></div><a className="primary center-link" href={stop.href}>{stop.action} →</a></article>)}</section>
    <section className="demo-truth"><div><small>THE CLEAN ANSWER</small><h2>What is the product?</h2><p>The usable mini-app is the product. Its job is to turn the customer’s real context into a finished plan, decision, system, or next action. The saved workspace and exports make that outcome durable.</p></div><aside><b>For tonight</b><p>You do not need a formal PRD. Use the downloadable brief for the story and write the lean production PRD after you collect reactions.</p><a href="/api/demo-brief">Keep the brief →</a></aside></section>
  </main>;
}
