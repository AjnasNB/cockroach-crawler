# Article publication adaptations

Use [TECHNICAL-ARTICLE.md](./TECHNICAL-ARTICLE.md) as the canonical article. Publish the canonical version on the project site first, then use canonical-link support where the platform provides it. Do not publish five identical copies at the same minute.

## Dev.to

**Title:** Why an agent crawler needs two network boundaries, not one

**Description:** A practical look at DNS-pinned local crawling, allowlist-first serverless fetching, exact budgets, and capability-aware source adapters.

**Tags:** `opensource`, `node`, `security`, `ai`

**Opening hook:**

> “Give the agent web access” is not one permission. It is a stack of decisions about destination, redirects, DNS, browser execution, credentials, and resource budgets. We built two crawler tiers because pretending every runtime can enforce the same boundary is worse than shipping a smaller capability.

**CTA:**

> Run `cockroach-sources doctor`, inspect the capability report, and tell us which failure mode deserves the next fixture.

Add the canonical URL in front matter after the site article is live.

## Hashnode

**Title:** Local DNS control vs serverless convenience: designing a crawler for agents

**Subtitle:** Why Cockroach Crawler exposes two honest network boundaries and keeps source APIs capability-aware.

**Series:** Building bounded tools for agents

**Opening hook:**

> A crawler running on your machine and a crawler running inside a generic serverless fetch runtime do not control the same things. A useful API should expose that difference, not erase it.

**Discussion prompt:**

> Which property would make you reject a crawler tool immediately: no destination pinning, no request budget, no robots failure policy, or no provenance?

Set the original URL to the canonical project article.

## Medium

**Title:** Your agent's web tool is a network boundary

**Subtitle:** The case for separate local and serverless crawler tiers

**Deck:**

> Agent browsing is usually presented as a capability. Security work starts when we treat it as authority.

**Pull quote:**

> The convenient tier should not inherit the security reputation of the hardened tier without inheriting its controls.

**Ending:**

> The alpha is open source. The most useful response is not a clap; it is a concrete URL, failure mode, or provider contract that the current tests miss.

Use Medium's import/canonical feature rather than pasting an unlinked duplicate.

## HackerNoon

**Title:** Agent browsing needs an SSRF boundary, not just a prompt

**Subtitle:** How explicit origins, DNS-pinned hops, exact budgets, and read-only provider adapters change the design of a crawler tool.

**Suggested tags:** Cybersecurity, Node.js, Open Source, Web Scraping, AI Agents

**Pitch paragraph:**

> This is a code-backed architecture article, not a generic launch announcement. It separates three concerns that are often collapsed into “browsing”: hardened local crawling, limited serverless HTML extraction, and official provider API reads. It includes concrete failure policies, returned capability metadata, and runnable commands from an MIT-licensed project.

**Editorial note:** Keep the competitor paragraph neutral. Do not add a scorecard or “best crawler” language.

## LinkedIn article

**Title:** What “web access” actually gives an agent

**Header:** Destination authority, resource authority, browser authority, and provider credentials are four different permissions.

**LinkedIn-specific introduction:**

> Teams often ask whether an agent can browse. The more useful question is: which destinations can it contact, how much work can one request cause, what browser state can it access, and which provider credentials can it use?

> I built Cockroach Crawler as a narrow, open-source answer for Node.js workflows. The important part of the alpha is not broader reach. It is that the local crawler, serverless crawler, and source adapters state different capabilities.

**LinkedIn closing:**

> If your team already gives agents web access, write down the four permissions above. If any answer is “whatever the prompt asks for,” that is the next boundary to design.

**Short feed post linking to the article:**

> “Can the agent browse?” is the wrong yes/no question.
>
> Ask four smaller questions:
>
> 1. Which destinations can it contact?
> 2. What resource budget can one request consume?
> 3. Is browser execution isolated?
> 4. Which provider credentials are available?
>
> I wrote up the two-tier design behind Cockroach Crawler `0.3.0-alpha.2`, including what the serverless tier deliberately does not claim.
>
> [CANONICAL_ARTICLE_URL]

## Benchmark-safe excerpt

Use this paragraph only with the canonical methodology link:

> The repository separates local throughput regression, security/conformance fixtures, and extraction quality. Its current 120-page loopback development capture reports a 508.5 pages/second median across seven measured runs on the named machine; that number is not a competitor comparison, public-internet speed, capacity claim, or SLA. Exact-commit CI evidence and the full sample distribution are published with the method. A future WCXB profile will evaluate word-level extraction quality separately.

Do not shorten this to “510 pages/s” or place it in a headline. Keep the workload, development status, and exclusions attached.

## Publication cadence

1. Day -2: canonical site article.
2. Day -1: Dev.to or Hashnode with canonical link.
3. Launch day: LinkedIn article or feed summary.
4. Day +2: Medium import.
5. Day +5 or after editorial approval: HackerNoon.

Update each edition with actual discussion insights; do not manufacture user quotes, adoption numbers, or benchmark claims.
