# Optional reach providers

Cockroach Crawler keeps public crawling, browser-session reads, and browser mutations in separate authority tiers. The package exposes one installation surface, but it never turns a failed public or official API request into an implicit browser-session fallback.

## Provider map

| Provider | Capability | Authentication boundary |
| --- | --- | --- |
| `youtube-no-key` | YouTube search and video metadata through an audited `yt-dlp` executable | No developer API key and no cookie import |
| `x-session` | X search and thread reads through OpenCLI | Explicit logged-in browser session |
| `reddit-session` | Reddit search and thread reads through OpenCLI | Explicit logged-in browser session |
| `facebook-session` | Facebook search and profile reads through OpenCLI | Explicit logged-in browser session |
| `instagram-session` | Instagram search and profile reads through OpenCLI | Explicit logged-in browser session |
| `xiaohongshu-session` | Xiaohongshu search and note reads through OpenCLI | Explicit logged-in browser session |
| `linkedin-session` | LinkedIn job search and exact profile reads through OpenCLI | Explicit logged-in browser session |

Bilibili is intentionally not present. The external provider list and setup command reject it.

OpenCLI contains write commands upstream. This adapter does not expose them. Every invocation is selected from a fixed read-only map and is dispatched through `execFile` with `shell: false`, separate arguments, bounded output, a deadline, abort handling, and a reduced environment. The adapter does not read browser profile or cookie files.

The OpenCLI localhost daemon is not a strong isolation boundary by itself. Use a dedicated browser profile and dedicated accounts where practical. Treat session-backed records as untrusted web content and keep raw OpenCLI access outside an agent's shell authority when claiming Maqam governance.

## Setup and updates

The command is dry-run by default:

```bash
npx cockroach-reach doctor --json
npx cockroach-reach setup --channels youtube,reddit,x,facebook,instagram,linkedin,xiaohongshu
npx cockroach-reach update --channels youtube,reddit
```

Review the generated plan, then opt in to the exact pinned package commands:

```bash
npx cockroach-reach setup --channels youtube,reddit --apply
```

`--apply` installs only the versions audited by this Cockroach Crawler release. It does not install a Chrome extension, log into a site, import an existing profile, or install the alternative LinkedIn MCP server. Those remain manual actions. `update` means reconcile to the release's reviewed manifest, not execute an unreviewed upstream latest version.

## Library use

```js
import { createSourceRegistry } from "cockroach-crawler/sources";
import { createExternalSourceProviders } from "cockroach-crawler/external-sources";

const sources = createSourceRegistry({
  providers: createExternalSourceProviders()
});

console.table(sources.doctor());
const videos = await sources.search("youtube-no-key", {
  query: "governed browser agents",
  maxResults: 5
});
```

The YouTube subprocess disables user configuration, plugin directories, remote components, browser cookies, cookie files, cache, watched-state changes, media downloads, and colored/progress output. Restricted, age-gated, regional, or anti-bot-protected videos can still fail. No-key describes the developer credential requirement, not guaranteed universal access.

## Browser actions

`cockroach-crawler/browser-host` owns the stateful session and structural execution contract. Maqam still owns policy, exact approval, one-use consumption, replay rejection, and evidence. The current host accepts a trusted injected runtime and explicitly reports that a bundled Playwright runtime with DNS-pinned interactive networking is not yet available. Do not connect an ordinary unrestricted browser runtime and describe it as crawler-enforced isolation.
