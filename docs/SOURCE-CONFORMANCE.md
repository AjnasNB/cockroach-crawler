# SourceProvider conformance harness

`cockroach-crawler/source-conformance` supplies a small offline harness for
built-in and community `SourceProvider` implementations. It registers a
third-party provider through the public `providers` extension point; the
adapter does not need to be imported into Cockroach Crawler core.

```js
import { runSourceProviderConformance } from "cockroach-crawler/source-conformance";

const report = await runSourceProviderConformance({
  provider: myProvider,
  secretMarkers: [fixtureToken],
  searchCase: { input: { query: "deterministic fixture", maxResults: 1 } },
  errorCases: [
    {
      name: "unsupported read",
      code: "SOURCE_CAPABILITY_UNAVAILABLE",
      run: (registry) => registry.read("my-provider", "fixture")
    }
  ]
});
```

The harness verifies status shape, boolean capabilities, explicit
authentication and limitation text, immutable normalized records, required
record fields, and secret-free records and errors. Adapter suites should add
error cases for unsupported operations, policy denial, quota, malformed
payloads, not found, cancellation, timeout, and response-size budgets whenever
those cases apply.

`status()` must report the exact access state. A provider that can read but not
search should report `read: true` and `search: false`; it must not advertise a
capability merely because a host could add it later. Missing credentials are a
normal capability state, not permission to discover cookies or fall back to a
different transport.

Passing this harness is repository-local contract evidence. The returned
report always sets `certification: false`; it is not provider certification,
partnership, security review, or live-service validation.
