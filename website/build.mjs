import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const siteUrl = "https://cockroachcrawler.com";
const repository = "https://github.com/AjnasNB/cockroach-crawler";
const npmPackage = "https://www.npmjs.com/package/cockroach-crawler";
const firecrawlRepository = "https://github.com/firecrawl/firecrawl";
const firecrawlDocs = "https://docs.firecrawl.dev/";
const crawl4aiRepository = "https://github.com/unclecode/crawl4ai";
const crawl4aiDocs = "https://docs.crawl4ai.com/";
const contributorTestIssue = `${repository}/issues/20`;
const goodFirstIssues = `${repository}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`;
const helpWantedIssues = `${repository}/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22`;
const maqamRepository = "https://github.com/AjnasNB/maqam";
const maqamDocs = "https://maqamagent.com/docs/";
const productLoopRepository = "https://github.com/AjnasNB/productloop-os";
const benchmarkRun = "https://github.com/AjnasNB/cockroach-crawler/actions/runs/29624859893";
const assetVersion = createHash("sha256")
  .update(await readFile(join(root, "assets", "styles.css")))
  .update(await readFile(join(root, "assets", "app.js")))
  .digest("hex")
  .slice(0, 12);
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
    title: "AI web crawler for governed agents | Cockroach Crawler",
    description:
      "Open-source AI web crawler for agents: crawl, map, render, and extract public web data into LLM-ready evidence with explicit network and resource limits.",
    body: homePage(),
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          name: "Cockroach Crawler",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Node.js 22, 24, or 26",
          softwareVersion: "0.3.0",
          license: "https://opensource.org/license/mit",
          codeRepository: repository,
          downloadUrl: npmPackage,
          sameAs: [repository, npmPackage],
          isAccessibleForFree: true,
          featureList: [
            "Bounded public-web crawling",
            "Fetch-validated site mapping",
            "Deterministic structured extraction",
            "JavaScript rendering",
            "Markdown, JSON, and JSONL output",
            "Read-only source adapters",
            "Evidence hashes and provenance"
          ],
          description:
            "Open-source AI web crawling and read-only source routing for agents, with explicit network policy, resource budgets, structured extraction, and normalized evidence records.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
        },
        {
          "@type": "WebSite",
          name: "Cockroach Crawler",
          url: siteUrl,
          description: "Documentation for the Cockroach Crawler open-source AI web crawler."
        },
        {
          "@type": "SoftwareSourceCode",
          name: "Cockroach Crawler source code",
          codeRepository: repository,
          codeSampleType: "full solution",
          programmingLanguage: ["JavaScript", "TypeScript"],
          license: "https://opensource.org/license/mit",
          runtimePlatform: "Node.js 22, 24, or 26"
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            faqSchema("Does Cockroach Crawler bypass logins or CAPTCHA?", "No. It does not include stealth, CAPTCHA, paywall, authentication, or authorization bypasses."),
            faqSchema("Can an agent expand its crawl permissions?", "No. The agent adapter treats creator-owned origins and limits as upper bounds and rejects undeclared policy overrides."),
            faqSchema("Does Cockroach Crawler require an API key?", "Public web crawling, public GitHub reads, and the optional pinned yt-dlp YouTube route work without a developer API key. Official API providers remain available when operators configure their credentials. Optional session-backed social reads require a separately installed, operator-controlled OpenCLI runtime."),
            faqSchema("Is browser mode a sandbox?", "No. Browser mode constrains network behavior and resource use, but Chromium still requires process or container isolation for untrusted targets."),
            faqSchema("Does it provide GitHub, YouTube, X, or Reddit access?", "The stable 0.3.0 package includes public GitHub REST, official provider adapters, a pinned no-key YouTube route, optional read-only X and Reddit session routes, ordered provider fallback, and explicit doctor output. It does not extract cookies or expose social write operations.")
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
    slug: "docs/map-and-extract",
    active: "Docs",
    title: "Map and structured extraction guide — Cockroach Crawler",
    description: "Build compact fetch-validated site maps and extract bounded deterministic CSS fields with Cockroach Crawler.",
    body: mapAndExtractDocsPage()
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
    description: "Inspect stable public, official, no-key, and session-backed read routes without hiding credentials, login state, or provider authority.",
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
    description: "A precise capability matrix for public HTTP, serverless crawling, GitHub, YouTube, social reads, authentication, sessions, and captions.",
    body: providersPage()
  },
  {
    slug: "compare",
    nav: "Compare",
    title: "Cockroach Crawler vs Firecrawl vs Crawl4AI | AI crawler comparison",
    description: "Compare Cockroach Crawler, Firecrawl, and Crawl4AI across crawling, mapping, extraction, browser rendering, hosted scale, evidence, and network governance.",
    body: comparePage(),
    schema: comparisonSchema(),
    ogType: "article"
  },
  {
    slug: "stack",
    nav: "Stack",
    title: "Governed agent stack | Cockroach Crawler",
    description: "See how Cockroach Crawler, Maqam, ProductLoop OS, and Qarinah compose as reach, governance, orchestration, and context layers.",
    body: stackPage()
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
    title: "Release 0.3.0 — Cockroach Crawler",
    description: "Cockroach Crawler 0.3.0 release notes, verification commands, package links, compatibility, and upgrade guidance.",
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
    tool: [{ "@type": "HowToTool", name: "Node.js 22, 24, or 26" }],
    step: [
      { "@type": "HowToStep", name: "Install", text: "Run npm install --global cockroach-crawler." },
      { "@type": "HowToStep", name: "Run", text: "Run cockroach-crawl with a public URL and explicit page, request, and duration limits." },
      { "@type": "HowToStep", name: "Inspect", text: "Review the JSON or JSONL records, failures, and crawl statistics." }
    ]
  };
}

function comparisonSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        headline: "Cockroach Crawler vs Firecrawl vs Crawl4AI",
        description: "A factual AI web crawler comparison across product scope, crawling, mapping, extraction, browser rendering, hosted scale, evidence, and network governance.",
        datePublished: "2026-07-23",
        dateModified: "2026-07-23",
        author: { "@type": "Person", name: "Ajnas N B" },
        publisher: { "@type": "Organization", name: "Cockroach Crawler", url: siteUrl },
        mainEntityOfPage: `${siteUrl}/compare/`,
        about: [
          { "@type": "SoftwareApplication", name: "Cockroach Crawler", url: siteUrl },
          { "@type": "SoftwareApplication", name: "Firecrawl", url: firecrawlRepository },
          { "@type": "SoftwareApplication", name: "Crawl4AI", url: crawl4aiRepository }
        ]
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          faqSchema("What is the best AI web crawler for agents?", "The best crawler is the smallest tested contract that meets the deployment. Cockroach Crawler fits governed local evidence, Firecrawl fits managed web-data infrastructure, and Crawl4AI fits broad self-hosted Python crawling workflows."),
          faqSchema("Is Cockroach Crawler better than Firecrawl?", "It is stronger for local, evidence-first crawling where explicit network and resource boundaries matter. Firecrawl is broader for hosted crawling, search, proxy infrastructure, asynchronous jobs, and managed scale."),
          faqSchema("Is Cockroach Crawler better than Crawl4AI?", "It is stronger for an inspectable agent network boundary and normalized provenance. Crawl4AI is broader for adaptive crawling, browser sessions, extraction strategies, document processing, caching, and Python workflows."),
          faqSchema("Which crawler should I choose for an AI agent?", "Choose the smallest product whose tested contract matches the job. Use Cockroach Crawler for governed local evidence, Firecrawl for a managed web-data API, and Crawl4AI for a broad self-hosted Python crawling toolkit.")
        ]
      }
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
  const primary = pages.filter((page) => ["Home", "Docs", "Providers", "Stack", "Security", "Benchmark"].includes(page.nav));
  const secondary = pages.filter((page) => ["Compare", "Media", "Launch", "Roadmap", "Community", "Release"].includes(page.nav));
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
        <div><h2>Use</h2><a href="/docs/">Documentation</a><a href="/providers/">Provider status</a><a href="/compare/">Crawler comparison</a><a href="/stack/">Governed stack</a><a href="${npmPackage}">npm package</a></div>
        <div><h2>Trust</h2><a href="/security/">Security model</a><a href="/benchmark/">Benchmark method</a><a href="${repository}/blob/main/SECURITY.md">Report privately</a></div>
        <div><h2>Project</h2><a href="/launch/">Launch kit</a><a href="/roadmap/">Roadmap</a><a href="/community/">Contribute</a><a href="${repository}">Source code</a><a href="${maqamDocs}">Govern with Maqam</a></div>
      </div>
      <div class="shell legal"><span>MIT · npm stable 0.3.0 · Node.js 22 / 24 / 26</span><span>Site content last reviewed 23 July 2026</span></div>
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
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <meta name="author" content="Ajnas N B" />
  <meta name="application-name" content="Cockroach Crawler" />
  <meta name="theme-color" content="#07100e" />
  <meta name="color-scheme" content="dark" />
  <link rel="canonical" href="${canonical}" />
  <link rel="icon" href="/assets/mark.svg" type="image/svg+xml" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta property="og:type" content="${page.ogType ?? "website"}" />
  <meta property="og:locale" content="en_US" />
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
  <meta name="twitter:image:alt" content="Cockroach Crawler bounded public-web crawl diagram" />
  <link rel="stylesheet" href="/assets/styles.css?v=${assetVersion}" />
  <script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>
  <script src="/assets/app.js?v=${assetVersion}" defer></script>
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
        <p class="eyebrow">Open-source AI web crawler for governed agents</p>
        <h1>Give your AI agents the web. Keep the keys.</h1>
        <p class="lede">Crawl sites, map URLs, render JavaScript, extract structured fields, and turn permitted public sources into LLM-ready Markdown, JSON, or JSONL while creator-owned policy limits origins, redirects, robots, requests, bytes, depth, and time.</p>
        <div class="button-row"><a class="button primary" href="/docs/">Start in five minutes</a><a class="button secondary" href="/compare/">Compare AI crawlers</a><a class="button secondary" href="${repository}">Inspect the source</a></div>
        <ul class="signal-list" aria-label="Release facts"><li>npm stable 0.3.0</li><li>Node.js 22 / 24 / 26</li><li>MIT</li><li>No signup</li></ul>
        <div class="candidate-note"><span>Stable release</span><p><strong>0.3.0</strong> combines bounded web crawling with ordered source routing, optional read-only reach providers, a governed browser-host contract, and a separate restricted serverless profile under npm <code>latest</code>.</p></div>
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
    <section class="section shell capability-section" aria-labelledby="capability-title">
      <div class="capability-intro">
        <p class="eyebrow">Status before request</p>
        <h2 id="capability-title">Know what works without a key.</h2>
        <p>Run the source doctor before an agent chooses a provider. The report reads local configuration state and never serializes credential values.</p>
        ${codeBlock("home-doctor", "capability check", "npx -y --package cockroach-crawler@0.3.0 cockroach-sources doctor\nnpx -y --package cockroach-crawler@0.3.0 cockroach-reach doctor")}
        <a class="text-link" href="/providers/">Inspect every provider boundary</a>
      </div>
      <div class="capability-board" role="list" aria-label="Credential-free and configured source capabilities">
        <article role="listitem"><span class="status shipped">Ready</span><div><h3>Public web</h3><p>Read permitted URLs with robots, network, redirect, origin, and resource controls.</p></div><strong>No key</strong></article>
        <article role="listitem"><span class="status shipped">Ready</span><div><h3>GitHub</h3><p>Search and read public repositories and issues at the unauthenticated REST limit.</p></div><strong>No key</strong></article>
        <article role="listitem"><span class="status shipped">Ready</span><div><h3>YouTube</h3><p>Read known-video metadata and optionally route no-key search through a pinned, restricted yt-dlp executable.</p></div><strong>No key route</strong></article>
        <article role="listitem"><span class="status conditional">Optional</span><div><h3>Social reads</h3><p>Use official APIs or an explicitly installed, read-only OpenCLI session provider. No cookie extraction or write operations.</p></div><strong>Operator session</strong></article>
      </div>
    </section>
    <section class="section shell stack-preview" aria-labelledby="stack-preview-title">
      <div>
        <p class="eyebrow">One flow, explicit layers</p>
        <h2 id="stack-preview-title">Reach is useful. Governed reach is the product.</h2>
        <p>Cockroach Crawler gathers bounded public evidence. Maqam governs registered actions. ProductLoop composes workflows. Qarinah compiles the evidence and decisions into small cited context packs.</p>
        <div class="button-row"><a class="button primary" href="/stack/">See the complete stack</a><a class="button secondary" href="/docs/agents/">Govern a crawler tool</a></div>
      </div>
      <figure><img src="/assets/provider-map.svg" width="720" height="560" alt="Five provider inputs entering a normalized read-only source record boundary" /><figcaption>Each layer stays replaceable. No direct call becomes governed merely because the packages are installed together.</figcaption></figure>
    </section>
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
      <div><p class="eyebrow">Choose the smallest mode that works</p><h2>One install. Crawl, map, render, extract.</h2><p>Use the CLI for repeatable exports, the library inside a Node service, or the strict adapter inside an agent runtime. Optional Chromium rendering stays behind the same URL and budget policy.</p></div>
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
      <div class="section-head"><div><p class="eyebrow">Where it fits</p><h2>Built for evidence pipelines, not access-control workarounds.</h2></div><p>Choose it when an inspectable agent boundary matters more than a managed proxy fleet. <a href="/compare/">Compare Firecrawl and Crawl4AI directly.</a></p></div>
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
      <details><summary>Can it read GitHub, YouTube, X, or Reddit?</summary><p>The stable 0.3.0 package includes public GitHub REST, official provider adapters, a restricted no-key YouTube route, and optional read-only X and Reddit session providers. Session providers require explicit local installation and never expose posting, liking, following, messaging, deleting, cookie extraction, or profile-file import.</p></details>
      <details><summary>Can I run it in a serverless edge function?</summary><p>The stable 0.3.0 package includes a self-hosted, token-authenticated, rate-limited Cloudflare Worker profile for deployment-configured HTTPS origins. It is bounded, but it does not resolve, classify, or pin DNS answers; an allowlisted hostname can resolve internally. Use operator-owned or independently trusted hostnames plus infrastructure egress policy.</p></details>
    </div></section>`;
}

function docsTopicNav() {
  const topics = [
    ["Install and run the CLI", "Copy one bounded crawl command, choose JSON or JSONL output, and inspect failures.", "/docs/cli/", "Open CLI guide"],
    ["Embed the Node.js API", "Call crawlDetailed with typed limits, cancellation, page records, and crawl statistics.", "/docs/javascript/", "Open API guide"],
    ["Map and extract fields", "Return compact fetch-validated URL entries or bounded deterministic CSS fields.", "/docs/map-and-extract/", "Open map and extraction guide"],
    ["Expose a bounded agent tool", "Keep origins and budgets owned by the host, then optionally route the call through Maqam.", "/docs/agents/", "Open agent guide"],
    ["Read supported providers", "See which GitHub, YouTube, X, and Reddit reads work and which official credentials are required.", "/docs/providers/", "Open provider guide"],
    ["Deploy the fixed-origin Worker", "Run a token-authenticated, rate-limited fetch profile for deployment-owned HTTPS origins.", "/docs/serverless/", "Open Worker guide"],
    ["Review the crawl boundary", "Audit SSRF defenses, robots behavior, browser limits, redirects, and resource ceilings.", "/security/", "Open security guide"]
  ];
  return `<section class="docs-directory shell" aria-labelledby="docs-directory-title">
    <div class="docs-directory-head"><p class="eyebrow">Choose a task</p><h2 id="docs-directory-title">What do you need to do?</h2><p>Each guide starts with runnable code and names the limits that still apply.</p></div>
    <nav class="doc-route-grid" aria-label="Documentation tasks">${topics.map(([title, text, href, action]) => `<a href="${href}"><strong>${title}</strong><span>${text}</span><em>${action} →</em></a>`).join("")}</nav>
  </section>`;
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
    `<section><p class="eyebrow">01 · Install</p><h2>Use maintained Node.js 22, 24, or 26.</h2><p>Global installation exposes <code>cockroach-crawl</code>. A project-local install works with <code>npx</code> and pins the crawler in your lockfile.</p>${codeBlock("cli-install-global", "global", "npm install --global cockroach-crawler\ncockroach-crawl --version")}${codeBlock("cli-install-local", "project local", "npm install cockroach-crawler\nnpx cockroach-crawl --version")}</section>
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

