# Puppeteer 25.5.0 capability baseline

Cockroach Crawler does **not** claim Puppeteer API parity. This baseline turns
that broad request into an inspectable implementation backlog while preserving
the product boundary:

- Cockroach Crawler owns policy-bounded acquisition, crawl scheduling,
  extraction, and evidence normalization.
- Cockroach Browser owns stateful interactive Chromium sessions, profiles,
  actions, artifacts, and browser receipts.
- `cockroach-crawler/browser-automation` is a dependency-injected bridge to a
  trusted browser backend. It is not a Puppeteer namespace shim and it does not
  import ambient profiles, cookies, credentials, executables, or CDP endpoints.

## Exact upstream

The inventory is pinned to official `puppeteer-core@25.5.0`:

| Field | Value |
| --- | --- |
| package | `puppeteer-core@25.5.0` |
| license | Apache-2.0 |
| Node requirement | `>=22.12.0` |
| npm integrity | `sha512-XPNT0dQJtphqQ4I29zxlG4IIPbg1iEHAQKWuQgtMJGXjACV77pZSmJvDi51IIIfd+DTKICcopJwUx4upVQ4XbA==` |
| tarball SHA-256 | `52b57c652a24d69b2cc659888fcce97e26d91af17f46cc58920ada7d0998bdbd` |
| official API | <https://pptr.dev/api> |
| tagged source | <https://github.com/puppeteer/puppeteer/tree/puppeteer-v25.5.0> |

The checked-in [API snapshot](./puppeteer-25.5.0-api-snapshot.json) records 213
exported declarations, 43 exported classes, 100 interfaces, 436 class members,
386 class method entries, and 418 interface members. The
[gap matrix](./puppeteer-25.5.0-gap-matrix.json) assigns all 436 class members
to one of 28 capability categories and gives each surface one of four statuses:
`supported`, `partial`, `missing`, or `not-applicable`.

| Surface | Supported | Partial | Missing | Not applicable |
| --- | ---: | ---: | ---: | ---: |
| Crawler core | 4 | 294 | 120 | 18 |
| Cockroach Browser | 71 | 272 | 75 | 18 |
| New crawler adapter | 19 | 317 | 82 | 18 |

These are member counts, not quality scores. `supported` means an equivalent
capability exists; it does not mean the JavaScript API shape is identical.

## Current capability result

| Capability category | Crawler | Cockroach Browser | Adapter |
| --- | --- | --- | --- |
| navigation, history, lifecycle waits | partial | supported | supported |
| screenshots and PDF | supported | supported | supported |
| forms and element interaction | partial | supported | partial |
| cookies and browser storage | partial | supported | partial |
| file upload/download and dialogs | missing | supported | partial |
| locators and element handles | partial | partial | partial |
| network inspection/interception | partial | partial | partial |
| JavaScript realms and handles | partial | partial | partial |
| keyboard, mouse, drag, touch | missing | partial | partial |
| accessibility tree | missing | partial | partial |
| tracing and screen recording | missing | partial | partial |
| extensions, PWA, Bluetooth, coverage, raw CDP, page WebMCP | missing | missing | missing |

The JSON matrix is authoritative and includes every member, category notes,
status semantics, local evidence paths, and official upstream links.

## Governed adapter foundation

The adapter accepts a structural backend with three methods:
`createSession`, `act`, and `closeSession`. A Cockroach Browser runtime or
authenticated client can be wrapped without making it a hard dependency:

```js
import { BrowserRuntime } from "cockroach-browser";
import { createBrowserAutomationAdapter } from "cockroach-crawler/browser-automation";

const runtime = new BrowserRuntime({ root: ".cockroach-browser" });
const adapter = createBrowserAutomationAdapter({
  backend: {
    createSession: (input) => runtime.createSession(input),
    act: (sessionId, action) => runtime.act(sessionId, action),
    closeSession: (sessionId) => runtime.closeSession(sessionId)
  }
});

const session = await adapter.open({
  purpose: "Capture release evidence",
  allowedOrigins: ["https://example.com"],
  startUrl: "https://example.com/releases"
});

await adapter.execute(session.id, { kind: "snapshot" });
await adapter.execute(session.id, { kind: "screenshot", fullPage: true });
await adapter.closeSession(session.id);
```

The catalog names 58 existing Cockroach Browser actions. The adapter enables
only 21 observation/navigation/evidence actions by default. Mutating,
credential, upload, download, JavaScript, cookie, storage, network-route, and
trace actions require explicit creator configuration. Action names and effects
are independent allowlists: for example, enabling `click` also requires the
`execute` effect. Every action still depends on the backend's action-specific
schema, policy, approval, network, secret, budget, and evidence enforcement.

The adapter additionally:

- admits only 1 to 32 exact credential-free HTTP(S) origins;
- rejects action navigation outside the session allowlist before dispatch;
- rejects inherited, accessor-backed, symbolic, reserved, sparse, oversized,
  deeply nested, and non-JSON action input;
- injects the reviewed session purpose into every action;
- can act only on sessions that it created;
- reports `puppeteerApiCompatible: false` in its capability record.

The capability record validates against the packed
`cockroach-crawler/schemas/browser-automation-capabilities.json` JSON Schema.

Cockroach Browser is a separately installed AGPL-3.0-or-later product. This
adapter copies no Puppeteer or Cockroach Browser source and adds no runtime
dependency. Operators must review the license and deployment boundary of every
backend they inject.

## Rebuild the inventory

The snapshot script intentionally reads the official flattened declaration
file rather than scraping documentation HTML:

```bash
node scripts/snapshot-puppeteer-api.mjs \
  /path/to/puppeteer-core/lib/types.d.ts \
  docs/compatibility/puppeteer-25.5.0-api-snapshot.json \
  /path/to/typescript-5/lib/typescript.js

node scripts/build-puppeteer-gap-matrix.mjs \
  docs/compatibility/puppeteer-25.5.0-api-snapshot.json \
  docs/compatibility/puppeteer-25.5.0-gap-matrix.json
```

Regenerating from another Puppeteer version is a reviewed baseline update, not
an automatic parity claim.
