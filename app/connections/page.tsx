const builtIn = [
  { name: "Private Rally access", use: "Sign in to keep your plans and progress in your own Rally library.", label: "Included" },
  { name: "Saved workspaces", use: "Return to your inputs, decisions, and finished outcomes when the listing includes saved access.", label: "Included" },
  { name: "Private files", use: "Add source material to supported Rallies without placing it on a public listing.", label: "When offered" },
  { name: "Live weather", use: "Use current forecast data in weather-aware Rallies such as the Little Garden Planner.", label: "Live data" },
  { name: "Calendar downloads", use: "Export events as a calendar file you can open in the calendar app you already use.", label: "Included" },
];

const reviewedHandoffs = [
  { name: "Email and text", use: "Pep Rally prepares a draft. You review it and choose whether to send it from your own app." },
  { name: "Maps and searches", use: "Open a current search for stays, restaurants, activities, or directions in the service you choose." },
  { name: "Reservations", use: "Compare options inside the Rally, then review availability and complete a booking with the provider." },
  { name: "Payment requests", use: "Prepare the amount and recipient, then approve the request in your own payment app." },
];

export default function ConnectionsPage() {
  return <main className="connections-page">
    <nav className="store-nav"><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div className="nav-links"><a href="#included">Included</a><a href="#handoffs">You approve</a><a href="#privacy">Privacy</a></div><a className="nav-button center-link" href="/rally/bachelorette">Try a free Rally</a></nav>

    <header className="connections-hero"><div><small>CONNECTIONS + PERMISSIONS</small><h1>Helpful tools.<br/><em>You stay in control.</em></h1><p>Before you use a Rally, you can see what it saves, what outside services it opens, and which actions always require your approval.</p><span className="connection-check"><i className="ready"/>Clear before you connect</span></div><aside><b>The simple rule</b><p>A Rally can organize the work and prepare the next step. You still approve messages, bookings, purchases, payment requests, and other important decisions.</p><a href="/rally/bachelorette">See it in the Bachelorette Blueprint →</a></aside></header>

    <section className="connection-section" id="included"><header><small>BUILT INTO PEP RALLY</small><h2>What a Rally can keep together.</h2><p>Each listing tells you which of these features it includes before you open or buy it.</p></header><div className="connection-card-grid consumer-connection-grid">{builtIn.map((connection) => <article key={connection.name}><div><span className="status-dot ready"/><small>AVAILABLE</small><em>{connection.label}</em></div><h3>{connection.name}</h3><p>{connection.use}</p></article>)}</div></section>

    <section className="connection-section account-section" id="handoffs"><header><small>YOU APPROVE THE FINAL STEP</small><h2>Use the apps you already trust.</h2><p>Some actions open another service instead of silently acting for you. That keeps the final choice—and any provider account—under your control.</p></header><div className="account-connection-list">{reviewedHandoffs.map((connection) => <article key={connection.name}><div><span className="status-dot ready"/><small>REVIEWED HANDOFF</small></div><h3>{connection.name}</h3><p>{connection.use}</p><b>Nothing is sent, booked, or paid without you.</b></article>)}</div></section>

    <section className="connection-principle" id="privacy"><small>YOUR INFORMATION</small><h2>Know what leaves the Rally.<br/><em>Decide before it does.</em></h2><p>Pep Rally does not ask you to paste bank credentials, private API keys, or passwords into a Rally. When an outside service is needed, the Rally should name it clearly and let you open and authorize that service yourself.</p><a href="/#marketplace" className="primary">Find a Rally →</a></section>
  </main>;
}