function mapAndExtractDocsPage() {
  return focusedDocsPage(
    "Documentation · Current source",
    "Map a site or select exact fields without an extraction service.",
    "The current source build adds compact fetch-validated maps and deterministic CSS extraction while retaining every existing network and resource boundary.",
    `<section><p class="eyebrow">01 · Compact map</p><h2>Return URL evidence without page bodies.</h2><p><code>mapSite</code> uses the normal crawler transport. Every entry passed robots, origin, redirect, DNS, sensitive-path, request, byte, queue, and duration policy before it was returned.</p>${codeBlock("map-cli-guide", "CLI", `cockroach-crawl https://example.com/docs \\
  --map \\
  --sitemaps \\
  --max-pages 200 \\
  --max-requests 800 \\
  --output map.json`)}${codeBlock("map-api-guide", "map.mjs", `import { mapSite } from "cockroach-crawler";

const result = await mapSite({
  seeds: ["https://example.com/docs"],
  includeSitemaps: true,
  maxPages: 200,
  maxRequests: 800,
  maxDurationMs: 120_000
});

console.log(result.entries);
console.log(result.failures, result.stats);`, "javascript")}</section>
    <section><p class="eyebrow">02 · Extraction schema</p><h2>Name fields and cap every output dimension.</h2><p>Selectors read visible text by default. A field may instead read cleaned inner HTML or one named attribute. Relative URL attributes can resolve against the fetched page.</p>${codeBlock("extract-schema-guide", "extraction.json", `{
  "fields": {
    "heading": "h1",
    "productNames": {
      "selector": ".product h2",
      "multiple": true,
      "limit": 100
    },
    "productUrls": {
      "selector": ".product a[href]",
      "source": "attribute",
      "attribute": "href",
      "resolveUrl": true,
      "multiple": true,
      "limit": 100
    }
  },
  "maxTotalValues": 250,
  "maxTotalCharacters": 100000
}`, "json")}${codeBlock("extract-cli-guide", "CLI", `cockroach-crawl https://example.com/catalog \\
  --extract extraction.json \\
  --max-pages 10 \\
  --output products.json`)}</section>
    <section><p class="eyebrow">03 · Direct API</p><h2>Use the same contract on HTML already in memory.</h2>${codeBlock("extract-api-guide", "extract.mjs", `import { extractStructured } from "cockroach-crawler";

const result = extractStructured(html, "https://example.com/catalog", {
  fields: {
    heading: "h1",
    prices: { selector: ".price", multiple: true, limit: 100 }
  },
  maxValueLength: 4096,
  maxTotalValues: 200,
  maxTotalCharacters: 100_000
});

console.log(result.data);
console.log(result.warnings);`, "javascript")}<div class="callout warning"><strong>Deterministic, not semantic</strong><p>This extractor does not run page scripts, arbitrary expressions, or an LLM. Model-assisted extraction belongs in a separately governed host adapter with explicit data disclosure, model identity, cost, retries, and schema validation.</p></div></section>
    <section><p class="eyebrow">04 · Limits</p><h2>Fail closed before crawling.</h2><p>The extractor rejects unknown options, getters and setters, inherited options, prototype-sensitive field names, invalid selectors, invalid attribute names, and incompatible settings. Scripts, styles, templates, embedded documents, SVG/canvas content, and hidden nodes are removed before selection.</p><div class="next-links"><a href="${repository}/blob/main/docs/CAPABILITIES.md"><span>Capability truth</span><strong>Review shipped, planned, and excluded work →</strong></a><a href="/security/"><span>Transport policy</span><strong>Review the crawl boundary →</strong></a></div></section>`
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
    "The installed runtime reports whether each adapter is public, keyed, credentialed, no-key, session-backed, partial, or unavailable without serializing secrets.",
    `<section><p class="eyebrow">01 · Doctor</p><h2>Inspect the current runtime.</h2>${codeBlock("provider-doctor-guide", "npm stable", "npx -y --package cockroach-crawler@0.3.0 cockroach-sources doctor --json\nnpx -y --package cockroach-crawler@0.3.0 cockroach-reach doctor --json")}</section>
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
    <section class="page-hero shell"><p class="eyebrow">Documentation</p><h1>Install it. Crawl one path. Inspect the result.</h1><p class="lede">Choose the CLI, Node.js API, agent adapter, provider, or Worker path. Every guide includes runnable code, output behavior, failures, and enforced limits.</p><div class="page-actions"><a class="button primary" href="#quickstart">Run the quickstart</a><a class="button secondary" href="${repository}/blob/main/README.md">Read the package README</a></div></section>
    ${docsTopicNav()}
    <details class="mobile-toc shell"><summary>On this page</summary><nav aria-label="On this page">${tocLinks}</nav></details>
    <div class="docs-layout shell">
      <aside class="toc"><nav aria-label="On this page"><h2>On this page</h2>${tocLinks}</nav></aside>
      <div class="docs-content">
        <section id="quickstart"><p class="eyebrow">01 · Quickstart</p><h2>Crawl a public documentation path.</h2><p>Requires a maintained Node.js 22, 24, or 26 release. The CLI obeys robots by default and stays on the seed origin unless you explicitly allow more.</p>${codeBlock("install-cli", "terminal", "npm install --global cockroach-crawler\ncockroach-crawl https://example.com/docs \\\n  --max-pages 20 \\\n  --max-requests 80 \\\n  --max-duration 60000 \\\n  --jsonl \\\n  --output crawl.jsonl")}</section>
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
        <section id="sources"><p class="eyebrow">05 · Stable · 0.3.0</p><h2>Inspect provider capability before dispatch.</h2><div class="callout candidate"><strong>npm latest</strong><p>This contract is part of stable 0.3.0. Pin the exact stable version when reproducible installation matters.</p></div>${codeBlock("sources-doctor", "npm stable", "npm install cockroach-crawler@0.3.0\nnpx cockroach-sources doctor --json\nnpx cockroach-reach doctor --json")}${codeBlock("sources-example", "sources.mjs", `import { createSourceRegistryFromEnv } from "cockroach-crawler/sources";

const sources = createSourceRegistryFromEnv(process.env);
console.table(sources.doctor());

const repositories = await sources.search("github", {
  query: "topic:web-crawler language:javascript",
  maxResults: 5
});

console.log(repositories);`, "javascript")}<p>Public GitHub REST is ready with optional token authentication. YouTube metadata reads work through public oEmbed; search needs <code>YOUTUBE_API_KEY</code> and transcripts remain unavailable. X requires <code>X_BEARER_TOKEN</code>. Reddit requires official client credentials and a contact-aware user agent.</p></section>
        <section id="serverless"><p class="eyebrow">06 · Serverless · stable 0.3.0</p><h2>A smaller edge boundary with named tradeoffs.</h2><p>The stable package includes a self-hosted Cloudflare Worker entry point. It accepts only token-authenticated <code>POST /v1/crawl</code>, requires configured HTTPS origins, and is rate-limited by the deployment.</p>${codeBlock("serverless-config", "worker/wrangler.jsonc", `{
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
        <section id="deployment"><p class="eyebrow">10 · Deployment</p><h2>Pick the tier whose boundary you can defend.</h2><p>The stable local package uses Node networking and optional Playwright; run it in a controlled Node process, container, or CI job. The stable Cloudflare Worker export is a separate fetch-only profile with an explicit weaker network guarantee. Do not describe the tiers as equivalent.</p><div class="next-links"><a href="/security/"><span>Next</span><strong>Review the security model →</strong></a><a href="/providers/"><span>Then</span><strong>Check provider coverage →</strong></a></div></section>
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
    </tbody></table></div><div class="callout candidate"><strong>Local crawler controls</strong><p>The table and network illustration describe the Node transport. The serverless profile has an origin allowlist but no DNS resolution, address classification, or pinning. Its allowlist is not a complete SSRF control; use operator-owned/trusted hostnames and platform egress policy.</p></div></section>
    <section class="section shell card-grid"><article><p class="eyebrow">Browser reality</p><h2>Network control is not process isolation.</h2><p>Hostile JavaScript can consume CPU or memory and may target browser vulnerabilities. Retain OS/container isolation and restricted host egress for untrusted targets.</p></article><article><p class="eyebrow">Content reality</p><h2>Extraction is not instruction trust.</h2><p>HTML, text, and Markdown can contain prompt injection and false claims. Keep crawler output in a data channel with URLs and hashes.</p></article></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Private disclosure</p><h2>Send the smallest safe reproduction.</h2><p>Use GitHub Security Advisories. Do not put credentials, cookies, private page content, or cloud metadata into a public issue.</p><a class="button primary" href="${repository}/security/advisories/new">Open a private advisory</a></div>${codeBlock("security-tests", "focused checks", "npm test\nnpm run test:browser\nnpm audit --omit=dev --audit-level=high")}</section>`;
}

function providersPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Provider coverage · stable 0.3.0</p><h1>Know what is public, keyed, session-backed, and still missing.</h1><p class="lede">Stable 0.3.0 combines the hardened web crawler with a tested provider registry, ordered routing, optional read-only reach providers, a governed browser-host contract, and a separate restricted serverless tier.</p><div class="page-actions"><a class="button primary" href="/docs/#sources">Inspect the stable API</a><a class="button secondary" href="${repository}/issues">Propose an adapter</a></div></section>
    <section class="section shell feature-stage"><figure><img src="/assets/provider-map.svg" width="720" height="560" alt="Provider coverage map distinguishing public web, GitHub, official APIs, no-key YouTube, and optional read-only session routes" /><figcaption>Doctor status is capability-based: public, keyed, credentialed, no-key, session-backed, partial, and unavailable states remain distinct.</figcaption></figure><div><p class="eyebrow">Know before dispatch</p><h2>Every adapter reports its exact access state.</h2><p>Each adapter reports its authority and availability before dispatch, together with its rate-limit and data-shape contract.</p><div class="candidate-note compact"><span>Stable contract</span><p><code>cockroach-sources doctor --json</code> and <code>cockroach-reach doctor --json</code> report runtime status without serializing secrets.</p></div></div></section>
    <section class="section shell"><div class="table-wrap" tabindex="0" role="region" aria-label="Provider capability status table"><table class="status-table"><thead><tr><th>Surface</th><th>Stable 0.3.0 status</th><th>Boundary</th></tr></thead><tbody>
      <tr><td>Hardened public web</td><td><span class="status shipped">Ready</span></td><td>Explicit URLs, robots, sitemaps, Markdown/JSONL, Node DNS pinning.</td></tr>
      <tr><td>GitHub REST</td><td><span class="status shipped">Ready</span></td><td>Public search/read at unauthenticated rate limits; token optional.</td></tr>
      <tr><td>YouTube</td><td><span class="status conditional">Partial</span></td><td>Public metadata and a restricted pinned no-key route; official search uses <code>YOUTUBE_API_KEY</code>; transcripts are unavailable.</td></tr>
      <tr><td>X API v2</td><td><span class="status conditional">Credentials</span></td><td>Search/read require an approved operator-supplied <code>X_BEARER_TOKEN</code>.</td></tr>
      <tr><td>Reddit API</td><td><span class="status conditional">Credentials</span></td><td>Application-only OAuth requires client ID, secret, and contact-aware user agent.</td></tr>
      <tr><td>Serverless web tier</td><td><span class="status conditional">Restricted</span></td><td>Self-hosted, token-authenticated, rate-limited, operator-owned HTTPS allowlist; no DNS resolution/pinning or browser/social adapters.</td></tr>
      <tr><td>YouTube transcripts</td><td><span class="status denied">Unavailable</span></td><td>No transcript extraction or transcript-provider integration.</td></tr>
      <tr><td>CAPTCHA/paywall bypass</td><td><span class="status denied">Not supported</span></td><td>No stealth, session theft, or authorization bypass.</td></tr>
    </tbody></table></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Adapter acceptance bar</p><h2>New reach must not erase the boundary.</h2></div><p>A provider adapter should be small, opt-in, provider-package-tested offline where possible, and explicit about authentication and missing guarantees.</p></div><ol class="process-grid"><li><span>01</span><h3>Public contract</h3><p>Use a documented API or permitted public surface with a pinned provider version.</p></li><li><span>02</span><h3>Creator authority</h3><p>Credentials, scopes, origins, and rate limits remain operator-owned.</p></li><li><span>03</span><h3>Offline fixture</h3><p>Prove allow and deny routing without accounts, live data, or side effects.</p></li><li><span>04</span><h3>Named limits</h3><p>Document what is not synchronized, discovered, authenticated, or certified.</p></li></ol></section>`;
}

function comparePage() {
  return `
    <section class="page-hero shell">
      <p class="eyebrow">Open-source AI web crawler comparison · reviewed 23 July 2026</p>
      <h1>Cockroach Crawler vs Firecrawl vs Crawl4AI</h1>
      <p class="lede">There is no honest universal “best crawler.” Choose by deployment model, extraction depth, hosted scale, language ecosystem, and the amount of network authority an agent should receive.</p>
      <div class="page-actions"><a class="button primary" href="/docs/">Try Cockroach Crawler</a><a class="button secondary" href="#matrix">Compare capabilities</a></div>
    </section>
    <section class="section shell">
      <div class="section-head"><div><p class="eyebrow">Short answer</p><h2>Three products, three different centers.</h2></div><p>This comparison uses public documentation and repository evidence. It is not a paid ranking or a claim that one product replaces every other crawler.</p></div>
      <div class="fit-grid">
        <article class="fit-yes"><span>Choose for governed local evidence</span><h3>Cockroach Crawler</h3><p>Best fit when agents need local crawling, mapping, rendering, deterministic extraction, normalized evidence, and creator-owned network ceilings in one small Node.js package.</p></article>
        <article><span>Choose for managed scale</span><h3>Firecrawl</h3><p>Best fit when a hosted API, managed search, proxy infrastructure, asynchronous jobs, browser interaction, and multi-format document handling matter more than a compact local boundary.</p></article>
        <article><span>Choose for broad Python control</span><h3>Crawl4AI</h3><p>Best fit when Python workflows need adaptive or deep crawling, browser sessions, caching, dispatchers, multiple extraction strategies, and extensive self-hosted configuration.</p></article>
      </div>
    </section>
    <section class="section shell" id="matrix">
      <div class="section-head"><div><p class="eyebrow">Capability matrix</p><h2>Compare the contract, not the tagline.</h2></div><p>“Source build” means the reviewed Cockroach Crawler branch that adds mapping and deterministic extraction; npm stable remains 0.3.0 until a newer exact artifact is published.</p></div>
      <div class="table-wrap" tabindex="0" role="region" aria-label="Cockroach Crawler, Firecrawl, and Crawl4AI comparison table">
        <table class="status-table">
          <thead><tr><th>Capability</th><th>Cockroach Crawler</th><th>Firecrawl</th><th>Crawl4AI</th></tr></thead>
          <tbody>
            <tr><th scope="row">Primary product</th><td>Local evidence-first crawler and source router for governed agents</td><td>Hosted and self-hostable web-data API</td><td>Self-hosted Python crawler and extraction toolkit</td></tr>
            <tr><th scope="row">Public-site crawl</th><td><span class="status shipped">Stable</span> bounded local crawl with robots, sitemaps, redirects, and budgets</td><td><span class="status shipped">Available</span> managed crawl jobs and self-hosted components</td><td><span class="status shipped">Available</span> async, deep, and adaptive crawl strategies</td></tr>
            <tr><th scope="row">Site mapping</th><td><span class="status conditional">Source build</span> fetch-validated compact entries</td><td><span class="status shipped">Available</span> dedicated map endpoint with optional search</td><td><span class="status shipped">Available</span> URL seeding and domain discovery workflows</td></tr>
            <tr><th scope="row">Structured extraction</th><td><span class="status conditional">Source build</span> deterministic CSS text, cleaned HTML, and attributes with hard output ceilings</td><td><span class="status shipped">Available</span> structured JSON and agent-driven extraction</td><td><span class="status shipped">Available</span> CSS, XPath, regex, schema, and model-assisted strategies</td></tr>
            <tr><th scope="row">JavaScript pages</th><td>Optional Chromium with explicit reviewed clicks and bounded HTTP(S) routing</td><td>Managed browser actions and interaction APIs</td><td>Browser sessions, hooks, JavaScript execution, and interaction configuration</td></tr>
            <tr><th scope="row">Hosted queues and proxies</th><td><span class="status denied">Not included</span></td><td><span class="status shipped">Core strength</span></td><td>Self-hosted orchestration; deployment supplies infrastructure</td></tr>
            <tr><th scope="row">Agent authority boundary</th><td><span class="status shipped">Core strength</span> creator-owned origins, network policy, request and byte budgets, immutable agent ceilings</td><td>API and deployment controls; review the selected hosted or self-hosted contract</td><td>Application-configured crawler and browser controls</td></tr>
            <tr><th scope="row">Evidence records</th><td><span class="status shipped">Core strength</span> canonical URL, redirect chain, content hash, warnings, failures, timestamps, and provenance</td><td>Content plus page metadata and source URLs</td><td>Crawl results, metadata, links, and extraction output</td></tr>
            <tr><th scope="row">Local use without hosted signup</th><td>Yes for public web and documented optional public routes</td><td>Self-hosting is available; managed API features use credentials</td><td>Yes</td></tr>
            <tr><th scope="row">License</th><td><a href="${repository}/blob/main/LICENSE">MIT</a></td><td><a href="${firecrawlRepository}/blob/main/LICENSE">AGPL-3.0</a></td><td><a href="${crawl4aiRepository}/blob/main/LICENSE">Apache-2.0</a></td></tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="section shell feature-stage reverse">
      <figure><img src="/assets/security-boundary.svg" width="720" height="560" alt="Public web requests crossing DNS, redirect, origin, robots, and resource checks before extraction" /><figcaption>Cockroach Crawler competes on what an agent is allowed to reach and what evidence returns, not on a universal page-coverage claim.</figcaption></figure>
      <div><p class="eyebrow">Where Cockroach Crawler is different</p><h2>Security and provenance are part of the return type.</h2><p>The Node transport validates the complete DNS answer set, pins a public address for each hop, rechecks redirects and robots, and applies exact traversal and byte budgets. The strict agent adapter cannot expand the limits selected by its creator.</p><ul class="check-list"><li>No hosted crawler account required for normal public URLs</li><li>No model call required for deterministic extraction</li><li>No cookie extraction or silent credential reuse</li><li>No CAPTCHA, paywall, login, or authorization bypass</li></ul></div>
    </section>
    <section class="section shell">
      <div class="section-head"><div><p class="eyebrow">Where broader platforms win</p><h2>Use the specialist when its larger surface is the job.</h2></div><p>Cockroach Crawler should earn adoption through a precise contract, not by hiding capabilities it has not shipped.</p></div>
      <div class="card-grid">
        <article><h3>Choose Firecrawl for managed operations</h3><p>Hosted search, proxy and anti-block infrastructure, large asynchronous jobs, managed browser interaction, document parsing, and operational scale remain outside Cockroach Crawler’s compact package.</p><a class="text-link" href="${firecrawlDocs}">Read Firecrawl documentation →</a></article>
        <article><h3>Choose Crawl4AI for broad Python workflows</h3><p>Adaptive crawling, session-rich browser control, policy-aware caching, PDF and media processing, multiple extraction strategies, and Python-native orchestration are broader in Crawl4AI today.</p><a class="text-link" href="${crawl4aiDocs}">Read Crawl4AI documentation →</a></article>
      </div>
    </section>
    <section class="section shell proof-section">
      <div><p class="eyebrow">Verify before choosing</p><h2>Run the crawler and inspect its boundaries.</h2><p>Install the stable package for production behavior. Mapping and deterministic extraction become stable only when an npm release contains their exact reviewed commit.</p><div class="button-row"><a class="button primary" href="/docs/">Run the quickstart</a><a class="button secondary" href="/security/">Audit the security model</a></div></div>
      ${codeBlock("compare-proof", "local verification", "npm install cockroach-crawler@0.3.0\nnpx cockroach-sources doctor --json\nnpx cockroach-crawl https://example.com/docs --max-pages 20 --jsonl")}
    </section>
    <section class="section shell faq-section"><div><p class="eyebrow">Crawler selection FAQ</p><h2>Choose the smallest trustworthy surface.</h2></div><div class="faq-list">
      <details><summary>What is the best AI web crawler for agents?</summary><p>The best crawler is the smallest tested contract that meets the deployment. Cockroach Crawler fits governed local evidence, Firecrawl fits managed web-data infrastructure, and Crawl4AI fits broad self-hosted Python crawling workflows.</p></details>
      <details><summary>Is Cockroach Crawler better than Firecrawl?</summary><p>It is a stronger fit for local, evidence-first crawling where explicit agent network and resource boundaries matter. Firecrawl is broader for hosted search, proxy infrastructure, asynchronous jobs, managed interaction, document formats, and production scale.</p></details>
      <details><summary>Is Cockroach Crawler better than Crawl4AI?</summary><p>It is a stronger fit for a compact Node.js agent boundary and normalized provenance. Crawl4AI is broader for adaptive crawling, browser sessions, extraction strategies, caching, document processing, and Python workflows.</p></details>
      <details><summary>Can I replace either product without testing?</summary><p>No. Match URL sets, rendering mode, output fields, robots policy, retries, concurrency, network conditions, and deployment requirements before migrating.</p></details>
      <details><summary>Where did the comparison data come from?</summary><p>Product claims were reviewed against the public <a href="${firecrawlRepository}">Firecrawl repository</a>, <a href="${firecrawlDocs}">Firecrawl documentation</a>, <a href="${crawl4aiRepository}">Crawl4AI repository</a>, and <a href="${crawl4aiDocs}">Crawl4AI documentation</a> on 23 July 2026.</p></details>
    </div></section>`;
}

function stackPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Governed agent stack</p><h1>One agent stack. Four explicit controls.</h1><p class="lede">Reach, action, context, and evidence compose without pretending that installation alone governs every call.</p><div class="page-actions"><a class="button primary" href="/docs/agents/">Govern a crawler tool</a><a class="button secondary" href="${productLoopRepository}">Inspect ProductLoop OS</a></div></section>
    <section class="section shell stack-flow" aria-labelledby="stack-flow-title">
      <div class="stack-flow-copy"><p class="eyebrow">Execution model</p><h2 id="stack-flow-title">The host chooses the route. Each layer proves one job.</h2><p>ProductLoop coordinates the workflow. Qarinah compiles approved project context. Maqam decides whether a registered operation may execute. Cockroach Crawler collects bounded public evidence. Results return as records, receipts, and context references.</p></div>
      <ol class="stack-path">
        <li><span>01</span><div><h3>Compose</h3><strong>ProductLoop OS</strong><p>Workflow runtime, policies, approvals, connectors, skills, evaluations, provenance, and research plans.</p></div></li>
        <li><span>02</span><div><h3>Contextualize</h3><strong>Qarinah</strong><p>Local event ledger, deterministic graph/index, and compact cited context packs. Private alpha today.</p></div></li>
        <li><span>03</span><div><h3>Govern</h3><strong>Maqam</strong><p>Registered tool policy, exact one-use approvals, browser-action contracts, traces, and evidence.</p></div></li>
        <li><span>04</span><div><h3>Reach</h3><strong>Cockroach Crawler</strong><p>Bounded public-web reads, provider capability checks, normalized source records, and serverless fetch policy.</p></div></li>
      </ol>
    </section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Capability truth</p><h2>What the combined system can claim today.</h2></div><p>Every row names the component that provides the behavior and the boundary the deployment must still enforce.</p></div><div class="table-wrap" tabindex="0" role="region" aria-label="Governed agent stack capability table"><table><thead><tr><th>Capability</th><th>Component</th><th>Status</th><th>Deployment boundary</th></tr></thead><tbody>
      <tr><td>Public URL crawl to Markdown or JSONL</td><td>Cockroach Crawler</td><td><span class="status shipped">Available</span></td><td>Explicit origin and resource policy; public network by default.</td></tr>
      <tr><td>Public GitHub read/search without a developer key</td><td>Cockroach Crawler</td><td><span class="status shipped">Available</span></td><td>Unauthenticated REST limits; read-only operations.</td></tr>
      <tr><td>Known-video metadata without a developer key</td><td>Cockroach Crawler</td><td><span class="status conditional">Partial</span></td><td>Public metadata and a restricted pinned no-key route; official search uses an API key.</td></tr>
      <tr><td>RSS/Atom and available YouTube captions</td><td>Maqam source adapters</td><td><span class="status conditional">Configured</span></td><td>The host supplies and governs the selected reader or executable.</td></tr>
      <tr><td>Natural-language browser actions</td><td>Maqam browser contract plus a host driver</td><td><span class="status conditional">Adapter-side</span></td><td>No browser engine or model provider is silently bundled.</td></tr>
      <tr><td>Exact approval and replay rejection</td><td>Maqam</td><td><span class="status shipped">Available</span></td><td>The real side effect must pass through the registered gateway.</td></tr>
      <tr><td>Durable compact project context</td><td>Qarinah</td><td><span class="status planned">Private alpha</span></td><td>Explicit workspace consent and machine-local trust are required.</td></tr>
      <tr><td>Cross-package workflow and evaluation</td><td>ProductLoop OS</td><td><span class="status shipped">Available</span></td><td>External browsers, models, secrets, identity, and durable services remain deployment choices.</td></tr>
    </tbody></table></div></section>
    <section class="section shell feature-stage"><figure><img src="/assets/provider-map.svg" width="720" height="560" alt="Provider inputs crossing explicit access checks before becoming normalized source records" /><figcaption>Reach enters the system as untrusted source data. It becomes useful only after policy, provenance, and retrieval boundaries remain visible.</figcaption></figure><div><p class="eyebrow">Original composition</p><h2>Learn from strong tools without cloning their product.</h2><p>Broad capability installers demonstrate the value of one command and a useful doctor. In-page agents demonstrate low-friction browser control. Knowledge graphs demonstrate compact retrieval across project relationships. This stack keeps a different center: governed execution and evidence-linked context across replaceable adapters.</p><ul class="check-list"><li>No imported upstream branding or silent dependency</li><li>No claim that free access is unlimited or provider-approved</li><li>No browser-cookie extraction or login reuse</li><li>No claim that an in-process policy is an operating-system sandbox</li></ul></div></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Try the public layers</p><h2>Check capability, then prove exact approval.</h2><p>The commands are independent on purpose. The first reports source access. The second proves the governance boundary. ProductLoop can compose both, while Qarinah remains a private alpha until its launch gates are complete.</p></div>${codeBlock("stack-public-proof", "public proof", "npx -y --package cockroach-crawler@0.3.0 cockroach-sources doctor\nnpx -y --package cockroach-crawler@0.3.0 cockroach-reach doctor\nnpx -y maqam@0.3.2 demo approval")}</section>
    <section class="section shell faq-section"><div><p class="eyebrow">Boundaries</p><h2>What one install cannot promise.</h2></div><div class="faq-list"><details><summary>Does the stack include a model or paid API?</summary><p>No. Model providers are deployment choices. Public web, GitHub, and selected optional routes may work without a developer key; every provider keeps its own authentication, login, terms, and availability constraints.</p></details><details><summary>Does Maqam automatically control every browser or shell?</summary><p>No. Only registered operations routed through the gateway are governed. Direct shell, browser, SDK, or provider calls bypass that boundary.</p></details><details><summary>Is Qarinah publicly installable?</summary><p>Not yet. It is a private Apache-2.0 alpha with explicit launch gates. The public stack must not advertise an install until those gates are complete.</p></details></div></section>`;
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
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Recommended sequence</p><h2>One verified release. Several useful explanations.</h2></div><p>Do not post the same announcement everywhere. Lead with a runnable technical proof, adapt the framing to the channel, and answer questions with source links.</p></div><ol class="process-grid"><li><span>01</span><h3>Verify the artifact</h3><p>Run the release gate against the exact commit and confirm the registry version before making a launch claim.</p></li><li><span>02</span><h3>Lock the claims</h3><p>Use the positioning and claims checklist to separate stable, optional, and planned capabilities.</p></li><li><span>03</span><h3>Choose one channel</h3><p>Start with Show HN or a technical article, then adapt the proof for communities where it is genuinely useful.</p></li><li><span>04</span><h3>Learn in public</h3><p>Collect reproducible feedback as focused issues. Update docs before repeating a confusing claim.</p></li></ol></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Copy and campaign material</p><h2>Every launch surface has a committed source.</h2></div><p>The repository keeps drafts reviewable. Publishing remains a deliberate maintainer action; these links do not auto-post.</p></div><div class="fit-grid"><article class="fit-yes"><span>Lead launch</span><h3>Show HN and Product Hunt</h3><p>Use the runnable CLI proof, honest boundaries, and a short founder explanation.</p><a class="text-link" href="${repository}/blob/main/docs/launch/SHOW-HN.md">Show HN draft →</a><br /><a class="text-link" href="${repository}/blob/main/docs/launch/PRODUCT-HUNT.md">Product Hunt kit →</a></article><article class="fit-yes"><span>Deep explanation</span><h3>Technical article</h3><p>Explain the network boundary, normalized records, and evidence path with commands readers can reproduce.</p><a class="text-link" href="${repository}/blob/main/docs/launch/TECHNICAL-ARTICLE.md">Full article →</a><br /><a class="text-link" href="${repository}/blob/main/docs/launch/ARTICLE-ADAPTATIONS.md">Channel adaptations →</a></article><article class="fit-yes"><span>Community distribution</span><h3>Social, video, and communities</h3><p>Choose the smallest useful demo for each audience and avoid generic cross-posting.</p><a class="text-link" href="${repository}/blob/main/docs/launch/COMMUNITIES.md">Community guide →</a><br /><a class="text-link" href="${repository}/blob/main/docs/launch/SOCIAL-AND-VIDEO.md">Social and video plan →</a></article></div></section>
    <section class="section shell"><div class="table-wrap" tabindex="0" role="region" aria-label="Launch assets and locations table"><table><thead><tr><th>Need</th><th>Committed source</th><th>Use</th></tr></thead><tbody><tr><td>Positioning and USP</td><td><a href="${repository}/blob/main/docs/launch/POSITIONING.md">POSITIONING.md</a></td><td>Homepage, release notes, pitches</td></tr><tr><td>Claim verification</td><td><a href="${repository}/blob/main/docs/launch/CLAIMS-CHECKLIST.md">CLAIMS-CHECKLIST.md</a></td><td>Final pre-publish review</td></tr><tr><td>Platform-sized artwork</td><td><a href="${repository}/tree/main/media/launch-assets">media/launch-assets</a></td><td>Social, articles, Product Hunt, YouTube</td></tr><tr><td>Captioned demos</td><td><a href="/media/">Media library</a></td><td>Overview, focused cuts, vertical short</td></tr><tr><td>Editable video source</td><td><a href="${repository}/tree/main/media/remotion">media/remotion</a></td><td>Re-render verified product demos</td></tr><tr><td>Channel and size map</td><td><a href="${repository}/blob/main/docs/launch/MEDIA-MATRIX.md">MEDIA-MATRIX.md</a></td><td>Select assets without stretching them</td></tr></tbody></table></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Product ideas worth proving</p><h2>Turn launch questions into narrow evidence work.</h2></div><p>These are development directions, not promises. Ship them only when code, fixtures, documentation, and release evidence agree.</p></div><div class="card-grid"><article><p class="eyebrow">Reach with visible authority</p><h2>Two explicit crawler tiers.</h2><ul class="check-list"><li>Hardened local runtime for model-selected public URLs</li><li>Restricted serverless runtime for deployment-owned origins</li><li>Capability doctor that names credential and availability state</li></ul></article><article><p class="eyebrow">Portable proof</p><h2>One normalized evidence contract.</h2><ul class="check-list"><li>Versioned source-record schema</li><li>Reusable third-party provider conformance harness</li><li>Offline official-API error fixtures</li><li>Independent serverless threat review</li></ul></article></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Open-source testing</p><h2>Take one boundary. Return one reproducible result.</h2></div><p>The current community task checks successful GitHub responses whose JSON is valid but whose shape is unusable. It needs no account, API key, or live request.</p></div><div class="fit-grid"><article class="fit-yes"><span>Open now</span><h3>Test payload-shape failures</h3><p>Prove that null or incompatible success payloads fail with a stable error while a real empty result stays valid.</p><a class="text-link" href="${contributorTestIssue}">Open testing issue #20 →</a></article><article class="fit-yes"><span>Contribution flow</span><h3>Fork, branch, prove, review</h3><p>Comment on the issue, work in a focused branch on your fork, run the release gate, and open a pull request. Maintainers review and merge.</p><a class="text-link" href="/community/">Read the four-step path →</a></article><article class="fit-yes"><span>More entry points</span><h3>Choose only work you can verify</h3><p>Browse the maintained testing and documentation tasks. Security-sensitive reports belong in a private advisory.</p><a class="text-link" href="${goodFirstIssues}">Browse good first issues →</a><br /><a class="text-link" href="${helpWantedIssues}">Browse help wanted →</a></article></div></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Before publishing</p><h2>Re-run the proof from the release commit.</h2><p>The benchmark, screenshots, videos, package archive, and public copy should all identify the exact behavior they demonstrate.</p></div>${codeBlock("launch-check", "terminal", "npm ci --ignore-scripts\nnpm run release:check\n\n# Review docs/launch/CLAIMS-CHECKLIST.md")}</section>`;
}

function roadmapPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Public roadmap</p><h1>Expand reach without hiding authority.</h1><p class="lede">Roadmap items become release claims only after code, tests, documentation, and reproducible evidence land together.</p><div class="page-actions"><a class="button primary" href="${contributorTestIssue}">Test one contract</a><a class="button secondary" href="${repository}/issues">Browse open issues</a></div></section>
    <section class="section shell roadmap-list">
      <article><div><span class="status shipped">Released · 0.3.0</span><h2>Hardened Node crawler</h2></div><ul><li>Public-network defaults and DNS pinning</li><li>Robots, sitemap, redirect, resource, and origin policy</li><li>CLI, JavaScript API, and strict agent adapter</li><li>Optional bounded Chromium rendering</li></ul></article>
      <article><div><span class="status shipped">Released · 0.3.0</span><h2>Provider and reach routing</h2></div><ul><li>Web, GitHub, YouTube, X, Reddit, Facebook, Instagram, LinkedIn, and Xiaohongshu doctor states</li><li>Public GitHub REST and restricted no-key YouTube reads</li><li>Official credentials or explicit operator-controlled read-only sessions</li><li>Ordered fallback with exact error-code boundaries and normalized provenance</li></ul></article>
      <article><div><span class="status shipped">Released · 0.3.0</span><h2>Governed browser-host contract</h2></div><ul><li>Observe, preview, apply, and submit phases for Maqam integration</li><li>Opaque element IDs, monotonic revisions, and stale-target rejection</li><li>Post-approval value resolution and operation deduplication</li><li>Structural host only; production runtime and isolation remain host responsibilities</li></ul></article>
      <article><div><span class="status shipped">Released · 0.3.0</span><h2>Fetch-only serverless profile</h2></div><ul><li>Self-hosted Cloudflare Worker entry point</li><li>Bearer authentication, deployment rate limit, and operator-owned HTTPS origin allowlist</li><li>Exact runtime disclosure: no DNS resolution/pinning, browser, social providers, or request-selected arbitrary origins</li><li>Separate <code>cockroach-crawler/serverless</code> contract</li></ul></article>
      <article><div><span class="status planned">Next evidence</span><h2>Broader coverage and independent use</h2></div><ul><li>Collect reproducible external installation reports</li><li>Verify npm registry provenance and clean packed consumers</li><li>Add transcript support only through a reviewed provider contract</li><li>Use benchmark distributions and raw evidence, not a single headline number</li></ul></article>
    </section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Community checkpoint</p><h2>Independent reproduction is roadmap evidence.</h2></div><p>Issue #20 is a credential-free starting point. A useful result records the commit, Node version, commands, and deterministic fixture; a green check without that context is not enough.</p></div><div class="page-actions"><a class="button primary" href="${contributorTestIssue}">Review issue #20</a><a class="button secondary" href="${repository}/blob/main/CONTRIBUTING.md">Read CONTRIBUTING.md</a></div></section>
    <section class="section shell proof-section"><div><p class="eyebrow">A useful issue</p><h2>Name one capability and one boundary.</h2><p>Prefer a deterministic fixture and an acceptance checklist over a broad “support everything” request. Do not add partnership, certification, or universal-coverage claims.</p></div>${codeBlock("issue-template", "issue outline", "Context\nOne current limitation and who it blocks.\n\nScope\nOne provider contract or crawler behavior.\n\nAcceptance\n- allow case dispatches once\n- deny case dispatches zero times\n- no live account or side effect\n- limits remain documented")}</section>`;
}

function communityPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Community</p><h1>Small, reviewable changes build durable reach.</h1><p class="lede">Start with a fixture, a missing explanation, or a single adapter boundary. Maintainers review and merge; contributors work through branches and pull requests.</p><div class="page-actions"><a class="button primary" href="${contributorTestIssue}">Take the testing issue</a><a class="button secondary" href="${repository}/fork">Fork the repository</a></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Contribution path</p><h2>From idea to verified pull request.</h2></div><p>No external contributor can directly merge into the maintainer's protected branch without repository permission and review.</p></div><ol class="process-grid"><li><span>01</span><h3>Choose scope</h3><p>Comment on an issue or open one with a narrow acceptance checklist.</p></li><li><span>02</span><h3>Fork and branch</h3><p>Make the smallest change that proves the requested behavior.</p></li><li><span>03</span><h3>Run gates</h3><p>Tests, types, browser checks where relevant, license audit, and package dry-run.</p></li><li><span>04</span><h3>Open a PR</h3><p>Include evidence, limitations, provenance, and docs in the same review.</p></li></ol></section>
    <section class="section shell card-grid"><article><p class="eyebrow">Open testing task</p><h2>Validate successful payload shapes.</h2><p>Issue #20 uses synthetic GitHub responses only. It separates a legitimate empty search from null or incompatible response shapes.</p><a class="text-link" href="${contributorTestIssue}">Read the acceptance criteria →</a></article><article><p class="eyebrow">Good first contributions</p><h2>Improve the proof surface.</h2><ul class="check-list"><li>Offline integration fixture</li><li>Clear error-message test</li><li>Copy-paste example from a packed consumer</li><li>Benchmark metadata or raw output</li></ul><a class="text-link" href="${goodFirstIssues}">See maintained tasks →</a></article><article><p class="eyebrow">Security findings</p><h2>Use a private advisory.</h2><p>Never post tokens, cookies, private content, or metadata responses in an issue.</p><a class="text-link" href="${repository}/security/advisories/new">Open a private report →</a></article></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Local checks</p><h2>Leave the repository easier to trust.</h2><p>Run the full release gate for changes that affect transport, browser behavior, packaging, or public types.</p></div>${codeBlock("contributor-check", "terminal", "npm ci --ignore-scripts\nnpm run release:check")}</section>`;
}

