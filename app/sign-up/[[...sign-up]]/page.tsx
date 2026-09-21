import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="auth-shell">
      <a className="auth-home" href="/">Pep Rally</a>
      <SignUp path="/sign-up" signInUrl="/sign-in" />
    </main>
  );
}
