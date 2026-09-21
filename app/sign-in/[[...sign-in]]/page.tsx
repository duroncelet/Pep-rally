import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="auth-shell">
      <a className="auth-home" href="/">Pep Rally</a>
      <SignIn path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}
