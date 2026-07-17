# Contributor issue plan

Create only the issues the maintainer is prepared to review. Each issue should have one owner, a reproducible fixture, acceptance criteria, and a documented boundary. Do not label security-sensitive network changes as `good first issue`.

## Good first issues

### 1. Add copy-paste source-doctor examples to the README

**Labels:** documentation, good first issue

**Scope:** Document no-credential output and one environment-only credential example without real values.

**Acceptance criteria:**

- Shows `doctor`, one GitHub search, and one known-video YouTube read.
- States that YouTube transcripts are unavailable.
- States that X and Reddit require official credentials.
- No tokens in CLI arguments, screenshots, fixtures, or history.

### 2. Add JSON Schema for normalized source records

**Labels:** documentation, types, good first issue

**Acceptance criteria:**

- Covers all required `SourceRecord` fields.
- Includes one fixture per built-in provider.
- Documents that `metadata` is provider-specific.
- Validates current fixtures in CI.

### 3. Improve accessible text for source status output

**Labels:** accessibility, CLI, good first issue

**Acceptance criteria:**

- Status remains understandable without color.
- JSON output is unchanged.
- Snapshot tests cover ready, partial, missing credentials, and unavailable.

### 4. Add a deterministic serverless quickstart fixture

**Labels:** documentation, serverless, good first issue

**Acceptance criteria:**

- Uses a local mocked Fetch implementation; no external network.
- Demonstrates one allowed crawl and one denied origin.
- Prints the returned runtime boundary.

## Help wanted

### 5. Cloudflare Workers reference deployment

**Labels:** integration, serverless, help wanted

**Acceptance criteria:**

- Origin allowlist and access token come from deployment configuration/secrets.
- Request body cannot change trusted configuration.
- Tests cover auth failure, origin denial, redirect escape, robots failure, bytes, and deadline.
- Docs say application-level DNS pinning is unavailable in this tier.
- No telemetry or hosted dependency is added by default.

### 6. Offline GitHub error-contract fixtures

**Labels:** provider:github, testing, help wanted

**Acceptance criteria:**

- Covers unauthenticated rate-limit, authenticated rate-limit, 404, malformed JSON, timeout, and response-size failure.
- Uses mocked Fetch; no real token or GitHub request.
- Normalized errors never include authorization values.

### 7. Offline YouTube API/oEmbed contract fixtures

**Labels:** provider:youtube, testing, help wanted

**Acceptance criteria:**

- Covers no-key metadata, keyed search/read, no result, quota error, malformed payload, and timeout.
- Confirms transcript capability remains `false`.
- No network, account, or key required.

### 8. Offline X API v2 contract fixtures

**Labels:** provider:x, testing, help wanted

**Acceptance criteria:**

- Covers recent search, single-post read, missing credentials, invalid token, quota response, and not found.
- Asserts read-only HTTP methods/endpoints.
- Asserts the bearer token never appears in records or errors.

### 9. Offline Reddit OAuth contract fixtures

**Labels:** provider:reddit, testing, help wanted

**Acceptance criteria:**

- Covers token acquisition/cache/expiry, global and subreddit search, post plus sampled comments, auth failure, and quota response.
- Uses a contact-aware fixture user agent.
- Asserts credentials and access token never appear in output.

### 10. SourceProvider conformance harness

**Labels:** providers, testing, help wanted

**Acceptance criteria:**

- Reusable tests for `status`, search/read capability errors, cancellation, timeouts, bounded responses, immutable records, and secret redaction.
- Supports third-party providers without importing them into core.
- Documents official vs community adapter status.

### 11. Real package consumer matrix

**Labels:** release, types, help wanted

**Acceptance criteria:**

- Installs a packed tarball in a clean temporary project.
- Exercises JavaScript and TypeScript imports for root, `/agent`, `/sources`, and `/serverless`.
- Runs both CLI bins and verifies prerelease version output.
- Runs on Node 20.18.1, 22, and 24.

### 12. Documentation threat-model decision tree

**Labels:** security, documentation, help wanted

**Acceptance criteria:**

- Helps choose local, local browser, serverless, or no crawl.
- Names process isolation and egress requirements for untrusted browser targets.
- Names DNS-pinning absence in serverless.
- Includes prompt-injection handling as a downstream responsibility.

## Maintainer-led security issues

### 13. Serverless deployment egress threat model

**Labels:** security, serverless, maintainer

Do not mark as a beginner issue.

**Acceptance criteria:**

- Documents DNS rebinding and provider-runtime assumptions.
- Enumerates controls supplied by application, runtime, and infrastructure.
- Includes an abuse-case table and rollback plan.
- Receives review from someone other than the author.

### 14. Browser-mode isolation reference profile

**Labels:** security, browser, maintainer

**Acceptance criteria:**

- Container/process, filesystem, memory/CPU, and host-egress guidance.
- Storage-state secret handling and cleanup.
- Demonstrates that browser routing is defense in depth, not sandboxing.
- No claim of complete browser containment.

### 15. Provider terms and endpoint review cadence

**Labels:** governance, providers, maintainer

**Acceptance criteria:**

- Records official documentation links, reviewed endpoints, auth model, and last review date.
- Quarterly reminder or issue automation.
- Defines how a provider is disabled when its contract changes.

## Issue template fields

Every provider/integration issue should answer:

1. What authorized user problem does this solve?
2. Which official API and documentation apply?
3. Is access public, API-key, OAuth, bearer, or user delegated?
4. Is the proposal strictly read-only?
5. What quotas, terms, and content limitations apply?
6. Which data fields will enter the normalized record?
7. What secrets exist, and how will tests prove they are not serialized?
8. What offline fixtures cover allow, deny, quota, timeout, malformed payload, and not-found paths?
9. What capabilities remain unimplemented?
10. Who will maintain the adapter when the provider changes?
