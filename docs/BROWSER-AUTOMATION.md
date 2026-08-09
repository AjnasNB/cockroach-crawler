# Governed browser automation

Cockroach Crawler now exposes an opt-in, product-owned browser-automation boundary at `cockroach-crawler/browser-automation`. It is a bounded subset for hosts that need direct page actions without surrendering origin, effect, time, upload, artifact, or session authority.

This is separate from the crawler core. The crawler core acquires and normalizes evidence. Cockroach Browser remains a separate product. The adapter in this package validates and dispatches explicitly registered actions through a host-injected browser runtime.

## Honest capability accounting

The machine-readable [capability matrix](./browser-automation-capability-matrix.json) distinguishes four different facts:

- **Cataloged:** the exact action schema and validator exist. Cataloging is not runtime support.
- **Built-in handler:** the shipped adapter maps the action to a runtime method, subject to method probes and authority checks.
- **Trusted service required:** the handler also needs an injected resolver or artifact/state service.
- **Real-engine integration verified:** the installed Chromium smoke test executes that exact action kind.

The current matrix catalogs 102 action contracts across 16 categories. The maximum configured adapter exposes 72 handlers: 61 built in and 11 requiring named trusted services. Thirty actions are explicitly unsupported. Twenty-nine action kinds are exercised by the installed-engine smoke test; unit tests cover the wider validation and handler surface. These numbers are generated from source and must not be read as comprehensive browser-automation coverage.

Regenerate the matrix with:

```bash
npm run browser-automation:matrix
```

## Security model

Every session binds one exact HTTP(S) origin, one authority identifier, allowed action kinds, allowed effects, action count, action deadline, session lifetime, and separate output/upload/artifact ceilings. The shipped engine adapter also:

- requires a newly owned isolated context from a trusted factory;
- requires the factory to attest blocked service workers and blocked WebSocket egress;
- installs action-bound HTTP(S) request authorization and WebSocket denial before navigation;
- checks the observed page and selected-frame origins before and after every dispatch;
- quarantines and closes the owned context after an origin escape or deadline;
- accepts uploads only as ordered opaque `file:` references resolved to bounded in-memory payloads;
- cancels and deletes browser download events and quarantines the session that emitted one; click-triggered download persistence stays unsupported until the runtime can bind an artifact to an unambiguous triggering request;
- applies hard per-session engine ceilings of 16 pages, 256 tracked frames, and 64 workers, quarantining resource bursts that cross them;
- returns bounded plain data and applies heuristic secret redaction to non-credential results;
- serializes actions per session and automatically closes abandoned sessions at expiry.

Session open creates or accepts only a fresh `about:blank` page after validating that it belongs to the newly owned context. It never performs an implicit navigation. `tab.open` also creates only a blank target; reaching a URL requires a separate metered `navigate` action authorized for the `read` effect.

The shipped backend keeps its browser context offline between actions. During an action it permits at most 128 routed HTTP(S) requests, with a 4,096-request session ceiling. The request authorizer receives the bound action, effect, principal, and action number. Methods other than `GET`, `HEAD`, or `OPTIONS` require a `write` effect. Persistent route mutation, ambient headers, manual online state, and ambiguous click-triggered downloads remain unsupported.

The adapter does not independently prove operating-system isolation. The host factory is trusted and must not import ambient profiles or credentials. Factory attestations are checked for shape but remain factory attestations. The built-in request boundary governs routed HTTP(S), blocks browser WebSockets, and requires blocked service workers. It does not independently meter response transfer bytes or prove that WebRTC, WebTransport, DNS, or another browser/process egress channel is contained. Hostile-page deployments still need an external network/process sandbox with byte ceilings.

## Minimal host wiring