function releasePage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Release · 0.3.0 · 21 July 2026</p><h1>The governed reading and browser-host release.</h1><p class="lede">Version 0.3.0 combines the hardened crawler with provider routing, explicit reach diagnostics, a Maqam-compatible browser-host contract, and a separate restricted serverless profile.</p><div class="page-actions"><a class="button primary" href="${npmPackage}">Install from npm</a><a class="button secondary" href="${repository}/releases">GitHub releases</a></div></section>
    <section class="release-banner"><div class="shell"><span>Install</span><code>npm install cockroach-crawler@0.3.0</code><button type="button" class="copy-button" data-copy-value="npm install cockroach-crawler@0.3.0" aria-describedby="release-copy-status">Copy</button><span class="sr-only" id="release-copy-status" aria-live="polite"></span></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">What changed</p><h2>One bounded contract from provider selection to output.</h2></div><p>See the repository changelog for the exhaustive list.</p></div><div class="fit-grid"><article class="fit-yes"><span>Added</span><h3>Provider and reach routing</h3><p>Capability-aware GitHub, YouTube, X, Reddit, and optional session-backed read routes with normalized provenance.</p></article><article class="fit-yes"><span>Added</span><h3>Governed browser host</h3><p>Observe, preview, apply, and submit phases with opaque targets, revisions, stale-target rejection, and operation deduplication.</p></article><article class="fit-yes"><span>Added</span><h3>Restricted serverless profile</h3><p>A token-authenticated, rate-limited Worker contract for deployment-owned HTTPS origins with its DNS limitation stated explicitly.</p></article></div></section>
    <section class="section shell"><div class="table-wrap" tabindex="0" role="region" aria-label="Release facts table"><table><thead><tr><th>Release fact</th><th>0.3.0</th></tr></thead><tbody><tr><td>Runtime status</td><td>Stable on maintained Node.js 22, 24, and 26</td></tr><tr><td>Package license</td><td>MIT</td></tr><tr><td>Optional browser peer</td><td>Playwright ≥ 1.48.0 and &lt; 2</td></tr><tr><td>Published package</td><td><a href="${npmPackage}">npmjs.com/package/cockroach-crawler</a></td></tr><tr><td>Source and issues</td><td><a href="${repository}">github.com/AjnasNB/cockroach-crawler</a></td></tr></tbody></table></div></section>
    <section class="section shell candidate-release"><div><p class="eyebrow">npm stable</p><h2>0.3.0 expands the governed reading layer.</h2><p>The npm <code>latest</code> release includes ordered source routing, optional read-only reach providers, <code>cockroach-sources</code> and <code>cockroach-reach</code> doctor CLIs, a governed browser-host contract, and the separate fetch-only Cloudflare Worker profile. Trusted-publishing provenance and post-publish consumer checks remain part of the release proof.</p></div><div class="candidate-facts"><div><span>GitHub</span><strong>Public REST ready</strong></div><div><span>YouTube</span><strong>Restricted no-key route</strong></div><div><span>Social</span><strong>Official API or explicit read-only session</strong></div><div><span>Browser</span><strong>Maqam-compatible structural host</strong></div></div></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Release gate</p><h2>Verify source, browser, audit, and tarball.</h2><p>The package's <code>prepublishOnly</code> script runs the same release check. Publishing remains a maintainer action.</p></div>${codeBlock("release-check", "terminal", "npm ci --ignore-scripts\nnpm run release:check")}</section>
    <section class="section shell card-grid"><article><p class="eyebrow">Upgrade note</p><h2>Review stricter failures.</h2><p>Cross-origin crawling now requires explicit allowed origins. Numeric strings and booleans are rejected instead of coerced. Robots and sensitive-path failures close earlier.</p></article><article><p class="eyebrow">Package provenance</p><h2>Inspect, do not infer.</h2><p>Review the npm package, committed workflow, lockfile, dependency-license snapshot, and packed tarball. This site does not claim certification.</p></article></section>`;
}

const notFound = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — Cockroach Crawler</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/styles.css?v=${assetVersion}"></head><body><main id="main" tabindex="-1"><section class="page-hero shell not-found"><p class="eyebrow">404</p><h1>This route is outside the crawl map.</h1><p class="lede">The page may have moved. Return to the documentation or inspect the project source.</p><div class="page-actions"><a class="button primary" href="/">Go home</a><a class="button secondary" href="/docs/">Read the docs</a></div></section></main></body></html>`;

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
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url><loc>${siteUrl}${page.slug ? `/${page.slug}/` : "/"}</loc><lastmod>2026-07-23</lastmod></url>`).join("\n")}\n</urlset>\n`,
  "utf8"
);
await writeFile(join(dist, "site.webmanifest"), JSON.stringify({ name: "Cockroach Crawler", short_name: "Crawler", start_url: "/", display: "standalone", background_color: "#07100e", theme_color: "#07100e", icons: [{ src: "/assets/mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] }, null, 2), "utf8");
await writeFile(join(dist, "_headers"), `/*\n  Cache-Control: public, max-age=300, no-transform\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n\n/assets/*\n  Cache-Control: public, max-age=300, must-revalidate, no-transform\n\n/media/*\n  Cache-Control: public, max-age=3600, must-revalidate, no-transform\n`, "utf8");
await writeFile(join(dist, "_redirects"), `/docs /docs/ 301\n/docs/cli /docs/cli/ 301\n/docs/javascript /docs/javascript/ 301\n/docs/map-and-extract /docs/map-and-extract/ 301\n/docs/agents /docs/agents/ 301\n/docs/providers /docs/providers/ 301\n/docs/serverless /docs/serverless/ 301\n/security /security/ 301\n/providers /providers/ 301\n/compare /compare/ 301\n/benchmark /benchmark/ 301\n/media /media/ 301\n/launch /launch/ 301\n/roadmap /roadmap/ 301\n/community /community/ 301\n/release /release/ 301\n`, "utf8");
await writeFile(join(dist, "llms.txt"), `# Cockroach Crawler\n\nCockroach Crawler is an open-source AI web crawler for agents, RAG pipelines, documentation indexing, research, content inventory, and QA. It crawls permitted public sites and emits LLM-ready Markdown, JSON, or JSONL with canonical URLs, redirect history, content hashes, retrieval metadata, failures, warnings, and provenance.\n\nnpm stable 0.3.0 is a local Node.js crawler for public or explicitly trusted HTTP(S) pages. It enforces robots, explicit origin policy, public-network defaults, DNS-pinned requests, validated redirects, and resource budgets. It outputs readable text, Markdown, links, hashes, metadata, failures, and crawl stats.\n\nStable 0.3.0 includes a tested provider registry, ordered source routing, optional read-only reach providers, a Maqam-compatible browser-host contract, and a separate serverless profile. Public GitHub REST works with an optional token. The pinned yt-dlp route supports no-key YouTube reads without loading configuration, plugins, cookies, watched state, or media downloads. Optional OpenCLI session providers expose fixed read-only routes for X, Reddit, Facebook, Instagram, LinkedIn, and Xiaohongshu and never expose social writes or browser-cookie extraction. The serverless tier is self-hosted, token-authenticated, rate-limited, and restricted to deployment-configured HTTPS origins. It does not resolve, classify, or pin DNS answers. Browser runtimes remain separately isolated host responsibilities.\n\nThe current source build adds compact fetch-validated mapping and bounded deterministic CSS extraction. These are not stable npm claims until a release containing the exact commit is published.\n\nCockroach Crawler is strongest when an AI agent needs a local, inspectable network boundary and evidence-linked output. Firecrawl remains broader for managed web-data APIs, hosted search, proxies, asynchronous jobs, and managed scale. Crawl4AI remains broader for adaptive crawling, browser sessions, caching, document processing, extraction strategies, and Python workflows. The dated comparison links the public sources behind those statements.\n\n- Documentation overview: ${siteUrl}/docs/\n- AI crawler comparison: ${siteUrl}/compare/\n- CLI guide: ${siteUrl}/docs/cli/\n- JavaScript guide: ${siteUrl}/docs/javascript/\n- Map and extraction guide: ${siteUrl}/docs/map-and-extract/\n- Agent and Maqam guide: ${siteUrl}/docs/agents/\n- Provider guide: ${siteUrl}/docs/providers/\n- Serverless guide: ${siteUrl}/docs/serverless/\n- Security: ${siteUrl}/security/\n- Provider status: ${siteUrl}/providers/\n- Benchmark method and clean CI result: ${siteUrl}/benchmark/\n- Launch kit, campaign assets, and product directions: ${siteUrl}/launch/\n- Maqam governance documentation: ${maqamDocs}\n- Source: ${repository}\n- npm: ${npmPackage}\n`, "utf8");
console.log(`Built ${pages.length} pages in ${dist}`);
