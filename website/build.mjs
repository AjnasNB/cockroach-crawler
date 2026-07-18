import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const siteUrl = "https://cockroachcrawler.com";
const repository = "https://github.com/AjnasNB/cockroach-crawler";
const npmPackage = "https://www.npmjs.com/package/cockroach-crawler";
const maqamRepository = "https://github.com/AjnasNB/maqam";
const maqamDocs = "https://maqamagent.com/docs/";
const benchmarkRun = "https://github.com/AjnasNB/cockroach-crawler/actions/runs/29624859893";
const benchmarkResult = JSON.parse(
  await readFile(join(root, "..", "bench", "results", "ci-validated.json"), "utf8")
);
const benchmarkElapsedMedian = benchmarkResult.results.elapsedMs.median;
const benchmarkElapsedP95 = benchmarkResult.results.elapsedMs.p95;
const benchmarkThroughputMedian = benchmarkResult.results.pagesPerSecond.median;
const benchmarkMeasuredRuns = benchmarkResult.configuration.measuredRuns;
const benchmarkPages = benchmarkResult.configuration.pages;
const benchmarkNode = benchmarkResult.environment.node;
const benchmarkCommit = benchmarkResult.source.commit.slice(0, 7);

const pages = [
  {
    slug: "",
    nav: "Home",
    title: "Cockroach Crawler — bounded public-web crawling for Node.js",
    description:
      "Crawl public or explicitly trusted HTTP(S) pages with robots enforcement, strict budgets, DNS-pinned requests, Markdown and JSONL output.",
    body: homePage(),
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          name: "Cockroach Crawler",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Node.js 20.18.1 or newer",
          softwareVersion: "0.2.0",
          license: "https://opensource.org/license/mit",
          codeRepository: repository,
          downloadUrl: npmPackage,
          description:
            "A local Node.js crawler for public or explicitly trusted HTTP(S) pages with explicit network policy and resource budgets.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            faqSchema("Does Cockroach Crawler bypass logins or CAPTCHA?", "No. It does not include stealth, CAPTCHA, paywall, authentication, or authorization bypasses."),
            faqSchema("Can an agent expand its crawl permissions?", "No. The agent adapter treats creator-owned origins and limits as upper bounds and rejects undeclared policy overrides."),
            faqSchema("Is browser mode a sandbox?", "No. Browser mode constrains network behavior and resource use, but Chromium still requires process or container isolation for untrusted targets."),
            faqSchema("Does it provide GitHub, YouTube, X, or Reddit access?", "The published 0.2.0 package does not. The 0.3.0-alpha.1 source candidate adds a tested provider registry: public GitHub REST is ready, YouTube metadata reads work without a key while search needs a key, and X and Reddit require official operator credentials. YouTube transcripts are not implemented.")
          ]
        }
      ]
    }
  },
  {
    slug: "docs",
    nav: "Docs",
    title: "Documentation — Cockroach Crawler",
    description: "Copy-paste quickstarts for the Cockroach Crawler CLI, JavaScript API, agent adapter, browser mode, and structured output.",
    body: docsPage(),
    schema: howToSchema()
  },
  {
    slug: "docs/cli",
    active: "Docs",
    title: "CLI guide — Cockroach Crawler",
    description: "Install Cockroach Crawler, run a bounded crawl, choose output formats, and understand the CLI safety controls.",
    body: cliDocsPage()
  },
  {
    slug: "docs/javascript",
    active: "Docs",
    title: "JavaScript API guide — Cockroach Crawler",
    description: "Use Cockroach Crawler from Node.js with typed limits, callbacks, abort signals, pages, failures, and statistics.",
    body: javascriptDocsPage()
  },
  {
    slug: "docs/agents",
    active: "Docs",
    title: "Agent and Maqam integration — Cockroach Crawler",
    description: "Expose a creator-bounded crawler tool to an agent and optionally route it through Maqam's registered ToolGateway.",
    body: agentDocsPage()
  },
  {
    slug: "docs/providers",
    active: "Docs",
    title: "Provider adapters guide — Cockroach Crawler",
    description: "Inspect and use the candidate GitHub, YouTube, X, and Reddit provider contracts without hiding credential requirements.",
    body: providerDocsPage()
  },
  {
    slug: "docs/serverless",
    active: "Docs",
    title: "Serverless deployment guide — Cockroach Crawler",
    description: "Deploy the restricted Cloudflare Worker crawler tier with fixed origins, a bearer secret, and explicit runtime limits.",
    body: serverlessDocsPage()
  },
  {
    slug: "security",
    nav: "Security",
    title: "Security model — Cockroach Crawler",
    description: "Understand Cockroach Crawler's public-network boundary, DNS pinning, robots policy, browser limits, resource budgets, and disclosure process.",
    body: securityPage()
  },
  {
    slug: "providers",
    nav: "Providers",
    title: "Provider coverage — Cockroach Crawler",
    description: "A precise stable-versus-candidate status matrix for public HTTP, serverless crawling, GitHub, YouTube, Reddit, X, authentication, and transcripts.",
    body: providersPage()
  },
  {
    slug: "benchmark",
    nav: "Benchmark",
    title: "Local benchmark — Cockroach Crawler",
    description: "Reproduce Cockroach Crawler's local 120-page fixture benchmark and understand what the result does—and does not—measure.",
    body: benchmarkPage()
  },
  {
    slug: "media",
    nav: "Media",
    title: "Product demos — Cockroach Crawler",
    description: "Watch captioned Cockroach Crawler demos covering the bounded crawl, source adapters, serverless boundary, and real CLI workflow proof.",
    body: mediaPage(),
    schema: mediaSchema()
  },
  {
    slug: "launch",
    nav: "Launch",
    title: "Launch kit — Cockroach Crawler",
    description: "Use Cockroach Crawler's evidence-led launch plan, channel drafts, release assets, demo videos, and public product roadmap.",
    body: launchPage()
  },
  {
    slug: "roadmap",
    nav: "Roadmap",
    title: "Roadmap — Cockroach Crawler",
    description: "Current capabilities and evidence-gated next steps for provider adapters, serverless profiles, conformance fixtures, and releases.",
    body: roadmapPage()
  },
  {
    slug: "community",
    nav: "Community",
    title: "Community and contributing — Cockroach Crawler",
    description: "Contribute focused changes, reproducible fixtures, documentation, and provider adapters to Cockroach Crawler.",
    body: communityPage()
  },
  {
    slug: "release",
    nav: "Release",
    title: "Release 0.2.0 — Cockroach Crawler",
    description: "Cockroach Crawler 0.2.0 release notes, verification commands, package links, compatibility, and upgrade guidance.",
    body: releasePage()
  }
];

function faqSchema(name, text) {
  return { "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } };
}

function howToSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Run a bounded public-web crawl",
    description: "Install Cockroach Crawler and crawl a public documentation site with explicit budgets.",
    totalTime: "PT5M",
    tool: [{ "@type": "HowToTool", name: "Node.js 20.18.1 or newer" }],
    step: [
      { "@type": "HowToStep", name: "Install", text: "Run npm install --global cockroach-crawler." },
      { "@type": "HowToStep", name: "Run", text: "Run cockroach-crawl with a public URL and explicit page, request, and duration limits." },
      { "@type": "HowToStep", name: "Inspect", text: "Review the JSON or JSONL records, failures, and crawl statistics." }
    ]
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function nav(active) {
  const primary = pages.filter((page) => ["Home", "Docs", "Security", "Providers", "Benchmark"].includes(page.nav));
  const secondary = pages.filter((page) => ["Media", "Launch", "Roadmap", "Community", "Release"].includes(page.nav));
  const link = (page) => {
    const href = page.slug ? `/${page.slug}/` : "/";
    const current = page.nav === active ? ' aria-current="page"' : "";
    return `<a href="${href}"${current}>${page.nav}</a>`;
  };
  return `
    <header class="site-header">
      <div class="shell nav-shell">
        <a class="brand" href="/" aria-label="Cockroach Crawler home">
          <img src="/assets/mark.svg" width="30" height="30" alt="" />
          <span>Cockroach Crawler</span>
        </a>
        <nav class="desktop-nav" aria-label="Primary navigation">${primary.map(link).join("")}</nav>
        <div class="nav-actions">
          <a class="github-link" href="${repository}" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
          <details class="more-nav">
            <summary>More</summary>
            <nav aria-label="More navigation">${secondary.map(link).join("")}</nav>
          </details>
        </div>
      </div>
      <nav class="mobile-nav" aria-label="Mobile navigation">${[...primary, ...secondary].map(link).join("")}</nav>
    </header>`;
}

function footer() {
  return `
    <footer class="site-footer">
      <div class="shell footer-grid">
        <div>
          <a class="brand" href="/"><img src="/assets/mark.svg" width="28" height="28" alt="" /><span>Cockroach Crawler</span></a>
          <p>Bounded crawling for public or explicitly trusted HTTP(S) pages.</p>
        </div>
        <div><h2>Use</h2><a href="/docs/">Documentation</a><a href="/providers/">Provider status</a><a href="/media/">Product demos</a><a href="${npmPackage}">npm package</a></div>
        <div><h2>Trust</h2><a href="/security/">Security model</a><a href="/benchmark/">Benchmark method</a><a href="${repository}/blob/main/SECURITY.md">Report privately</a></div>
        <div><h2>Project</h2><a href="/launch/">Launch kit</a><a href="/roadmap/">Roadmap</a><a href="/community/">Contribute</a><a href="${repository}">Source code</a><a href="${maqamDocs}">Govern with Maqam</a></div>
      </div>
      <div class="shell legal"><span>MIT · npm stable 0.2.0 · source candidate 0.3.0-alpha.1</span><span>Site content last reviewed 18 July 2026</span></div>
    </footer>`;
}

function codeBlock(id, label, code, language = "shell") {
  return `<div class="code-panel">
    <div class="code-head"><span>${label}</span><button type="button" class="copy-button" data-copy="${id}" aria-describedby="${id}-status">Copy</button></div>
    <pre tabindex="0" aria-label="${escapeHtml(label)} code example"><code id="${id}" data-language="${language}">${escapeHtml(code)}</code></pre>
    <span class="sr-only" id="${id}-status" aria-live="polite"></span>
  </div>`;
}

function pageTemplate(page) {
  const path = page.slug ? `/${page.slug}/` : "/";
  const canonical = `${siteUrl}${path}`;
  const schema = page.schema ?? {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "Cockroach Crawler", url: siteUrl }
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}" />
  <meta name="theme-color" content="#07100e" />
  <meta name="color-scheme" content="dark" />
  <link rel="canonical" href="${canonical}" />
  <link rel="icon" href="/assets/mark.svg" type="image/svg+xml" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Cockroach Crawler" />
  <meta property="og:title" content="${escapeHtml(page.title)}" />
  <meta property="og:description" content="${escapeHtml(page.description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${siteUrl}/assets/social-card.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Cockroach Crawler bounded public-web crawl diagram" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(page.title)}" />
  <meta name="twitter:description" content="${escapeHtml(page.description)}" />
  <meta name="twitter:image" content="${siteUrl}/assets/social-card.png" />
  <link rel="stylesheet" href="/assets/styles.css" />
  <script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>
  <script src="/assets/app.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${nav(page.active ?? page.nav)}
  <main id="main" tabindex="-1">${page.body}</main>
  ${footer()}
