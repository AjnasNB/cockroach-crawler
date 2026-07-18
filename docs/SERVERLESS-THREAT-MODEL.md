# Restricted serverless crawler threat model

Status: implementation draft awaiting review by someone other than the author
under [issue #13](https://github.com/AjnasNB/cockroach-crawler/issues/13).

## Scope and security objective

This model covers the Fetch-compatible crawler in
`cockroach-crawler/serverless` and the example Cloudflare Worker in `worker/`.
The deployment accepts one authenticated crawl request, permits only
operator-configured HTTPS origins, rechecks every redirect and robots target,
and enforces request, page, byte, link, concurrency, delay, and deadline
ceilings.

The objective is to bound an authenticated caller's use of a deliberately
small HTML-reading service. It is not a general SSRF defense, browser sandbox,
anonymous public proxy, distributed crawler, or complete egress-isolation
system.

## Trust boundaries and ownership

| Boundary | Library control | Runtime/platform control | Operator responsibility |
| --- | --- | --- | --- |
| Request authentication | Worker compares the bearer value without accepting it in the body | Secret storage supplies `CRAWLER_API_TOKEN` | Create, rotate, scope, and revoke the secret; never expose it to browser code |
| Abuse rate | Worker requires a rate-limit binding and fails closed if absent | Cloudflare applies the configured rate-limit resource | Select limits for the deployment and monitor rejection rates |
| Destination origin | Library accepts only one to 32 configured HTTPS origins and rechecks redirects | Fetch resolves and connects to the hostname | Allowlist only owned or independently trusted hosts and apply infrastructure egress policy |
| DNS and IP destination | No application-level DNS resolution, classification, or pinning | Runtime resolver and network select the destination | Prevent internal/metadata egress outside the library; review hostname ownership and DNS changes |
| Robots and redirects | Robots failure closes; every redirect is re-authorized before dispatch | Runtime performs the final network operation | Monitor repeated robots/redirect failures and keep origin policy narrow |
| Resource use | Exact pages, requests, queue, links, bytes, delay, and deadline ceilings | Runtime CPU, memory, subrequest, and wall-clock quotas | Set platform quotas below financial and availability risk thresholds |
| Logs and records | Errors omit request credentials and normalized output is bounded | Platform stores and exports logs | Redact URLs/query values where sensitive; control retention and access |

## DNS rebinding and provider-runtime assumptions

The serverless profile validates the URL's scheme and configured origin, but it
does not inspect DNS answers or pin a request to a previously validated public
address. An allowlisted hostname can later resolve to a private, link-local, or
metadata destination. The platform may also change resolution, connection
reuse, proxying, or egress behavior independently of this library.

Therefore:

- use this tier only with operator-owned or independently trusted hostnames;
- do not allow callers to add origins at request time;
- block private, link-local, metadata, and internal service destinations with
  platform/network egress controls where the deployment can reach them;
- treat DNS ownership and record changes as security-sensitive configuration;
- use the hardened local Node crawler when application-level DNS answer
  classification and address pinning are required.

## Abuse cases

| Abuse case | Expected control and signal | Residual risk |
| --- | --- | --- |
| Caller supplies an unlisted origin | Reject before page dispatch; record a validation failure count | A trusted allowlisted hostname can still serve attacker-controlled content |
| Redirect escapes the allowlist | Revalidate before target dispatch; record redirect denial and source origin | A same-origin redirect can reach a path with unexpectedly sensitive public content |
| Allowlisted DNS is rebound internally | Infrastructure egress policy must deny the connection | Library-only deployments remain vulnerable to the runtime's chosen destination |
| `robots.txt` fails or redirects unsafely | Fail closed before page crawl; record robots failure class | Robots is publisher policy, not authorization or confidentiality control |
| Oversized or endless response | Streaming byte ceiling and total deadline cancel work | Runtime may account some bandwidth/CPU before cancellation is observed |
| Link fan-out or redirect loop | Queue, link, page, request, redirect, and deadline limits terminate work | Adversarial content can consume the full configured budget |
| Missing or guessed bearer token | Constant-time comparison rejects before rate-limited crawl work | Token theft remains possible through operator logs, clients, or unrelated systems |
| High authenticated request rate | Rate-limit binding rejects; monitor 429 counts and unique caller keys | Shared tokens reduce attribution and revocation precision |
| Credential placed in request body | Worker ignores it and requires the configured Authorization header | Reverse proxies and access logs may still retain headers unless configured safely |
| Sensitive URL appears in logs | Log structured error classes and hashes rather than full query strings | Operators control downstream log sinks and retention |

## Observability

Track at minimum:

- authentication failures without recording the bearer value;
- rate-limit decisions and missing-binding failures;
- admitted origin, final origin, redirect count, and denial class;
- robots status and fail-closed reason;
- pages, requests, queued URLs, bytes, duration, and which ceiling stopped work;
- platform subrequest, CPU, memory, egress, and exception metrics;
- deployment version and configuration revision used for each request.

Alert on repeated origin denials, unexpected final origins, metadata/private
network egress blocks, robots failure spikes, requests consistently exhausting
ceilings, token failures, and abrupt cost or subrequest growth.

Do not log bearer tokens, Reddit/X/GitHub/YouTube credentials, request bodies,
browser state, or unbounded response content. Consider hashing normalized URLs
when paths or queries can contain customer data.

## Rollback and incident response

1. Disable or route traffic away from the Worker.
2. Rotate `CRAWLER_API_TOKEN` and revoke all known clients if authentication may
   be compromised.
3. Remove affected origins from deployment configuration and tighten egress
   policy.
4. Preserve bounded security events and the exact deployed commit/configuration
   for investigation without copying secrets into issues.
5. Deploy the last reviewed version, then run authentication, rate-limit,
   allowlist, redirect, robots, byte, and deadline probes before restoring
   traffic.
6. Use a private GitHub security advisory for library vulnerabilities.

## Residual risks

- No application-level DNS pinning or complete SSRF isolation exists in this
  tier.
- Trusted origins can change ownership, DNS, content, redirects, or robots
  behavior after review.
- HTML is untrusted output even when retrieval is allowed.
- Shared bearer authentication does not identify an end user.
- Rate limits and application budgets reduce abuse; they do not guarantee cost
  or availability under every platform failure.
- Platform networking, logging, and runtime semantics can change outside the
  package release cycle.

An independent reviewer must confirm these assumptions against the intended
deployment before issue #13 is closed.
