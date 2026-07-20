# Reach and governed browser architecture

Cockroach Crawler should be easy to install as part of one agent product, but it must not combine every trust boundary in one runtime. Public evidence retrieval, provider routing, browser actions, approvals, context retention, and workflow orchestration have different security properties.

## Package boundaries

| Layer | Responsibility | Must not do |
| --- | --- | --- |
| `cockroach-crawler` | Bounded public HTTP retrieval, extraction, normalized records, provider contracts | Reuse login sessions or submit mutations |
| `cockroach-crawler/source-router` | Ordered read/search providers, capability diagnostics, explicit failure fallback | Turn an auth failure into an implicit cookie/session fallback |
| Governed browser adapter | DOM observation, typed action proposals, optional multi-page execution | Dispatch mutating actions before policy and exact approval |
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
| YouTube captions | Available through a separately configured governed Maqam adapter | Register as an optional provider; never import browser cookies |
| YouTube search | Official API key in crawler | Allow an explicitly configured alternate search provider without claiming universal no-key access |
| RSS/Atom | Governed Maqam adapter and crawler issue | Add a built-in parser over the crawler transport |
| Hosted web search | Governed Maqam MCP adapter | Register as an optional search provider with visible operator and data boundary |
| X and Reddit official APIs | Built in with credentials | Retain as official adapters |
| Login-session social reads | Not built in | Separate local browser-session connector with explicit per-provider consent and doctor state |
| Additional regional/social providers | Not built in | Independent optional adapters with conformance fixtures, documented terms and ordered routing |
| One-command install/update | Partial | ProductLoop installer registers CLI, MCP and Codex/Claude skills, then runs every doctor |

No-key means that a developer key is not required for that specific adapter. It does not mean anonymous access always works, that login state may be taken silently, or that provider terms and regional restrictions disappear.

## Page interaction target

The browser layer should cover in-page copilots, form filling, accessibility commands, multi-page tasks and MCP control. It should use a structural DOM representation instead of screenshots when possible and permit bring-your-own-model configuration.

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
