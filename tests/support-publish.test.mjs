import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("publishes the support email and a signed-out support form", async () => {
  const [supportPage, supportForm, policies] = await Promise.all([
    readFile(new URL("../app/support/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/support/SupportForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/policies/page.tsx", import.meta.url), "utf8"),
  ]);

  // The support address is published on the support page itself.
  assert.match(supportPage, /support@peprally\.fun/);
  assert.match(supportPage, /mailto:support@peprally\.fun/);
  // The form asks for the visitor's email and needs no sign-in.
  assert.match(supportForm, /type="email"/);
  assert.match(supportForm, /required/);
  assert.match(supportForm, /mailto:\$\{SUPPORT_EMAIL\}/);
  // No sign-in gate: nothing asks the visitor to sign in to send.
  assert.match(supportForm, /No\s*\n?\s*sign-in needed/);
  assert.doesNotMatch(supportForm, /Sign in to send|signIn|401|href="\/sign-in"/);
  assert.doesNotMatch(supportPage, /Sign in to send|signIn|401|href="\/sign-in"/);

  // The policies page points strangers at the published address and route.
  assert.match(policies, /support@peprally\.fun/);
  assert.match(policies, /href="\/support"/);
  assert.doesNotMatch(policies, /contact the person who shared Pep Rally with you/i);
});
