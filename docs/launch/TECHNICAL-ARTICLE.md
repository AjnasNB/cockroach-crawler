# Why an agent crawler needs two network boundaries, not one

“Give the agent web access” sounds like a single switch. It is not.

A crawler that runs on a developer machine can inspect DNS answers, pin a connection to an approved address, control a local browser process, and stop work at an exact deadline. A small serverless function can be easier to deploy, but its fetch runtime may not expose the address-level controls needed to make the same network guarantees.

Treating both environments as equivalent creates a dangerous documentation problem: the convenient tier inherits the security reputation of the hardened tier without inheriting its controls.

Cockroach Crawler `0.3.0-alpha.2` takes the opposite approach. It exposes two tiers, returns their capabilities, and keeps official source adapters separate from both.

## The first boundary: what may be contacted?

An agent-generated URL is untrusted input. The obvious checks—`http` or `https`, no embedded password, no localhost—are only the beginning.

A public hostname can resolve to a private address. It can return multiple answers, some public and some private. A redirect can leave the approved origin. A DNS answer can change between validation and connection. IPv4 can be represented through mapped IPv6 or alternate numeric forms. Cloud providers expose metadata and platform endpoints that must remain blocked even when a general private-network exception is enabled.

The hardened local crawler therefore applies policy before every contact:

1. Parse and normalize the URL.
2. Reject credentials, unsafe schemes, unsupported hosts, and sensitive paths.
3. Enforce same-origin behavior or an explicit cross-origin allowlist.
4. Resolve and validate every DNS answer.
5. Pin the request to an approved address.
6. Validate each redirect as a new request.
7. Recheck robots policy before the target page is fetched.

This does not make a crawler universally safe. It creates a narrower, testable network boundary.

## The second boundary: how much work may the request cause?

Even a permitted origin can return an infinite calendar, an enormous response, a redirect loop, or millions of links. Agent tools also need resource policy.

Cockroach Crawler uses explicit limits for pages, network requests, queue entries, discovered links, sitemap documents and URLs, redirect hops, URL length, decoded bytes per response, total bytes, concurrency, retries, depth, and total duration.

The distinction between `maxPages` and `maxRequests` matters. A page budget limits useful output; a request budget limits total network activity, including robots and sitemap work. Both are needed.

The agent adapter snapshots those creator-owned limits. Model input may request less work but cannot silently expand the ceiling, disable robots, enable private networks, or turn on browser mode unless the creator authorized that capability.

## Why the serverless tier is smaller

The serverless entry point accepts one to 32 explicit HTTPS origins chosen by the deployment operator. It rejects IP literals, validates redirect destinations before following them, re-checks robots at every redirect target, fails closed when robots policy cannot be verified, and applies strict page, depth, request, byte, redirect, delay, timeout, and duration budgets.

But it does not resolve, classify, or pin DNS answers. An allowlisted hostname could resolve to an internal address, so operators must allowlist only origins they own or independently trust and add infrastructure egress controls when internal destinations are reachable. It does not run Playwright, expose authenticated source providers, or accept request-selected arbitrary origins.

Those are not missing marketing bullets. They are the reason the serverless tier can remain understandable. Every result contains runtime metadata that says:

```json
{
  "tier": "serverless",
  "browser": false,
  "authenticatedProviders": false,
  "dnsPinning": false,
  "allowlistedOrigins": ["https://docs.example.com"]
}
```

If a deployment needs stronger destination control, the correct answer is to use the hardened local tier or add infrastructure-level egress controls—not to rename an origin allowlist “DNS protection.”

## Source access is a third concern

Reading a website and reading a provider API have different rules. Cockroach Crawler's source registry exposes them through a shared record format without pretending their availability is identical.

After installing the alpha CLI globally, run:

```bash
npm install --global cockroach-crawler@0.3.0-alpha.2
cockroach-sources doctor
```

In an environment with no credentials, the current alpha reports:

- public web: explicit URL crawling is ready;
- GitHub: public search and repository reads are ready at the unauthenticated REST rate limit;
- YouTube: known-video oEmbed metadata is available, while search requires an API key and transcripts are not implemented;
- X: search and read require an approved API v2 bearer token;
- Reddit: search and read require application-only OAuth and a contact-aware user agent.

Credentials come from environment variables, not command-line flags. The built-in adapters perform read operations only. They do not post, comment, like, follow, edit, or delete.

Every normalized record includes a provider ID, source ID, type, title, URL, text, author, publication time when available, retrieval time, adapter version, content hash, warnings, metadata, and an authenticated-retrieval flag. That makes records easier to inspect and deduplicate, but it is not a guarantee that the underlying content is true or safe. Crawled text remains untrusted data and can contain prompt injection.

## Measure three different things separately

One number cannot establish crawler quality. The repository therefore keeps three evidence tracks separate:

1. **Local regression:** a synthetic 120-page IPv4-loopback site measures the non-browser Node path across two warmups and seven recorded runs. The current development capture on Node 24 and an AMD Ryzen 7 4800H reports a 508.5 pages/second median, while checking the exact URL set, request count, robots behavior, sensitive-path denial, extracted fields, and content hashes.
2. **Security and conformance:** deterministic tests exercise DNS classes, redirect escapes, robots failures, resource ceilings, provider authentication states, browser egress controls, and the weaker serverless contract. These are pass/fail boundary checks, not throughput results.
3. **Extraction quality:** a future WCXB profile can measure word-level extraction F1 across its seven annotated page types. WCXB is useful complementary evidence, not an industry certification or a replacement for the project's security fixtures.

The 508.5 result is a project-local development baseline, not a competitor score, public-internet speed, production-capacity claim, or SLA. Release CI regenerates an exact-commit artifact, and the repository records the machine, Node version, samples, exclusions, source fingerprint, and dirty-source state needed to interpret it. Reproduce the method with `npm run bench` and read `docs/BENCHMARK.md` before quoting any result.

## Browser rendering is not a sandbox

Some pages need JavaScript. The optional local Playwright mode routes HTTP(S) traffic through the crawler's validated transport and blocks several egress paths and state-changing methods. It also applies byte and deadline accounting.

That is defense in depth, not process isolation. Hostile pages can consume CPU or memory and may target browser vulnerabilities. Storage-state files contain credentials. An operator running untrusted pages still needs a container or process boundary, restricted host egress, and reviewed selectors.

## A useful architecture diagram

```text
agent / workflow
       |
       v
creator-owned policy and budgets
       |
       +--------------------+
       |                    |
       v                    v
hardened local crawler   allowlist serverless crawler
DNS validation/pinning   operator-configured HTTPS origins
optional browser         HTML only, no DNS pinning
       |                    |
       +----------+---------+
                  |
                  v
       normalized records + provenance

official source registry is invoked separately and reports
provider-specific search/read/authentication capabilities
```

## Best fit

Cockroach Crawler is designed for a common agent integration: an explicit read request enters a creator-owned boundary, consumes a known budget, and returns a record with enough provenance to audit what happened. Distributed queues, proxy infrastructure, hosted search indexes, and large-scale browser orchestration belong in a separate deployment layer.

## Try the alpha

After the reviewed alpha is published:

```bash
npm install --global cockroach-crawler@0.3.0-alpha.2
cockroach-sources doctor
cockroach-crawl https://example.com/docs --max-pages 10 --jsonl
```

Source: <https://github.com/AjnasNB/cockroach-crawler>

The release is an integration preview. Review the security documentation, run the verification suite, and test it against your own threat model before deployment.

## Closing question

If you expose web reading to an agent today, where is the real boundary: in code, in infrastructure, or only in the prompt?
