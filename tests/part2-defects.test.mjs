import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// WCAG contrast ratio for two hex colors.
function luminance(hex) {
  const channels = hex.match(/\w\w/g).map((v) => parseInt(v, 16) / 255).map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test("fixes the Part 2 visual defects: nav, sticky, shadow, contrast, links", async () => {
  const [css, support, emailSupport, product, purchaseButton] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/support/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/support/EmailSupport.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shop/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/discover/[slug]/PurchaseButton.tsx", import.meta.url), "utf8"),
  ]);

  // 1. Mobile nav: the bar grows to fit its wrapped second row instead of
  // rendering the links below an 82px bar with no background.
  assert.match(css, /\.store-nav \{ flex-wrap:wrap; height:auto; \}/);

  // 2. Homepage nav sticks: .consumer-home must not be a scroll container.
  assert.doesNotMatch(css, /\.consumer-home \{ overflow: hidden; \}/);
  assert.match(css, /\.consumer-home \{ overflow-x: clip; \}/);

  // 3. Button shadow bleed: the link under the white pill gets clearance and
  // an underline; the .primary shadow itself is untouched sitewide.
  assert.match(css, /\.product-copy > a:not\(\.primary\) \{/);
  assert.match(css, /margin-top: 16px;\n  text-align: center;\n  text-decoration: underline;/);
  assert.match(css, /box-shadow: 3px 4px 0 var\(--ink\);/);
  // Shop hero: the button is a block, so .pdp-assurance's 15px margin is real
  // clearance instead of painting over an inline element's overflowed padding.
  assert.match(css, /\.pdp-copy > \.primary \{ display: block; \}/);

  // 4. Primary-button text passes WCAG AA: white on the button background.
  const darkCoral = css.match(/--coral-dark: (#[0-9a-f]{6});/)?.[1];
  assert.ok(darkCoral, "expected a --coral-dark variable");
  assert.ok(contrast("#ffffff", darkCoral) >= 4.5,
    `white on ${darkCoral} is ${contrast("#ffffff", darkCoral).toFixed(2)}:1, below the 4.5:1 AA bar`);
  assert.match(css, /background: var\(--coral-dark\);/);

  // 5. Text links read as links: underlines case by case, and the support
  // nav's My Rallies matches the homepage's button treatment.
  assert.match(css, /\.community-card > a:not\(\.primary\) \{/);
  assert.match(css, /\.pdp-trust aside a \{[^}]*text-decoration: underline;/);
  assert.match(css, /\.concept-source a \{[^}]*text-decoration: underline;/);
  assert.match(support, /className="nav-button" href="\/library">My Rallies/);

  // 6. Support forms use the full card width instead of two-thirds.
  assert.match(support, /<label className="full-field">Rally name or page URL/);
  assert.match(support, /<label className="full-field">What happened\?/);
  assert.match(emailSupport, /<label className="full-field">Your reply email/);
  assert.match(emailSupport, /<label className="full-field">What happened\? Include the Rally name/);

  // 7. No dead band under the homepage hero photo on phones: the
  // min-heights exist for the figure variant, not the in-flow home photo.
  assert.match(css, /\.consumer-home \.home-feature-photo \{ display:block; min-height: 0; \}/);

  // 8. Concept-card category labels are legible (7px -> 9px).
  assert.match(css, /\.idea-card > div small \{ font-size: 9px;/);

  // 9. Support page's Privacy + terms link sits in the page footer, not flush
  // on the viewport edge; the gap between the two forms is halved.
  assert.match(support, /<footer><a href="\/policies">Privacy \+ terms<\/a><\/footer>/);
  assert.match(css, /\.policy-page \.rally-content \{ padding-bottom:40px; \}/);

  // 10. Shop page: the lowest-contrast line darkens, and the page ends with
  // the site footer like the homepage.
  const pdpGray = css.match(/\.pdp-price span \{ color: (#[0-9a-f]{6});/)?.[1];
  assert.ok(pdpGray, "expected a .pdp-price span color");
  assert.ok(contrast(pdpGray, "#fbf7ee") >= 4.5,
    `${pdpGray} on cream is ${contrast(pdpGray, "#fbf7ee").toFixed(2)}:1, below the 4.5:1 AA bar`);
  assert.match(product, /className="consumer-footer"/);
  assert.match(product, /Open\. Finish\. Keep\./);

  // 11. Anchored sections clear the sticky nav instead of hiding under it.
  assert.match(css, /#marketplace, #free, #creators, #faq, #reviews \{ scroll-margin-top: 96px; \}/);

  // 12. The community-card CTA pins to the bottom; the report link does not
  // share its auto margin.
  assert.match(css, /\.community-card > a\.primary, \.community-card > button, \.community-card > span \{ margin-top: auto;/);
  assert.doesNotMatch(css, /\.community-card > a, \.community-card > button \{ margin-top: auto;/);

  // 13. The buy button is styled before checkout turns on.
  assert.match(purchaseButton, /<button className="primary" disabled=\{busy\} onClick=\{buy\}>/);

  // 14. The per-product color system does something: near-white tints instead
  // of a silenced `white !important`.
  assert.doesNotMatch(css, /background: white !important;/);
  assert.match(css, /\.product-card\.coral \{ background: #fff6f4; \}/);
  assert.match(css, /\.product-card\.green \{ background: #f2faf4; \}/);
  assert.match(css, /\.pdp-coral \.pdp-hero \{ background: #fff6f4; \}/);
  assert.match(css, /\.pdp-green \.pdp-hero \{ background: #f2faf4; \}/);
});
