# Read-only source adapters

The stable `0.3.0` package includes the capability-aware registry, ordered source routing, and optional read-only reach providers. Check the installed package version before importing it.

Normalized records follow the published JSON Schema at
`cockroach-crawler/schemas/source-record.json`. Every required field is shared
across providers; `metadata` is intentionally provider-specific and consumers
must feature-detect its keys.

```bash
npm install cockroach-crawler@0.3.0
npx cockroach-sources doctor --json
npx cockroach-sources search github "topic:web-crawler language:javascript" --max-results 5 --json
npx cockroach-sources read youtube "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --json
```

Human-readable `doctor` output includes explicit `READY`, `PARTIAL`,
`MISSING CREDENTIALS`, and `UNAVAILABLE` labels. Color is optional decoration:
`NO_COLOR=1` disables it, and JSON output is identical in every terminal. The
command exits zero when it successfully reports capability state, including
missing optional credentials; invalid commands and failed operations exit
non-zero.

```js
import { createSourceRegistryFromEnv } from "cockroach-crawler/sources";

const sources = createSourceRegistryFromEnv(process.env);
const status = sources.doctor();
const records = await sources.search("github", {
  query: "topic:web-crawler language:javascript",
  maxResults: 5
});
```

| Provider | Without credentials | With documented credentials | Environment |
| --- | --- | --- | --- |
| Web | Explicit URL crawl through the hardened crawler | Same; creator may authorize additional local capabilities | none |
| GitHub | Public repository/issue search and repository read at unauthenticated limits | Higher documented REST limits | `GITHUB_TOKEN` or `GH_TOKEN` |
| YouTube | Known-video oEmbed metadata | Search and richer video metadata; no transcript implementation | `YOUTUBE_API_KEY` |
| X | Unavailable | Read/search through approved API v2 access | `X_BEARER_TOKEN` |
| Reddit | Unavailable | Read/search through application-only OAuth | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `COCKROACH_REDDIT_USER_AGENT` |

API keys and tokens are sent in headers where the provider supports it. They are excluded from normalized records, errors, URLs, doctor output, and CLI arguments. A YouTube API key identifies a project/quota context; it does not authenticate a user principal, so records correctly report `authenticated: false` and `credentialed: true`.

Provider responses must contain both valid JSON and the minimum documented
payload shape before normalization. Malformed JSON and syntactically valid but
incompatible successful payloads fail separately at the same
`SOURCE_INVALID_RESPONSE` boundary; valid empty collection payloads remain
successful empty results.

The built-ins do not post, vote, like, follow, comment, upload, edit, or delete. Provider terms, quotas, approval, regional availability, content truth, and downstream prompt-injection handling remain the operator's responsibility.