</body>
</html>`.replace(/\s\/>/g, ">").replace(/[ \t]+$/gm, "");
}

function homePage() {
  return `
    <section class="hero shell">
      <div class="hero-copy">
        <p class="eyebrow">Bounded public-web crawling for Node.js</p>
        <h1>Crawl the public web. Keep the boundary explicit.</h1>
        <p class="lede">A local CLI and JavaScript API that turns permitted HTTP(S) pages into Markdown, JSON, or JSONL—while enforcing robots, network policy, and exact resource budgets.</p>
        <div class="button-row"><a class="button primary" href="/docs/">Start in five minutes</a><a class="button secondary" href="${repository}">Inspect the source</a></div>
        <ul class="signal-list" aria-label="Release facts"><li>npm stable 0.2.0</li><li>Node 20.18+</li><li>MIT</li><li>No signup</li></ul>
        <div class="candidate-note"><span>Source candidate</span><p><strong>0.3.0-alpha.1</strong> adds tested provider and serverless contracts. It is not presented as published until registry verification passes.</p></div>
      </div>
      <figure class="hero-visual">
        <img src="/assets/crawl-gate.svg" width="720" height="600" alt="Isometric crawl gate showing a public URL entering policy checks before approved pages become structured records" />
        <figcaption>Requests cross one reviewed boundary. Denied routes never reach the extractor.</figcaption>
      </figure>
    </section>
    <section class="proof-band" aria-label="Product boundaries"><div class="shell proof-grid">
      <div><span class="metric-label">Network</span><strong>Public by default</strong></div>
      <div><span class="metric-label">Redirects</span><strong>Validated every hop</strong></div>
      <div><span class="metric-label">Output</span><strong>Markdown + JSONL</strong></div>
      <div><span class="metric-label">Policy</span><strong>Creator-owned limits</strong></div>
    </div></section>
    <section class="section shell demo-section" aria-labelledby="home-demo-title">
      <div class="section-head"><div><p class="eyebrow">60-second product demo</p><h2 id="home-demo-title">What is Cockroach Crawler?</h2></div><p>See one URL enter an explicit crawl boundary, produce structured records, and stop at the limits its operator selected.</p></div>
      <figure class="video-stage">
        <video controls playsinline preload="metadata" poster="/media/cockroach-crawler-main-poster.png" aria-label="Cockroach Crawler 60-second product demo">
          <source src="/media/cockroach-crawler-main-60s.mp4" type="video/mp4" />
          <track kind="captions" srclang="en" label="English" src="/media/captions-cockroach-crawler-main-60s-en.vtt" />
          Your browser does not support embedded video. <a href="/media/cockroach-crawler-main-60s.mp4">Open the MP4</a>.
        </video>
        <figcaption>Captioned, locally narrated, and rendered from the tested command flow. No autoplay.</figcaption>
      </figure>
      <div class="button-row demo-actions"><a class="button secondary" href="/media/">Watch every release cut</a><a class="button secondary" href="${repository}/tree/main/media/remotion">Inspect the video source</a></div>
    </section>
    <section class="section shell split-intro">
      <div><p class="eyebrow">Choose the smallest mode that works</p><h2>One boundary. Three entry points.</h2><p>Use the CLI for repeatable exports, the library inside a Node service, or the strict adapter inside an agent runtime. Optional Chromium rendering stays behind the same URL and budget policy.</p></div>
      <div class="mode-list">
        <article><span>01</span><div><h3>CLI</h3><p>Bounded crawl jobs with JSON or JSONL output and explicit flags.</p><a href="/docs/cli/">Copy the command →</a></div></article>
        <article><span>02</span><div><h3>JavaScript API</h3><p>Typed options, callbacks, abort signals, failures, and crawl statistics.</p><a href="/docs/javascript/">See the API →</a></div></article>
        <article><span>03</span><div><h3>Agent adapter</h3><p>Model input cannot expand the origins, budgets, or browser authority set by its creator.</p><a href="/docs/agents/">Bind a tool →</a></div></article>
      </div>
    </section>
    <section class="section shell">
      <div class="section-head"><div><p class="eyebrow">Execution path</p><h2>Four checks before useful content.</h2></div><p>Security is part of the crawl path, not a separate toggle hidden in deployment settings.</p></div>
      <ol class="process-grid">
        <li><span>01</span><h3>Normalize</h3><p>Reject unsafe schemes, embedded credentials, oversized URLs, and undeclared origins.</p></li>
        <li><span>02</span><h3>Resolve</h3><p>Validate the complete DNS answer set and pin the selected public address.</p></li>
        <li><span>03</span><h3>Respect</h3><p>Apply robots, sensitive-path policy, redirects, pacing, and exact budgets.</p></li>
        <li><span>04</span><h3>Record</h3><p>Return readable text, Markdown, links, hashes, provenance, failures, and stats.</p></li>
      </ol>
    </section>
    <section class="section shell feature-stage">
      <figure><img src="/assets/browser-boundary.svg" width="720" height="560" alt="Technical diagram of Chromium requests being routed through a DNS-validated pinned HTTP boundary" /><figcaption>Browser mode routes HTTP(S) GET and HEAD traffic through the pinned transport; it is not a process sandbox.</figcaption></figure>
      <div><p class="eyebrow">Optional browser mode</p><h2>Render JavaScript without opening an unreviewed egress path.</h2><p>Playwright is optional. Context-wide routing applies origin, robots, redirect, byte, request, and duration policy before responses are fulfilled into Chromium.</p><ul class="check-list"><li>State-changing methods are denied</li><li>WebSockets and WebRTC are blocked</li><li>Cookies follow conservative host, path, Secure, and SameSite checks</li><li>Process isolation is still required for hostile pages</li></ul><a class="text-link" href="/security/">Read the complete boundary →</a></div>
    </section>
    <section class="section shell">
      <div class="section-head"><div><p class="eyebrow">Where it fits</p><h2>Built for evidence pipelines, not access-control workarounds.</h2></div><p>The product deliberately stays smaller than distributed crawler platforms.</p></div>
      <div class="fit-grid">
        <article class="fit-yes"><span>Strong fit</span><h3>Documentation and RAG inputs</h3><p>Turn public documentation, help centers, blogs, and owned sites into source-linked records.</p></article>
        <article class="fit-yes"><span>Strong fit</span><h3>Content inventory and QA</h3><p>Capture titles, canonical URLs, response metadata, hashes, links, and readable content.</p></article>
        <article class="fit-no"><span>Choose another tool</span><h3>Distributed or stealth crawling</h3><p>No proxy rotation, CAPTCHA bypass, paywall bypass, or hosted queue infrastructure.</p></article>
      </div>
    </section>
    <section class="section shell proof-section">
      <div><p class="eyebrow">Proof, not promises</p><h2>Reproduce the same gates before you trust a release.</h2><p>The repository tests SSRF defenses, robots failures, redirects, exact concurrency limits, agent-policy immutability, browser egress restrictions, TypeScript consumption, and package contents.</p><div class="button-row"><a class="button primary" href="/benchmark/">See the benchmark method</a><a class="button secondary" href="/release/">Run release checks</a></div></div>
      ${codeBlock("home-check", "release gate", "npm ci --ignore-scripts\nnpm run release:check")}
    </section>
    <section class="section shell faq-section"><div><p class="eyebrow">Questions answered plainly</p><h2>Know the limits before installing.</h2></div><div class="faq-list">
      <details><summary>Does it bypass logins, CAPTCHA, or paywalls?</summary><p>No. Cockroach Crawler does not include stealth, CAPTCHA, paywall, authentication, or authorization bypasses.</p></details>
      <details><summary>Can a model enable private-network crawling?</summary><p>No. Private-network access is a trusted-operator library/CLI option and cannot be enabled through the strict agent input schema.</p></details>
      <details><summary>Can it read GitHub, YouTube, X, or Reddit?</summary><p>The npm-stable 0.2.0 package has no provider registry. The 0.3.0-alpha.1 source candidate adds public GitHub REST, YouTube metadata, keyed YouTube search, official X API v2 bearer access, and Reddit application-only OAuth. YouTube transcripts are not implemented.</p></details>
      <details><summary>Can I run it in a serverless edge function?</summary><p>The 0.3.0-alpha.1 source candidate includes a self-hosted, token-authenticated, rate-limited Cloudflare Worker profile for deployment-configured HTTPS origins. It is bounded, but it does not resolve, classify, or pin DNS answers; an allowlisted hostname can resolve internally. Use operator-owned or independently trusted hostnames plus infrastructure egress policy. It is not in npm stable until the candidate release gate and publish are verified.</p></details>
    </div></section>`;
}

function docsTopicNav() {
  const topics = [
    ["CLI", "Install, flags, output files, and trusted-operator options.", "/docs/cli/"],
    ["JavaScript", "Typed crawl options, results, cancellation, and failures.", "/docs/javascript/"],
    ["Agents + Maqam", "Creator-owned ceilings and a registered governance boundary.", "/docs/agents/"],
    ["Providers", "GitHub, YouTube, X, and Reddit capability contracts.", "/docs/providers/"],
    ["Serverless", "Restricted Cloudflare Worker deployment and tradeoffs.", "/docs/serverless/"],
    ["Security", "Network, browser, content, and disclosure boundaries.", "/security/"]
  ];
  return `<nav class="doc-route-grid shell" aria-label="Documentation topics">${topics.map(([title, text, href]) => `<a href="${href}"><strong>${title}</strong><span>${text}</span><em>Open guide →</em></a>`).join("")}</nav>`;
}

function focusedDocsPage(eyebrow, title, lede, content) {
  return `
    <section class="page-hero shell"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lede">${lede}</p><div class="page-actions"><a class="button secondary" href="/docs/">All documentation</a><a class="button secondary" href="${repository}">Source on GitHub</a></div></section>
    ${docsTopicNav()}
    <article class="docs-article shell">${content}</article>`;
}

function cliDocsPage() {
  return focusedDocsPage(
    "Documentation · CLI",
    "Install once. Put every crawl limit in the command.",
    "Use the CLI for repeatable exports, scheduled documentation snapshots, content inventories, and local evidence jobs.",
    `<section><p class="eyebrow">01 · Install</p><h2>Use Node.js 20.18.1 or newer.</h2><p>Global installation exposes <code>cockroach-crawl</code>. A project-local install works with <code>npx</code> and pins the crawler in your lockfile.</p>${codeBlock("cli-install-global", "global", "npm install --global cockroach-crawler\ncockroach-crawl --version")}${codeBlock("cli-install-local", "project local", "npm install cockroach-crawler\nnpx cockroach-crawl --version")}</section>
    <section><p class="eyebrow">02 · Run</p><h2>Start with one permitted origin.</h2><p>Same-origin traversal and robots enforcement are the defaults. These limits cap discovery, requests, decoded bytes, depth, and wall-clock time.</p>${codeBlock("cli-safe-run", "bounded crawl", "cockroach-crawl https://example.com/docs \\\n+  --max-pages 25 \\\n+  --max-requests 120 \\\n+  --max-depth 2 \\\n+  --max-total-bytes 10000000 \\\n+  --max-duration 60000 \\\n+  --jsonl \\\n+  --output crawl.jsonl")}</section>
    <section><p class="eyebrow">03 · Inspect</p><h2>Keep records and failures together.</h2><p>JSON is convenient for one bounded result. JSONL streams one page record per line. Each page includes its final URL, status, title, readable text, Markdown, links, content hash, redirect chain, and retrieval time.</p><div class="next-links"><a href="/docs/#output"><span>Output contract</span><strong>See the record shape →</strong></a><a href="/security/"><span>Before production</span><strong>Review the security boundary →</strong></a></div></section>`
  );
}

function javascriptDocsPage() {
  return focusedDocsPage(
    "Documentation · JavaScript",
    "Call the crawler from a typed Node service.",
    "The library returns pages, structured failures, and final statistics so applications do not have to parse terminal output.",
    `<section><p class="eyebrow">01 · Install</p><h2>Pin the package in the application.</h2>${codeBlock("js-install", "terminal", "npm install cockroach-crawler")}</section>
    <section><p class="eyebrow">02 · Execute</p><h2>Use <code>crawlDetailed</code> when failures matter.</h2>${codeBlock("js-detailed", "crawl.mjs", `import { crawlDetailed } from "cockroach-crawler";

const controller = new AbortController();
const result = await crawlDetailed({
  seeds: ["https://example.com/docs"],
  allowedOrigins: ["https://example.com"],
  maxPages: 25,
  maxRequests: 120,
  maxDepth: 2,
  maxDurationMs: 60_000,
  maxTotalBytes: 10_000_000,
  includeSitemaps: true,
  signal: controller.signal
});

console.log(result.pages);
console.log(result.failures);
console.log(result.stats);`, "javascript")}</section>
    <section><p class="eyebrow">03 · Handle</p><h2>Treat a partial crawl as an explicit state.</h2><p>Inspect <code>failures</code> and <code>stats</code> before indexing. Keep page URLs and hashes beside derived chunks, and keep crawled text in a data channel because page content is untrusted.</p><div class="next-links"><a href="/docs/agents/"><span>Agent use</span><strong>Bind creator-owned ceilings →</strong></a><a href="${repository}/blob/main/types/index.d.ts"><span>Types</span><strong>Read the public declarations →</strong></a></div></section>`
  );
}

function agentDocsPage() {
  return focusedDocsPage(
    "Documentation · Agents",
    "Give an agent a crawler without giving it crawl authority.",
    "The application creator selects origins, budgets, and browser permission. Agent input may narrow those values, but it cannot expand them.",
    `<section><p class="eyebrow">01 · Strict adapter</p><h2>Create one bounded tool.</h2>${codeBlock("agent-install", "terminal", "npm install cockroach-crawler maqam")}${codeBlock("agent-strict-tool", "agent-tool.mjs", `import { createCockroachCrawlerTool } from "cockroach-crawler/agent";

const crawler = createCockroachCrawlerTool({
  allowedOrigins: ["https://docs.example.com"],
  maxPages: 10,
  maxRequests: 80,
  maxDepth: 1,
  maxDurationMs: 60_000,
  includeSitemaps: true
});

const result = await crawler.execute({
  urls: ["https://docs.example.com/start"],
  maxPages: 5
});`, "javascript")}</section>
    <section><p class="eyebrow">02 · Maqam composition</p><h2>Route the tool through a registered governance boundary.</h2><p>Maqam and Cockroach Crawler remain separate packages. The crawler owns network and resource policy; Maqam can add registered-tool policy, traces, approval rules, and evidence records around the call.</p>${codeBlock("agent-maqam", "governed-crawl.mjs", `import { PolicyEngine, ToolGateway } from "maqam";
import { createCockroachCrawlerTool } from "cockroach-crawler/agent";

const crawler = createCockroachCrawlerTool({
  allowedOrigins: ["https://docs.example.com"],
  maxPages: 10,
  maxRequests: 80
});

const gateway = new ToolGateway({
  policyEngine: new PolicyEngine({
    allowedTools: [crawler.name],
    allowedOrigins: ["https://docs.example.com"]
  })
});

gateway.registerTool(
  crawler.name,
  crawler.execute.bind(crawler),
  { effects: ["read"], risk: "low" }
);

const result = await gateway.call(crawler.name, {
  urls: ["https://docs.example.com/start"],
  maxPages: 5
}, {
  runId: "research_1",
  authorizedOrigins: ["https://docs.example.com"]
});`, "javascript")}</section>
    <section><p class="eyebrow">03 · Boundary</p><h2>Remove bypass paths in the host.</h2><p>A registered gateway controls only calls routed through it. Do not also give the model a general shell, unrestricted HTTP client, browser profile, or provider token that can perform the same action outside the adapter.</p><div class="next-links"><a href="${maqamDocs}"><span>Maqam</span><strong>Read the governance documentation →</strong></a><a href="${maqamRepository}"><span>Source</span><strong>Inspect Maqam on GitHub →</strong></a></div></section>`
  );
}

function providerDocsPage() {
  return focusedDocsPage(
    "Documentation · Providers",
    "Check capability before making a provider request.",
    "The source candidate reports whether each adapter is public, keyed, credentialed, partial, or unavailable without serializing secrets.",
    `<section><p class="eyebrow">01 · Doctor</p><h2>Inspect the current runtime.</h2>${codeBlock("provider-doctor-guide", "source candidate", "git clone https://github.com/AjnasNB/cockroach-crawler.git\ncd cockroach-crawler\nnpm ci --ignore-scripts\nnode bin/cockroach-sources.js doctor --json")}</section>
    <section><p class="eyebrow">02 · Credentials</p><h2>Use official provider access only.</h2><div class="table-wrap" tabindex="0" role="region" aria-label="Provider credential guide"><table><thead><tr><th>Provider</th><th>Public path</th><th>Optional or required credential</th></tr></thead><tbody><tr><td>GitHub</td><td>Public REST read/search</td><td><code>GITHUB_TOKEN</code> optional for higher rate limits</td></tr><tr><td>YouTube</td><td>Public oEmbed metadata</td><td><code>YOUTUBE_API_KEY</code> required for search</td></tr><tr><td>X</td><td>None in this adapter</td><td><code>X_BEARER_TOKEN</code> required</td></tr><tr><td>Reddit</td><td>None in this adapter</td><td>Official OAuth client ID, secret, and contact user agent</td></tr></tbody></table></div></section>
    <section><p class="eyebrow">03 · Normalize</p><h2>Keep source identity in every record.</h2><p>Provider results include provider ID, canonical URL, retrieval time, adapter version, content hash, warnings, and the provider-specific payload. Check <a href="/providers/">the live coverage table</a> before promising a capability.</p></section>`
  );
}

function serverlessDocsPage() {
  return focusedDocsPage(
    "Documentation · Serverless",
    "Deploy a smaller crawler for fixed public origins.",
    "The Worker tier is a separate fetch-only profile for operator-owned or independently trusted HTTPS hosts. It is not the hardened Node transport.",
    `<section><p class="eyebrow">01 · Configure</p><h2>Fix the authority at deployment time.</h2>${codeBlock("worker-config-guide", "worker/wrangler.jsonc", `{
  "name": "cockroach-crawler-serverless",
  "main": "worker.js",
  "compatibility_date": "2026-07-17",
  "vars": {
    "CRAWLER_ALLOWED_ORIGINS": "https://docs.example.com"
  },
  "ratelimits": [{
    "name": "CRAWLER_RATE_LIMITER",
    "namespace_id": "YOUR_NAMESPACE_ID",
    "simple": { "limit": 10, "period": 60 }
  }]
}`, "json")}</section>
    <section><p class="eyebrow">02 · Protect</p><h2>Store the bearer token as a Worker secret.</h2>${codeBlock("worker-secret-guide", "terminal", "npx wrangler secret put CRAWLER_API_TOKEN --config worker/wrangler.jsonc\nnpm run worker:check\nnpx wrangler deploy --config worker/wrangler.jsonc")}</section>
    <section><p class="eyebrow">03 · Call</p><h2>Send a bounded job.</h2>${codeBlock("worker-call-guide", "request", `curl https://YOUR-WORKER.example.workers.dev/v1/crawl \\
  --request POST \\
  --header "Authorization: Bearer $CRAWLER_API_TOKEN" \\
  --header "Content-Type: application/json" \\
  --data '{"url":"https://docs.example.com/start","maxPages":5,"maxRequests":30}'`, "shell")}<div class="callout warning"><strong>Runtime distinction</strong><p>The Worker validates configured HTTPS origins, token authentication, method, content type, rate, and resource limits. It does not resolve and pin DNS answers, launch Chromium, or accept arbitrary request-selected origins. Use Cloudflare egress controls and trusted hostnames.</p></div></section>`
  );
}

function docsPage() {
  const tocLinks = `<a href="#quickstart">Quickstart</a><a href="#cli">CLI</a><a href="#library">JavaScript API</a><a href="#agent">Agent adapter</a><a href="#sources">Source registry</a><a href="#serverless">Serverless</a><a href="#browser">Browser mode</a><a href="#output">Output</a><a href="#limits">Limits</a><a href="#deployment">Deployment notes</a>`;
  return `
    <section class="page-hero shell"><p class="eyebrow">Documentation</p><h1>From install to a bounded crawl.</h1><p class="lede">Start with public pages you own or are permitted to access. Add limits before adding scale.</p><div class="page-actions"><a class="button primary" href="#quickstart">Quickstart</a><a class="button secondary" href="${repository}/blob/main/README.md">README source</a></div></section>
    ${docsTopicNav()}
    <details class="mobile-toc shell"><summary>On this page</summary><nav aria-label="On this page">${tocLinks}</nav></details>
    <div class="docs-layout shell">
      <aside class="toc"><nav aria-label="On this page"><h2>On this page</h2>${tocLinks}</nav></aside>
      <div class="docs-content">
        <section id="quickstart"><p class="eyebrow">01 · Quickstart</p><h2>Crawl a public documentation path.</h2><p>Requires Node.js 20.18.1 or newer. The CLI obeys robots by default and stays on the seed origin unless you explicitly allow more.</p>${codeBlock("install-cli", "terminal", "npm install --global cockroach-crawler\ncockroach-crawl https://example.com/docs \\\n  --max-pages 20 \\\n  --max-requests 80 \\\n  --max-duration 60000 \\\n  --jsonl \\\n  --output crawl.jsonl")}</section>
        <section id="cli"><p class="eyebrow">02 · CLI</p><h2>Make policy visible in the command.</h2><p>A useful crawl names its page, request, byte, and duration ceilings. Cross-origin crawling requires every permitted origin to be listed.</p>${codeBlock("cli-cross", "cross-origin example", "cockroach-crawl https://example.com \\\n  --all-origins \\\n  --allow-origin https://example.com \\\n  --allow-origin https://docs.example.com \\\n  --max-pages 50 \\\n  --max-requests 200 \\\n  --output crawl.json")}
          <div class="callout warning"><strong>Trusted operator only</strong><p><code>--allow-private-networks</code> intentionally permits private and loopback targets. It never permits metadata or link-local targets and should not be exposed to untrusted input.</p></div>
        </section>
        <section id="library"><p class="eyebrow">03 · JavaScript API</p><h2>Use typed options inside Node.</h2>${codeBlock("api-example", "crawl.mjs", `import { crawlDetailed } from "cockroach-crawler";

const result = await crawlDetailed({
  seeds: ["https://example.com/docs"],
  maxPages: 25,
  maxRequests: 150,
  maxDepth: 2,
  maxDurationMs: 60_000,
  maxTotalBytes: 10_000_000,
  concurrency: 4,
  includeSitemaps: true,
  include: ["/docs/"]
});

console.log(result.pages[0]?.markdown);
console.log(result.stats, result.failures);`, "javascript")}</section>
        <section id="agent"><p class="eyebrow">04 · Agent adapter</p><h2>Let the creator set the ceiling.</h2><p>The model can request a smaller crawl. It cannot broaden allowed origins, disable robots, enable private networks, or turn on browser mode unless the creator has authorized browser use.</p>${codeBlock("agent-example", "agent-tool.mjs", `import { createCockroachCrawlerTool } from "cockroach-crawler/agent";

const crawlTool = createCockroachCrawlerTool({
  allowedOrigins: ["https://example.com"],
  maxPages: 10,
  maxDepth: 1,
  maxRequests: 80,
  maxDurationMs: 60_000,
  includeSitemaps: true
});

const result = await crawlTool.execute({
  urls: ["https://example.com/docs"],
  maxPages: 5
});`, "javascript")}</section>
        <section id="sources"><p class="eyebrow">05 · Source candidate · 0.3.0-alpha.1</p><h2>Inspect provider capability before dispatch.</h2><div class="callout candidate"><strong>Source checkout only</strong><p>This contract is tested in the repository but is not in npm stable 0.2.0. Verify the published version before using the package import.</p></div>${codeBlock("sources-doctor", "source checkout", "git clone https://github.com/AjnasNB/cockroach-crawler.git\ncd cockroach-crawler\nnpm ci --ignore-scripts\nnode bin/cockroach-sources.js doctor --json")}${codeBlock("sources-example", "sources.mjs", `import { createSourceRegistryFromEnv } from "cockroach-crawler/sources";

const sources = createSourceRegistryFromEnv(process.env);
console.table(sources.doctor());

const repositories = await sources.search("github", {
  query: "topic:web-crawler language:javascript",
  maxResults: 5
});

console.log(repositories);`, "javascript")}<p>Public GitHub REST is ready with optional token authentication. YouTube metadata reads work through public oEmbed; search needs <code>YOUTUBE_API_KEY</code> and transcripts remain unavailable. X requires <code>X_BEARER_TOKEN</code>. Reddit requires official client credentials and a contact-aware user agent.</p></section>
        <section id="serverless"><p class="eyebrow">06 · Serverless candidate · 0.3.0-alpha.1</p><h2>A smaller edge boundary with named tradeoffs.</h2><p>The source candidate includes a self-hosted Cloudflare Worker entry point. It accepts only token-authenticated <code>POST /v1/crawl</code>, requires configured HTTPS origins, and is rate-limited by the deployment.</p>${codeBlock("serverless-config", "worker/wrangler.jsonc", `{
  "name": "cockroach-crawler-serverless",
  "main": "worker.js",
  "compatibility_date": "2026-07-18",
  "vars": {
    "CRAWLER_ALLOWED_ORIGINS": "https://docs.example.com"
  }
}`, "json")}${codeBlock("serverless-secret", "trusted operator", "npx wrangler secret put CRAWLER_API_TOKEN\nnpm run worker:check")}<div class="callout warning"><strong>Different security boundary</strong><p>The edge runtime does not resolve, classify, or pin DNS answers. An allowlisted hostname can resolve internally, so allowlist only operator-owned or independently trusted origins and keep infrastructure egress controls. This tier also has no browser, authenticated providers, social adapters, or request-selected arbitrary origins.</p></div></section>
        <section id="browser"><p class="eyebrow">07 · Browser mode</p><h2>Add rendering only when static HTTP is insufficient.</h2>${codeBlock("browser-install", "terminal", "npm install cockroach-crawler playwright\nnpx playwright install chromium")}${codeBlock("browser-example", "render.mjs", `import { crawl } from "cockroach-crawler";

const pages = await crawl({
  seeds: ["https://example.com/app"],
  maxPages: 3,
  maxRequests: 100,
  browser: {
    waitUntil: "domcontentloaded",
    click: ["button.load-more"],
    waitFor: ".loaded"
  }
});`, "javascript")}<div class="callout warning"><strong>Not a JavaScript sandbox</strong><p>Browser mode constrains requests and budgets. Isolate Chromium at the process or container level when targets are untrusted.</p></div></section>
        <section id="output"><p class="eyebrow">08 · Output</p><h2>Keep content attached to provenance.</h2>${codeBlock("output-shape", "page record", `{
  "url": "https://example.com/",
  "canonical": "https://example.com/",
  "title": "Example",
  "markdown": "# Example\\n\\nReadable markdown…",
  "links": ["https://example.com/about"],
  "status": 200,
  "contentHash": "sha256:…",
  "redirectChain": [],
  "robotsAllowed": true,
  "fetchedAt": "2026-07-18T00:00:00.000Z"
}`, "json")}<p>Store the URL and content hash beside any indexed chunk. Crawled text is untrusted data and must not become system or developer instructions.</p></section>
        <section id="limits"><p class="eyebrow">09 · Limits</p><h2>Budget every dimension that can grow.</h2><div class="table-wrap" tabindex="0" role="region" aria-label="Crawler resource limits table"><table><thead><tr><th>Concern</th><th>Controls</th><th>Why it matters</th></tr></thead><tbody>
          <tr><td>Traversal</td><td><code>maxPages</code>, <code>maxDepth</code>, <code>maxQueue</code></td><td>Bounds discovered work.</td></tr>
          <tr><td>Network</td><td><code>maxRequests</code>, <code>maxRedirects</code>, <code>maxRetries</code></td><td>Caps requests and retry amplification.</td></tr>
          <tr><td>Data</td><td><code>maxBytes</code>, <code>maxTotalBytes</code></td><td>Caps decoded content volume.</td></tr>
          <tr><td>Time</td><td><code>timeoutMs</code>, <code>maxDurationMs</code>, <code>signal</code></td><td>Creates request and total deadlines.</td></tr>
          <tr><td>Authority</td><td><code>allowedOrigins</code>, <code>sameOrigin</code></td><td>Names where a crawl may go.</td></tr>
        </tbody></table></div></section>
        <section id="deployment"><p class="eyebrow">10 · Deployment</p><h2>Pick the tier whose boundary you can defend.</h2><p>The npm-stable package uses Node networking and optional Playwright; run it in a controlled Node process, container, or CI job. The source candidate's Cloudflare Worker is a separate fetch-only profile with an explicit weaker network guarantee. Do not describe the tiers as equivalent.</p><div class="next-links"><a href="/security/"><span>Next</span><strong>Review the security model →</strong></a><a href="/providers/"><span>Then</span><strong>Check provider coverage →</strong></a></div></section>
      </div>
    </div>`;
}

function securityPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Security model</p><h1>Deny unsafe routes before contact.</h1><p class="lede">Cockroach Crawler treats URLs, redirects, browser requests, and crawled content as untrusted. Its defaults reduce reach; they do not make hostile code safe.</p><div class="page-actions"><a class="button primary" href="${repository}/blob/main/SECURITY.md">Read SECURITY.md</a><a class="button secondary" href="${repository}/security/advisories/new">Report privately</a></div></section>
    <section class="section shell feature-stage reverse"><figure><img src="/assets/security-boundary.svg" width="720" height="560" alt="Isometric network boundary showing unsafe schemes, private addresses, metadata endpoints, and denied redirects blocked before the fetch transport" /><figcaption>The complete DNS answer set and every redirect hop are validated before the target receives a request.</figcaption></figure><div><p class="eyebrow">Default network posture</p><h2>Public unicast HTTP(S), or no request.</h2><p>The default transport rejects URL credentials, unsafe schemes, private, loopback, link-local, multicast, reserved, and metadata targets. A trusted private-network option never enables metadata or link-local access.</p><ul class="check-list"><li>DNS pinning on every hop</li><li>Manual bounded redirects</li><li>Same-origin by default</li><li>Cross-origin requires an allowlist</li></ul></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Controls</p><h2>What is blocked and where.</h2></div><p>Defense is layered across URL admission, transport, browser routing, resources, and agent input.</p></div><div class="table-wrap" tabindex="0" role="region" aria-label="Security boundary controls table"><table><thead><tr><th>Boundary</th><th>Denied by default</th><th>Explicit operator choice</th></tr></thead><tbody>
      <tr><td>URL</td><td>Credentials, unsafe schemes, oversized URLs</td><td>None</td></tr>
      <tr><td>Network</td><td>Private, loopback, link-local, reserved, metadata</td><td>Private/loopback only; metadata remains denied</td></tr>
      <tr><td>Origin</td><td>Cross-origin traversal</td><td>Enumerated allowed origins</td></tr>
      <tr><td>Robots</td><td>Failures other than true absence</td><td>Lower-level library only for owner-authorized fixtures</td></tr>
      <tr><td>Browser</td><td>State-changing methods, WebSockets, WebRTC, downloads</td><td>Creator opts into browser mode and reviewed selectors</td></tr>
      <tr><td>Agent</td><td>Unknown fields and authority expansion</td><td>Creator-owned immutable ceilings</td></tr>
    </tbody></table></div><div class="callout candidate"><strong>Local crawler controls</strong><p>The table and network illustration describe the Node transport. The serverless candidate has an origin allowlist but no DNS resolution, address classification, or pinning. Its allowlist is not a complete SSRF control; use operator-owned/trusted hostnames and platform egress policy.</p></div></section>
    <section class="section shell card-grid"><article><p class="eyebrow">Browser reality</p><h2>Network control is not process isolation.</h2><p>Hostile JavaScript can consume CPU or memory and may target browser vulnerabilities. Retain OS/container isolation and restricted host egress for untrusted targets.</p></article><article><p class="eyebrow">Content reality</p><h2>Extraction is not instruction trust.</h2><p>HTML, text, and Markdown can contain prompt injection and false claims. Keep crawler output in a data channel with URLs and hashes.</p></article></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Private disclosure</p><h2>Send the smallest safe reproduction.</h2><p>Use GitHub Security Advisories. Do not put credentials, cookies, private page content, or cloud metadata into a public issue.</p><a class="button primary" href="${repository}/security/advisories/new">Open a private advisory</a></div>${codeBlock("security-tests", "focused checks", "npm test\nnpm run test:browser\nnpm audit --omit=dev --audit-level=high")}</section>`;
}

function providersPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Provider coverage · stable vs candidate</p><h1>Know what is public, keyed, and still missing.</h1><p class="lede">npm stable 0.2.0 ships the hardened web crawler. The 0.3.0-alpha.1 source candidate adds a tested provider registry and a separate serverless tier; it is not presented as published until registry verification passes.</p><div class="page-actions"><a class="button primary" href="/docs/#sources">Inspect the candidate API</a><a class="button secondary" href="${repository}/issues">Propose an adapter</a></div></section>
    <section class="section shell feature-stage"><figure><img src="/assets/provider-map.svg" width="720" height="560" alt="Provider coverage map showing released public web crawling, candidate GitHub and YouTube adapters, and credential-gated X and Reddit adapters" /><figcaption>Doctor status is capability-based: public GitHub REST is ready, YouTube is partial, and X/Reddit stay closed without official credentials.</figcaption></figure><div><p class="eyebrow">Know before dispatch</p><h2>Every adapter reports its exact access state.</h2><p>Each adapter reports whether access is public, keyed, or credentialed before dispatch, together with its rate-limit and data-shape contract.</p><div class="candidate-note compact"><span>Candidate contract</span><p><code>cockroach-sources doctor --json</code> reports exact runtime status without serializing secrets.</p></div></div></section>
    <section class="section shell"><div class="table-wrap" tabindex="0" role="region" aria-label="Provider capability status table"><table class="status-table"><thead><tr><th>Surface</th><th>npm stable 0.2.0</th><th>0.3.0-alpha.1 source candidate</th><th>Boundary</th></tr></thead><tbody>
      <tr><td>Hardened public web</td><td><span class="status shipped">Shipped</span></td><td><span class="status shipped">Ready</span></td><td>Explicit URLs, robots, sitemaps, Markdown/JSONL, Node DNS pinning.</td></tr>
      <tr><td>GitHub REST</td><td><span class="status planned">No adapter</span></td><td><span class="status shipped">Ready</span></td><td>Public search/read at unauthenticated rate limits; token optional.</td></tr>
      <tr><td>YouTube</td><td><span class="status planned">No adapter</span></td><td><span class="status conditional">Partial</span></td><td>Public oEmbed metadata read; search requires <code>YOUTUBE_API_KEY</code>; transcript false.</td></tr>
      <tr><td>X API v2</td><td><span class="status planned">No adapter</span></td><td><span class="status conditional">Credentials</span></td><td>Search/read require an approved operator-supplied <code>X_BEARER_TOKEN</code>.</td></tr>
      <tr><td>Reddit API</td><td><span class="status planned">No adapter</span></td><td><span class="status conditional">Credentials</span></td><td>Application-only OAuth requires client ID, secret, and contact-aware user agent.</td></tr>
      <tr><td>Serverless web tier</td><td><span class="status planned">Not shipped</span></td><td><span class="status conditional">Candidate</span></td><td>Self-hosted, token-authenticated, rate-limited, operator-owned HTTPS allowlist; no DNS resolution/pinning or browser/social adapters.</td></tr>
      <tr><td>YouTube transcripts</td><td><span class="status denied">Unavailable</span></td><td><span class="status denied">Unavailable</span></td><td>No transcript extraction or transcript-provider integration.</td></tr>
      <tr><td>CAPTCHA/paywall bypass</td><td><span class="status denied">Not supported</span></td><td><span class="status denied">Not supported</span></td><td>No stealth, session theft, or authorization bypass.</td></tr>
    </tbody></table></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Adapter acceptance bar</p><h2>New reach must not erase the boundary.</h2></div><p>A provider adapter should be small, opt-in, provider-package-tested offline where possible, and explicit about authentication and missing guarantees.</p></div><ol class="process-grid"><li><span>01</span><h3>Public contract</h3><p>Use a documented API or permitted public surface with a pinned provider version.</p></li><li><span>02</span><h3>Creator authority</h3><p>Credentials, scopes, origins, and rate limits remain operator-owned.</p></li><li><span>03</span><h3>Offline fixture</h3><p>Prove allow and deny routing without accounts, live data, or side effects.</p></li><li><span>04</span><h3>Named limits</h3><p>Document what is not synchronized, discovered, authenticated, or certified.</p></li></ol></section>`;
}

function benchmarkPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">CI-validated local regression benchmark</p><h1>Repeat the same workload. Catch the regression.</h1><p class="lede">A clean exact-commit CI run completed ${benchmarkMeasuredRuns} measured passes of the deterministic ${benchmarkPages}-page loopback fixture at a ${benchmarkElapsedMedian} ms median and ${benchmarkThroughputMedian} pages per second median. All correctness and policy probes passed.</p><div class="page-actions"><a class="button primary" href="#reproduce">Reproduce it</a><a class="button secondary" href="${benchmarkRun}">Open the CI run</a><a class="button secondary" href="${repository}/blob/main/docs/BENCHMARK.md">Read the method</a></div></section>
    <section class="benchmark-hero shell"><div class="benchmark-number"><span>${benchmarkMeasuredRuns}-run median</span><strong>${benchmarkThroughputMedian}</strong><em>loopback fixture pages / second</em></div><figure><img src="/assets/benchmark-rig.svg" width="720" height="520" alt="Isometric benchmark rig feeding 120 local pages through a controlled extraction path into measured output" /><figcaption>Clean CI artifact ${benchmarkCommit} · ${benchmarkNode} · ${benchmarkPages} static loopback pages · ${benchmarkMeasuredRuns}/${benchmarkMeasuredRuns} correctness passes</figcaption></figure></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Scope</p><h2>What this number measures.</h2></div><p>This deterministic 120-page fixture measures local traversal and extraction. Public-network and production-capacity measurements require a separate workload.</p></div><div class="fit-grid"><article class="fit-yes"><span>Measured</span><h3>Local crawler regression</h3><p>Traversal and extraction across 120 deterministic local pages, including Markdown output and a likely-private URL skip.</p></article><article><span>Separate profile</span><h3>Public-network behavior</h3><p>DNS latency, TLS, remote pacing, robots delays, and real-site extraction need a dated public-network workload.</p></article><article><span>Separate profile</span><h3>Hosted capacity</h3><p>Browser rendering, proxy infrastructure, distributed queues, and production concurrency need deployment-level evidence.</p></article></div></section>
    <section class="section shell proof-section" id="reproduce"><div><p class="eyebrow">Reproduce</p><h2>Run the committed fixture.</h2><p>The script records the source fingerprint, commit, dirty state, environment, every sample, correctness assertions, and policy probes in raw JSON.</p>${codeBlock("bench-run", "terminal", "git clone https://github.com/AjnasNB/cockroach-crawler.git\ncd cockroach-crawler\nnpm ci --ignore-scripts\nnpm run bench")}</div>${codeBlock("bench-output", "clean CI summary", `{
  "pages": ${benchmarkPages},
  "measuredRuns": ${benchmarkMeasuredRuns},
  "elapsedMsMedian": ${benchmarkElapsedMedian},
  "elapsedMsP95": ${benchmarkElapsedP95},
  "pagesPerSecondMedian": ${benchmarkThroughputMedian},
  "correctness": "${benchmarkMeasuredRuns}/${benchmarkMeasuredRuns} passed",
  "policyProbes": "passed"
}`, "json")}</section>
    <section class="section shell card-grid"><article><p class="eyebrow">Before publishing</p><h2>Use a distribution, not one lucky run.</h2><p>Warm up, run multiple samples, report median and variability, pin dependencies, and attach raw JSON.</p></article><article><p class="eyebrow">Before comparing</p><h2>Match the contract.</h2><p>Use the same pages, rendering mode, concurrency, output fields, robots policy, retry policy, and network conditions.</p></article></section>`;
}