```js
import { chromium } from "playwright";
import {
  createGovernedBrowserAutomation,
  createGovernedPlaywrightBackend
} from "cockroach-crawler/browser-automation";

const browser = await chromium.launch({ headless: true });
const backend = createGovernedPlaywrightBackend({
  async createSession() {
    const context = await browser.newContext({
      acceptDownloads: false,
      serviceWorkers: "block"
    });
    const page = await context.newPage();
    return {
      context,
      page,
      browser,
      browserOwned: false,
      ownedContext: true,
      networkIsolation: { serviceWorkers: "block", webSockets: "block" }
    };
  },
  async authorizeRequest({ origin, method, effect, principalId }) {
    const methodAllowed = ["GET", "HEAD", "OPTIONS"].includes(method) || effect === "write";
    return { allowed: origin === "https://example.com" && methodAllowed && principalId === "agent:research" };
  }
});

const automation = createGovernedBrowserAutomation({
  backend,
  policy: {
    allowedActions: ["navigate", "page.title", "fill"],
    allowedEffects: ["read", "write"],
    maxSessions: 1,
    maxActionMs: 10_000,
    maxSessionMs: 60_000
  }
});

const authority = {
  principalId: "agent:research",
  allowedOrigins: ["https://example.com"],
  allowedActions: ["navigate", "page.title", "fill"],
  allowedEffects: ["read", "write"],
  maxActions: 20,
  maxActionMs: 10_000,
  maxSessionMs: 60_000,
  maxArtifactBytes: 1_000_000,
  maxUploadBytes: 1_000_000,
  maxTotalArtifactBytes: 2_000_000,
  maxTotalUploadBytes: 2_000_000
};

const session = await automation.openSession({
  allowedOrigins: authority.allowedOrigins,
  purpose: "bounded research"
}, authority);

const boundAuthority = { ...authority, authorityId: session.authorityId };
await automation.act({
  sessionId: session.sessionId,
  action: { kind: "navigate", origin: "https://example.com", url: "https://example.com/" }
}, boundAuthority);
const title = await automation.act({
  sessionId: session.sessionId,
  action: { kind: "page.title", origin: "https://example.com" }
}, boundAuthority);

await automation.closeSession({ sessionId: session.sessionId }, boundAuthority);
console.log(title.data);
```

`allowedActions` and `allowedEffects` are deny-by-default. Ordered multi-file uploads, credential-bearing state, scripts, DOM mutation, and artifact writes must be enabled explicitly. A catalog entry is not proof that the shipped backend exposes it.

## Explicitly unsupported families

The current adapter does not claim comprehensive browser control. Missing or intentionally withheld work includes:

- process launch/persistent/server/protocol lifecycle and raw protocol sessions;
- browser version, connection-state, and multi-context inspection;
- rich viewport/media/clock controls and exposed bindings;
- function/request/response/load-state waits and direct content replacement;
- remote handle lifecycle and richer locator attributes, bounds, and filters;
- click-triggered download persistence, file-chooser lifecycle, and download cancel/delete/failure/save-as as public operations;
- mouse-wheel, credential reset, permission reset, and cookie reset operations;
- HAR and WebSocket routing plus response body, timing, and security details;
- persistent request routes, ambient request headers, and caller-controlled online/offline state;
- service/background workers, trace chunks/groups, recording, coverage, and heap capture;
- process-global custom-selector registration.

Some cataloged actions are also explicitly unsupported by the shipped backend where a safe, bounded implementation is not yet available. Consult the generated matrix rather than inferring support from an action name.

## Output and redaction limits

Results are converted to bounded plain JSON. Accessor-backed objects and raw runtime handles are rejected. Non-credential results redact common secret-shaped keys and strings, including authorization, cookie, token, password, passcode, CSRF, API-key, and session patterns. This is a defense-in-depth heuristic, not a substitute for selecting the correct action effect and avoiding secret-bearing output.

Artifact `maxBytes` values are output and sink ceilings. Screenshot dimensions and paired-capture document size are preflighted, and network exports are assembled incrementally. Some browser-engine operations such as PDF generation still allocate their engine result before JavaScript can enforce the final byte check; this boundary is not hostile-page memory isolation.
