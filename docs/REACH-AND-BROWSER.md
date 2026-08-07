# Reach and governed browser architecture

Cockroach Crawler should be easy to install as part of one agent product, but it must not combine every trust boundary in one runtime. Public evidence retrieval, provider routing, browser actions, approvals, context retention, and workflow orchestration have different security properties.

## Package boundaries

| Layer | Responsibility | Must not do |
| --- | --- | --- |
| `cockroach-crawler` | Bounded public HTTP retrieval, extraction, normalized records, provider contracts | Reuse login sessions or submit mutations |
| `cockroach-crawler/source-router` | Ordered read/search providers, capability diagnostics, explicit failure fallback | Turn an auth failure into an implicit cookie/session fallback |
| `cockroach-crawler/external-sources` | Explicit no-key and browser-session read providers, pinned setup plans | Expose upstream write commands or import browser cookies |
| `cockroach-crawler/browser-host` | Stateful sessions, structural observations, previews, approved execution, deduplication | Issue approvals or claim a network boundary the injected runtime does not provide |
| `cockroach-browser@0.1.0` (separate `AGPL-3.0-or-later` runtime) | Authorized interactive sessions, semantic snapshots and browser evidence behind its own policy | Enter the crawler dependency graph or send profiles, cookies, daemon auth or authenticated state through the crawler |
| Maqam | Policy, exact input-bound approval, one-use consumption, replay rejection, traces and evidence | Claim control over tools that bypass its registered gateway |
| Qarinah | Opt-in compact context, cited retrieval, deterministic index/graph and host hooks | Capture content without workspace consent |
| ProductLoop OS | One installer, workflow composition and cross-layer receipts | Erase the package boundaries above |

The intended user experience is one setup command. The internal implementation remains modular so a read-only crawl cannot acquire browser-session authority by accident.

## Reach capability target

| Capability | Current state | Target implementation |
| --- | --- | --- |
| Explicit public web URL | Built in | Retain hardened crawler and normalized record |
| Public GitHub search/read | Built in | Add optional authenticated read-only profile |
| Known YouTube metadata | Built in | Retain oEmbed no-key path |
| YouTube captions | Available through a separately configured governed Maqam adapter | Move the reviewed caption path into a future crawler provider; never import browser cookies |
| YouTube search | Official API key plus optional `youtube-no-key` provider | Keep official and yt-dlp routes explicit; never fall back after authentication failure |
| RSS/Atom | Governed Maqam adapter and crawler issue | Add a built-in parser over the crawler transport |
| Hosted web search | Governed Maqam MCP adapter | Register as an optional search provider with visible operator and data boundary |
| X and Reddit official APIs | Built in with credentials | Retain as official adapters |
| Login-session social reads | X, Reddit, Facebook, Instagram and LinkedIn through fixed OpenCLI read mappings | Add a stronger authenticated localhost broker and dedicated-profile guidance |
| Additional regional/social providers | Xiaohongshu read mapping; Bilibili intentionally excluded | Add only reviewed adapters with conformance fixtures and documented terms |
| One-command install/update | `cockroach-reach` dry-run plan and explicit pinned apply | Add signed manifest distribution, rollback and scheduled check integration |

No-key means that a developer key is not required for that specific adapter. It does not mean anonymous access always works, that login state may be taken silently, or that provider terms and regional restrictions disappear.

## Page interaction target

The in-package browser layer covers the Maqam-compatible structural contract for in-page copilots, form preparation, typed commits and multi-page identity. `cockroach-crawler/browser-host` owns lifecycle, opaque element IDs, revisions, operation validation, value references and deduplication, but it deliberately requires an injected trusted runtime and does not automatically use Cockroach Browser.

The public `cockroach-browser@0.1.0` runtime is a separate deployment and license boundary. Cockroach Crawler may discover static evidence and a trusted host may select one exact fetched URL for browser work. Only that explicit URL, explicit allowed origins and finite browser budgets cross the handoff. Browser purpose and action/effect policy are added by the browser host. Profiles, cookies, storage state, website credentials, daemon authentication and authenticated browser state never enter crawler options, records or callbacks. The crawler's DNS-pinned transport does not govern a separate browser session; each runtime reports and enforces its own network boundary.

Every proposed action is classified before dispatch:

| Class | Examples | Default handling |
| --- | --- | --- |
| Observe | Read visible text, inspect controls, collect accessibility structure | Policy check and bounded evidence record |
| Navigate | Open an allowlisted URL or same-site page | Policy check; approval can be required by host policy |
| Prepare | Fill a draft without submission | Exact plan, redacted field evidence and optional approval |
| Commit | Submit form, send message, publish post, purchase, delete or change settings | Exact one-use Maqam approval immediately before dispatch |
| Sensitive | Authentication, payments, secrets, identity or privileged administration | Deny by default unless an explicit host integration defines the boundary |

The browser executor must return a causal receipt linking the proposal, structural plan, policy decision, approval identity, dispatched action, resulting page state and evidence hashes. Multi-page execution must re-authorize every origin transition and must not treat a previously approved action as approval for a changed DOM target.

## Compatibility strategy

External browser agents may propose actions through an adapter, including a Page Agent integration. The proposal is untrusted input. Maqam converts it into a canonical structural plan, evaluates policy, binds approval to the exact plan, and dispatches only through a registered executor. This preserves compatibility without making the external agent the authorization boundary.

Third-party code or packages must retain their licenses and required notices. Capability names and public documentation must describe the Cockroach/Maqam contract rather than implying that an upstream project is bundled when it is only an optional integration.

## Release gates

1. Provider conformance fixtures run without live credentials.
2. Capability doctor distinguishes ready, partial, missing credentials and unavailable.
3. Fallback never widens authentication or browser authority implicitly.
4. Browser commit actions demonstrate exact approval and replay rejection.
5. Packed consumers pass on Node 22, 24 and 26.
6. An external security reviewer validates session handling, redirects, DOM target binding and evidence redaction.
7. The one-command installer reports every optional dependency and asks before installing system software or enabling browser-session reuse.
8. Browser-host capability output must remain explicit that no interactive runtime is bundled. A separate Cockroach Browser deployment does not upgrade or replace the crawler host's reported network capabilities.

The runnable, exact-field protocol is documented in
[Cockroach Browser handoff](./COCKROACH-BROWSER.md).
