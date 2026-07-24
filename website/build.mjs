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
const stableVersion = "0.4.2";
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
          softwareVersion: stableVersion,
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
            faqSchema("Does it provide GitHub, YouTube, X, or Reddit access?", "The stable 0.4.2 package includes public GitHub REST, official provider adapters, a pinned no-key YouTube route, optional read-only X and Reddit session routes, ordered provider fallback, and explicit doctor output. It does not extract cookies or expose social write operations.")
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
    slug: "docs/crawling",
    active: "Docs",
    title: "Deep crawling, strategies, and cache — Cockroach Crawler",
    description: "Configure simple, BFS, DFS, best-first, and adaptive crawls with sitemaps, filters, cache, callbacks, deadlines, and exact resource budgets.",
    body: crawlingDocsPage()
  },
  {
    slug: "docs/browser",
    active: "Docs",
    title: "Browser rendering and evidence — Cockroach Crawler",
    description: "Render JavaScript, wait, click, scroll, flatten open Shadow DOM and readable iframes, capture screenshots and PDFs, and use explicit profiles.",
    body: browserDocsPage()
  },
  {
    slug: "docs/extraction",
    active: "Docs",
    title: "Markdown, CSS, XPath, PDF, and LLM extraction — Cockroach Crawler",
    description: "Turn pages and local PDFs into bounded Markdown and structured records with CSS, XPath, or a host-supplied JSON-Schema-validated model adapter.",
    body: extractionDocsPage()
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
    slug: "docs/mcp",
    active: "Docs",
    title: "Native MCP server — Cockroach Crawler",
    description: "Connect Cockroach Crawler to Codex, Claude Code, and other MCP clients over stdio with deployment-owned origins and crawl ceilings.",
    body: mcpDocsPage()
  },
  {
    slug: "docs/docker",
    active: "Docs",
    title: "Docker API, dashboard, and playground — Cockroach Crawler",
    description: "Run Cockroach Crawler as a token-authenticated local or container API with health checks, crawl and extraction endpoints, a dashboard, and playground.",
    body: dockerDocsPage()
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
    slug: "docs/reference",
    active: "Docs",
    title: "JavaScript and CLI reference — Cockroach Crawler",
    description: "Reference every stable package export, crawl option, page field, statistic, command, subpath, agent surface, and deployment entry point.",
    body: apiReferenceDocsPage()
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
    title: "Release 0.4.2 — Cockroach Crawler",
    description: "Cockroach Crawler 0.4.2 release notes, verification commands, deep-crawl features, browser artifacts, MCP, Docker, and upgrade guidance.",
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
        datePublished: "2026-07-24",
        dateModified: "2026-07-24",
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
      <div class="shell legal"><span>MIT · npm stable 0.4.2 · Node.js 22 / 24 / 26</span><span>Site content last reviewed 24 July 2026</span></div>
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
        <ul class="signal-list" aria-label="Release facts"><li>npm stable 0.4.2</li><li>Node.js 22 / 24 / 26</li><li>MIT</li><li>No signup</li></ul>
        <div class="candidate-note"><span>Stable release</span><p><strong>0.4.2</strong> combines deep relevance crawling, browser evidence, PDF workflows, deterministic and model-assisted extraction, native MCP, Docker, provider routing, and a restricted serverless profile under npm <code>latest</code>.</p></div>
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
        ${codeBlock("home-doctor", "capability check", "npx -y --package cockroach-crawler@0.4.2 cockroach-sources doctor\nnpx -y --package cockroach-crawler@0.4.2 cockroach-reach doctor")}
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
      <details><summary>Can it read GitHub, YouTube, X, or Reddit?</summary><p>The stable 0.4.2 package includes public GitHub REST, official provider adapters, a restricted no-key YouTube route, and optional read-only X and Reddit session providers. Session providers require explicit local installation and never expose posting, liking, following, messaging, deleting, cookie extraction, or profile-file import.</p></details>
      <details><summary>Can I run it in a serverless edge function?</summary><p>The stable 0.4.2 package includes a self-hosted, token-authenticated, rate-limited Cloudflare Worker profile for deployment-configured HTTPS origins. It is bounded, but it does not resolve, classify, or pin DNS answers; an allowlisted hostname can resolve internally. Use operator-owned or independently trusted hostnames plus infrastructure egress policy.</p></details>
    </div></section>`;
}

function docsTopicNav() {
  const topics = [
    ["Start crawling", "Install the CLI or ESM package, crawl one site, and receive clean Markdown, JSON, JSONL, links, hashes, and crawl statistics.", "#quickstart", "Run the two-minute quickstart"],
    ["Deep crawl intelligently", "Choose BFS, DFS, best-first, or adaptive relevance traversal for documentation, research, support, and migration discovery.", "/docs/crawling/", "Open the crawling manual"],
    ["Render the real page", "Use Chromium, clicks, waits, virtual scroll, open Shadow DOM, readable iframes, screenshots, PDFs, and dedicated profiles.", "/docs/browser/", "Open the browser manual"],
    ["Extract exact data", "Select fields with CSS or XPath, parse local PDFs, or connect a host-supplied model adapter with mandatory JSON Schema validation.", "/docs/extraction/", "Open the extraction manual"],
    ["Connect any agent", "Use the strict agent tool, native MCP stdio server, authenticated Docker API, Node.js API, or optional Maqam boundary.", "/docs/mcp/", "Open the MCP manual"],
    ["Reach public sources", "Route public web, GitHub, YouTube, X, Reddit, RSS, and optional read-only session providers through explicit capability checks.", "/docs/providers/", "Open provider guide"],
    ["Explore every feature", "Search the complete 40-plus feature index, then open the typed package, option, output, command, and deployment reference.", "/docs/reference/", "Open the complete reference"],
    ["Deploy with confidence", "Run locally, in CI, in Docker, or through the fixed-origin Cloudflare Worker profile with reproducible release checks.", "/docs/docker/", "Open deployment paths"]
  ];
  return `<section class="docs-directory shell" aria-labelledby="docs-directory-title">
    <div class="docs-directory-head"><p class="eyebrow">Documentation map</p><h2 id="docs-directory-title">From one URL to agent-ready evidence.</h2><p>Start with a workflow, then use the searchable API index for every crawler, browser, extraction, provider, agent, and deployment surface.</p></div>
    <nav class="doc-route-grid" aria-label="Documentation tasks">${topics.map(([title, text, href, action]) => `<a href="${href}"><strong>${title}</strong><span>${text}</span><em>${action} →</em></a>`).join("")}</nav>
  </section>`;
}

function focusedDocsPage(eyebrow, title, lede, content) {
  const currentPath = {
    "Documentation · CLI": "/docs/cli/",
    "Documentation · JavaScript": "/docs/javascript/",
    "Documentation · Stable 0.4.2": "/docs/map-and-extract/",
    "Documentation · Agents": "/docs/agents/",
    "Documentation · Providers": "/docs/providers/",
    "Documentation · Serverless": "/docs/serverless/"
  }[eyebrow] ?? "";
  return `
    <section class="page-hero shell"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lede">${lede}</p><div class="page-actions"><a class="button secondary" href="/docs/">All documentation</a><a class="button secondary" href="${repository}">Source on GitHub</a></div></section>
    <details class="docs-mobile-directory shell"><summary>Documentation menu</summary>${docsSidebar(currentPath)}</details>
    <div class="docs-manual-layout docs-focused-layout shell">
      <aside class="docs-sidebar">${docsSidebar(currentPath)}</aside>
      <article class="docs-article docs-manual-content">${content}</article>
      <aside class="docs-related"><h2>Go deeper</h2><a href="/docs/crawling/">Crawling and cache</a><a href="/docs/browser/">Browser rendering</a><a href="/docs/extraction/">Extraction and PDF</a><a href="/docs/mcp/">Native MCP</a><a href="/docs/reference/">Complete reference</a></aside>
    </div>`;
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
    "Documentation · Stable 0.4.2",
    "Map a site or select exact fields without an extraction service.",
    "Stable 0.4.2 includes compact fetch-validated maps and deterministic CSS extraction alongside XPath, PDF, browser, cache, and deep-crawl modules.",
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
    `<section><p class="eyebrow">01 · Doctor</p><h2>Inspect the current runtime.</h2>${codeBlock("provider-doctor-guide", "npm stable", "npx -y --package cockroach-crawler@0.4.2 cockroach-sources doctor --json\nnpx -y --package cockroach-crawler@0.4.2 cockroach-reach doctor --json")}</section>
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

function docsNavigationGroups() {
  return [
    ["Start", [
      ["/docs/", "Overview"],
      ["/docs/cli/", "CLI"],
      ["/docs/javascript/", "JavaScript API"]
    ]],
    ["Crawl and extract", [
      ["/docs/crawling/", "Crawling and cache"],
      ["/docs/browser/", "Browser rendering"],
      ["/docs/extraction/", "Extraction and PDF"],
      ["/docs/map-and-extract/", "Map and CSS fields"]
    ]],
    ["Agents and sources", [
      ["/docs/agents/", "Agent tool and Maqam"],
      ["/docs/mcp/", "Native MCP"],
      ["/docs/providers/", "Providers and no-key routes"]
    ]],
    ["Deploy and reference", [
      ["/docs/docker/", "Docker API and playground"],
      ["/docs/serverless/", "Cloudflare Worker"],
      ["/docs/reference/", "Complete reference"],
      ["/security/", "Security model"]
    ]]
  ];
}

function docsSidebar(currentPath) {
  return `<nav class="docs-sidebar-nav" aria-label="Documentation sections">
    <a class="docs-sidebar-home" href="/docs/">Cockroach Crawler ${stableVersion}</a>
    ${docsNavigationGroups().map(([group, links]) => `<section><h2>${group}</h2>${links.map(([href, label]) => `<a href="${href}"${href === currentPath ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</section>`).join("")}
  </nav>`;
}

function docsManualPage({ currentPath, eyebrow, title, lede, toc, content }) {
  const tocLinks = toc.map(([id, label]) => `<a href="#${id}">${label}</a>`).join("");
  return `
    <section class="page-hero shell docs-manual-hero"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lede">${lede}</p><div class="page-actions"><a class="button primary" href="#${toc[0][0]}">Start here</a><a class="button secondary" href="/docs/reference/">Open the reference</a></div></section>
    <details class="docs-mobile-directory shell"><summary>Documentation menu</summary>${docsSidebar(currentPath)}</details>
    <details class="mobile-toc shell"><summary>On this page</summary><nav aria-label="On this page">${tocLinks}</nav></details>
    <div class="docs-manual-layout shell">
      <aside class="docs-sidebar">${docsSidebar(currentPath)}</aside>
      <article class="docs-manual-content">${content}</article>
      <aside class="toc docs-manual-toc"><nav aria-label="On this page"><h2>On this page</h2>${tocLinks}</nav></aside>
    </div>`;
}

function crawlingDocsPage() {
  return docsManualPage({
    currentPath: "/docs/crawling/",
    eyebrow: "Core manual · crawling",
    title: "Spend every request on the pages that matter.",
    lede: "Run a simple crawl, cover a hierarchy with BFS or DFS, rank admitted URLs with best-first or adaptive relevance, and reuse results through a bounded persistent cache.",
    toc: [
      ["simple-crawl", "Simple crawl"],
      ["strategies", "Traversal strategies"],
      ["discovery", "Discovery and filters"],
      ["budgets", "Budgets and callbacks"],
      ["cache", "Persistent cache"],
      ["map-results", "Map and results"]
    ],
    content: `
      <section id="simple-crawl"><p class="eyebrow">01 · Simple crawl</p><h2>Start with one explicit URL and a complete job result.</h2><p><code>crawlDetailed</code> returns pages, structured failures, and aggregate statistics. Public-network admission, same-origin traversal, robots checks, sensitive-path filtering, redirect validation, and finite budgets are enabled by default.</p>${codeBlock("manual-simple-crawl", "simple-crawl.mjs", `import { crawlDetailed } from "cockroach-crawler";

const result = await crawlDetailed({
  seeds: ["https://docs.example.com/start"],
  allowedOrigins: ["https://docs.example.com"],
  maxPages: 25,
  maxRequests: 120,
  maxDepth: 2,
  maxTotalBytes: 10_000_000,
  maxDurationMs: 60_000
});

console.log(result.pages);
console.log(result.failures);
console.log(result.stats);`, "javascript")}</section>
      <section id="strategies"><p class="eyebrow">02 · Traversal strategies</p><h2>Choose coverage, depth, ranking, or live reprioritization.</h2><div class="reference-cards"><article><strong>BFS</strong><p>Visits admitted URLs level by level. Use it for broad documentation coverage.</p><code>traversal: "bfs"</code></article><article><strong>DFS</strong><p>Follows the newest admitted path first. Use it for narrow hierarchies.</p><code>traversal: "dfs"</code></article><article><strong>Best-first</strong><p>Scores queued URLs against a query before fetching them.</p><code>{ mode: "best-first", query }</code></article><article><strong>Adaptive</strong><p>Uses newly fetched page context to reprioritize the remaining admitted queue.</p><code>{ mode: "adaptive", query }</code></article></div>${codeBlock("manual-adaptive-crawl", "adaptive-crawl.mjs", `const result = await crawlDetailed({
  seeds: ["https://docs.example.com"],
  traversal: {
    mode: "adaptive",
    query: ["oauth", "migration", "breaking changes"],
    depthPenalty: 0.2,
    minimumScore: 0.05,
    maxScoreInputCharacters: 20_000
  },
  maxDepth: 5,
  maxPages: 80,
  maxRequests: 300
});`, "javascript")}<p>The scorer changes queue order only. It cannot add an origin, permit a private address, increase a budget, ignore robots, or admit a filtered URL.</p></section>
      <section id="discovery"><p class="eyebrow">03 · Discovery</p><h2>Combine links, sitemaps, origins, and path filters.</h2>${codeBlock("manual-discovery", "discovery.mjs", `const result = await crawlDetailed({
  seeds: ["https://example.com/docs"],
  sameOrigin: false,
  allowedOrigins: [
    "https://example.com",
    "https://docs.example.com"
  ],
  includeSitemaps: true,
  maxSitemaps: 20,
  maxUrlsPerSitemap: 5_000,
  include: [/\\/docs\\//, /\\/guides\\//],
  exclude: [/\\/archive\\//, /\\?preview=/],
  maxLinksPerPage: 500,
  maxQueue: 10_000
});`, "javascript")}<p>Sitemap URLs pass through the same normalization, origin, public-network, filter, queue, and page limits as HTML links. Cross-origin traversal requires both <code>sameOrigin: false</code> and an explicit <code>allowedOrigins</code> entry.</p></section>
      <section id="budgets"><p class="eyebrow">04 · Control</p><h2>Bound work, stream progress, and cancel the whole job.</h2>${codeBlock("manual-budgets", "controlled-crawl.mjs", `const controller = new AbortController();

const result = await crawlDetailed({
  seeds: ["https://example.com"],
  maxPages: 100,
  maxSeeds: 10,
  maxRequests: 500,
  maxQueue: 20_000,
  maxDepth: 4,
  concurrency: 6,
  delayMs: 200,
  timeoutMs: 15_000,
  maxDurationMs: 120_000,
  maxBytes: 3_145_728,
  maxTotalBytes: 50_000_000,
  maxRedirects: 5,
  maxRetries: 2,
  retryDelayMs: 400,
  signal: controller.signal,
  onPage: (page) => console.log("page", page.url),
  onError: (failure) => console.error(failure.code, failure.url)
});`, "javascript")}<p>Callbacks are awaited and bounded by the complete job deadline. A callback failure becomes a structured failure instead of silently discarding the rest of the crawl.</p></section>
      <section id="cache"><p class="eyebrow">05 · Cache</p><h2>Reuse only a policy-identical crawl.</h2>${codeBlock("manual-cache", "cached-crawl.mjs", `import { crawlDetailed } from "cockroach-crawler";
import {
  FileCrawlCache,
  createCachedCrawler
} from "cockroach-crawler/cache";

const cache = new FileCrawlCache({
  directory: ".cache/cockroach",
  namespace: "docs-v1",
  ttlMs: 6 * 60 * 60 * 1_000,
  maxEntries: 500,
  maxBytes: 250 * 1024 * 1024
});

const cachedCrawl = createCachedCrawler(cache, crawlDetailed);
const result = await cachedCrawl({
  seeds: ["https://docs.example.com"],
  allowedOrigins: ["https://docs.example.com"],
  maxPages: 50
});

console.log(result.cache);
await cache.prune();`, "javascript")}<p>The cache key includes the serialized input and namespace. Entries carry expiry and content digests; corrupt, expired, oversized, or policy-different entries are not treated as hits.</p></section>
      <section id="map-results"><p class="eyebrow">06 · Results</p><h2>Keep full evidence or emit a compact site map.</h2>${codeBlock("manual-map", "map.mjs", `import { mapSite } from "cockroach-crawler";

const map = await mapSite({
  seeds: ["https://docs.example.com"],
  traversal: "bfs",
  includeSitemaps: true,
  maxPages: 200
});

console.table(map.entries.map(({ url, title, depth, linkCount, contentHash }) => ({
  url, title, depth, linkCount, contentHash
})));`, "javascript")}<p>Every map entry is fetch-validated. Full page records additionally include readable text, Markdown, canonical URL, metadata, redirect history, parent URL, response headers, artifacts, warnings, and browser details when enabled.</p></section>`
  });
}

function browserDocsPage() {
  return docsManualPage({
    currentPath: "/docs/browser/",
    eyebrow: "Core manual · browser",
    title: "Render the page. Keep the evidence.",
    lede: "Use optional Playwright for JavaScript applications, explicit interaction, bounded virtual scroll, open Shadow DOM, readable same-origin frames, screenshots, PDFs, hooks, storage state, and dedicated profiles.",
    toc: [
      ["browser-install", "Install Chromium"],
      ["render", "Render and wait"],
      ["interact", "Click and scroll"],
      ["flatten", "Shadow DOM and iframes"],
      ["artifacts", "Screenshots and PDF"],
      ["sessions", "Hooks and profiles"],
      ["browser-boundary", "Network boundary"]
    ],
    content: `
      <section id="browser-install"><p class="eyebrow">01 · Install</p><h2>Add the optional browser peer.</h2>${codeBlock("manual-browser-install", "terminal", `npm install cockroach-crawler playwright
npx playwright install chromium`)}</section>
      <section id="render"><p class="eyebrow">02 · Render</p><h2>Wait for a page state or one selector.</h2>${codeBlock("manual-browser-render", "render.mjs", `import { crawl } from "cockroach-crawler";

const pages = await crawl({
  seeds: ["https://app.example.com/public-report"],
  allowedOrigins: ["https://app.example.com"],
  maxPages: 3,
  browser: {
    headless: true,
    waitUntil: "networkidle",
    waitFor: ".report-ready"
  }
});

console.log(pages[0].markdown);`, "javascript")}<p><code>waitUntil</code> accepts <code>load</code>, <code>domcontentloaded</code>, <code>networkidle</code>, or <code>commit</code>. <code>waitFor</code> accepts a selector or a bounded millisecond delay.</p></section>
      <section id="interact"><p class="eyebrow">03 · Interact</p><h2>Perform a fixed click sequence and bounded scroll.</h2>${codeBlock("manual-browser-interact", "interaction.mjs", `const pages = await crawl({
  seeds: ["https://app.example.com/catalog"],
  browser: {
    click: ["button.accept", "button.load-more"],
    scroll: {
      maxSteps: 20,
      stepPixels: 900,
      delayMs: 150,
      stableIterations: 3
    }
  }
});`, "javascript")}<p>Selectors and scrolling are operator configuration. The strict agent and MCP inputs do not accept hooks, profile paths, storage-state paths, executable paths, or arbitrary JavaScript.</p></section>
      <section id="flatten"><p class="eyebrow">04 · Flatten</p><h2>Make open components visible to extraction.</h2>${codeBlock("manual-browser-flatten", "flatten.mjs", `const pages = await crawl({
  seeds: ["https://components.example.com"],
  browser: {
    flattenShadowDom: true,
    flattenIframes: true
  }
});

console.log(pages[0].browserDetails.flattened);`, "javascript")}<p>Only open shadow roots and readable same-origin frames are cloned. Cross-origin frame isolation remains in place. Root, frame, and cloned-node ceilings prevent unbounded DOM expansion.</p></section>
      <section id="artifacts"><p class="eyebrow">05 · Evidence</p><h2>Capture a screenshot and a printable PDF.</h2>${codeBlock("manual-browser-artifacts", "artifacts.mjs", `const pages = await crawl({
  seeds: ["https://reports.example.com/quarterly"],
  browser: {
    artifactDirectory: ".cockroach-artifacts",
    maxArtifactBytes: 25 * 1024 * 1024,
    screenshot: {
      format: "png",
      fullPage: true
    },
    pdf: {
      format: "A4",
      landscape: false,
      printBackground: true,
      preferCSSPageSize: true
    }
  }
});

console.log(pages[0].artifacts);`, "javascript")}<p>Artifact records include path, media type, byte length, and SHA-256. The directory is explicit and the complete artifact set shares a hard byte ceiling.</p></section>
      <section id="sessions"><p class="eyebrow">06 · Authorized state</p><h2>Use reviewed hooks and dedicated state explicitly.</h2>${codeBlock("manual-browser-session", "authorized-session.mjs", `const reviewedHook = async ({ index }) => {
  document.documentElement.dataset.captureRun = String(index);
  return { marked: true };
};

const pages = await crawl({
  seeds: ["https://portal.example.com/reports"],
  browser: {
    allowPageJavaScript: true,
    hooks: [reviewedHook],
    storageState: ".auth/portal-state.json",
    saveStorageState: ".auth/portal-state.next.json",
    profileDirectory: ".profiles/portal-reader",
    allowPersistentProfile: true
  }
});`, "javascript")}<p>Hooks are trusted operator functions. Persistent profiles require both an explicit directory and <code>allowPersistentProfile: true</code>. Cockroach Crawler never searches the machine for a browser profile or imports cookie files automatically.</p></section>
      <section id="browser-boundary"><p class="eyebrow">07 · Boundary</p><h2>Browser mode keeps the crawler transport in front of page requests.</h2><p>HTTP(S) GET and HEAD requests pass through origin checks, DNS classification and pinning, robots, redirects, request limits, response-byte limits, and the complete deadline. State-changing methods, WebSockets, WebRTC, extension protocols, downloads, and unreviewed page hooks are denied.</p><div class="callout warning"><strong>Deployment isolation still matters</strong><p>The request boundary is not a Chromium process sandbox. Use a container, virtual machine, or comparable process boundary for hostile pages.</p></div><a class="text-link" href="/security/">Read the complete browser and network model →</a></section>`
  });
}

function extractionDocsPage() {
  return docsManualPage({
    currentPath: "/docs/extraction/",
    eyebrow: "Core manual · extraction",
    title: "From page bytes to model-ready records.",
    lede: "Receive readable text and Markdown automatically, select exact CSS or XPath fields locally, parse bounded PDFs, or connect your own model adapter behind JSON Schema validation.",
    toc: [
      ["markdown", "Text and Markdown"],
      ["css", "CSS extraction"],
      ["xpath", "XPath extraction"],
      ["llm", "LLM schema extraction"],
      ["pdf-parse", "PDF parsing"],
      ["provenance", "Output and provenance"]
    ],
    content: `
      <section id="markdown"><p class="eyebrow">01 · Built in</p><h2>Every page already includes cleaned text and Markdown.</h2>${codeBlock("manual-markdown", "page-record.mjs", `const { pages } = await crawlDetailed({
  seeds: ["https://example.com/guide"],
  maxPages: 1
});

const page = pages[0];
console.log(page.title);
console.log(page.text);
console.log(page.markdown);
console.log(page.links);`, "javascript")}<p>Scripts, styles, templates, hidden nodes, SVG, canvas, and embedded document elements are removed from the inactive extraction snapshot. Metadata, headings, canonical URL, language, and admitted links remain separate fields.</p></section>
      <section id="css"><p class="eyebrow">02 · Deterministic</p><h2>Select visible text, cleaned HTML, or attributes with CSS.</h2>${codeBlock("manual-css-extract", "css-extract.mjs", `import { extractStructured } from "cockroach-crawler";

const result = extractStructured(html, "https://shop.example.com/item/42", {
  fields: {
    name: "main h1",
    price: { selector: "[data-price]", source: "attribute", attribute: "data-price" },
    features: { selector: ".feature", multiple: true, limit: 20 },
    links: {
      selector: "main a",
      source: "attribute",
      attribute: "href",
      multiple: true,
      resolveUrl: true
    }
  },
  maxFields: 20,
  maxItemsPerField: 100,
  maxInputCharacters: 5_000_000,
  maxValueLength: 50_000,
  maxTotalValues: 1_000,
  maxTotalCharacters: 500_000
});

console.log(result.data, result.warnings);`, "javascript")}</section>
      <section id="xpath"><p class="eyebrow">03 · Deterministic</p><h2>Use bounded XPath for document-shaped selectors.</h2>${codeBlock("manual-xpath-extract", "xpath-extract.mjs", `import { extractWithXPath } from "cockroach-crawler/extractors";

const result = extractWithXPath(html, url, {
  fields: {
    title: "//main//h1",
    links: {
      xpath: "//main//a",
      source: "attribute",
      attribute: "href",
      multiple: true,
      resolveUrl: true
    }
  },
  maxFields: 20,
  maxItemsPerField: 100,
  maxInputCharacters: 5_000_000,
  maxTotalCharacters: 500_000
});`, "javascript")}<p>XPath runs against inactive markup. Unknown options, getters, setters, inherited values, invalid attributes, prototype-sensitive names, and outputs beyond the configured ceilings are rejected.</p></section>
      <section id="llm"><p class="eyebrow">04 · Optional model</p><h2>Bring the model client; keep validation in the host.</h2>${codeBlock("manual-llm-extract", "llm-extract.mjs", `import { extractWithLlm } from "cockroach-crawler/extractors";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["product", "price"],
  properties: {
    product: { type: "string" },
    price: { type: ["number", "null"] }
  }
};

const result = await extractWithLlm(page, {
  schema,
  instruction: "Extract the named product and numeric price.",
  maxInputCharacters: 40_000,
  maxOutputCharacters: 8_000,
  adapter: ({ content, schema, instruction }) =>
    yourModelClient.generateJson({ content, schema, instruction })
});

console.log(result.data, result.provenance);`, "javascript")}<p>No model SDK or key is bundled. The adapter receives bounded content, schema, and instruction. Output is accepted only after parsing and validation against the supplied schema.</p></section>
      <section id="pdf-parse"><p class="eyebrow">05 · Documents</p><h2>Parse explicit local PDF bytes without a hosted service.</h2>${codeBlock("manual-pdf-parse", "parse-pdf.mjs", `import { readFile } from "node:fs/promises";
import { parsePdf } from "cockroach-crawler/documents";

const pdf = await parsePdf(await readFile("report.pdf"), {
  maxBytes: 20 * 1024 * 1024,
  maxPages: 100,
  maxTextCharacters: 1_000_000
});

console.log(pdf.pageCount);
console.log(pdf.text);
console.log(pdf.metadata);
console.log(pdf.contentHash, pdf.warnings);`, "javascript")}<p>The parser verifies the PDF signature, applies byte, page, and text ceilings, and returns normalized metadata, truncation state, warnings, and a SHA-256 hash.</p></section>
      <section id="provenance"><p class="eyebrow">06 · Output</p><h2>Index content without losing the source record.</h2><p>Keep canonical URL, fetched time, response status, content type, byte size, ETag, Last-Modified, redirect chain, robots decision, parent URL, depth, content hash, extraction warnings, failures, and crawl statistics alongside derived chunks. Treat web text as untrusted data—not as agent instructions.</p><a class="text-link" href="/docs/reference/#page-record">Open the complete page-record reference →</a></section>`
  });
}

function mcpDocsPage() {
  return docsManualPage({
    currentPath: "/docs/mcp/",
    eyebrow: "Integration manual · MCP",
    title: "Connect the crawler to any MCP client.",
    lede: "Run a native stdio server for Codex, Claude Code, desktop clients, or your own MCP host. The process refuses to start until the deployment supplies at least one allowed origin.",
    toc: [
      ["mcp-install", "Install"],
      ["mcp-run", "Run over stdio"],
      ["mcp-config", "Client configuration"],
      ["mcp-tools", "Tools and resource"],
      ["mcp-authority", "Authority model"],
      ["mcp-programmatic", "Programmatic server"]
    ],
    content: `
      <section id="mcp-install"><p class="eyebrow">01 · Install</p><h2>Install one package in the host project.</h2>${codeBlock("manual-mcp-install", "terminal", `npm install cockroach-crawler`)}</section>
      <section id="mcp-run"><p class="eyebrow">02 · Run</p><h2>Set fixed origins and ceilings before stdio starts.</h2>${codeBlock("manual-mcp-run", "terminal", `COCKROACH_ALLOWED_ORIGINS=https://docs.example.com,https://example.com \\
COCKROACH_MAX_PAGES=20 \\
COCKROACH_MAX_DEPTH=2 \\
COCKROACH_MAX_REQUESTS=100 \\
COCKROACH_MAX_DURATION_MS=120000 \\
npx cockroach-mcp`)}<p>The MCP process writes protocol messages to stdout and diagnostics to stderr. It has no network listener and needs no crawler API key.</p></section>
      <section id="mcp-config"><p class="eyebrow">03 · Configure</p><h2>Use the same command in Codex, Claude Code, or another MCP host.</h2>${codeBlock("manual-mcp-config", "mcp.json", `{
  "mcpServers": {
    "cockroach-crawler": {
      "command": "npx",
      "args": ["-y", "cockroach-crawler@0.4.2", "cockroach-mcp"],
      "env": {
        "COCKROACH_ALLOWED_ORIGINS": "https://docs.example.com",
        "COCKROACH_MAX_PAGES": "20",
        "COCKROACH_MAX_DEPTH": "2",
        "COCKROACH_MAX_REQUESTS": "100",
        "COCKROACH_MAX_DURATION_MS": "120000"
      }
    }
  }
}`, "json")}<p>Client configuration locations differ, but the command, arguments, and environment contract stay the same. Restart the client after changing its MCP configuration.</p></section>
      <section id="mcp-tools"><p class="eyebrow">04 · Surface</p><h2>Three read-only tools and one capability resource.</h2><div class="reference-cards"><article><strong>crawl</strong><p>Returns pages, failures, and statistics. Inputs: URLs, max pages, max depth, and optional relevance query.</p></article><article><strong>map_site</strong><p>Returns compact fetch-validated map entries under the same fixed policy.</p></article><article><strong>extract_structured</strong><p>Runs deterministic CSS fields against caller-supplied inactive HTML.</p></article><article><strong>cockroach://capabilities</strong><p>Reports version, tools, fixed policy, and explicit exclusions as JSON.</p></article></div></section>
      <section id="mcp-authority"><p class="eyebrow">05 · Authority</p><h2>Tool input can narrow the deployment; it cannot widen it.</h2><p>The request may lower <code>maxPages</code> or <code>maxDepth</code>. It cannot add an allowed origin, enable private networks, disable robots, add browser hooks or profiles, provide credentials, raise request or duration ceilings, or request a write action. A relevance query selects adaptive queue order but does not expand admitted URLs.</p></section>
      <section id="mcp-programmatic"><p class="eyebrow">06 · Embed</p><h2>Create the same MCP server in application code.</h2>${codeBlock("manual-mcp-programmatic", "mcp-server.mjs", `import {
  createCockroachMcpServer
} from "cockroach-crawler/mcp";

const server = createCockroachMcpServer({
  name: "docs-crawler",
  crawlDefaults: {
    allowedOrigins: ["https://docs.example.com"],
    sameOrigin: true,
    obeyRobots: true,
    maxPages: 20,
    maxDepth: 2,
    maxRequests: 100,
    maxDurationMs: 120_000
  },
  extractDefaults: {
    maxFields: 20,
    maxInputCharacters: 2_000_000
  }
});

// Connect server to the transport owned by your MCP host.`, "javascript")}</section>`
  });
}

function dockerDocsPage() {
  return docsManualPage({
    currentPath: "/docs/docker/",
    eyebrow: "Deployment manual · Docker",
    title: "Run an authenticated crawler API and playground.",
    lede: "Package fixed crawl authority into a non-root Node container with a health endpoint, responsive playground, bounded crawl/map endpoint, and deterministic extraction endpoint.",
    toc: [
      ["docker-build", "Build and run"],
      ["docker-env", "Environment"],
      ["docker-api", "HTTP API"],
      ["docker-playground", "Dashboard"],
      ["docker-production", "Production checklist"]
    ],
    content: `
      <section id="docker-build"><p class="eyebrow">01 · Container</p><h2>Build the reviewed Dockerfile and run as an unprivileged user.</h2>${codeBlock("manual-docker-build", "terminal", `docker build -t cockroach-crawler:0.4.2 .

docker run --rm -p 3878:3878 \\
  -e COCKROACH_API_TOKEN="replace-with-at-least-16-random-characters" \\
  -e COCKROACH_ALLOWED_ORIGINS="https://docs.example.com" \\
  -e COCKROACH_MAX_PAGES=20 \\
  -e COCKROACH_MAX_DEPTH=2 \\
  -e COCKROACH_MAX_REQUESTS=100 \\
  cockroach-crawler:0.4.2`)}</section>
      <section id="docker-env"><p class="eyebrow">02 · Configuration</p><h2>Keep authority in deployment environment variables.</h2><div class="table-wrap" tabindex="0" role="region" aria-label="Docker environment variables"><table><thead><tr><th>Variable</th><th>Purpose</th><th>Default</th></tr></thead><tbody><tr><td><code>COCKROACH_API_TOKEN</code></td><td>Required bearer token for API routes.</td><td>None</td></tr><tr><td><code>COCKROACH_ALLOWED_ORIGINS</code></td><td>Required comma-separated HTTP(S) origins.</td><td>None</td></tr><tr><td><code>COCKROACH_HOST</code></td><td>Listen address.</td><td><code>0.0.0.0</code></td></tr><tr><td><code>COCKROACH_PORT</code></td><td>Listen port.</td><td><code>3878</code></td></tr><tr><td><code>COCKROACH_MAX_PAGES</code></td><td>Maximum pages a request may ask for.</td><td><code>20</code></td></tr><tr><td><code>COCKROACH_MAX_DEPTH</code></td><td>Maximum traversal depth.</td><td><code>2</code></td></tr><tr><td><code>COCKROACH_MAX_REQUESTS</code></td><td>Complete request ceiling.</td><td><code>100</code></td></tr><tr><td><code>COCKROACH_MAX_DURATION_MS</code></td><td>Complete crawl deadline.</td><td><code>120000</code></td></tr></tbody></table></div></section>
      <section id="docker-api"><p class="eyebrow">03 · HTTP API</p><h2>Health, crawl/map, and deterministic extraction.</h2>${codeBlock("manual-docker-health", "health", `curl http://127.0.0.1:3878/health`)}${codeBlock("manual-docker-crawl", "crawl request", `curl http://127.0.0.1:3878/v1/crawl \\
  --request POST \\
  --header "Authorization: Bearer $COCKROACH_API_TOKEN" \\
  --header "Content-Type: application/json" \\
  --data '{
    "seeds": ["https://docs.example.com/start"],
    "mode": "crawl",
    "maxPages": 5,
    "maxDepth": 1,
    "query": "authentication"
  }'`)}${codeBlock("manual-docker-extract", "extract request", `curl http://127.0.0.1:3878/v1/extract \\
  --request POST \\
  --header "Authorization: Bearer $COCKROACH_API_TOKEN" \\
  --header "Content-Type: application/json" \\
  --data '{
    "url": "https://example.com/item",
    "html": "<main><h1>Example</h1></main>",
    "fields": { "title": "main h1" }
  }'`)}</section>
      <section id="docker-playground"><p class="eyebrow">04 · Dashboard</p><h2>Open the responsive playground at the service root.</h2><p>Visit <code>http://127.0.0.1:3878/</code>, enter the bearer token and an admitted URL, then choose compact map or evidence crawl. The form can lower page count but cannot change origins, credentials, robots behavior, browser authority, or server ceilings.</p></section>
      <section id="docker-production"><p class="eyebrow">05 · Production</p><h2>Put the API behind the controls your deployment needs.</h2><ul class="check-list"><li>Use a long random bearer token from a secret manager</li><li>Keep the origin list small and deployment owned</li><li>Terminate TLS at a trusted reverse proxy or service mesh</li><li>Apply external request-rate and egress controls</li><li>Keep response and request body ceilings finite</li><li>Mount an artifact or cache directory only when the service needs it</li><li>Run the exact tagged image and verify package provenance</li></ul><a class="text-link" href="/security/">Review the complete production boundary →</a></section>`
  });
}

function apiReferenceDocsPage() {
  const crawlOptions = [
    ["seeds / urls", "string or string[]", "Explicit entry URLs."],
    ["maxPages / maxSeeds", "number", "Returned page and initial-seed ceilings."],
    ["maxRequests / maxQueue", "number", "Network-request and admitted-queue ceilings."],
    ["maxLinksPerPage / maxUrlLength", "number", "Discovery input ceilings."],
    ["maxDepth / concurrency", "number", "Traversal depth and exact worker concurrency."],
    ["sameOrigin / allowedOrigins", "boolean / string[]", "Origin admission policy."],
    ["include / exclude", "string or RegExp", "Admitted URL filters."],
    ["skipSensitivePaths", "boolean", "Likely account, login, admin, cart, and similar path filter."],
    ["includeSitemaps", "boolean", "Enable robots-declared and conventional sitemap discovery."],
    ["maxSitemaps / maxUrlsPerSitemap", "number", "Sitemap traversal ceilings."],
    ["obeyRobots", "boolean", "Robots enforcement; enabled by default."],
    ["allowPrivateNetworks", "boolean", "Trusted-operator opt-in; never exposed by strict agent/MCP input."],
    ["userAgent / delayMs", "string / number", "Contact-aware identity and per-origin pacing."],
    ["timeoutMs / maxDurationMs", "number", "Per-request and complete-job deadlines."],
    ["maxBytes / maxTotalBytes", "number", "Per-page and complete decoded-byte ceilings."],
    ["maxRedirects / maxRetries / retryDelayMs", "number", "Redirect and retry budgets."],
    ["browser / rendered", "true or BrowserOptions", "Optional Playwright rendering and evidence."],
    ["extract", "StructuredExtractionOptions", "Bounded deterministic CSS fields."],
    ["traversal", "mode or TraversalOptions", "BFS, DFS, best-first, or adaptive queue order."],
    ["signal", "AbortSignal", "Complete-job cancellation."],
    ["dnsLookup", "DnsLookup", "Trusted test or deployment resolver injection."],
    ["onPage / onError", "function", "Awaited page and structured-failure callbacks."]
  ];
  const pageFields = [
    ["url / canonical", "Final fetched URL and declared canonical URL."],
    ["title / description / h1 / language", "Normalized document metadata."],
    ["text / markdown / links", "Cleaned content and admitted link candidates."],
    ["fetchedAt / status / contentType / bytes", "Retrieval identity and response facts."],
    ["contentHash", "SHA-256 over normalized content."],
    ["depth / discoveredFrom", "Traversal relationship."],
    ["redirectChain", "Every validated redirect hop."],
    ["etag / lastModified / robotsAllowed", "HTTP and policy evidence."],
    ["structured / extractionWarnings", "Deterministic CSS output and warnings."],
    ["artifacts", "Screenshot and PDF path, bytes, media type, and hash."],
    ["browserDetails", "Hook, scroll, flattening, and persistent-profile facts."]
  ];
  const subpaths = [
    [".", "crawl, crawlDetailed, mapSite, sitemap discovery, CSS extraction, page extraction, URL and IP security helpers"],
    ["agent", "Strict creator-bounded crawler tool"],
    ["sources / source-router", "Official/public provider registry and deterministic route fallback"],
    ["external-sources", "Optional fixed read-only session and no-key providers"],
    ["browser-host", "Structural browser observation and approved-execution host contract"],
    ["strategies / cache", "Traversal queues, relevance scoring, and persistent bounded cache"],
    ["documents / extractors", "PDF parsing, XPath, and host-supplied LLM schema extraction"],
    ["browser / providers", "Browser helpers and challenge-aware provider escalation"],
    ["mcp / server / serverless", "Native MCP, authenticated Node API, and Worker profile"],
    ["source-conformance", "Provider-record and status conformance helpers"]
  ];
  const table = (headers, rows, label) => `<div class="table-wrap" tabindex="0" role="region" aria-label="${label}"><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  return docsManualPage({
    currentPath: "/docs/reference/",
    eyebrow: "Stable 0.4.2 · reference",
    title: "The complete public surface, in one place.",
    lede: "Look up package exports, crawl options, page fields, statistics, CLI commands, MCP tools, environment variables, provider commands, and deployment entry points.",
    toc: [
      ["exports", "Package exports"],
      ["crawl-options", "Crawl options"],
      ["page-record", "Page record"],
      ["statistics", "Statistics"],
      ["commands", "Commands"],
      ["reference-links", "Typed source"]
    ],
    content: `
      <section id="exports"><p class="eyebrow">01 · Package map</p><h2>Stable ESM entry points.</h2>${table(["Subpath", "Public purpose"], subpaths.map(([path, purpose]) => [`<code>cockroach-crawler${path === "." ? "" : `/${path}`}</code>`, purpose]), "Package export reference")}</section>
      <section id="crawl-options"><p class="eyebrow">02 · CrawlOptions</p><h2>Every stable top-level crawl option.</h2>${table(["Option", "Type", "Purpose"], crawlOptions.map(([name, type, purpose]) => [`<code>${name}</code>`, `<code>${type}</code>`, purpose]), "Crawl option reference")}<p><code>publicOnly</code> remains as a deprecated alias for sensitive-path behavior and does not control network reachability. Use <code>skipSensitivePaths</code>.</p></section>
      <section id="page-record"><p class="eyebrow">03 · CrawlPage</p><h2>Content stays attached to retrieval evidence.</h2>${table(["Field", "Meaning"], pageFields.map(([name, meaning]) => [`<code>${name}</code>`, meaning]), "Crawl page record reference")}</section>
      <section id="statistics"><p class="eyebrow">04 · CrawlStats</p><h2>Know what completed and what stopped.</h2>${table(["Field group", "Fields"], [["Work", "<code>fetched</code>, <code>requests</code>, <code>bytes</code>, <code>retries</code>"], ["Policy skips", "<code>skippedRobots</code>, <code>skippedFiltered</code>, <code>skippedNonPublic</code>, <code>skippedOrigin</code>"], ["Queue and output", "<code>queueDropped</code>, <code>queued</code>, <code>seen</code>, <code>pages</code>, <code>failures</code>, <code>errors</code>"], ["Time and mode", "<code>durationMs</code>, <code>startedAt</code>, <code>finishedAt</code>, <code>traversal</code>"]], "Crawler statistics reference")}</section>
      <section id="commands"><p class="eyebrow">05 · Executables</p><h2>Seven command-line entry points.</h2>${table(["Command", "Purpose"], [["<code>cockroach-crawl</code>", "Crawl, map, render, and export JSON or JSONL."], ["<code>cockroach-crawler</code>", "Alias for cockroach-crawl."], ["<code>cockroach-sources</code>", "Provider doctor, search, and read."], ["<code>cockroach-reach</code>", "Optional reach doctor, dry-run setup, reviewed install, update, search, and read."], ["<code>cockroach-documents</code>", "Normalize supported offline documents and feeds."], ["<code>cockroach-mcp</code>", "Native stdio MCP server."], ["<code>cockroach-server</code>", "Authenticated Node/Docker API and playground."]], "Command-line entry point reference")}</section>
      <section id="reference-links"><p class="eyebrow">06 · Typed source</p><h2>Use declarations and executable help as the final local reference.</h2>${codeBlock("manual-reference-help", "terminal", `cockroach-crawl --help
cockroach-sources --help
cockroach-reach --help
npm view cockroach-crawler version dist.integrity`)}<div class="next-links"><a href="${repository}/tree/main/types"><span>Type declarations</span><strong>Inspect every exported interface →</strong></a><a href="${repository}/blob/main/docs/FEATURES.md"><span>Feature inventory</span><strong>Read implementation boundaries →</strong></a><a href="${repository}/blob/main/docs/CAPABILITIES.md"><span>Capability states</span><strong>Separate stable, optional, and excluded →</strong></a></div></section>`
  });
}

function crawlerFeatureCatalog() {
  return [
    ["Crawl", "Static HTTP crawling", "Crawl public HTTP(S) pages without running a browser and receive normalized page records.", "crawlDetailed({ seeds: [url], maxPages: 25 })"],
    ["Crawl", "Multiple seeds", "Start one bounded job from several explicit entry points.", "crawl({ seeds: [docsUrl, blogUrl], maxPages: 50 })"],
    ["Crawl", "Breadth-first traversal", "Explore each depth level before moving deeper; useful for broad documentation coverage.", "traversal: \"bfs\""],
    ["Crawl", "Depth-first traversal", "Follow the newest admitted path first; useful for narrow hierarchies.", "traversal: \"dfs\""],
    ["Crawl", "Best-first traversal", "Rank admitted links by a bounded relevance score and visit the strongest candidates first.", "traversal: { mode: \"best-first\", query: [\"oauth\", \"migration\"] }"],
    ["Crawl", "Adaptive relevance traversal", "Continuously reprioritize the queue as relevant page text is discovered.", "traversal: { mode: \"adaptive\", query: \"breaking changes\" }"],
    ["Crawl", "Sitemap discovery", "Read robots-declared and conventional sitemap locations, including nested sitemap indexes.", "includeSitemaps: true"],
    ["Crawl", "Robots enforcement", "Evaluate robots policy before page contact and keep the decision in the result.", "obeyRobots: true"],
    ["Crawl", "Include and exclude filters", "Constrain admitted URLs to the paths your job actually needs.", "include: [\"/docs/\"], exclude: [\"/archive/\"]"],
    ["Crawl", "Validated redirects", "Inspect and admit every redirect destination before following it.", "maxRedirects: 5"],
    ["Crawl", "Concurrency and politeness", "Run exact concurrent work while retaining per-origin delay and global request ceilings.", "concurrency: 4, delayMs: 150"],
    ["Crawl", "Deadlines and cancellation", "Stop the complete job by wall-clock budget or AbortSignal.", "maxDurationMs: 60_000, signal: controller.signal"],
    ["Crawl", "Persistent cache", "Reuse hash-verified crawl results from an explicit namespace, TTL, entry, and byte budget.", "createCachedCrawler(new FileCrawlCache({ directory: \".cache/crawl\" }), crawlDetailed)"],
    ["Crawl", "Compact site map", "Return fetch-validated URL metadata without retaining complete page bodies.", "mapSite({ seeds: [url], maxPages: 200 })"],
    ["Browser", "JavaScript rendering", "Render client-side applications through optional Playwright Chromium.", "browser: { waitUntil: \"networkidle\" }"],
    ["Browser", "Selector waits and clicks", "Wait for one state and perform an explicit bounded click sequence.", "browser: { waitFor: \".ready\", click: [\"button.load-more\"] }"],
    ["Browser", "Infinite and virtual scroll", "Scroll by bounded steps until content height stabilizes.", "browser: { scroll: { maxSteps: 20, stableIterations: 3 } }"],
    ["Browser", "Open Shadow DOM flattening", "Clone bounded open shadow roots into the final extraction snapshot.", "browser: { flattenShadowDom: true }"],
    ["Browser", "Readable iframe flattening", "Clone bounded same-origin frame content while preserving cross-origin isolation.", "browser: { flattenIframes: true }"],
    ["Browser", "Screenshots", "Capture full-page PNG or JPEG evidence with byte size and SHA-256.", "browser: { screenshot: { format: \"png\", fullPage: true } }"],
    ["Browser", "PDF generation", "Print rendered pages to PDF with format, background, landscape, and CSS-page controls.", "browser: { pdf: { format: \"A4\", printBackground: true } }"],
    ["Browser", "Trusted page hooks", "Run reviewed operator functions inside an authorized page; hooks are excluded from model input.", "browser: { hooks: [reviewedHook], allowPageJavaScript: true }"],
    ["Browser", "Persistent profiles", "Use an explicit dedicated browser profile directory instead of discovering a local user profile.", "browser: { profileDirectory: \".profiles/docs\", allowPersistentProfile: true }"],
    ["Extract", "Readable Markdown", "Convert cleaned document content into Markdown for retrieval, summarization, and indexing.", "page.markdown"],
    ["Extract", "CSS schema extraction", "Read visible text, cleaned HTML, or named attributes with per-field and total ceilings.", "extractStructured(html, url, { fields: { title: \"h1\" } })"],
    ["Extract", "XPath extraction", "Select deterministic fields from inactive markup using bounded XPath expressions.", "extractWithXPath(html, url, { fields: { title: \"//h1\" } })"],
    ["Extract", "Optional LLM schema extraction", "Connect your own model adapter; returned JSON must pass the supplied JSON Schema.", "extractWithLlm(page, { schema, adapter })"],
    ["Extract", "Local PDF parsing", "Parse explicit local PDF bytes with signature, page, byte, and text ceilings.", "parsePdf(await readFile(\"report.pdf\"), { maxPages: 100 })"],
    ["Extract", "Links and page metadata", "Receive canonical URL, title, description, H1, language, links, status, ETag, and Last-Modified.", "result.pages[0]"],
    ["Extract", "Evidence hashes", "Attach SHA-256 content hashes, fetch time, parent, depth, and redirect history to every page.", "page.contentHash"],
    ["Sources", "Public GitHub reads", "Search and read public repositories and issues, with an optional token for higher rate limits.", "sources.search(\"github\", { query: \"topic:web-crawler\" })"],
    ["Sources", "YouTube without a developer key", "Read public metadata and use the separately installed pinned yt-dlp route for supported no-key search and reads.", "cockroach-reach doctor --json"],
    ["Sources", "Official provider adapters", "Use explicit operator credentials for official YouTube, X, and Reddit read APIs.", "createSourceRegistryFromEnv(process.env)"],
    ["Sources", "Read-only session providers", "Expose fixed operator-installed read routes for X, Reddit, Facebook, Instagram, LinkedIn, and Xiaohongshu.", "cockroach-reach setup --dry-run"],
    ["Sources", "RSS and Atom", "Parse feeds into normalized research documents without a live model call.", "cockroach-documents feed.xml"],
    ["Sources", "Provider doctor and routing", "Inspect capability before dispatch and use deterministic fallback only for approved failure classes.", "cockroach-sources doctor --json"],
    ["Agents", "Strict agent tool", "Give a model a crawl tool whose input may narrow but cannot broaden host-owned origins and budgets.", "createCockroachCrawlerTool({ allowedOrigins: [origin], maxPages: 10 })"],
    ["Agents", "Native MCP server", "Expose crawl, map_site, extract_structured, and a machine-readable capability resource over stdio.", "COCKROACH_ALLOWED_ORIGINS=https://docs.example.com cockroach-mcp"],
    ["Agents", "Maqam integration", "Optionally route the registered crawler tool through Maqam for policy, approval, traces, and evidence.", "gateway.registerTool(crawler.name, crawler.execute.bind(crawler))"],
    ["Deploy", "Authenticated Docker API", "Run health, playground, crawl, and extraction endpoints behind a deployment-owned bearer token.", "docker run -p 3878:3878 -e COCKROACH_API_TOKEN=... cockroach-crawler:0.4.2"],
    ["Deploy", "Dashboard and playground", "Open the responsive local playground while the server keeps fixed crawl authority.", "cockroach-server"],
    ["Deploy", "Cloudflare Worker profile", "Deploy a small token-authenticated fetch profile for deployment-configured HTTPS origins.", "npx wrangler deploy --config worker/wrangler.jsonc"],
    ["Security", "Public-network admission", "Reject credentials, unsafe schemes, private and metadata destinations before the Node transport connects.", "resolveUrlTarget(url)"],
    ["Security", "DNS pinning and origin policy", "Validate the complete address set and bind admitted requests to approved public addresses and origins.", "allowedOrigins: [\"https://docs.example.com\"]"],
    ["Security", "Resource ceilings", "Cap pages, requests, queue, depth, bytes, retries, redirects, callbacks, and total duration.", "maxPages: 25, maxRequests: 120, maxTotalBytes: 10_000_000"],
    ["Security", "Challenge-aware provider escalation", "Record transport attempts and stop at access challenges unless an explicit approved provider handles them.", "createEscalationRouter({ providers, maxAttempts: 2 })"]
  ];
}

function renderFeatureCatalog() {
  const features = crawlerFeatureCatalog();
  const categories = [...new Set(features.map(([category]) => category))];
  const guideByCategory = {
    Crawl: ["/docs/crawling/", "Crawling manual"],
    Browser: ["/docs/browser/", "Browser manual"],
    Extract: ["/docs/extraction/", "Extraction manual"],
    Sources: ["/docs/providers/", "Provider manual"],
    Agents: ["/docs/mcp/", "Agent and MCP manual"],
    Deploy: ["/docs/docker/", "Deployment manual"],
    Security: ["/security/", "Security model"]
  };
  return `<section id="feature-reference" class="feature-reference" aria-labelledby="feature-reference-title">
    <div class="feature-reference-head">
      <div><p class="eyebrow">Complete feature index · ${features.length} capabilities</p><h2 id="feature-reference-title">Find the exact API surface.</h2><p>Every entry names the option, function, command, or output field that activates the capability in stable ${stableVersion}.</p></div>
      <label class="feature-search"><span>Filter documentation</span><input type="search" data-feature-search placeholder="Try “PDF”, “MCP”, “YouTube”, or “adaptive”" autocomplete="off" /></label>
    </div>
    <div class="feature-filter-row" aria-label="Feature categories"><button type="button" data-feature-category="all" aria-pressed="true">All</button>${categories.map((category) => `<button type="button" data-feature-category="${escapeHtml(category)}" aria-pressed="false">${escapeHtml(category)}</button>`).join("")}</div>
    <p class="feature-result-count" data-feature-count aria-live="polite">${features.length} capabilities shown</p>
    <div class="feature-catalog">${features.map(([category, title, description, usage], index) => `<article class="feature-entry" data-feature-entry data-category="${escapeHtml(category)}" data-search="${escapeHtml(`${category} ${title} ${description} ${usage}`.toLowerCase())}">
      <div class="feature-entry-meta"><span>${String(index + 1).padStart(2, "0")}</span><em>${escapeHtml(category)}</em></div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
      <pre tabindex="0" aria-label="${escapeHtml(title)} usage"><code>${escapeHtml(usage)}</code></pre>
      <a class="feature-guide-link" href="${guideByCategory[category][0]}">${guideByCategory[category][1]} →</a>
    </article>`).join("")}</div>
  </section>`;
}

function docsPage() {
  const tocLinks = `<a href="#quickstart">Quickstart</a><a href="#deep-crawl">Deep crawling</a><a href="#browser-suite">Browser suite</a><a href="#extraction-suite">Extraction</a><a href="#agent-deploy">Agents and MCP</a><a href="#feature-reference">All features</a><a href="#output">Output</a><a href="#deployment">Deployment</a>`;
  return `
    <section class="page-hero shell docs-hero"><p class="eyebrow">Cockroach Crawler ${stableVersion} documentation</p><h1>The complete web toolkit for JavaScript AI agents.</h1><p class="lede">Crawl static and rendered pages, prioritize the right links, extract exact data, capture browser evidence, parse PDFs, route public sources, and connect through JavaScript, CLI, MCP, Docker, or Maqam.</p><div class="page-actions"><a class="button primary" href="#quickstart">Start in two minutes</a><a class="button secondary" href="#feature-reference">Explore ${crawlerFeatureCatalog().length} capabilities</a></div><div class="docs-command" aria-label="Installation command"><code>npm install cockroach-crawler</code><button type="button" class="copy-button" data-copy-value="npm install cockroach-crawler" aria-describedby="docs-install-copy">Copy</button><span class="sr-only" id="docs-install-copy" aria-live="polite"></span></div></section>
    ${docsTopicNav()}
    <details class="mobile-toc shell"><summary>On this page</summary><nav aria-label="On this page">${tocLinks}</nav></details>
    <div class="docs-layout shell">
      <aside class="toc"><nav aria-label="On this page"><h2>On this page</h2>${tocLinks}</nav></aside>
      <div class="docs-content">
        <section id="quickstart"><p class="eyebrow">01 · Quickstart</p><h2>Turn a site into clean agent-ready records.</h2><p>Use a maintained Node.js 22, 24, or 26 release. The result contains pages, failures, and aggregate statistics, so indexing and research pipelines can make explicit completeness decisions.</p>${codeBlock("install-cli", "terminal", `npm install cockroach-crawler
npx cockroach-crawl https://example.com/docs \\
  --max-pages 20 \\
  --max-requests 80 \\
  --max-duration 60000 \\
  --jsonl \\
  --output crawl.jsonl`)}${codeBlock("api-example", "crawl.mjs", `import { crawlDetailed } from "cockroach-crawler";

const result = await crawlDetailed({
  seeds: ["https://example.com/docs"],
  maxPages: 25,
  maxRequests: 150,
  maxDepth: 2,
  maxDurationMs: 60_000,
  maxTotalBytes: 10_000_000,
  concurrency: 4,
  includeSitemaps: true
});

console.log(result.pages[0]?.markdown);
console.log(result.stats, result.failures);`, "javascript")}</section>
        <section id="deep-crawl"><p class="eyebrow">02 · Deep crawling</p><h2>Choose how the crawler spends its attention.</h2><p>BFS gives broad coverage, DFS follows a path, best-first ranks admitted links, and adaptive mode keeps reprioritizing as relevant content arrives.</p>${codeBlock("deep-crawl-example", "adaptive-crawl.mjs", `import { crawlDetailed } from "cockroach-crawler";

const result = await crawlDetailed({
  seeds: ["https://docs.example.com"],
  traversal: {
    mode: "adaptive",
    query: ["oauth", "migration", "breaking change"],
    depthPenalty: 0.2,
    maxScoreInputCharacters: 20_000
  },
  includeSitemaps: true,
  maxDepth: 5,
  maxPages: 80,
  maxRequests: 300
});

console.log(result.stats.traversal, result.pages);`, "javascript")}<div class="mode-strip" aria-label="Traversal modes"><span>BFS · coverage</span><span>DFS · depth</span><span>Best-first · ranking</span><span>Adaptive · live relevance</span></div></section>
        <section id="browser-suite"><p class="eyebrow">03 · Browser suite</p><h2>Render, interact, flatten, and capture.</h2><p>Use optional Playwright when static HTML is not enough. Browser requests retain the crawler’s origin and resource policy while the page produces extractable HTML and evidence artifacts.</p>${codeBlock("browser-suite-example", "browser-evidence.mjs", `import { crawl } from "cockroach-crawler";

const pages = await crawl({
  seeds: ["https://app.example.com/public-report"],
  maxPages: 3,
  browser: {
    waitUntil: "networkidle",
    click: ["button.load-more"],
    scroll: { maxSteps: 20, stepPixels: 900, stableIterations: 3 },
    flattenShadowDom: true,
    flattenIframes: true,
    screenshot: { format: "png", fullPage: true },
    pdf: { format: "A4", printBackground: true },
    artifactDirectory: ".cockroach-artifacts",
    maxArtifactBytes: 25 * 1024 * 1024
  }
});

console.log(pages[0].artifacts, pages[0].browserDetails);`, "javascript")}</section>
        <section id="extraction-suite"><p class="eyebrow">04 · Extraction</p><h2>Choose deterministic selectors or your own model adapter.</h2><p>CSS and XPath extraction are local and deterministic. Model-assisted extraction is optional: your host supplies the adapter, bounds the disclosed content, and receives output only after JSON Schema validation.</p>${codeBlock("extraction-suite-example", "extract.mjs", `import { extractWithXPath, extractWithLlm } from "cockroach-crawler/extractors";

const fields = extractWithXPath(html, url, {
  fields: {
    title: "//h1",
    links: { xpath: "//main//a", source: "attribute", attribute: "href", multiple: true }
  },
  maxTotalCharacters: 200_000
});

const semantic = await extractWithLlm(page, {
  schema,
  adapter: ({ content, schema, instruction }) =>
    modelClient.extract({ content, schema, instruction })
});

console.log(fields.data, semantic.data);`, "javascript")}<p>Local PDFs use <code>parsePdf(bytes)</code>; compact site maps use <code>mapSite(options)</code>; normal page records already include Markdown, readable text, links, metadata, and evidence hashes.</p></section>
        <section id="agent-deploy"><p class="eyebrow">05 · Agents, MCP, and Docker</p><h2>Connect the same crawler contract everywhere.</h2><p>Use the strict tool in application code, launch the native MCP stdio service, or run the authenticated Docker API and playground.</p>${codeBlock("agent-example", "agent-tool.mjs", `import { createCockroachCrawlerTool } from "cockroach-crawler/agent";

const crawlTool = createCockroachCrawlerTool({
  allowedOrigins: ["https://example.com"],
  maxPages: 10,
  maxDepth: 1,
  maxRequests: 80
});

const result = await crawlTool.execute({
  urls: ["https://example.com/docs"],
  maxPages: 5
});`, "javascript")}${codeBlock("mcp-docker-example", "MCP or Docker", `COCKROACH_ALLOWED_ORIGINS=https://docs.example.com cockroach-mcp

docker build -t cockroach-crawler:0.4.2 .
docker run --rm -p 3878:3878 \\
  -e COCKROACH_API_TOKEN="replace-with-a-long-random-secret" \\
  -e COCKROACH_ALLOWED_ORIGINS="https://docs.example.com" \\
  cockroach-crawler:0.4.2`)}</section>
        ${renderFeatureCatalog()}
        <section id="output"><p class="eyebrow">06 · Output contract</p><h2>Keep useful content attached to evidence.</h2>${codeBlock("output-shape", "page record", `{
  "url": "https://example.com/",
  "canonical": "https://example.com/",
  "title": "Example",
  "markdown": "# Example\\n\\nReadable Markdown…",
  "links": ["https://example.com/about"],
  "status": 200,
  "contentHash": "sha256:…",
  "redirectChain": [],
  "robotsAllowed": true,
  "fetchedAt": "2026-07-24T00:00:00.000Z"
}`, "json")}<p>Store the URL and content hash beside indexed chunks. Keep structured failures and aggregate statistics with the job so downstream systems can tell a complete crawl from a partial one.</p></section>
        <section id="deployment"><p class="eyebrow">07 · Deployment</p><h2>One package, five production paths.</h2><div class="deployment-grid"><article><strong>CLI</strong><p>Scheduled exports, local research, CI snapshots.</p><code>npx cockroach-crawl URL</code></article><article><strong>Node.js</strong><p>Typed application and agent integrations.</p><code>import { crawlDetailed }</code></article><article><strong>MCP</strong><p>Codex, Claude, and other MCP clients.</p><code>cockroach-mcp</code></article><article><strong>Docker API</strong><p>Authenticated crawl service and playground.</p><code>cockroach-server</code></article><article><strong>Cloudflare Worker</strong><p>Small fixed-origin fetch deployments.</p><code>wrangler deploy</code></article></div><div class="next-links"><a href="/security/"><span>Production checklist</span><strong>Review network and browser controls →</strong></a><a href="/docs/providers/"><span>Public sources</span><strong>Configure provider routes →</strong></a><a href="${repository}/issues"><span>Build with us</span><strong>Pick a contributor issue →</strong></a></div></section>
      </div>
    </div>`;
}

function legacyDocsPage() {
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
        <section id="sources"><p class="eyebrow">05 · Stable · 0.4.2</p><h2>Inspect provider capability before dispatch.</h2><div class="callout candidate"><strong>npm latest</strong><p>This contract is part of stable 0.4.2. Pin the exact stable version when reproducible installation matters.</p></div>${codeBlock("sources-doctor", "npm stable", "npm install cockroach-crawler@0.4.2\nnpx cockroach-sources doctor --json\nnpx cockroach-reach doctor --json")}${codeBlock("sources-example", "sources.mjs", `import { createSourceRegistryFromEnv } from "cockroach-crawler/sources";

const sources = createSourceRegistryFromEnv(process.env);
console.table(sources.doctor());

const repositories = await sources.search("github", {
  query: "topic:web-crawler language:javascript",
  maxResults: 5
});

console.log(repositories);`, "javascript")}<p>Public GitHub REST is ready with optional token authentication. YouTube metadata reads work through public oEmbed; search needs <code>YOUTUBE_API_KEY</code> and transcripts remain unavailable. X requires <code>X_BEARER_TOKEN</code>. Reddit requires official client credentials and a contact-aware user agent.</p></section>
        <section id="serverless"><p class="eyebrow">06 · Serverless · stable 0.4.2</p><h2>A smaller edge boundary with named tradeoffs.</h2><p>The stable package includes a self-hosted Cloudflare Worker entry point. It accepts only token-authenticated <code>POST /v1/crawl</code>, requires configured HTTPS origins, and is rate-limited by the deployment.</p>${codeBlock("serverless-config", "worker/wrangler.jsonc", `{
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
    <section class="page-hero shell"><p class="eyebrow">Provider coverage · stable 0.4.2</p><h1>Know what is public, keyed, and session-backed.</h1><p class="lede">Stable 0.4.2 combines the complete crawler with a tested provider registry, ordered routing, optional read-only reach providers, a Maqam-compatible browser-host contract, and a separate restricted serverless tier.</p><div class="page-actions"><a class="button primary" href="/docs/providers/">Inspect the stable API</a><a class="button secondary" href="${repository}/issues">Propose an adapter</a></div></section>
    <section class="section shell feature-stage"><figure><img src="/assets/provider-map.svg" width="720" height="560" alt="Provider coverage map distinguishing public web, GitHub, official APIs, no-key YouTube, and optional read-only session routes" /><figcaption>Doctor status is capability-based: public, keyed, credentialed, no-key, session-backed, partial, and unavailable states remain distinct.</figcaption></figure><div><p class="eyebrow">Know before dispatch</p><h2>Every adapter reports its exact access state.</h2><p>Each adapter reports its authority and availability before dispatch, together with its rate-limit and data-shape contract.</p><div class="candidate-note compact"><span>Stable contract</span><p><code>cockroach-sources doctor --json</code> and <code>cockroach-reach doctor --json</code> report runtime status without serializing secrets.</p></div></div></section>
    <section class="section shell"><div class="table-wrap" tabindex="0" role="region" aria-label="Provider capability status table"><table class="status-table"><thead><tr><th>Surface</th><th>Stable 0.4.2 status</th><th>Access path</th></tr></thead><tbody>
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
      <p class="eyebrow">Open-source AI web crawler comparison · reviewed 24 July 2026</p>
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
      <div class="section-head"><div><p class="eyebrow">Capability matrix</p><h2>Compare the complete developer surface.</h2></div><p>Stable 0.4.2 brings mapping, adaptive crawling, browser evidence, extraction, MCP, Docker, source routing, and the Node.js network boundary into one published package.</p></div>
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
      <div><p class="eyebrow">Verify before choosing</p><h2>Run the complete crawler yourself.</h2><p>Install stable 0.4.2 and exercise mapping, adaptive traversal, browser evidence, deterministic extraction, native MCP, and provider diagnostics against your own fixtures.</p><div class="button-row"><a class="button primary" href="/docs/">Run the quickstart</a><a class="button secondary" href="/security/">Audit the security model</a></div></div>
      ${codeBlock("compare-proof", "local verification", "npm install cockroach-crawler@0.4.2\nnpx cockroach-sources doctor --json\nnpx cockroach-crawl https://example.com/docs --max-pages 20 --jsonl")}
    </section>
    <section class="section shell faq-section"><div><p class="eyebrow">Crawler selection FAQ</p><h2>Choose the smallest trustworthy surface.</h2></div><div class="faq-list">
      <details><summary>What is the best AI web crawler for agents?</summary><p>The best crawler is the smallest tested contract that meets the deployment. Cockroach Crawler fits governed local evidence, Firecrawl fits managed web-data infrastructure, and Crawl4AI fits broad self-hosted Python crawling workflows.</p></details>
      <details><summary>Is Cockroach Crawler better than Firecrawl?</summary><p>It is a stronger fit for local, evidence-first crawling where explicit agent network and resource boundaries matter. Firecrawl is broader for hosted search, proxy infrastructure, asynchronous jobs, managed interaction, document formats, and production scale.</p></details>
      <details><summary>Is Cockroach Crawler better than Crawl4AI?</summary><p>It is a stronger fit for a compact Node.js agent boundary and normalized provenance. Crawl4AI is broader for adaptive crawling, browser sessions, extraction strategies, caching, document processing, and Python workflows.</p></details>
      <details><summary>Can I replace either product without testing?</summary><p>No. Match URL sets, rendering mode, output fields, robots policy, retries, concurrency, network conditions, and deployment requirements before migrating.</p></details>
      <details><summary>Where did the comparison data come from?</summary><p>Product claims were reviewed against the public <a href="${firecrawlRepository}">Firecrawl repository</a>, <a href="${firecrawlDocs}">Firecrawl documentation</a>, <a href="${crawl4aiRepository}">Crawl4AI repository</a>, and <a href="${crawl4aiDocs}">Crawl4AI documentation</a> on 24 July 2026.</p></details>
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
    <section class="section shell proof-section"><div><p class="eyebrow">Try the public layers</p><h2>Check web reach, then prove exact approval.</h2><p>Cockroach Crawler reports source access and Maqam demonstrates its separate tool-approval boundary. ProductLoop can compose both, while Qarinah remains a private alpha until its launch gates are complete.</p></div>${codeBlock("stack-public-proof", "public proof", "npx -y --package cockroach-crawler@0.4.2 cockroach-sources doctor\nnpx -y --package cockroach-crawler@0.4.2 cockroach-reach doctor\nnpx -y maqam@0.3.2 demo approval")}</section>
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
      <article><div><span class="status shipped">Released · 0.4.2</span><h2>Deep AI crawler</h2></div><ul><li>BFS, DFS, best-first, and adaptive relevance traversal</li><li>Persistent cache, compact mapping, robots, sitemaps, and exact crawl budgets</li><li>CLI, typed JavaScript API, strict agent adapter, and normalized evidence records</li><li>Public-network admission, DNS pinning, and validated redirects in the Node transport</li></ul></article>
      <article><div><span class="status shipped">Released · 0.4.2</span><h2>Browser and extraction suite</h2></div><ul><li>JavaScript rendering, waits, clicks, virtual scroll, Shadow DOM, and same-origin iframes</li><li>Screenshots, PDF generation and parsing, dedicated persistent profiles, and reviewed page hooks</li><li>Markdown, CSS, XPath, and optional schema-validated host LLM extraction</li><li>Artifact sizes, SHA-256 hashes, metadata, failures, and crawl statistics</li></ul></article>
      <article><div><span class="status shipped">Released · 0.4.2</span><h2>Agent and deployment surfaces</h2></div><ul><li>Native MCP crawl, mapping, extraction, and capability resource</li><li>Authenticated Docker/Node API, responsive dashboard, and playground</li><li>Maqam-compatible structural browser host and registered-tool composition</li><li>Fetch-only Cloudflare Worker profile for fixed deployment origins</li></ul></article>
      <article><div><span class="status shipped">Released · 0.4.2</span><h2>Provider and reach routing</h2></div><ul><li>Web, GitHub, YouTube, X, Reddit, Facebook, Instagram, LinkedIn, and Xiaohongshu doctor states</li><li>Public GitHub REST and optional no-key YouTube reads</li><li>Official credentials or explicit operator-controlled read-only sessions</li><li>Ordered provider/proxy escalation with attempt provenance and challenge-aware stopping</li></ul></article>
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
    <section class="page-hero shell"><p class="eyebrow">Release · 0.4.2 · 24 July 2026</p><h1>Deep crawling, browser evidence, extraction, MCP, and Docker.</h1><p class="lede">Version 0.4.2 packages the complete Node.js web toolkit for AI agents with the current image-free npm README and searchable documentation portal.</p><div class="page-actions"><a class="button primary" href="${npmPackage}">Install from npm</a><a class="button secondary" href="/docs/">Explore every feature</a></div></section>
    <section class="release-banner"><div class="shell"><span>Install</span><code>npm install cockroach-crawler@0.4.2</code><button type="button" class="copy-button" data-copy-value="npm install cockroach-crawler@0.4.2" aria-describedby="release-copy-status">Copy</button><span class="sr-only" id="release-copy-status" aria-live="polite"></span></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">What changed</p><h2>The crawler now covers the complete agent workflow.</h2></div><p>One package now handles discovery, rendering, extraction, source routing, evidence, and deployment.</p></div><div class="fit-grid"><article class="fit-yes"><span>Deep crawl</span><h3>Four traversal strategies</h3><p>BFS, DFS, best-first, adaptive relevance, persistent cache, and fetch-validated site maps.</p></article><article class="fit-yes"><span>Browser + data</span><h3>Capture what users see</h3><p>Virtual scroll, Shadow DOM, iframes, screenshots, PDFs, XPath, CSS, and schema-validated host LLM extraction.</p></article><article class="fit-yes"><span>Agent ready</span><h3>Run anywhere</h3><p>Native MCP, strict agent tools, authenticated Docker API, dashboard, playground, Node.js, CLI, and Cloudflare Worker.</p></article></div></section>
    <section class="section shell"><div class="table-wrap" tabindex="0" role="region" aria-label="Release facts table"><table><thead><tr><th>Release fact</th><th>0.4.2</th></tr></thead><tbody><tr><td>Runtime status</td><td>Stable on maintained Node.js 22, 24, and 26</td></tr><tr><td>Package license</td><td>MIT</td></tr><tr><td>Optional browser peer</td><td>Playwright ≥ 1.48.0 and &lt; 2</td></tr><tr><td>Verification</td><td>184 core tests, 28 Chromium tests, Docker, MCP transport, CodeQL, packed TypeScript consumer</td></tr><tr><td>Published package</td><td><a href="${npmPackage}">npmjs.com/package/cockroach-crawler</a></td></tr><tr><td>Source and issues</td><td><a href="${repository}">github.com/AjnasNB/cockroach-crawler</a></td></tr></tbody></table></div></section>
    <section class="section shell candidate-release"><div><p class="eyebrow">npm latest</p><h2>0.4.2 is the complete crawler line.</h2><p>The stable line includes adaptive crawling, browser evidence, PDF workflows, cache, deterministic and optional model extraction, provider/proxy routing, native MCP, Docker, and a searchable 46-capability documentation index. Trusted-publishing provenance and registry consumer checks bind npm to the reviewed main commit.</p></div><div class="candidate-facts"><div><span>Crawl</span><strong>BFS · DFS · best-first · adaptive</strong></div><div><span>Browser</span><strong>Scroll · flatten · screenshot · PDF</strong></div><div><span>Extract</span><strong>Markdown · CSS · XPath · LLM schema</strong></div><div><span>Deploy</span><strong>Node · CLI · MCP · Docker · Worker</strong></div></div></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Release proof</p><h2>Verify source, browser, audit, MCP, Docker, and tarball.</h2><p>The package's <code>prepublishOnly</code> script runs the complete release gate, and npm Trusted Publishing attaches provenance to the immutable artifact.</p></div>${codeBlock("release-check", "terminal", "npm ci --ignore-scripts\nnpm run release:check\nnpm audit signatures")}</section>
    <section class="section shell card-grid"><article><p class="eyebrow">Upgrade</p><h2>Adopt features incrementally.</h2><p>Existing crawl calls continue to work. Add traversal, cache, browser artifacts, extractors, MCP, or Docker only where the application needs them.</p></article><article><p class="eyebrow">Contribute</p><h2>Bring a real web fixture.</h2><p>Open an issue with a reproducible page, expected record, Node version, and the smallest configuration that demonstrates the improvement.</p><a class="text-link" href="${repository}/issues">Open an issue →</a></article></section>`;
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
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url><loc>${siteUrl}${page.slug ? `/${page.slug}/` : "/"}</loc><lastmod>2026-07-24</lastmod></url>`).join("\n")}\n</urlset>\n`,
  "utf8"
);
await writeFile(join(dist, "site.webmanifest"), JSON.stringify({ name: "Cockroach Crawler", short_name: "Crawler", start_url: "/", display: "standalone", background_color: "#07100e", theme_color: "#07100e", icons: [{ src: "/assets/mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] }, null, 2), "utf8");
await writeFile(join(dist, "_headers"), `/*\n  Cache-Control: public, max-age=300, no-transform\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n\n/assets/*\n  Cache-Control: public, max-age=300, must-revalidate, no-transform\n\n/media/*\n  Cache-Control: public, max-age=3600, must-revalidate, no-transform\n`, "utf8");
await writeFile(join(dist, "_redirects"), `/docs /docs/ 301\n/docs/cli /docs/cli/ 301\n/docs/javascript /docs/javascript/ 301\n/docs/crawling /docs/crawling/ 301\n/docs/browser /docs/browser/ 301\n/docs/extraction /docs/extraction/ 301\n/docs/map-and-extract /docs/map-and-extract/ 301\n/docs/agents /docs/agents/ 301\n/docs/mcp /docs/mcp/ 301\n/docs/docker /docs/docker/ 301\n/docs/providers /docs/providers/ 301\n/docs/serverless /docs/serverless/ 301\n/docs/reference /docs/reference/ 301\n/security /security/ 301\n/providers /providers/ 301\n/compare /compare/ 301\n/benchmark /benchmark/ 301\n/media /media/ 301\n/launch /launch/ 301\n/roadmap /roadmap/ 301\n/community /community/ 301\n/release /release/ 301\n`, "utf8");
await writeFile(join(dist, "llms.txt"), `# Cockroach Crawler\n\nCockroach Crawler 0.4.2 is an open-source Node.js web toolkit for AI agents, RAG pipelines, documentation indexing, research, content inventory, and QA. It crawls static and rendered pages and emits LLM-ready Markdown, JSON, or JSONL with canonical URLs, redirect history, content hashes, retrieval metadata, failures, warnings, and provenance.\n\nThe crawler supports BFS, DFS, best-first, and adaptive relevance traversal; robots and sitemap discovery; validated redirects; persistent hash-verified cache; compact site maps; JavaScript rendering; waits and clicks; virtual scroll; open Shadow DOM and same-origin iframe flattening; screenshots; PDF generation and local parsing; dedicated persistent browser profiles; reviewed page hooks; CSS and XPath extraction; and optional host-supplied LLM extraction with mandatory JSON Schema validation.\n\nAgent and deployment surfaces include a typed JavaScript API, CLI, strict agent tool, native MCP stdio service, authenticated Docker/Node API, responsive dashboard and playground, a Maqam-compatible structural browser host, and a restricted Cloudflare Worker profile. Model-facing inputs can narrow but cannot expand deployment-owned origins, credentials, browser hooks, profiles, or resource ceilings.\n\nThe provider registry covers public web, public GitHub REST, official YouTube, X, and Reddit APIs, an optional pinned no-key YouTube route, RSS/Atom documents, and optional fixed read-only session routes for X, Reddit, Facebook, Instagram, LinkedIn, and Xiaohongshu. Provider doctor commands report the exact access state before dispatch.\n\nThe Node transport applies HTTP(S)-only admission, public-network defaults, DNS classification and pinning, validated redirects, explicit origin policy, robots checks, sensitive-path filtering, and exact page, request, queue, byte, retry, redirect, callback, and duration budgets. The serverless Worker is a separate fixed-origin fetch profile.\n\n- Complete documentation and searchable feature index: ${siteUrl}/docs/\n- AI crawler comparison: ${siteUrl}/compare/\n- CLI guide: ${siteUrl}/docs/cli/\n- JavaScript guide: ${siteUrl}/docs/javascript/\n- Deep crawling and cache: ${siteUrl}/docs/crawling/\n- Browser rendering and evidence: ${siteUrl}/docs/browser/\n- Markdown, CSS, XPath, PDF, and LLM extraction: ${siteUrl}/docs/extraction/\n- Map and extraction guide: ${siteUrl}/docs/map-and-extract/\n- Agent and Maqam guide: ${siteUrl}/docs/agents/\n- Native MCP setup: ${siteUrl}/docs/mcp/\n- Docker API, dashboard, and playground: ${siteUrl}/docs/docker/\n- Provider guide: ${siteUrl}/docs/providers/\n- Serverless guide: ${siteUrl}/docs/serverless/\n- Complete JavaScript and CLI reference: ${siteUrl}/docs/reference/\n- Security: ${siteUrl}/security/\n- Provider status: ${siteUrl}/providers/\n- Benchmark: ${siteUrl}/benchmark/\n- Release 0.4.2: ${siteUrl}/release/\n- Maqam documentation: ${maqamDocs}\n- Source: ${repository}\n- npm: ${npmPackage}\n`, "utf8");
console.log(`Built ${pages.length} pages in ${dist}`);
