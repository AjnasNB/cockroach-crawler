# Node quality extraction

`cockroach-crawler/quality` is an opt-in Node-only main-content extraction
backend. It runs the exact `trafilatura@0.2.0` N-API package and is deliberately
not imported by Cockroach Crawler's core or serverless entry points.

```js
import { extractPageQuality } from "cockroach-crawler/quality";

const result = extractPageQuality(html, {
  url: "https://example.com/article",
  profile: "balanced",
  failClosed: true,
  diagnostics: true
});

if (result.status === "abstained") {
  console.error(result.abstention.reasons);
} else {
  console.log(result.markdown);
}
```

The default profile is `balanced`. `precision` and `recall` are explicit
alternatives. `failClosed` is opt-in: when enabled, application shells,
challenge pages, empty or undersized output, low backend quality, and output
budget violations return `status: "abstained"` with no extracted body. Native
warnings are always returned; diagnostics additionally report whether the
backend used its own content fallback.

`extractPageQuality` is synchronous because the reviewed native backend is
synchronous. For high-volume services, run it in a bounded worker-thread pool
instead of on a latency-sensitive event loop.

Input, output, image, URL, language, page-type, and option-object bounds are
validated before results are admitted. Unknown options and accessor-backed
options are rejected. If the exact native backend or matching platform package
cannot load, importing this subpath throws `QUALITY_BACKEND_UNAVAILABLE`.
Cockroach Crawler does not silently substitute its core extractor.

## Observed WCEB evidence

The balanced profile was evaluated with the same source-pinned WCEB scorer as
the core extractor:

| Corpus and mode | Pages | Precision | Recall | F1 | Required-snippet recall | Unwanted inclusion | Abstentions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Observed partition, balanced | 511 | 0.894101 | 0.926022 | 0.890524 | 0.864090 | 0.111383 | - |
| WCEB development split, balanced | 1,497 | 0.852784 | 0.896259 | 0.847064 | 0.755867 | 0.096181 | - |
| Observed partition, balanced + fail-closed | 511 | 0.847901 | 0.875080 | 0.844935 | 0.812035 | 0.104207 | 43 |

WCEB names the 511-page partition `test`, but this project had already
inspected and iterated against it. It is therefore observed development
evidence, not untouched held-out proof. The numbers do not establish universal
0.90 precision. Fail-closed is a separate safety profile whose 43 abstentions
must be reported with its quality metrics.

See [BENCHMARK.md](./BENCHMARK.md) for artifact names, reproduction commands,
and the complete claim boundary.

The default input ceiling is 10 million JavaScript characters, with a hard
configurable maximum of 20 million. Oversized input is rejected before it
enters the native backend.

Category and tag metadata are capped at 128 entries each. Extra entries are
discarded without discarding the independently bounded body, and
`diagnostics.metadataTruncated` records that condition.

The exact dependency is `trafilatura@0.2.0`; compatible ranges are not used.
Its upstream package publishes prebuilt binaries for Windows x64/ARM64, macOS
x64/ARM64, and glibc Linux x64/ARM64. Alpine/musl Linux, 32-bit systems, and
other operating systems are not supported by this native release. The core and
serverless entry points remain isolated from it, so use the core extractor on
those platforms or deploy the quality subpath on a supported Node host.
