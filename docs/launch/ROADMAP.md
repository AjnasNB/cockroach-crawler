# Public 30/60/90-day roadmap

This roadmap is evidence-driven. Dates start when `0.3.0-alpha.1` is published from a reviewed commit. Items may move when provider APIs, security findings, or contributor capacity change. “Done” means the stated exit criteria are met, not that code merely exists on a branch.

## Contribute to the next evidence checkpoint

[Issue #20](https://github.com/AjnasNB/cockroach-crawler/issues/20) is the
current credential-free community test: distinguish a legitimate empty GitHub
search result from syntactically valid but unusable payload shapes. It requires
no account, key, live request, or external side effect. Contributors should
work from a fork and a focused branch; maintainers review and merge pull
requests after the required checks pass.

## First 30 days: make the alpha observable

### 1. Release and install verification

**Outcome:** Anyone can reproduce the published package from the tagged source.

**Exit criteria:**

- npm trusted-publishing provenance and the approved tarball integrity are visible.
- Node 22, 24, and 26 CI plus real Chromium tests pass at the tag.
- Registry-only JavaScript, TypeScript, CLI, `/agent`, `/sources`, and `/serverless` smoke tests are recorded.
- The site reports the exact published version and links to the release.

### 2. Provider contract fixtures

**Outcome:** Built-in adapters are testable without real accounts or network access.

**Exit criteria:**

- Versioned response fixtures cover GitHub search/read, YouTube keyed/no-key read, X read/search, and Reddit token/search/read.
- Error fixtures cover quota, auth, not-found, timeout, malformed response, and size limit.
- Fixture provenance and licensing are documented.

### 3. Serverless reference deployment

**Outcome:** A maintainer can deploy the allowlist-first tier without inventing security defaults.

**Exit criteria:**

- One Cloudflare Workers example with environment-held access token and origin allowlist.
- Deployment tests for unauthorized request, unlisted origin, redirect escape, robots failure, oversized body, and deadline.
- Documentation states that runtime fetch has no application-level DNS pinning.

### 4. Feedback loop

**Outcome:** Launch feedback becomes traceable engineering work.

**Exit criteria:**

- Discussion template for provider requests.
- Issue forms require use case, official API/docs link, auth model, read/write scope, sample payload, and test plan.
- No duplicate “add every source” umbrella issues.
- At least one external, credential-free fixture reproduction records the exact commit, Node version, commands, and result.

## Days 31–60: deepen integration quality

### 1. Stable normalized schema proposal

**Outcome:** Downstream users can rely on a documented record contract.

**Exit criteria:**

- JSON Schema for `SourceRecord` with examples for each provider.
- Compatibility policy for metadata additions and breaking core-field changes.
- Snapshot fixtures and consumer tests.

### 2. Framework adapters, one at a time

**Outcome:** Common agent runtimes can call the crawler without weakening creator policy.

**Candidate order:** MCP tool, OpenAI Agents SDK tool, Google ADK FunctionTool, LangChain/LangGraph tool.

**Exit criteria per adapter:**

- Provider package is development-only or peer-optional.
- One allow case dispatches exactly once through the registered crawler.
- One deny case causes zero network/adapter dispatches.
- No model call, account, key, or external side effect is required for the contract test.
- Unsupported confirmation, authentication, discovery, and approval synchronization are named.

### 3. Output sinks

**Outcome:** Records can enter common local workflows without a hosted dependency.

**Candidates:** JSONL rotation, SQLite, filesystem snapshots, and user-supplied callback stream.

**Exit criteria:** Backpressure, atomic writes, duplicate content hashes, cancellation, and partial failure are tested.

### 4. Documentation quality

**Outcome:** A new user can select a tier and finish one authorized crawl in under ten minutes.

**Exit criteria:**

- Copy-paste quickstarts for local CLI, Node API, agent tool, source registry, and serverless handler.
- Threat-model decision tree.
- Accessibility audit and mobile navigation check for the site.
- Every example names what it cannot do.

## Days 61–90: decide the stable surface

### 1. Alpha-to-beta review

**Outcome:** Decide whether `/sources` and `/serverless` are ready for a beta compatibility promise.

**Exit criteria:**

- No unresolved high-severity security findings.
- At least two external integrations have reproduced the install path.
- Provider fixtures match current official API contracts.
- Serverless example has a deployment threat model and rollback procedure.
- Breaking feedback is resolved or explicitly deferred.

### 2. Performance methodology

**Outcome:** Publish measurements that answer real capacity questions without universal claims.

**Exit criteria:**

- Fixed hardware/runtime/environment metadata.
- Local fixture server and deterministic corpus.
- Separate extraction, network scheduling, and browser profiles.
- Warmup, sample count, median, interval, variance, and raw JSON.
- No competitor ranking unless each tool is configured and reviewed under an agreed workload.

### 3. Provider extension API

**Outcome:** Community adapters can be added without entering the core credential boundary.

**Exit criteria:**

- Documented `SourceProvider` lifecycle and error taxonomy.
- Contract-test harness for third-party providers.
- Secret-redaction and no-write conformance checks.
- Maintainer policy for official vs community adapters.

### 4. Governance and maintenance

**Outcome:** Contributions remain reviewable as visibility grows.

**Exit criteria:**

- CODEOWNERS or equivalent review ownership for security-sensitive files.
- Required checks and no direct unreviewed publishing.
- Security response targets and supported-version policy.
- Monthly dependency, provider-contract, and documentation review cadence.

## Scope gates for this horizon

- Login, paywall, CAPTCHA, or access-control bypass.
- Posting or other provider write operations.
- Proxy rotation or stealth fingerprinting.
- Unverified provider capabilities or undocumented credential paths.