function mediaSchema() {
  const videos = [
    ["Install, run, and inspect Cockroach Crawler", "A 60-second deterministic CLI demo covering installation, explicit limits, allowed output, denied dispatch, and normalized evidence.", "cockroach-crawler-main-60s", "PT60S"],
    ["Providers and serverless", "A 30-second explanation of provider access status and the restricted serverless runtime.", "cockroach-crawler-providers-serverless-30s", "PT30S"],
    ["Real CLI workflow proof", "A 45-second deterministic workflow showing doctor output, denied dispatch, and normalized records.", "cockroach-crawler-workflow-proof-45s", "PT45S"],
    ["Short provider boundary", "A 30-second vertical explanation of public, credentialed, and unavailable provider capabilities.", "cockroach-crawler-vertical-short-30s", "PT30S"]
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Cockroach Crawler product demos",
        description: "Captioned product demonstrations for the bounded crawler, provider adapters, serverless profile, and release workflow.",
        url: `${siteUrl}/media/`,
        isPartOf: { "@type": "WebSite", name: "Cockroach Crawler", url: siteUrl }
      },
      ...videos.map(([name, description, file, duration]) => ({
        "@type": "VideoObject",
        name,
        description,
        uploadDate: "2026-07-18",
        duration,
        contentUrl: `${siteUrl}/media/${file}.mp4`,
        thumbnailUrl: `${siteUrl}/media/${file.replace(/-(?:60s|30s|45s)$/, "")}-poster.png`
      }))
    ]
  };
}

function mediaPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Captioned product demos</p><h1>See the boundary, then run the proof.</h1><p class="lede">Four short videos show the real offline CLI flow, provider and serverless boundaries, and the normalized records used by agent workflows.</p><div class="page-actions"><a class="button primary" href="#main-demo">Watch the 60-second demo</a><a class="button secondary" href="${repository}/tree/main/media/remotion">Inspect the Remotion source</a></div></section>
    <section class="section shell" id="main-demo"><div class="section-head"><div><p class="eyebrow">Real CLI demo · 60 seconds</p><h2>Install. Run. Inspect the record.</h2></div><p>A deterministic loopback run shows installation, explicit ceilings, an allowed crawl, a fail-closed denial, and the resulting source-linked evidence record.</p></div>
      <figure class="video-stage">
        <video controls playsinline preload="metadata" poster="/media/cockroach-crawler-main-poster.png" aria-label="Cockroach Crawler 60-second overview">
          <source src="/media/cockroach-crawler-main-60s.mp4" type="video/mp4" />
          <track kind="captions" srclang="en" label="English" src="/media/captions-cockroach-crawler-main-60s-en.vtt" />
          Your browser does not support embedded video. <a href="/media/cockroach-crawler-main-60s.mp4">Open the MP4</a>.
        </video>
        <figcaption>Rendered from the committed Remotion source and deterministic workflow capture. Captions are burned in; an optional English track remains selectable.</figcaption>
      </figure>
    </section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Focused release cuts</p><h2>Choose the proof you need.</h2></div><p>Every cut is captioned, locally narrated, and uses the same release visual system. None autoplay.</p></div>
      <div class="video-grid">
        <article class="video-card"><div><span>30 seconds</span><h3>Providers and serverless</h3><p>Understand access status, official credentials, deployment-owned origins, and the narrower edge runtime.</p></div><video controls playsinline preload="metadata" poster="/media/cockroach-crawler-providers-serverless-poster.png" aria-label="Providers and serverless 30-second demo"><source src="/media/cockroach-crawler-providers-serverless-30s.mp4" type="video/mp4" /><track kind="captions" srclang="en" label="English" src="/media/captions-cockroach-crawler-providers-serverless-30s-en.vtt" /></video></article>
        <article class="video-card"><div><span>45 seconds</span><h3>Real CLI workflow proof</h3><p>Follow deterministic doctor output, a denied dispatch, and a normalized record captured from the tested offline flow.</p></div><video controls playsinline preload="metadata" poster="/media/cockroach-crawler-workflow-proof-poster.png" aria-label="Real CLI workflow proof 45-second demo"><source src="/media/cockroach-crawler-workflow-proof-45s.mp4" type="video/mp4" /><track kind="captions" srclang="en" label="English" src="/media/captions-cockroach-crawler-workflow-proof-45s-en.vtt" /></video></article>
        <article class="video-card"><div><span>30 seconds · vertical</span><h3>Short provider boundary</h3><p>A vertical cut for mobile and social surfaces: what is public, what needs credentials, and what stays unavailable.</p></div><video controls playsinline preload="metadata" poster="/media/cockroach-crawler-vertical-short-poster.png" aria-label="Vertical provider boundary 30-second demo"><source src="/media/cockroach-crawler-vertical-short-30s.mp4" type="video/mp4" /><track kind="captions" srclang="en" label="English" src="/media/captions-cockroach-crawler-vertical-short-30s-en.vtt" /></video></article>
      </div>
    </section>`;
}

function launchPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Open launch kit</p><h1>Launch with evidence attached.</h1><p class="lede">Use the prepared channel drafts, verified claims, campaign artwork, and captioned demos. Keep every public statement narrower than the release artifact it cites.</p><div class="page-actions"><a class="button primary" href="${repository}/tree/main/docs/launch">Open the complete kit</a><a class="button secondary" href="/media/">Watch the demos</a></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Recommended sequence</p><h2>One verified release. Several useful explanations.</h2></div><p>Do not post the same announcement everywhere. Lead with a runnable technical proof, adapt the framing to the channel, and answer questions with source links.</p></div><ol class="process-grid"><li><span>01</span><h3>Verify the artifact</h3><p>Run the release gate against the exact commit and confirm the registry version before making a launch claim.</p></li><li><span>02</span><h3>Lock the claims</h3><p>Use the positioning and claims checklist to separate stable, candidate, and planned capabilities.</p></li><li><span>03</span><h3>Choose one channel</h3><p>Start with Show HN or a technical article, then adapt the proof for communities where it is genuinely useful.</p></li><li><span>04</span><h3>Learn in public</h3><p>Collect reproducible feedback as focused issues. Update docs before repeating a confusing claim.</p></li></ol></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Copy and campaign material</p><h2>Every launch surface has a committed source.</h2></div><p>The repository keeps drafts reviewable. Publishing remains a deliberate maintainer action; these links do not auto-post.</p></div><div class="fit-grid"><article class="fit-yes"><span>Lead launch</span><h3>Show HN and Product Hunt</h3><p>Use the runnable CLI proof, honest boundaries, and a short founder explanation.</p><a class="text-link" href="${repository}/blob/main/docs/launch/SHOW-HN.md">Show HN draft →</a><br /><a class="text-link" href="${repository}/blob/main/docs/launch/PRODUCT-HUNT.md">Product Hunt kit →</a></article><article class="fit-yes"><span>Deep explanation</span><h3>Technical article</h3><p>Explain the network boundary, normalized records, and evidence path with commands readers can reproduce.</p><a class="text-link" href="${repository}/blob/main/docs/launch/TECHNICAL-ARTICLE.md">Full article →</a><br /><a class="text-link" href="${repository}/blob/main/docs/launch/ARTICLE-ADAPTATIONS.md">Channel adaptations →</a></article><article class="fit-yes"><span>Community distribution</span><h3>Social, video, and communities</h3><p>Choose the smallest useful demo for each audience and avoid generic cross-posting.</p><a class="text-link" href="${repository}/blob/main/docs/launch/COMMUNITIES.md">Community guide →</a><br /><a class="text-link" href="${repository}/blob/main/docs/launch/SOCIAL-AND-VIDEO.md">Social and video plan →</a></article></div></section>
    <section class="section shell"><div class="table-wrap" tabindex="0" role="region" aria-label="Launch assets and locations table"><table><thead><tr><th>Need</th><th>Committed source</th><th>Use</th></tr></thead><tbody><tr><td>Positioning and USP</td><td><a href="${repository}/blob/main/docs/launch/POSITIONING.md">POSITIONING.md</a></td><td>Homepage, release notes, pitches</td></tr><tr><td>Claim verification</td><td><a href="${repository}/blob/main/docs/launch/CLAIMS-CHECKLIST.md">CLAIMS-CHECKLIST.md</a></td><td>Final pre-publish review</td></tr><tr><td>Platform-sized artwork</td><td><a href="${repository}/tree/main/media/launch-assets">media/launch-assets</a></td><td>Social, articles, Product Hunt, YouTube</td></tr><tr><td>Captioned demos</td><td><a href="/media/">Media library</a></td><td>Overview, focused cuts, vertical short</td></tr><tr><td>Editable video source</td><td><a href="${repository}/tree/main/media/remotion">media/remotion</a></td><td>Re-render verified product demos</td></tr><tr><td>Channel and size map</td><td><a href="${repository}/blob/main/docs/launch/MEDIA-MATRIX.md">MEDIA-MATRIX.md</a></td><td>Select assets without stretching them</td></tr></tbody></table></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Product ideas worth proving</p><h2>Turn launch questions into narrow evidence work.</h2></div><p>These are development directions, not promises. Ship them only when code, fixtures, documentation, and release evidence agree.</p></div><div class="card-grid"><article><p class="eyebrow">Reach with visible authority</p><h2>Two explicit crawler tiers.</h2><ul class="check-list"><li>Hardened local runtime for model-selected public URLs</li><li>Restricted serverless runtime for deployment-owned origins</li><li>Capability doctor that names credential and availability state</li></ul></article><article><p class="eyebrow">Portable proof</p><h2>One normalized evidence contract.</h2><ul class="check-list"><li>Versioned source-record schema</li><li>Reusable third-party provider conformance harness</li><li>Offline official-API error fixtures</li><li>Independent serverless threat review</li></ul></article></div></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Before publishing</p><h2>Re-run the proof from the release commit.</h2><p>The benchmark, screenshots, videos, package archive, and public copy should all identify the exact behavior they demonstrate.</p></div>${codeBlock("launch-check", "terminal", "npm ci --ignore-scripts\nnpm run release:check\n\n# Review docs/launch/CLAIMS-CHECKLIST.md")}</section>`;
}

function roadmapPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Public roadmap</p><h1>Expand reach without hiding authority.</h1><p class="lede">Roadmap items become release claims only after code, tests, documentation, and reproducible evidence land together.</p><div class="page-actions"><a class="button primary" href="${repository}/issues">Browse open issues</a><a class="button secondary" href="/community/">Contribute a fixture</a></div></section>
    <section class="section shell roadmap-list">
      <article><div><span class="status shipped">Released · 0.2.0</span><h2>Hardened Node crawler</h2></div><ul><li>Public-network defaults and DNS pinning</li><li>Robots, sitemap, redirect, resource, and origin policy</li><li>CLI, JavaScript API, and strict agent adapter</li><li>Optional bounded Chromium rendering</li></ul></article>
      <article><div><span class="status conditional">Source candidate · 0.3.0-alpha.1</span><h2>Provider registry</h2></div><ul><li>Web, GitHub, YouTube, X, and Reddit capability doctor</li><li>Public GitHub REST and public YouTube metadata reads</li><li>Official credential gates for keyed search and social APIs</li><li>Normalized records with provenance, hash, warnings, and adapter version</li></ul></article>
      <article><div><span class="status conditional">Source candidate · 0.3.0-alpha.1</span><h2>Fetch-only serverless profile</h2></div><ul><li>Self-hosted Cloudflare Worker entry point</li><li>Bearer authentication, deployment rate limit, and operator-owned HTTPS origin allowlist</li><li>Exact runtime disclosure: no DNS resolution/pinning, browser, social providers, or request-selected arbitrary origins</li><li>Separate <code>cockroach-crawler/serverless</code> contract</li></ul></article>
      <article><div><span class="status planned">Next evidence</span><h2>Release and broader coverage</h2></div><ul><li>Resolve the candidate release gate and verify the packed consumer</li><li>Publish only after npm registry state is confirmed</li><li>Add transcript support only through a reviewed provider contract</li><li>Use benchmark distributions and raw evidence, not a single headline number</li></ul></article>
    </section>
    <section class="section shell proof-section"><div><p class="eyebrow">A useful issue</p><h2>Name one capability and one boundary.</h2><p>Prefer a deterministic fixture and an acceptance checklist over a broad “support everything” request. Do not add partnership, certification, or universal-coverage claims.</p></div>${codeBlock("issue-template", "issue outline", "Context\nOne current limitation and who it blocks.\n\nScope\nOne provider contract or crawler behavior.\n\nAcceptance\n- allow case dispatches once\n- deny case dispatches zero times\n- no live account or side effect\n- limits remain documented")}</section>`;
}

function communityPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Community</p><h1>Small, reviewable changes build durable reach.</h1><p class="lede">Start with a fixture, a missing explanation, or a single adapter boundary. Maintainers review and merge; contributors work through branches and pull requests.</p><div class="page-actions"><a class="button primary" href="${repository}/issues">Find an issue</a><a class="button secondary" href="${repository}/fork">Fork the repository</a></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Contribution path</p><h2>From idea to verified pull request.</h2></div><p>No external contributor can directly merge into the maintainer's protected branch without repository permission and review.</p></div><ol class="process-grid"><li><span>01</span><h3>Choose scope</h3><p>Comment on an issue or open one with a narrow acceptance checklist.</p></li><li><span>02</span><h3>Fork and branch</h3><p>Make the smallest change that proves the requested behavior.</p></li><li><span>03</span><h3>Run gates</h3><p>Tests, types, browser checks where relevant, license audit, and package dry-run.</p></li><li><span>04</span><h3>Open a PR</h3><p>Include evidence, limitations, provenance, and docs in the same review.</p></li></ol></section>
    <section class="section shell card-grid"><article><p class="eyebrow">Good first contributions</p><h2>Improve the proof surface.</h2><ul class="check-list"><li>Offline integration fixture</li><li>Clear error-message test</li><li>Copy-paste example from a packed consumer</li><li>Benchmark metadata or raw output</li></ul></article><article><p class="eyebrow">Security findings</p><h2>Use a private advisory.</h2><p>Never post tokens, cookies, private content, or metadata responses in an issue.</p><a class="text-link" href="${repository}/security/advisories/new">Open a private report →</a></article></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Local checks</p><h2>Leave the repository easier to trust.</h2><p>Run the full release gate for changes that affect transport, browser behavior, packaging, or public types.</p></div>${codeBlock("contributor-check", "terminal", "npm ci --ignore-scripts\nnpm run release:check")}</section>`;
}

