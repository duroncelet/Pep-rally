import SupportForm from "./SupportForm";

export const metadata = {
  title: "Support · Pep Rally",
  description: "Contact Pep Rally support by email. No sign-in needed.",
};

export default function SupportPage({
  searchParams,
}: {
  searchParams?: { rally?: string };
}) {
  return (
    <main className="policy-page">
      <nav>
        <a href="/" className="brand">
          <span className="brand-mark">P</span>Pep Rally
        </a>
        <div>
          <a href="/#marketplace">Shop</a>
          <a href="/policies">Trust + terms</a>
          <a href="/library">My Rallies</a>
        </div>
      </nav>
      <header>
        <small>PEP RALLY SUPPORT</small>
        <h1>
          How can we help?
        </h1>
        <p>
          Report a broken Rally, a misleading listing, or a problem with your
          saved work. Email us directly at{" "}
          <a href="mailto:support@peprally.fun">support@peprally.fun</a> — no
          sign-in needed, and we will reply to the email address you give us.
        </p>
      </header>
      <section className="rally-content">
        <SupportForm rally={searchParams?.rally ?? ""} />
        <p>
          Prefer to write us yourself? Email{" "}
          <a href="mailto:support@peprally.fun">support@peprally.fun</a>{" "}
          with the Rally name or page URL and a short description of what went
          wrong. Response times are not guaranteed during the beta.
        </p>
      </section>
      <footer>
        <p>
          This is a concise launch-edition policy—not a substitute for
          jurisdiction-specific legal advice before commercial release.
        </p>
        <a href="/policies">Privacy + terms →</a>
      </footer>
    </main>
  );
}
