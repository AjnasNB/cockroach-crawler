# Selectors, adaptive relocation, identity, and export

Stable `0.6.x` adds four entry points beside the crawler: a document selection
API, adaptive element relocation, named request identities with challenge
handling, and record exporters. Each is a separate subpath export so a consumer
pays only for what it imports.

## Document selection

```js
import { Selector } from "cockroach-crawler/parser";

const page = Selector.parse(html, { url: "https://shop.example/catalog" });

page.css(".title::text").getall();        // ["Widget A", "Widget B"]
page.css("a::attr(href)").getall();       // absolute, resolved against url
page.xpath("//span[@class='price']");     // live nodes, still traversable
page.findAll("li", { class_: "product", "data-id": /^[0-9]+$/ });
page.findByText(/clearance/iu, { tag: "h2" });
```

`css` and `xpath` both return a `SelectorList`. `::text` and `::attr(name)`
change what `get()` and `getall()` yield; `href`, `src`, `action`, and `poster`
are resolved against the document URL when one was supplied.

XPath results map back onto the live tree, so traversal keeps working:

```js
page.xpath("//span[@class='price']").first.parent.attr("data-id"); // "1"
```

Navigation is `parent`, `parents`, `children`, `siblings`, `next`, `previous`.
`cssPath()` and `xpathPath()` generate a path that re-selects the same element,
preferring a unique `id` and falling back to a `:nth-of-type` chain.

## Adaptive relocation

Selectors break when a site is redesigned. `createAdaptiveLocator` tries the
selector first, and falls back to a stored fingerprint when it stops matching.

```js
import { ElementFingerprintStore, createAdaptiveLocator } from "cockroach-crawler/adaptive";

const locate = createAdaptiveLocator(
  new ElementFingerprintStore({ directory: ".cockroach/elements" })
);

await locate("product-title", html, { selector: "h2.title" });
// { found: true, locatedBy: "selector", text: "Widget A" }

await locate("product-title", redesignedHtml, { selector: "h2.title" });
// { found: true, locatedBy: "relocated", selector: "li.card:nth-of-type(1) > h3.name" }
```

A fingerprint records tag family, identity attributes, class set, normalized
text, ancestor chain, sibling position, and child structure. Scoring is a
weighted sum over those signals; ancestor comparison uses a longest common
subsequence so an inserted wrapper does not destroy the match, and tag
comparison gives partial credit inside a family (`h2` to `h3`, `div` to
`section`).

The default threshold is `0.62`. Below it, relocation reports a miss and
returns no element rather than offering a best guess — a wrong element is worse
than a reported failure. Every weight, threshold, and ceiling is overridable:

```js
relocateElement(html, fingerprint, {
  threshold: 0.8,
  tagLock: true,
  weights: { text: 0.5, classes: 0.05 }
});
```

`findSimilarElements` and `Selector#findSimilar` use the same scorer to pull
repeated records — product cards, table rows, search results — off one example.

## Request identity

```js
import { resolveIdentity, identityHeaders, identityBrowserContext } from "cockroach-crawler/identity";

const identity = resolveIdentity("chrome-windows", { acceptLanguage: "de-DE,de;q=0.9" });
identityHeaders(identity);          // coherent headers for the HTTP tier
identityBrowserContext(identity);   // matching Playwright context options
```

Profiles: `chrome-windows`, `chrome-macos`, `edge-windows`, `firefox-windows`,
`safari-macos`, `chrome-android`, `safari-ios`.

A profile keeps user agent, client hints, `Accept-Language`, viewport, platform,
locale, and timezone consistent with each other, and drives both tiers from one
declaration. Firefox and WebKit profiles do not emit Chromium client hints.

This solves a correctness problem: a client whose headers describe no real
browser gets degraded markup or a flat refusal from many sites. Profiles are
named and inspectable, and none impersonates a specific person or account.

## Access challenges

A challenge page is an access-control decision, not page content. Detection is
always on, so a challenge never becomes a silently empty extraction.

```js
import { detectChallenge, normalizeChallengePolicy, applyChallengePolicy } from "cockroach-crawler/identity";

const report = detectChallenge({ status: 403, headers, body, url });
// { challenged: true, vendor: "cloudflare", kind: "interstitial", evidence: [...] }
```

Three policy modes:

```js
normalizeChallengePolicy();                    // deny  — throws ChallengeError
normalizeChallengePolicy({ mode: "report" });  // report — hand the report back
```

`operator` mode is for the case where a crawl is authorized but an over-broad
protection rule blocks it. It fails closed and requires an authorization
statement, an origin allowlist, and a handler:

```js
const policy = normalizeChallengePolicy({
  mode: "operator",
  authorization: "I operate shop.example and hold a WAF allowlist for this crawler.",
  allowOrigins: ["https://shop.example"],
  handler: async ({ origin, report }) => ({
    resolved: true,
    headers: { "cf-clearance": await myIssuedToken(origin) }
  })
});
```

A challenge outside `allowOrigins` is refused even with a valid handler. The
package ships no solver and depends on no solving service: resolution authority
comes from the operator, is recorded in the policy, and is auditable.

Legitimate handler sources are authority you already hold — a WAF allowlist
entry, an issued clearance token, a contract-backed credential, or a human who
answered the challenge once in an attended browser session.

## Export

```js
import { exportRecords, toCsv } from "cockroach-crawler/exporters";

toCsv(rows);                                   // union of keys, stable order
toCsv(rows, { columns: ["title", "price"] });  // explicit projection
exportRecords(rows, "xml", { rowName: "product" });
```

Formats: `csv`, `xml`, `jsonl`, `json`. CSV prefixes leading `=`, `+`, `-`, and
`@` so a value cannot execute as a spreadsheet formula on open; pass
`injectionGuard: false` to opt out. XML validates element names and strips
control characters that would break the document. All four reject
prototype-polluting keys and non-serializable values.