function releasePage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Release · 0.2.0 · 15 July 2026</p><h1>The hardened network and agent boundary release.</h1><p class="lede">Version 0.2.0 adds optional Chromium rendering, a strict agent adapter, TypeScript declarations, richer provenance, and a substantially expanded security and release gate.</p><div class="page-actions"><a class="button primary" href="${npmPackage}">Install from npm</a><a class="button secondary" href="${repository}/releases">GitHub releases</a></div></section>
    <section class="release-banner"><div class="shell"><span>Install</span><code>npm install cockroach-crawler@0.2.0</code><button type="button" class="copy-button" data-copy-value="npm install cockroach-crawler@0.2.0" aria-describedby="release-copy-status">Copy</button><span class="sr-only" id="release-copy-status" aria-live="polite"></span></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">What changed</p><h2>Authority is explicit from URL to output.</h2></div><p>See the repository changelog for the exhaustive list.</p></div><div class="fit-grid"><article class="fit-yes"><span>Added</span><h3>Optional Chromium mode</h3><p>Bounded waits and explicit clicks behind the DNS-validated, address-pinned transport.</p></article><article class="fit-yes"><span>Added</span><h3>Strict agent adapter</h3><p>Creator-owned limits, runtime validation, and browser opt-in.</p></article><article class="fit-yes"><span>Added</span><h3>Typed and traceable output</h3><p>Public declarations, hashes, redirect provenance, failures, stats, and AbortSignal support.</p></article></div></section>
    <section class="section shell"><div class="table-wrap" tabindex="0" role="region" aria-label="Release facts table"><table><thead><tr><th>Release fact</th><th>0.2.0</th></tr></thead><tbody><tr><td>Runtime</td><td>Node.js ≥ 20.18.1</td></tr><tr><td>Package license</td><td>MIT</td></tr><tr><td>Optional browser peer</td><td>Playwright ≥ 1.48.0 and &lt; 2</td></tr><tr><td>Published package</td><td><a href="${npmPackage}">npmjs.com/package/cockroach-crawler</a></td></tr><tr><td>Source and issues</td><td><a href="${repository}">github.com/AjnasNB/cockroach-crawler</a></td></tr></tbody></table></div></section>
    <section class="section shell candidate-release"><div><p class="eyebrow">Next release candidate</p><h2>0.3.0-alpha.1 expands the reading layer.</h2><p>The current source tree adds a provider registry, <code>cockroach-sources</code> doctor CLI, and a separate fetch-only Cloudflare Worker profile. The release gate verifies the package tarball, registry version, and post-publish consumer before promotion.</p></div><div class="candidate-facts"><div><span>GitHub</span><strong>Public REST ready</strong></div><div><span>YouTube</span><strong>Metadata read; keyed search; no transcript</strong></div><div><span>X + Reddit</span><strong>Official credentials required</strong></div><div><span>Serverless</span><strong>Operator allowlist + token + rate limit; no DNS resolution/pinning</strong></div></div></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Release gate</p><h2>Verify source, browser, audit, and tarball.</h2><p>The package's <code>prepublishOnly</code> script runs the same release check. Publishing remains a maintainer action.</p></div>${codeBlock("release-check", "terminal", "npm ci --ignore-scripts\nnpm run release:check")}</section>
    <section class="section shell card-grid"><article><p class="eyebrow">Upgrade note</p><h2>Review stricter failures.</h2><p>Cross-origin crawling now requires explicit allowed origins. Numeric strings and booleans are rejected instead of coerced. Robots and sensitive-path failures close earlier.</p></article><article><p class="eyebrow">Package provenance</p><h2>Inspect, do not infer.</h2><p>Review the npm package, committed workflow, lockfile, dependency-license snapshot, and packed tarball. This site does not claim certification.</p></article></section>`;
}

const notFound = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — Cockroach Crawler</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/styles.css"></head><body><main id="main" tabindex="-1"><section class="page-hero shell not-found"><p class="eyebrow">404</p><h1>This route is outside the crawl map.</h1><p class="lede">The page may have moved. Return to the documentation or inspect the project source.</p><div class="page-actions"><a class="button primary" href="/">Go home</a><a class="button secondary" href="/docs/">Read the docs</a></div></section></main></body></html>`;

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, "assets"), join(dist, "assets"), { recursive: true });
await mkdir(join(dist, "schemas"), { recursive: true });
await cp(join(root, "..", "schemas", "source-record.schema.json"), join(dist, "schemas", "source-record.schema.json"));
const siteMediaFiles = [
  "cockroach-crawler-main-60s.mp4",
  "captions-cockroach-crawler-main-60s-en.vtt",
  "cockroach-crawler-main-poster.png",
  "cockroach-crawler-providers-serverless-30s.mp4",
  "captions-cockroach-crawler-providers-serverless-30s-en.vtt",
  "cockroach-crawler-providers-serverless-poster.png",
  "cockroach-crawler-workflow-proof-45s.mp4",
  "captions-cockroach-crawler-workflow-proof-45s-en.vtt",
  "cockroach-crawler-workflow-proof-poster.png",
  "cockroach-crawler-vertical-short-30s.mp4",
  "captions-cockroach-crawler-vertical-short-30s-en.vtt",
  "cockroach-crawler-vertical-short-poster.png"
];
await mkdir(join(dist, "media"), { recursive: true });
for (const file of siteMediaFiles) {
  await cp(join(root, "..", "media", "remotion", "renders", file), join(dist, "media", file));
}
for (const page of pages) {
  const target = page.slug ? join(dist, page.slug, "index.html") : join(dist, "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, pageTemplate(page), "utf8");
}
await writeFile(join(dist, "404.html"), notFound, "utf8");
await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`, "utf8");
await writeFile(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url><loc>${siteUrl}${page.slug ? `/${page.slug}/` : "/"}</loc><lastmod>2026-07-18</lastmod></url>`).join("\n")}\n</urlset>\n`,
  "utf8"
);
await writeFile(join(dist, "site.webmanifest"), JSON.stringify({ name: "Cockroach Crawler", short_name: "Crawler", start_url: "/", display: "standalone", background_color: "#07100e", theme_color: "#07100e", icons: [{ src: "/assets/mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] }, null, 2), "utf8");
await writeFile(join(dist, "_headers"), `/*\n  Cache-Control: public, max-age=300, no-transform\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n\n/assets/*\n  Cache-Control: public, max-age=300, must-revalidate, no-transform\n\n/media/*\n  Cache-Control: public, max-age=3600, must-revalidate, no-transform\n`, "utf8");
await writeFile(join(dist, "_redirects"), `/docs /docs/ 301\n/docs/cli /docs/cli/ 301\n/docs/javascript /docs/javascript/ 301\n/docs/agents /docs/agents/ 301\n/docs/providers /docs/providers/ 301\n/docs/serverless /docs/serverless/ 301\n/security /security/ 301\n/providers /providers/ 301\n/benchmark /benchmark/ 301\n/media /media/ 301\n/launch /launch/ 301\n/roadmap /roadmap/ 301\n/community /community/ 301\n/release /release/ 301\n`, "utf8");
await writeFile(join(dist, "llms.txt"), `# Cockroach Crawler\n\nnpm stable 0.2.0 is a local Node.js crawler for public or explicitly trusted HTTP(S) pages. It enforces robots, explicit origin policy, public-network defaults, DNS-pinned requests, validated redirects, and resource budgets. It outputs readable text, Markdown, links, hashes, metadata, failures, and crawl stats.\n\nThe 0.3.0-alpha.1 source candidate adds a tested provider registry and separate serverless profile. Provider doctor status: web ready; public GitHub REST ready with optional token; YouTube metadata read ready, search requires YOUTUBE_API_KEY, transcript false; X requires an official bearer token; Reddit requires official OAuth client credentials and a contact-aware user agent. The serverless tier is self-hosted, token-authenticated, rate-limited, and restricted to deployment-configured HTTPS origins. It does not resolve, classify, or pin DNS answers, so operators must use owned or trusted hostnames and infrastructure egress policy. Browser mode is optional and requires process isolation for hostile pages.\n\n- Documentation overview: ${siteUrl}/docs/\n- CLI guide: ${siteUrl}/docs/cli/\n- JavaScript guide: ${siteUrl}/docs/javascript/\n- Agent and Maqam guide: ${siteUrl}/docs/agents/\n- Provider guide: ${siteUrl}/docs/providers/\n- Serverless guide: ${siteUrl}/docs/serverless/\n- Security: ${siteUrl}/security/\n- Provider status: ${siteUrl}/providers/\n- Benchmark method and clean CI result: ${siteUrl}/benchmark/\n- Launch kit, campaign assets, and product directions: ${siteUrl}/launch/\n- Maqam governance documentation: ${maqamDocs}\n- Source: ${repository}\n- npm: ${npmPackage}\n`, "utf8");
console.log(`Built ${pages.length} pages in ${dist}`);
