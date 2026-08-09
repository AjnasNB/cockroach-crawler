import { blogIndexPage, blogPosts } from "./blog.mjs";
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
const crawleeRepository = "https://github.com/apify/crawlee";
const scrapyRepository = "https://github.com/scrapy/scrapy";
const trafilaturaDocs = "https://trafilatura.readthedocs.io/en/latest/";
const trafilaturaEvaluation = "https://trafilatura.readthedocs.io/en/latest/evaluation.html";
const playwrightRepository = "https://github.com/microsoft/playwright";
const apifyDocs = "https://docs.apify.com/get-started";
const scrapingBeeDocs = "https://www.scrapingbee.com/documentation/";
const qarinahSite = "https://qarinah.io";
const qarinahRepository = "https://github.com/AjnasNB/qarinah";
const cockroachBrowserSite = "https://cockroachbrowser.com";
const cockroachBrowserRepository = "https://github.com/AjnasNB/cockroach-browser";
const browserUseRepository = "https://github.com/browser-use/browser-use";
const stagehandSite = "https://www.stagehand.dev/";
const langGraphDocs = "https://docs.langchain.com/oss/javascript/langgraph/overview";
const openAiAgentsDocs = "https://openai.github.io/openai-agents-js/";
const doclingDocs = "https://docling-project.github.io/docling/";
const contributorTestIssue = `${repository}/issues/20`;
const goodFirstIssues = `${repository}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`;
const helpWantedIssues = `${repository}/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22`;
const discussions = `${repository}/discussions`;
const maqamRepository = "https://github.com/AjnasNB/maqam";
const maqamDocs = "https://maqamagent.com/docs/";
const productLoopRepository = "https://github.com/AjnasNB/productloop-os";
const benchmarkRun = "https://github.com/AjnasNB/cockroach-crawler/actions/runs/29624859893";
const publishedVersion = "0.6.1";
const candidateVersion = "0.7.0-rc.1";
const candidateCommit = "62f270636a019c9bcc617a13fe254640bcd06925";
const candidateSource = `${repository}/tree/${candidateCommit}`;
const candidatePackage = `${npmPackage}/v/${candidateVersion}`;
const paperDoi = "10.5281/zenodo.21851008";
const paperDoiUrl = `https://doi.org/${paperDoi}`;
const paperRecord = "https://zenodo.org/records/21851008";
const documentationVersion = candidateVersion;
const assetVersion = createHash("sha256")
  .update(await readFile(join(root, "assets", "styles.css")))
  .update(await readFile(join(root, "assets", "app.js")))
  .digest("hex")
  .slice(0, 12);
const benchmarkResult = JSON.parse(
  await readFile(join(root, "..", "bench", "results", "ci-validated.json"), "utf8")
);
const coreObservedResult = JSON.parse(
  await readFile(join(root, "..", "bench", "results", "wceb-core-observed-0.7.0.json"), "utf8")
);
const qualityObservedResult = JSON.parse(
  await readFile(join(root, "..", "bench", "results", "wceb-quality-observed-0.7.0.json"), "utf8")
);
const qualityDevelopmentResult = JSON.parse(
  await readFile(join(root, "..", "bench", "results", "wceb-quality-development-0.7.0.json"), "utf8")
);
const qualityFailClosedResult = JSON.parse(
  await readFile(join(root, "..", "bench", "results", "wceb-quality-fail-closed-observed-0.7.0.json"), "utf8")
);
const publicConformanceResult = JSON.parse(
  await readFile(join(root, "..", "bench", "results", "public-conformance-0.7.0.json"), "utf8")
);
const benchmarkElapsedMedian = benchmarkResult.results.elapsedMs.median;
const benchmarkElapsedP95 = benchmarkResult.results.elapsedMs.p95;
const benchmarkThroughputMedian = benchmarkResult.results.pagesPerSecond.median;
const benchmarkMeasuredRuns = benchmarkResult.configuration.measuredRuns;
const benchmarkPages = benchmarkResult.configuration.pages;
const benchmarkNode = benchmarkResult.environment.node;
const benchmarkCommit = benchmarkResult.source.commit.slice(0, 7);
const corePrecision = coreObservedResult.results.precision.toFixed(6);
const coreRecall = coreObservedResult.results.recall.toFixed(6);
const coreF1 = coreObservedResult.results.f1.toFixed(6);
const qualityPrecision = qualityObservedResult.results.precision.toFixed(6);
const qualityRecall = qualityObservedResult.results.recall.toFixed(6);
const qualityF1 = qualityObservedResult.results.f1.toFixed(6);
const qualityRequiredRecall = qualityObservedResult.results.requiredSnippetRecall.toFixed(6);
const qualityUnwanted = qualityObservedResult.results.unwantedSnippetInclusion.toFixed(6);
const qualityDevelopmentPrecision = qualityDevelopmentResult.results.precision.toFixed(6);
const qualityDevelopmentRecall = qualityDevelopmentResult.results.recall.toFixed(6);
const qualityDevelopmentF1 = qualityDevelopmentResult.results.f1.toFixed(6);
const qualityDevelopmentRequired = qualityDevelopmentResult.results.requiredSnippetRecall.toFixed(6);
const qualityDevelopmentUnwanted = qualityDevelopmentResult.results.unwantedSnippetInclusion.toFixed(6);
const failClosedPrecision = qualityFailClosedResult.results.precision.toFixed(6);
const failClosedRecall = qualityFailClosedResult.results.recall.toFixed(6);
const failClosedF1 = qualityFailClosedResult.results.f1.toFixed(6);
const failClosedRequired = qualityFailClosedResult.results.requiredSnippetRecall.toFixed(6);
const failClosedUnwanted = qualityFailClosedResult.results.unwantedSnippetInclusion.toFixed(6);
const failClosedAbstentions = qualityFailClosedResult.results.abstained;
const documentationF1 = qualityObservedResult.results.byPageType.documentation.f1.toFixed(6);
const robotsPassed = publicConformanceResult.robots.passed;
const robotsCases = publicConformanceResult.robots.cases;
const wptPassed = publicConformanceResult.wptUrl.passed;
const wptCases = publicConformanceResult.wptUrl.cases;

const extraPosts = blogPosts({ codeBlock, siteUrl, repository });

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
          softwareVersion: publishedVersion,
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
          runtimePlatform: "Node.js 22, 24, or 26",
          softwareVersion: candidateVersion,
          identifier: candidateCommit
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            faqSchema("Does Cockroach Crawler bypass logins or CAPTCHA?", "No. It does not include stealth, CAPTCHA, paywall, authentication, or authorization bypasses."),
            faqSchema("Can an agent expand its crawl permissions?", "No. The agent adapter treats creator-owned origins and limits as upper bounds and rejects undeclared policy overrides."),
            faqSchema("Does Cockroach Crawler require an API key?", "Public web crawling, public GitHub reads, and the optional pinned yt-dlp YouTube route work without a developer API key. Official API providers remain available when operators configure their credentials. Optional session-backed social reads require a separately installed, operator-controlled OpenCLI runtime."),
            faqSchema("Is browser mode a sandbox?", "No. Browser mode constrains network behavior and resource use, but Chromium still requires process or container isolation for untrusted targets."),
            faqSchema("What is the current published version?", "The npm latest tag is 0.6.1. The reviewed 0.7.0-rc.1 prerelease is also published for opt-in testing on the npm next tag."),
            faqSchema("Does the release candidate provide GitHub, YouTube, X, or Reddit access?", "The 0.7.0 release candidate includes public GitHub REST, official provider adapters, a pinned no-key YouTube route, optional read-only X and Reddit session routes, ordered provider fallback, and explicit doctor output. It does not extract cookies or expose social write operations.")
          ]
        }
      ]
    }
  },
  {
    slug: "docs",
    nav: "Docs",
    title: "Documentation - Cockroach Crawler",
    description: "Copy-paste quickstarts for the Cockroach Crawler CLI, JavaScript API, agent adapter, browser mode, and structured output.",
    body: docsPage(),
    schema: howToSchema()
  },
  {
    slug: "docs/cli",
    active: "Docs",
    title: "CLI guide - Cockroach Crawler",
    description: "Install Cockroach Crawler, run a bounded crawl, choose output formats, and understand the CLI safety controls.",
    body: cliDocsPage()
  },
  {
    slug: "docs/javascript",
    active: "Docs",
    title: "JavaScript API guide - Cockroach Crawler",
    description: "Use Cockroach Crawler from Node.js with typed limits, callbacks, abort signals, pages, failures, and statistics.",
    body: javascriptDocsPage()
  },
  {
    slug: "docs/crawling",
    active: "Docs",
    title: "Deep crawling, strategies, and cache - Cockroach Crawler",
    description: "Configure simple, BFS, DFS, best-first, and adaptive crawls with sitemaps, filters, cache, callbacks, deadlines, and exact resource budgets.",
    body: crawlingDocsPage()
  },
  {
    slug: "docs/browser",
    active: "Docs",
    title: "Browser rendering and evidence - Cockroach Crawler",
    description: "Render JavaScript, wait, click, scroll, flatten open Shadow DOM and readable iframes, capture screenshots and PDFs, and use explicit profiles.",
    body: browserDocsPage()
  },
  {
    slug: "docs/extraction",
    active: "Docs",
    title: "Markdown, CSS, XPath, PDF, and LLM extraction - Cockroach Crawler",
    description: "Turn pages and local PDFs into bounded Markdown and structured records with CSS, XPath, or a host-supplied JSON-Schema-validated model adapter.",
    body: extractionDocsPage()
  },
  {
    slug: "docs/map-and-extract",
    active: "Docs",
    title: "Map and structured extraction guide - Cockroach Crawler",
    description: "Build compact fetch-validated site maps and extract bounded deterministic CSS fields with Cockroach Crawler.",
    body: mapAndExtractDocsPage()
  },
  {
    slug: "docs/agents",
    active: "Docs",
    title: "Agent and Maqam integration - Cockroach Crawler",
    description: "Expose a creator-bounded crawler tool to an agent and optionally route it through Maqam's registered ToolGateway.",
    body: agentDocsPage()
  },
  {
    slug: "docs/mcp",
    active: "Docs",
    title: "Native MCP server - Cockroach Crawler",
    description: "Connect Cockroach Crawler to Codex, Claude Code, and other MCP clients over stdio with deployment-owned origins and crawl ceilings.",
    body: mcpDocsPage()
  },
  {
    slug: "docs/docker",
    active: "Docs",
    title: "Docker API, dashboard, and playground - Cockroach Crawler",
    description: "Run Cockroach Crawler as a token-authenticated local or container API with health checks, crawl and extraction endpoints, a dashboard, and playground.",
    body: dockerDocsPage()
  },
  {
    slug: "docs/providers",
    active: "Docs",
    title: "Provider adapters guide - Cockroach Crawler",
    description: "Inspect stable public, official, no-key, and session-backed read routes without hiding credentials, login state, or provider authority.",
    body: providerDocsPage()
  },
  {
    slug: "docs/serverless",
    active: "Docs",
    title: "Serverless deployment guide - Cockroach Crawler",
    description: "Deploy the restricted Cloudflare Worker crawler tier with fixed origins, a bearer secret, and explicit runtime limits.",
    body: serverlessDocsPage()
  },
  {
    slug: "docs/reference",
    active: "Docs",
    title: "JavaScript and CLI reference - Cockroach Crawler",
    description: "Reference every stable package export, crawl option, page field, statistic, command, subpath, agent surface, and deployment entry point.",
    body: apiReferenceDocsPage()
  },
  ...capabilityCategoryPages(),
  ...capabilityDocsPages(),
  {
    slug: "security",
    nav: "Security",
    title: "Security model - Cockroach Crawler",
    description: "Understand Cockroach Crawler's public-network boundary, DNS pinning, robots policy, browser limits, resource budgets, and disclosure process.",
    body: securityPage()
  },
  {
    slug: "providers",
    nav: "Providers",
    title: "Provider coverage - Cockroach Crawler",
    description: "A precise capability matrix for public HTTP, serverless crawling, GitHub, YouTube, social reads, authentication, sessions, and captions.",
    body: providersPage()
  },
  {
    slug: "compare",
    nav: "Compare",
    title: "Cockroach Crawler alternatives | Crawlers, extractors, browsers, APIs",
    description: "Compare Cockroach Crawler with managed acquisition services, crawler frameworks, specialist extraction, and direct browser automation by product category and evidence boundary.",
    body: comparePage(),
    schema: comparisonSchema(),
    ogType: "article"
  },
  {
    slug: "ecosystem",
    nav: "Ecosystem",
    title: "Open-source toolkit for governed AI agents | Cockroach Crawler",
    description: "A source-linked map of Qarinah, Maqam, Cockroach Browser, Cockroach Crawler, and adjacent open-source agent, browser, web, extraction, and document tools.",
    body: ecosystemPage(),
    schema: ecosystemSchema(),
    ogType: "article",
    lastModified: "2026-08-09"
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
    title: "Local benchmark - Cockroach Crawler",
    description: "Reproduce Cockroach Crawler's local 120-page fixture benchmark and understand what the result does - and does not - measure.",
    body: benchmarkPage()
  },
  {
    slug: "paper",
    nav: "Paper",
    title: "Cockroach Crawler technical white paper | 0.7 release candidate",
    description: "Architecture, trust boundaries, evidence protocol, and reproducibility plan for the Cockroach Crawler 0.7 release candidate. Numerical release claims remain pending the frozen gate.",
    body: paperPage(),
    ogType: "article",
    pdfHref: "/paper/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf",
    schema: paperSchema()
  },
  {
    slug: "media",
    nav: "Media",
    title: "Product demos - Cockroach Crawler",
    description: "Watch captioned Cockroach Crawler demos covering the bounded crawl, source adapters, serverless boundary, and real CLI workflow proof.",
    body: mediaPage(),
    schema: mediaSchema()
  },
  {
    slug: "launch",
    nav: "Launch",
    title: "Launch kit - Cockroach Crawler",
    description: "Use Cockroach Crawler's evidence-led launch plan, channel drafts, release assets, demo videos, and public product roadmap.",
    body: launchPage()
  },
  {
    slug: "roadmap",
    nav: "Roadmap",
    title: "Roadmap - Cockroach Crawler",
    description: "Current capabilities and evidence-gated next steps for provider adapters, serverless profiles, conformance fixtures, and releases.",
    body: roadmapPage()
  },
  {
    slug: "community",
    nav: "Community",
    title: "Community and contributing - Cockroach Crawler",
    description: "Contribute focused changes, reproducible fixtures, documentation, and provider adapters to Cockroach Crawler.",
    body: communityPage()
  },
  {
    slug: "release",
    nav: "Release",
    title: "Release 0.7.0 - Cockroach Crawler",
    description: "Cockroach Crawler 0.7.0 release notes, Node quality extraction, fail-closed admission, benchmark evidence, platform limits, and verification commands.",
    body: releasePage()
  },
  {
    slug: "blog/why-css-selectors-break",
    title: "Why CSS selectors break, and what to do about it | Cockroach Crawler",
    description:
      "Every scraper dies the same way: the markup changes and the selector matches nothing. Here is why brittleness is structural, and how fingerprinting an element by tag family, text, and ancestor subsequence recovers it after a redesign.",
    body: selectorBlogPost(),
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "TechArticle",
          headline: "Why CSS selectors break, and what to do about it",
          description:
            "CSS selectors encode a path, not an identity. Fingerprinting an element by tag family, identity attributes, text, and a longest common subsequence over its ancestor chain survives redesigns that break every selector.",
          datePublished: "2026-08-06",
          dateModified: "2026-08-06",
          author: { "@type": "Person", name: "Ajnas N B" },
          publisher: { "@type": "Organization", name: "Cockroach Crawler", url: siteUrl },
          mainEntityOfPage: `${siteUrl}/blog/why-css-selectors-break/`,
          keywords: [
            "web scraping",
            "css selectors",
            "brittle selectors",
            "self-healing selectors",
            "adaptive scraping",
            "ai web scraping",
            "web crawler"
          ]
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Why do CSS selectors break when a website changes?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A CSS selector encodes a path through the document rather than the identity of the element. Renaming a class, changing a tag, or inserting a wrapper element changes the path while leaving the element itself unchanged, so the selector stops matching something that is still there."
              }
            },
            {
              "@type": "Question",
              name: "What is a self-healing or adaptive selector?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "An adaptive selector stores a fingerprint of the element - its tag family, identity attributes, class set, text content, ancestor chain, and sibling structure - alongside the selector. When the selector stops matching, the fingerprint is scored against every element in the new document and the best match above an explicit threshold is used."
              }
            },
            {
              "@type": "Question",
              name: "How do you avoid matching the wrong element after a redesign?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Require an explicit confidence threshold and abstain below it. A relocation that reports a miss can be retried or escalated, while a confidently wrong element silently corrupts the dataset. Cockroach Crawler defaults to a 0.62 threshold and returns no element below it."
              }
            }
          ]
        }
      ]
    }
  },
  {
    slug: "blog",
    title: "Engineering notes | Cockroach Crawler",
    description: "Mechanisms behind resilient crawling: adaptive selectors, request identity, access challenges, resumable spiders, cookies, proxies, and resource blocking.",
    body: blogIndexPage([{ slug: "blog/why-css-selectors-break", cardTitle: "Why CSS selectors break, and what to do about it", cardSummary: "A selector encodes a path, not an identity. Why brittleness is structural, and how an ancestor subsequence comparison survives a redesign that breaks every selector." }, ...extraPosts])
  },
  ...extraPosts
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
        headline: "Cockroach Crawler alternatives by product category",
        description: "A factual comparison of crawler frameworks, main-content extractors, browser-automation primitives, managed web-data APIs, and Cockroach Crawler's governed evidence surface.",
        datePublished: "2026-07-24",
        dateModified: "2026-08-08",
        author: { "@type": "Person", name: "Ajnas N B" },
        publisher: { "@type": "Organization", name: "Cockroach Crawler", url: siteUrl },
        mainEntityOfPage: `${siteUrl}/compare/`,
        about: [
          { "@type": "SoftwareApplication", name: "Cockroach Crawler", url: siteUrl },
          { "@type": "SoftwareApplication", name: "Firecrawl", url: firecrawlRepository },
          { "@type": "SoftwareApplication", name: "Crawl4AI", url: crawl4aiRepository },
          { "@type": "SoftwareApplication", name: "Crawlee", url: crawleeRepository },
          { "@type": "SoftwareApplication", name: "Scrapy", url: scrapyRepository },
          { "@type": "SoftwareApplication", name: "Trafilatura", url: trafilaturaDocs },
          { "@type": "SoftwareApplication", name: "Playwright", url: playwrightRepository },
          { "@type": "SoftwareApplication", name: "Apify", url: apifyDocs },
          { "@type": "SoftwareApplication", name: "ScrapingBee", url: scrapingBeeDocs }
        ]
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          faqSchema("What is the best AI web crawler for agents?", "There is no universal best crawler. Choose by required layer: managed acquisition, programmable crawling, browser automation, main-content extraction, or governed evidence."),
          faqSchema("Is Cockroach Crawler better than Trafilatura?", "No universal ranking is established. Cockroach Crawler's opt-in Node quality surface is Trafilatura-backed and adds crawling, rendering, policy, structured extraction, and evidence around that extractor."),
          faqSchema("How does Cockroach Crawler differ from direct browser automation?", "Direct automation controls a browser. Cockroach Crawler composes bounded acquisition, extraction, and evidence above an optional browser runtime."),
          faqSchema("Which crawler should I choose for an AI agent?", "Choose the smallest tested contract that matches the job: Cockroach Crawler for bounded local evidence, a managed service for hosted reach, a crawler framework for a custom system, or a direct browser library for page-level automation.")
        ]
      }
    ]
  };
}

function ecosystemSchema() {
  const entries = [
    ["Qarinah", qarinahSite],
    ["Maqam", "https://maqamagent.com"],
    ["Cockroach Browser", cockroachBrowserSite],
    ["Cockroach Crawler", siteUrl],
    ["Playwright", playwrightRepository],
    ["Trafilatura", trafilaturaDocs],
    ["Firecrawl", firecrawlDocs],
    ["Browser Use", browserUseRepository],
    ["Stagehand", stagehandSite],
    ["LangGraph", langGraphDocs],
    ["OpenAI Agents SDK", openAiAgentsDocs],
    ["Docling", doclingDocs]
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "An open-source toolkit for governed AI agents",
        description: "A source-linked guide to composing agent runtimes, project memory, action governance, browser execution, web acquisition, main-content extraction, and document conversion.",
        datePublished: "2026-08-09",
        dateModified: "2026-08-09",
        inLanguage: "en",
        author: { "@type": "Person", name: "Ajnas N B" },
        publisher: { "@type": "Organization", name: "Cockroach Crawler", url: siteUrl },
        mainEntityOfPage: `${siteUrl}/ecosystem/`,
        about: entries.map(([name, url]) => ({ "@type": "SoftwareApplication", name, url }))
      },
      {
        "@type": "ItemList",
        "@id": `${siteUrl}/ecosystem/#projects`,
        name: "Open-source tools for governed AI agent systems",
        numberOfItems: entries.length,
        itemListElement: entries.map(([name, url], index) => ({
          "@type": "ListItem",
          position: index + 1,
          name,
          url
        }))
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Cockroach Crawler", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Ecosystem", item: `${siteUrl}/ecosystem/` }
        ]
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          faqSchema("Do these projects form one automatic control plane?", "No. They are independent projects with different contracts. A deployment must explicitly connect the selected layers and still own identity, secrets, isolation, storage, and operations."),
          faqSchema("Does Cockroach Browser replace Playwright?", "No. Cockroach Browser uses playwright-core and adds an operator-owned authority, evidence, and integration boundary above that browser-automation primitive."),
          faqSchema("Is Cockroach Crawler's quality extractor independent of Trafilatura?", "No. The opt-in Node quality path delegates main-content extraction to exact trafilatura@0.2.0 and adds crawling, rendering, policy, structured extraction, and evidence around that backend."),
          faqSchema("Where do LangGraph and the OpenAI Agents SDK fit?", "They are agent runtime and orchestration choices. They can call governed browser or crawler tools, but neither is replaced by the evidence, memory, or approval layers on this page."),
          faqSchema("When should a team use Firecrawl or Docling?", "Consider Firecrawl when managed web acquisition and hosted operations are central. Consider Docling when document conversion, layout, tables, images, or complex PDF structure are the main problem. Test the exact workload before choosing.")
        ]
      }
    ]
  };
}

function paperSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ScholarlyArticle",
        headline: "Cockroach Crawler: A governed, evidence-preserving web acquisition layer for AI agents",
        alternativeHeadline: "Technical white paper for the 0.7.0 release candidate",
        author: { "@type": "Person", name: "Ajnas N B" },
        datePublished: "2026-08-08",
        dateModified: "2026-08-08",
        inLanguage: "en",
        isAccessibleForFree: true,
        license: "https://creativecommons.org/licenses/by/4.0/",
        mainEntityOfPage: `${siteUrl}/paper/`,
        url: `${siteUrl}/paper/`,
        encoding: {
          "@type": "MediaObject",
          contentUrl: `${siteUrl}/paper/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf`,
          encodingFormat: "application/pdf"
        },
        about: [
          "governed web crawling",
          "AI agent evidence",
          "network policy",
          "main-content extraction",
          "reproducible software evaluation"
        ],
        citation: [
          `${repository}/blob/${candidateCommit}/docs/ARCHITECTURE.md`,
          `${repository}/blob/${candidateCommit}/docs/BENCHMARK.md`,
          `${repository}/blob/${candidateCommit}/SECURITY.md`
        ]
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          faqSchema("Is Cockroach Crawler 0.7 published?", "The reviewed 0.7.0-rc.1 package is published on npm next at commit 62f2706. It is not the stable latest release; npm latest remains 0.6.1."),
          faqSchema("Does this paper claim universal 0.90 crawler quality?", "No. A numerical release claim remains pending until a frozen, source-pinned evaluation passes every declared aggregate, page-type, and fold gate."),
          faqSchema("Can the evaluation be reproduced?", "The paper identifies the source commit, evaluation boundaries, artifact requirements, and release checks. A final DOI and benchmark receipt are added only after the immutable candidate is verified."),
          faqSchema("Is browser mode a security sandbox?", "No. Browser mode constrains network and resource behavior, but hostile JavaScript still requires process or container isolation.")
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
  const primary = pages.filter((page) => ["Home", "Docs", "Providers", "Security", "Benchmark", "Paper"].includes(page.nav));
  const secondary = pages.filter((page) => ["Ecosystem", "Stack", "Compare", "Media", "Launch", "Roadmap", "Community", "Release"].includes(page.nav));
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
        <div><h2>Use</h2><a href="/docs/">Documentation</a><a href="/providers/">Provider status</a><a href="/compare/">Crawler comparison</a><a href="/ecosystem/">Open-source ecosystem</a><a href="/stack/">Governed stack</a><a href="${npmPackage}">npm package</a></div>
        <div><h2>Trust</h2><a href="/security/">Security model</a><a href="/benchmark/">Benchmark method</a><a href="/paper/">Technical paper</a><a href="${repository}/blob/main/SECURITY.md">Report privately</a></div>
        <div><h2>Project</h2><a href="/launch/">Launch kit</a><a href="/roadmap/">Roadmap</a><a href="/community/">Contribute</a><a href="${repository}">Source code</a><a href="${maqamDocs}">Govern with Maqam</a></div>
      </div>
      <div class="shell launch-recognition" aria-label="Launch directories">
        <span>Find Cockroach Crawler on</span>
        <a class="fazier-badge" href="https://fazier.com/launches/cockroachcrawler.com" target="_blank" rel="noreferrer">
          <img src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&amp;theme=light" width="120" height="51" alt="Fazier badge" />
        </a>
      </div>
      <div class="shell legal"><span>MIT software · npm latest ${publishedVersion} · npm next ${candidateVersion}</span><span>Site content last reviewed 8 August 2026</span></div>
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
  <link rel="alternate" hreflang="en" href="${canonical}" />
  <link rel="alternate" hreflang="x-default" href="${canonical}" />
  ${page.pdfHref ? `<link rel="alternate" type="application/pdf" href="${page.pdfHref}" />` : ""}
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
  ${page.pdfHref ? `<meta name="citation_title" content="Cockroach Crawler: A governed, evidence-preserving web acquisition layer for AI agents" />
  <meta name="citation_author" content="Ajnas N B" />
  <meta name="citation_publication_date" content="2026/08/08" />
  <meta name="citation_pdf_url" content="${siteUrl}${page.pdfHref}" />` : ""}
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
        <p class="eyebrow">Governed web acquisition for AI agents</p>
        <h1>Reach the web.<br />Keep the boundary.</h1>
        <p class="lede">Cockroach Crawler turns permitted public pages into source-linked Markdown, JSON, or JSONL while operator-owned policy bounds origins, redirects, robots, requests, bytes, depth, and time.</p>
        <div class="button-row"><a class="button primary" href="/docs/">Read the documentation</a><a class="button secondary" href="/paper/">Open the technical paper</a><a class="text-link hero-source" href="${candidateSource}">Inspect candidate source →</a></div>
        <ul class="signal-list" aria-label="Publication facts"><li>npm latest ${publishedVersion}</li><li>npm next ${candidateVersion}</li><li>Node.js 22 / 24 / 26</li><li>MIT</li></ul>
        <div class="candidate-note"><span>Published prerelease</span><p>The reviewed package is on <a href="${candidatePackage}">npm <code>next</code></a> at <strong>${candidateCommit.slice(0, 7)}</strong>. Stable promotion and numerical leadership claims remain blocked because the frozen evaluation did not pass every gate.</p></div>
      </div>
      <div class="hero-rail" role="list" aria-label="Crawler execution boundary"><span role="listitem">01 normalize</span><span role="listitem">02 resolve</span><span role="listitem">03 respect</span><span role="listitem">04 record</span></div>
    </section>
    <section class="section shell" aria-labelledby="quality-title">
      <p class="eyebrow">New in 0.7.0 · measured on WCEB</p>
      <h2 id="quality-title">Choose the lightweight core or the measured Node quality path.</h2>
      <p class="lede">The opt-in <code>cockroach-crawler/quality</code> surface combines bounded validation and explicit abstention with the exact native <code>trafilatura@0.2.0</code> backend.</p>
      <div class="candidate-facts"><div><span>Observed 511</span><strong>${qualityPrecision} precision</strong></div><div><span>Observed 511</span><strong>${qualityRecall} recall</strong></div><div><span>Observed 511</span><strong>${qualityF1} F1</strong></div><div><span>WCEB development 1,497</span><strong>${qualityDevelopmentF1} F1</strong></div></div>
      ${codeBlock("quality-home", "quality extraction", `import { extractPageQuality } from "cockroach-crawler/quality";

const result = extractPageQuality(html, {
  url: "https://example.com/article",
  profile: "balanced",
  failClosed: true,
  diagnostics: true
});`, "javascript")}
      <div class="callout warning"><strong>Exact scope</strong><p>The 511-page partition is observed development evidence because this project previously iterated against it; it is not untouched held-out proof and does not support a universal 0.90 claim. The native backend supports Windows, macOS, and glibc Linux on x64/ARM64, not Alpine/musl, 32-bit, or other operating systems.</p></div>
      <div class="button-row"><a class="button primary" href="/benchmark/">Inspect every result</a><a class="button secondary" href="${repository}/blob/main/docs/QUALITY.md">Read the quality API</a></div>
    </section>
    <section class="section shell" aria-labelledby="adaptive-title">
      <p class="eyebrow">Adaptive selectors · included</p>
      <h2 id="adaptive-title">Your selectors stop breaking when the site redesigns.</h2>
      <p class="lede">Every scraper dies the same way: the markup changes and <code>h2.title</code> matches nothing. Cockroach Crawler fingerprints the element the first time it sees it, then finds it again by what it <em>is</em> rather than where it sat.</p>
      <div class="split-grid">
        <div>
          <p class="metric-label">Monday</p>
          ${codeBlock("adaptive-before", "original markup", `<li class="product">
  <h2 class="title">Widget A</h2>
  <span class="price">$10</span>
</li>`, "html")}
        </div>
        <div>
          <p class="metric-label">Thursday, after a redesign</p>
          ${codeBlock("adaptive-after", "new markup", `<section>
  <li class="item card">
    <h3 class="name">Widget A</h3>
    <span class="cost">$10</span>
  </li>
</section>`, "html")}
        </div>
      </div>
      <p>The tag changed, both class names changed, and a wrapper was inserted. A CSS selector has nothing left to hold. The fingerprint still resolves:</p>
      ${codeBlock("adaptive-code", "adaptive relocation", `import { ElementFingerprintStore, createAdaptiveLocator } from "cockroach-crawler/adaptive";

const locate = createAdaptiveLocator(
  new ElementFingerprintStore({ directory: ".cockroach/elements" })
);

await locate("product-title", monday, { selector: "h2.title" });
// { locatedBy: "selector",  score: 1,     text: "Widget A" }

await locate("product-title", thursday, { selector: "h2.title" });
// { locatedBy: "relocated", score: 0.796, text: "Widget A",
//   selector: "li.item.card:nth-of-type(1) > h3.name" }`, "javascript")}
      <p>Scoring combines tag family, identity attributes, class set, text, ancestor chain, and sibling structure. Below an explicit threshold it reports a miss instead of guessing, because a confidently wrong element is worse than a reported failure.</p>
      <div class="button-row"><a class="button primary" href="/docs/">Read the selector guide</a><a class="button secondary" href="/blog/why-css-selectors-break/">Why selectors break →</a></div>
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
        ${codeBlock("home-doctor", "published prerelease capability check", `npx -y --package cockroach-crawler@${candidateVersion} cockroach-sources doctor\nnpx -y --package cockroach-crawler@${candidateVersion} cockroach-reach doctor`)}
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
      <div class="section-head"><div><p class="eyebrow">Where it fits</p><h2>Built for evidence pipelines, not access-control workarounds.</h2></div><p>Choose it when an inspectable agent boundary matters more than a managed proxy fleet. <a href="/compare/">Compare crawler frameworks, hosted APIs, extractors, and browser primitives.</a></p></div>
      <div class="fit-grid">
        <article class="fit-yes"><span>Strong fit</span><h3>Documentation and RAG inputs</h3><p>Turn public documentation, help centers, blogs, and owned sites into source-linked records.</p></article>
        <article class="fit-yes"><span>Strong fit</span><h3>Content inventory and QA</h3><p>Capture titles, canonical URLs, response metadata, hashes, links, and readable content.</p></article>
        <article class="fit-no"><span>Know the boundary</span><h3>Creator-owned infrastructure</h3><p>Use the bounded process-local queue and fixed self-hosted proxy gateway, or connect an external durable queue. CAPTCHA, paywall, authentication, and authorization bypasses remain out of scope.</p></article>
      </div>
    </section>
    <section class="section shell proof-section">
      <div><p class="eyebrow">Proof, not promises</p><h2>Reproduce the same gates before you trust a release.</h2><p>The repository tests SSRF defenses, robots failures, redirects, exact concurrency limits, agent-policy immutability, browser egress restrictions, TypeScript consumption, and package contents.</p><div class="button-row"><a class="button primary" href="/benchmark/">See the benchmark method</a><a class="button secondary" href="/release/">Run release checks</a></div></div>
      ${codeBlock("home-check", "release gate", "npm ci --ignore-scripts\nnpm run release:check")}
    </section>
    <section class="section shell faq-section"><div><p class="eyebrow">Questions answered plainly</p><h2>Know the limits before installing.</h2></div><div class="faq-list">
      <details><summary>Does it bypass logins, CAPTCHA, or paywalls?</summary><p>No. Cockroach Crawler does not include stealth, CAPTCHA, paywall, authentication, or authorization bypasses.</p></details>
      <details><summary>Can a model enable private-network crawling?</summary><p>No. Private-network access is a trusted-operator library/CLI option and cannot be enabled through the strict agent input schema.</p></details>
      <details><summary>Can the 0.7 candidate read GitHub, YouTube, X, or Reddit?</summary><p>The 0.7 release candidate includes public GitHub REST, official provider adapters, a restricted no-key YouTube route, and optional read-only X and Reddit session providers. Session providers require explicit local installation and never expose posting, liking, following, messaging, deleting, cookie extraction, or profile-file import.</p></details>
      <details><summary>Can the candidate run in a serverless edge function?</summary><p>The 0.7 release candidate includes a self-hosted, token-authenticated, rate-limited Cloudflare Worker profile for deployment-configured HTTPS origins. It is bounded, but it does not resolve, classify, or pin DNS answers; an allowlisted hostname can resolve internally. Use operator-owned or independently trusted hostnames plus infrastructure egress policy.</p></details>
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
    "Documentation · 0.7.0 release candidate": "/docs/map-and-extract/",
    "Documentation · Agents": "/docs/agents/",
    "Documentation · Providers": "/docs/providers/",
    "Documentation · Serverless": "/docs/serverless/"
  }[eyebrow] ?? "";
  return `
    <section class="page-hero shell"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lede">${lede}</p><div class="page-actions"><a class="button secondary" href="/docs/">All documentation</a><a class="button secondary" href="${repository}">Source on GitHub</a></div></section>
    <details class="docs-mobile-directory shell" open><summary>Browse documentation</summary>${docsSidebar(currentPath, "mobile")}</details>
    <div class="docs-manual-layout docs-focused-layout shell">
      <aside class="docs-sidebar">${docsSidebar(currentPath, "desktop")}</aside>
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
    "Documentation · 0.7.0 release candidate",
    "Map a site or select exact fields without an extraction service.",
    "The 0.7.0 release candidate includes searchable fetch-validated maps, deterministic CSS/XPath/regex extraction, and an opt-in Node quality backend alongside PDF, browser, cache, and deep-crawl modules.",
    `<section><p class="eyebrow">01 · Searchable map</p><h2>Return the most relevant URL evidence without page bodies.</h2><p><code>mapSite</code> uses the normal crawler transport. Every entry passed robots, origin, redirect, DNS, sensitive-path, request, byte, queue, and duration policy before it was ranked and returned. Search only filters fetched entries; it never discovers an otherwise inadmissible URL.</p>${codeBlock("map-cli-guide", "CLI", `cockroach-crawl https://example.com/docs \\
  --map \\
  --map-search "authentication migration" \\
  --map-results 25 \\
  --sitemaps \\
  --max-pages 200 \\
  --max-requests 800 \\
  --output map.json`)}${codeBlock("map-api-guide", "map.mjs", `import { mapSite } from "cockroach-crawler";

const result = await mapSite({
  seeds: ["https://example.com/docs"],
  includeSitemaps: true,
  search: "authentication migration",
  maxResults: 25,
  maxPages: 200,
  maxRequests: 800,
  maxDurationMs: 120_000
});

console.log(result.search);
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
    `<section><p class="eyebrow">01 · Doctor</p><h2>Inspect the current runtime.</h2>${codeBlock("provider-doctor-guide", "published npm prerelease", `npx -y --package cockroach-crawler@${candidateVersion} cockroach-sources doctor --json\nnpx -y --package cockroach-crawler@${candidateVersion} cockroach-reach doctor --json`)}</section>
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

function docsSlug(value) {
  return String(value)
    .toLowerCase()
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function capabilityCategoryPath(category) {
  return `/docs/capabilities/${docsSlug(category)}/`;
}

function capabilityPath(feature) {
  return `${capabilityCategoryPath(feature[0])}${docsSlug(feature[1])}/`;
}

function capabilityCategoryDetails(category) {
  const details = {
    Crawl: {
      title: "Crawl and discover",
      lede: "Choose seeds, traversal strategy, discovery rules, budgets, redirects, cancellation, caching, and compact maps.",
      manual: ["/docs/crawling/", "Open the crawling manual"],
      output: "A crawl returns normalized page records, structured failures, and aggregate statistics. Mapping returns compact fetch-validated URL entries.",
      boundary: "Traversal changes queue order and discovery depth. It never expands origins, network reach, robots policy, or creator-owned resource ceilings."
    },
    Browser: {
      title: "Render and capture",
      lede: "Render JavaScript, perform bounded interaction, flatten readable component trees, and capture screenshot or PDF evidence.",
      manual: ["/docs/browser/", "Open the browser manual"],
      output: "Browser runs enrich page records with rendered HTML and requested evidence artifacts, including byte size and SHA-256 metadata.",
      boundary: "Browser mode is optional. Page hooks and persistent profiles are operator-owned inputs, and hostile pages still require process or container isolation."
    },
    Extract: {
      title: "Extract agent-ready data",
      lede: "Produce readable Markdown, deterministic fields, PDF text, metadata, hashes, or schema-validated model output.",
      manual: ["/docs/extraction/", "Open the extraction manual"],
      output: "Extraction returns bounded data plus warnings while page records retain their canonical URL, retrieval time, hash, parent, depth, and redirect history.",
      boundary: "Deterministic extractors operate on inactive content. Optional model extraction uses a host-supplied adapter and rejects output that fails the supplied JSON Schema."
    },
    Sources: {
      title: "Reach public sources",
      lede: "Inspect provider capability, read public sources, and route optional official or operator-installed read-only providers.",
      manual: ["/docs/providers/", "Open the provider manual"],
      output: "Provider routes return normalized research records with source identity, canonical URL, retrieval metadata, hashes, warnings, and provider-specific payloads.",
      boundary: "Every route reports its access state before dispatch. Credentials and read-only sessions are installed by the operator and are never extracted from a browser profile."
    },
    Agents: {
      title: "Connect agents and MCP",
      lede: "Expose strict crawler tools to agent runtimes through JavaScript, native MCP, or an optional Maqam gateway.",
      manual: ["/docs/mcp/", "Open the agent and MCP manual"],
      output: "Agent surfaces return the same pages, failures, statistics, maps, extraction data, and machine-readable capability records as the underlying library.",
      boundary: "Model-facing input may narrow but cannot broaden host-owned origins, budgets, credentials, browser hooks, profiles, or resource ceilings."
    },
    Deploy: {
      title: "Deploy and operate",
      lede: "Run the crawler through a token-authenticated Node or Docker API, a local playground, or a fixed-origin Worker profile.",
      manual: ["/docs/docker/", "Open the deployment manual"],
      output: "Deployment surfaces expose health, capability, crawl, map, and extraction responses without changing the crawler's record contracts.",
      boundary: "The API token, origin allowlist, browser installation, storage, egress policy, and runtime resource limits remain deployment-owned."
    },
    Security: {
      title: "Keep authority bounded",
      lede: "Admit public destinations, pin DNS decisions, validate redirects, enforce exact budgets, and stop at access challenges.",
      manual: ["/security/", "Open the security model"],
      output: "Policy decisions appear as structured failures, warnings, skipped counters, transport attempts, and final crawl statistics.",
      boundary: "The Node transport rejects undeclared or unsafe reach. The Worker profile is a smaller fixed-origin fetch tier and does not provide Node DNS pinning."
    }
  };
  return details[category];
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
    ]],
    ["Capability library", [
      ["/docs/capabilities/", "All 50 capabilities"],
      ...[...new Set(crawlerFeatureCatalog().map(([category]) => category))]
        .map((category) => [capabilityCategoryPath(category), capabilityCategoryDetails(category).title])
    ]]
  ];
}

function docsSidebar(currentPath, instance = "desktop") {
  const activeCategory = crawlerFeatureCatalog()
    .map(([category]) => category)
    .find((category) => currentPath.startsWith(capabilityCategoryPath(category)));
  const currentFeatures = activeCategory
    ? crawlerFeatureCatalog().filter(([category]) => category === activeCategory)
    : [];
  return `<nav class="docs-sidebar-nav" aria-label="Documentation sections" data-docs-nav-expanded="true">
    <a class="docs-sidebar-home" href="/docs/"><span>Documentation</span><strong>next ${documentationVersion}</strong></a>
    ${docsNavigationGroups().map(([group, links]) => {
      const active = links.some(([href]) => href === currentPath || (href !== "/docs/" && currentPath.startsWith(href)));
      const id = `docs-nav-${instance}-${docsSlug(group)}`;
      return `<section class="docs-sidebar-section${active ? " is-active" : ""}" aria-labelledby="${id}"><h2 id="${id}">${group}</h2><ul>${links.map(([href, label]) => `<li><a href="${href}"${href === currentPath ? ' aria-current="page"' : ""}>${label}</a></li>`).join("")}</ul></section>`;
    }).join("")}
    ${activeCategory ? `<section class="docs-sidebar-children" aria-labelledby="docs-nav-${instance}-current-category"><h2 id="docs-nav-${instance}-current-category">${activeCategory} capability pages</h2><ul>${currentFeatures.map((feature) => {
      const href = capabilityPath(feature);
      return `<li><a href="${href}"${href === currentPath ? ' aria-current="page"' : ""}>${feature[1]}</a></li>`;
    }).join("")}</ul></section>` : ""}
  </nav>`;
}

function docsManualPage({ currentPath, eyebrow, title, lede, toc, content }) {
  const currentLabel = docsNavigationGroups()
    .flatMap(([, links]) => links)
    .find(([href]) => href === currentPath)?.[1] ?? "Documentation";
  const tocLinks = toc.map(([id, label], index) => `<a href="#${id}"><span>${String(index + 1).padStart(2, "0")}</span>${label}</a>`).join("");
  return `
    <section class="page-hero shell docs-manual-hero" aria-labelledby="docs-manual-title">
      <nav class="docs-breadcrumbs" aria-label="Breadcrumb"><a href="/docs/">Documentation</a><span aria-hidden="true">/</span><span aria-current="page">${currentLabel}</span></nav>
      <div class="docs-hero-labels"><span>${eyebrow}</span><span>Prerelease ${documentationVersion}</span></div>
      <h1 id="docs-manual-title">${title}</h1>
      <p class="lede">${lede}</p>
      <div class="page-actions"><a class="button primary" href="#${toc[0][0]}">Read ${toc[0][1]}</a><a class="button secondary" href="/docs/reference/">View API reference</a></div>
    </section>
    <details class="docs-mobile-directory shell" open><summary>Browse documentation</summary>${docsSidebar(currentPath, "mobile")}</details>
    <details class="mobile-toc shell"><summary>In this manual</summary><nav aria-label="In this manual">${tocLinks}</nav></details>
    <div class="docs-manual-layout shell">
      <aside class="docs-sidebar">${docsSidebar(currentPath, "desktop")}</aside>
      <article class="docs-manual-content">${content}</article>
      <aside class="toc docs-manual-toc"><nav aria-label="In this manual"><h2>In this manual</h2>${tocLinks}</nav></aside>
    </div>`;
}

function crawlingDocsPage() {
  return docsManualPage({
    currentPath: "/docs/crawling/",
    eyebrow: "Core manual · crawling",
    title: "Deep crawling, traversal, and cache",
    lede: "Spend requests on the pages that matter. Run a simple crawl, cover a hierarchy with BFS or DFS, rank admitted URLs with best-first or adaptive relevance, and reuse results through a bounded persistent cache.",
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
  search: "authentication migration",
  maxResults: 25,
  maxPages: 200
});

console.table(map.entries.map(({ url, title, depth, linkCount, contentHash, score }) => ({
  url, title, depth, linkCount, contentHash, score
})));`, "javascript")}<p>Every map entry is fetch-validated. Full page records additionally include readable text, Markdown, canonical URL, metadata, redirect history, parent URL, response headers, artifacts, warnings, and browser details when enabled.</p></section>`
  });
}

function browserDocsPage() {
  return docsManualPage({
    currentPath: "/docs/browser/",
    eyebrow: "Core manual · browser",
    title: "Browser rendering and evidence",
    lede: "Render the page and keep the evidence. Use optional Playwright for JavaScript applications, explicit interaction, bounded virtual scroll, open Shadow DOM, readable same-origin frames, screenshots, PDFs, hooks, storage state, and dedicated profiles.",
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
    title: "Extraction, quality admission, Markdown, and PDF",
    lede: "Turn page bytes into model-ready records. Use the dependency-light core, opt into the measured Node quality backend, select exact CSS, XPath, or restricted regex fields, parse bounded PDFs, or connect your own model adapter behind JSON Schema validation.",
    toc: [
      ["markdown", "Text and Markdown"],
      ["quality", "Node quality extraction"],
      ["css", "CSS extraction"],
      ["xpath", "XPath extraction"],
      ["regex", "Restricted regex extraction"],
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
      <section id="quality"><p class="eyebrow">02 · Opt-in Node backend</p><h2>Use balanced quality with optional fail-closed admission.</h2>${codeBlock("manual-quality", "quality-extract.mjs", `import { extractPageQuality } from "cockroach-crawler/quality";

const result = extractPageQuality(html, {
  url: "https://example.com/article",
  profile: "balanced",
  failClosed: true,
  diagnostics: true
});

if (result.status === "abstained") {
  console.error(result.abstention.reasons);
} else {
  console.log(result.markdown);
}`, "javascript")}<p>The default profile is <code>balanced</code>; <code>precision</code> and <code>recall</code> are explicit alternatives. Fail-closed mode returns no body for admitted shell, challenge, size, quality, or output-budget failures. It never silently substitutes the core extractor.</p><div class="callout warning"><strong>Native platform boundary</strong><p>This subpath requires exact <code>trafilatura@0.2.0</code>. Supported prebuilt targets are Windows x64/ARM64, macOS x64/ARM64, and glibc Linux x64/ARM64. Alpine/musl, 32-bit, and other operating systems are unsupported. Core and serverless do not import this backend.</p></div><p>Observed WCEB evidence: 0.894101 precision, 0.926022 recall, and 0.890524 F1 on 511 previously observed pages; 0.852784 precision, 0.896259 recall, and 0.847064 F1 on the 1,497-page development split. These are development results, not a universal 0.90 claim.</p><a class="text-link" href="/benchmark/">Inspect raw evidence and scope →</a></section>
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
      <section id="regex"><p class="eyebrow">04 · Deterministic</p><h2>Extract bounded text patterns without executing code.</h2>${codeBlock("manual-regex-extract", "regex-extract.mjs", `import { extractWithRegex } from "cockroach-crawler/extractors";

const result = extractWithRegex(page.text, {
  fields: {
    invoiceId: { pattern: "Invoice\\\\s+#([A-Z0-9-]+)", group: 1 },
    amounts: {
      pattern: "\\\\$([0-9]+(?:\\\\.[0-9]{2})?)",
      group: 1,
      multiple: true,
      limit: 50
    }
  },
  maxFields: 20,
  maxItemsPerField: 100,
  maxInputCharacters: 2_000_000,
  maxTotalCharacters: 250_000
});

console.log(result.data, result.warnings);`, "javascript")}<p>The regex strategy rejects lookarounds, backreferences, unsupported flags, suspicious nested repetition, and output beyond field, item, value, or total-character limits. It is intended for compact deterministic patterns, not arbitrary user-supplied regular expressions.</p></section>
      <section id="llm"><p class="eyebrow">05 · Optional model</p><h2>Bring the model client; keep validation in the host.</h2>${codeBlock("manual-llm-extract", "llm-extract.mjs", `import { extractWithLlm } from "cockroach-crawler/extractors";

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
      <section id="pdf-parse"><p class="eyebrow">06 · Documents</p><h2>Parse explicit local PDF bytes without a hosted service.</h2>${codeBlock("manual-pdf-parse", "parse-pdf.mjs", `import { readFile } from "node:fs/promises";
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
      <section id="provenance"><p class="eyebrow">07 · Output</p><h2>Index content without losing the source record.</h2><p>Keep canonical URL, fetched time, response status, content type, byte size, ETag, Last-Modified, redirect chain, robots decision, parent URL, depth, content hash, extraction warnings, failures, and crawl statistics alongside derived chunks. Treat web text as untrusted data - not as agent instructions.</p><a class="text-link" href="/docs/reference/#page-record">Open the complete page-record reference →</a></section>`
  });
}

function mcpDocsPage() {
  return docsManualPage({
    currentPath: "/docs/mcp/",
    eyebrow: "Integration manual · MCP",
    title: "MCP and agent integration",
    lede: "Run a native stdio server for Codex, Claude Code, desktop clients, or your own MCP host. The process refuses to start until the deployment supplies at least one allowed origin.",
    toc: [
      ["mcp-install", "Install"],
      ["mcp-run", "Run over stdio"],
      ["mcp-config", "Client configuration"],
      ["mcp-tools", "Tools and resource"],
      ["mcp-registry", "Registry metadata"],
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
      "args": ["-y", "cockroach-crawler@0.7.0-rc.1", "cockroach-mcp"],
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
      <section id="mcp-tools"><p class="eyebrow">04 · Surface</p><h2>Three read-only tools and one capability resource.</h2><div class="reference-cards"><article><strong>crawl</strong><p>Returns pages, failures, and statistics. Inputs: URLs, max pages, max depth, and optional relevance query.</p></article><article><strong>map_site</strong><p>Returns compact fetch-validated entries and can rank them with an optional <code>search</code> query and <code>maxResults</code> ceiling.</p></article><article><strong>extract_structured</strong><p>Runs deterministic CSS fields against caller-supplied inactive HTML.</p></article><article><strong>cockroach://capabilities</strong><p>Reports version, tools, fixed policy, and explicit exclusions as JSON.</p></article></div></section>
      <section id="mcp-registry"><p class="eyebrow">05 · Discovery</p><h2>Ship metadata that the official MCP Registry can verify.</h2><p>The npm package declares <code>mcpName: io.github.AjnasNB/cockroach-crawler</code>. The root <code>server.json</code> uses the official schema, repeats that exact server name and package version, and declares the <code>cockroach-mcp</code> stdio transport. Registry publication remains a maintainer release action after the matching npm artifact exists.</p>${codeBlock("manual-mcp-registry", "terminal", `npm view cockroach-crawler mcpName version
npx mcp-publisher login github
npx mcp-publisher publish`)}</section>
      <section id="mcp-authority"><p class="eyebrow">06 · Authority</p><h2>Tool input can narrow the deployment; it cannot widen it.</h2><p>The request may lower <code>maxPages</code>, <code>maxDepth</code>, or map result count. It cannot add an allowed origin, enable private networks, disable robots, add browser hooks or profiles, provide credentials or proxy endpoints, raise request or duration ceilings, or request a write action. A relevance query changes queue or result order but does not expand admitted URLs.</p></section>
      <section id="mcp-programmatic"><p class="eyebrow">07 · Embed</p><h2>Create the same MCP server in application code.</h2>${codeBlock("manual-mcp-programmatic", "mcp-server.mjs", `import {
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
    title: "Docker API, dashboard, and playground",
    lede: "Package fixed crawl authority into a non-root Node container with health, responsive playground, dedicated crawl and searchable-map endpoints, deterministic extraction, and a bounded process-local job queue.",
    toc: [
      ["docker-build", "Build and run"],
      ["docker-env", "Environment"],
      ["docker-api", "HTTP API"],
      ["docker-jobs", "Asynchronous jobs"],
      ["docker-playground", "Dashboard"],
      ["docker-production", "Production checklist"]
    ],
    content: `
      <section id="docker-build"><p class="eyebrow">01 · Container</p><h2>Build the reviewed Dockerfile and run as an unprivileged user.</h2>${codeBlock("manual-docker-build", "terminal", `docker build -t cockroach-crawler:0.7.0 .

docker run --rm -p 3878:3878 \\
  -e COCKROACH_API_TOKEN="replace-with-at-least-16-random-characters" \\
  -e COCKROACH_ALLOWED_ORIGINS="https://docs.example.com" \\
  -e COCKROACH_MAX_PAGES=20 \\
  -e COCKROACH_MAX_DEPTH=2 \\
  -e COCKROACH_MAX_REQUESTS=100 \\
  cockroach-crawler:0.7.0`)}</section>
      <section id="docker-env"><p class="eyebrow">02 · Configuration</p><h2>Keep authority in deployment environment variables.</h2><div class="table-wrap" tabindex="0" role="region" aria-label="Docker environment variables"><table><thead><tr><th>Variable</th><th>Purpose</th><th>Default</th></tr></thead><tbody><tr><td><code>COCKROACH_API_TOKEN</code></td><td>Required bearer token for API routes.</td><td>None</td></tr><tr><td><code>COCKROACH_ALLOWED_ORIGINS</code></td><td>Required comma-separated HTTP(S) origins.</td><td>None</td></tr><tr><td><code>COCKROACH_HOST</code></td><td>Listen address.</td><td><code>0.0.0.0</code></td></tr><tr><td><code>COCKROACH_PORT</code></td><td>Listen port.</td><td><code>3878</code></td></tr><tr><td><code>COCKROACH_MAX_PAGES</code></td><td>Maximum pages a request may ask for.</td><td><code>20</code></td></tr><tr><td><code>COCKROACH_MAX_DEPTH</code></td><td>Maximum traversal depth.</td><td><code>2</code></td></tr><tr><td><code>COCKROACH_MAX_REQUESTS</code></td><td>Complete request ceiling.</td><td><code>100</code></td></tr><tr><td><code>COCKROACH_MAX_DURATION_MS</code></td><td>Complete crawl deadline.</td><td><code>120000</code></td></tr><tr><td><code>COCKROACH_JOB_CONCURRENCY</code></td><td>Maximum simultaneous queued jobs.</td><td><code>2</code></td></tr><tr><td><code>COCKROACH_JOB_MAX_PENDING</code></td><td>Maximum queued plus running jobs.</td><td><code>100</code></td></tr><tr><td><code>COCKROACH_JOB_MAX_RETAINED</code></td><td>Maximum completed job records retained in memory.</td><td><code>1000</code></td></tr><tr><td><code>COCKROACH_JOB_MAX_RESULT_BYTES</code></td><td>Maximum serialized result size per job.</td><td><code>20000000</code></td></tr></tbody></table></div></section>
      <section id="docker-api"><p class="eyebrow">03 · HTTP API</p><h2>Use dedicated crawl, map, and extraction routes.</h2>${codeBlock("manual-docker-health", "health", `curl http://127.0.0.1:3878/health`)}${codeBlock("manual-docker-crawl", "crawl request", `curl http://127.0.0.1:3878/v1/crawl \\
  --request POST \\
  --header "Authorization: Bearer $COCKROACH_API_TOKEN" \\
  --header "Content-Type: application/json" \\
  --data '{
    "seeds": ["https://docs.example.com/start"],
    "maxPages": 5,
    "maxDepth": 1,
    "query": "authentication"
  }'`)}${codeBlock("manual-docker-map", "searchable map request", `curl http://127.0.0.1:3878/v1/map \\
  --request POST \\
  --header "Authorization: Bearer $COCKROACH_API_TOKEN" \\
  --header "Content-Type: application/json" \\
  --data '{
    "seeds": ["https://docs.example.com"],
    "search": "authentication migration",
    "maxResults": 25,
    "maxPages": 100
  }'`)}${codeBlock("manual-docker-extract", "extract request", `curl http://127.0.0.1:3878/v1/extract \\
  --request POST \\
  --header "Authorization: Bearer $COCKROACH_API_TOKEN" \\
  --header "Content-Type: application/json" \\
  --data '{
    "strategy": "regex",
    "url": "https://example.com/item",
    "html": "<main><h1>Example</h1></main>",
    "fields": { "title": { "pattern": "<h1>([^<]+)</h1>", "group": 1 } }
  }'`)}</section>
      <section id="docker-jobs"><p class="eyebrow">04 · Queue</p><h2>Run bounded crawl or map work asynchronously.</h2>${codeBlock("manual-docker-jobs", "submit and inspect", `JOB_ID=$(curl --silent http://127.0.0.1:3878/v1/jobs \\
  --request POST \\
  --header "Authorization: Bearer $COCKROACH_API_TOKEN" \\
  --header "Content-Type: application/json" \\
  --data '{"operation":"map","input":{"seeds":["https://docs.example.com"],"search":"oauth","maxPages":50}}' \\
  | jq -r .id)

curl --header "Authorization: Bearer $COCKROACH_API_TOKEN" \\
  "http://127.0.0.1:3878/v1/jobs/$JOB_ID"

curl --request DELETE \\
  --header "Authorization: Bearer $COCKROACH_API_TOKEN" \\
  "http://127.0.0.1:3878/v1/jobs/$JOB_ID"`)}<p>The bundled queue is bounded and process-local. It survives neither a process restart nor horizontal failover. For durable distributed work, keep Cockroach Crawler as the worker and connect the same typed API to an operator-owned queue.</p></section>
      <section id="docker-playground"><p class="eyebrow">05 · Dashboard</p><h2>Open the responsive playground at the service root.</h2><p>Visit <code>http://127.0.0.1:3878/</code>, enter the bearer token and an admitted URL, then choose compact map or evidence crawl. The form can lower page count but cannot change origins, credentials, robots behavior, browser authority, or server ceilings.</p></section>
      <section id="docker-production"><p class="eyebrow">06 · Production</p><h2>Put the API behind the controls your deployment needs.</h2><ul class="check-list"><li>Use a long random bearer token from a secret manager</li><li>Keep the origin list small and deployment owned</li><li>Terminate TLS at a trusted reverse proxy or service mesh</li><li>Apply external request-rate and egress controls</li><li>Keep response and request body ceilings finite</li><li>Mount an artifact or cache directory only when the service needs it</li><li>Use an external durable queue when restart-safe jobs are required</li><li>Run the exact tagged image and verify package provenance</li></ul><a class="text-link" href="/security/">Review the complete production boundary →</a></section>`
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
    ["search / maxResults", "string / number", "Map-only ranking query and returned-entry ceiling; never expands fetched or admitted URLs."],
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
    ["documents / extractors", "PDF parsing, XPath, restricted regex, and host-supplied LLM schema extraction"],
    ["browser / providers", "Browser helpers and challenge-aware provider escalation"],
    ["jobs", "Bounded process-local asynchronous job queue"],
    ["mcp / server / serverless", "Native MCP, authenticated Node API with dedicated map/jobs routes, and Worker profile"],
    ["source-conformance", "Provider-record and status conformance helpers"]
  ];
  const table = (headers, rows, label) => `<div class="table-wrap" tabindex="0" role="region" aria-label="${label}"><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  return docsManualPage({
    currentPath: "/docs/reference/",
    eyebrow: "0.7.0 release candidate · reference",
    title: "Complete JavaScript and CLI reference",
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
    ["Crawl", "Searchable site map", "Rank and limit only the fetch-validated entries already admitted by the crawl policy.", "mapSite({ seeds: [url], search: \"oauth migration\", maxResults: 25 })"],
    ["Browser", "JavaScript rendering", "Render client-side applications through optional Playwright Chromium.", "browser: { waitUntil: \"networkidle\" }"],
    ["Browser", "Selector waits and clicks", "Wait for one state and perform an explicit bounded click sequence.", "browser: { waitFor: \".ready\", click: [\"button.load-more\"] }"],
    ["Browser", "Infinite and virtual scroll", "Scroll by bounded steps until content height stabilizes.", "browser: { scroll: { maxSteps: 20, stableIterations: 3 } }"],
    ["Browser", "Open Shadow DOM flattening", "Clone bounded open shadow roots into the final extraction snapshot.", "browser: { flattenShadowDom: true }"],
    ["Browser", "Readable iframe flattening", "Clone bounded same-origin frame content while preserving cross-origin isolation.", "browser: { flattenIframes: true }"],
    ["Browser", "Screenshots", "Capture full-page PNG or JPEG evidence with byte size and SHA-256.", "browser: { screenshot: { format: \"png\", fullPage: true } }"],
    ["Browser", "PDF generation", "Print rendered pages to PDF with format, background, landscape, and CSS-page controls.", "browser: { pdf: { format: \"A4\", printBackground: true } }"],
    ["Browser", "Trusted page hooks", "Run reviewed operator functions inside an authorized page; hooks are excluded from model input.", "browser: { hooks: [reviewedHook], allowPageJavaScript: true }"],
    ["Browser", "Persistent profiles", "Use an explicit dedicated browser profile directory instead of discovering a local user profile.", "browser: { profileDirectory: \".profiles/docs\", allowPersistentProfile: true }"],
    ["Extract", "Readable Markdown", "Use the dependency-light core or the opt-in Node quality backend to produce bounded text and Markdown for retrieval, summarization, and indexing.", "extractPageQuality(html, { profile: \"balanced\" }).markdown"],
    ["Extract", "CSS schema extraction", "Read visible text, cleaned HTML, or named attributes with per-field and total ceilings.", "extractStructured(html, url, { fields: { title: \"h1\" } })"],
    ["Extract", "XPath extraction", "Select deterministic fields from inactive markup using bounded XPath expressions.", "extractWithXPath(html, url, { fields: { title: \"//h1\" } })"],
    ["Extract", "Restricted regex extraction", "Extract compact text patterns with safe flags and hard input, field, item, value, and total ceilings.", "extractWithRegex(text, { fields: { id: { pattern: \"ID: ([A-Z0-9-]+)\", group: 1 } } })"],
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
    ["Deploy", "Authenticated Docker API", "Run health, playground, crawl, and extraction endpoints behind a deployment-owned bearer token.", "docker run -p 3878:3878 -e COCKROACH_API_TOKEN=... cockroach-crawler:0.7.0"],
    ["Deploy", "Dashboard and playground", "Open the responsive local playground while the server keeps fixed crawl authority.", "cockroach-server"],
    ["Deploy", "Bounded asynchronous jobs", "Submit crawl or map work to a process-local queue with concurrency, pending, retained-result, and result-byte ceilings.", "createBoundedJobQueue({ concurrency: 2, maxPending: 100, maxRetained: 500 })"],
    ["Deploy", "Cloudflare Worker profile", "Deploy a small token-authenticated fetch profile for deployment-configured HTTPS origins.", "npx wrangler deploy --config worker/wrangler.jsonc"],
    ["Security", "Public-network admission", "Reject credentials, unsafe schemes, private and metadata destinations before the Node transport connects.", "resolveUrlTarget(url)"],
    ["Security", "DNS pinning and origin policy", "Validate the complete address set and bind admitted requests to approved public addresses and origins.", "allowedOrigins: [\"https://docs.example.com\"]"],
    ["Security", "Resource ceilings", "Cap pages, requests, queue, depth, bytes, retries, redirects, callbacks, and total duration.", "maxPages: 25, maxRequests: 120, maxTotalBytes: 10_000_000"],
    ["Security", "Fixed self-hosted proxy gateway", "Route an approved read request through one operator-owned gateway without accepting model-selected endpoints or credentials.", "createProxyGatewayProvider({ endpoint: \"https://proxy.internal.example/read\", token })"],
    ["Security", "Challenge-aware provider escalation", "Record transport attempts and stop at access challenges unless an explicit approved provider handles them.", "createEscalationRouter({ providers, maxAttempts: 2 })"]
  ];
}

function capabilityPrerequisite(category) {
  const prerequisites = {
    Crawl: "Install the package on maintained Node.js 22, 24, or 26. Start from explicit HTTP(S) seeds and declare finite page, request, byte, depth, queue, and duration budgets.",
    Browser: "Install Cockroach Crawler and its optional Playwright peer, then install a compatible Chromium build. Enable browser behavior only in creator-owned configuration.",
    Extract: "Install the package and supply inactive HTML, a crawler page record, or explicit local PDF bytes. Optional model extraction also requires a host adapter and JSON Schema.",
    Sources: "Install the package and run the provider doctor first. Public routes need no credential; official and session-backed routes require explicit operator configuration.",
    Agents: "Install the package in the agent host. The host must own the origin allowlist and resource ceilings before the tool or MCP server starts.",
    Deploy: "Choose Node.js 22, 24, or 26 or the published container. Configure a long API token, fixed allowed origins, and infrastructure-level resource and egress controls.",
    Security: "Declare the smallest permitted origin set and finite budgets. Treat fetched content as untrusted data and isolate browser execution from sensitive host resources."
  };
  return prerequisites[category];
}

function capabilityQuickstart(category) {
  const quickstarts = {
    Crawl: `import { crawlDetailed } from "cockroach-crawler";

const result = await crawlDetailed({
  seeds: ["https://docs.example.com"],
  allowedOrigins: ["https://docs.example.com"],
  maxPages: 25,
  maxRequests: 120,
  maxDurationMs: 60_000
});`,
    Browser: `import { crawl } from "cockroach-crawler";

const pages = await crawl({
  seeds: ["https://app.example.com/public"],
  browser: { waitUntil: "networkidle" },
  maxPages: 3
});`,
    Extract: `import { extractStructured } from "cockroach-crawler";

const result = extractStructured(html, pageUrl, {
  fields: { title: "h1" },
  maxTotalValues: 100,
  maxTotalCharacters: 100_000
});`,
    Sources: `npx cockroach-sources doctor --json
npx cockroach-reach doctor --json`,
    Agents: `COCKROACH_ALLOWED_ORIGINS=https://docs.example.com \\
COCKROACH_MAX_PAGES=10 \\
npx cockroach-mcp`,
    Deploy: `docker run --rm -p 3878:3878 \\
  -e COCKROACH_API_TOKEN="replace-with-a-long-random-secret" \\
  -e COCKROACH_ALLOWED_ORIGINS="https://docs.example.com" \\
  cockroach-crawler:${publishedVersion}`,
    Security: `const result = await crawlDetailed({
  seeds: ["https://docs.example.com"],
  allowedOrigins: ["https://docs.example.com"],
  maxPages: 25,
  maxRequests: 120,
  maxTotalBytes: 10_000_000,
  maxDurationMs: 60_000
});`
  };
  return quickstarts[category];
}

function capabilityLibraryPage() {
  const features = crawlerFeatureCatalog();
  const categories = [...new Set(features.map(([category]) => category))];
  return docsManualPage({
    currentPath: "/docs/capabilities/",
    eyebrow: `Prerelease ${documentationVersion} - capability library`,
    title: "Fifty capabilities. One page for every surface.",
    lede: "Browse by job, open the exact capability, copy its public API or command, and understand its output and operating boundary without scrolling through one giant reference page.",
    toc: [
      ["categories", "Browse by category"],
      ["all-capabilities", "All 50 capabilities"],
      ["start", "Start in two minutes"]
    ],
    content: `
      <section id="categories"><p class="eyebrow">01 - Categories</p><h2>Choose the job your agent needs to complete.</h2><div class="capability-category-grid">${categories.map((category) => {
        const detail = capabilityCategoryDetails(category);
        const count = features.filter(([candidate]) => candidate === category).length;
        return `<a href="${capabilityCategoryPath(category)}"><span>${String(count).padStart(2, "0")} capabilities</span><strong>${detail.title}</strong><p>${detail.lede}</p><em>Open ${category.toLowerCase()} docs -></em></a>`;
      }).join("")}</div></section>
      <section id="all-capabilities"><p class="eyebrow">02 - Complete index</p><h2>Search a name, output, command, or integration.</h2>${renderFeatureCatalog()}</section>
      <section id="start"><p class="eyebrow">03 - Quickstart</p><h2>Install once, then choose a capability page.</h2><p>The package exposes JavaScript, CLI, native MCP, Docker, provider, and Worker surfaces. Every capability page links back to its deeper task manual.</p>${codeBlock("capability-library-install", "terminal", `npm install cockroach-crawler@${documentationVersion}
npx cockroach-crawl --help
npx cockroach-sources doctor --json`)}<div class="next-links"><a href="/docs/cli/"><span>Command line</span><strong>Run the CLI -></strong></a><a href="/docs/javascript/"><span>Application code</span><strong>Use the JavaScript API -></strong></a><a href="/docs/mcp/"><span>Agent clients</span><strong>Connect native MCP -></strong></a></div></section>`
  });
}

function capabilityCategoryPage(category) {
  const detail = capabilityCategoryDetails(category);
  const features = crawlerFeatureCatalog().filter(([candidate]) => candidate === category);
  const terminalCategory = ["Deploy", "Sources", "Agents"].includes(category);
  return docsManualPage({
    currentPath: capabilityCategoryPath(category),
    eyebrow: `Capability library - ${category}`,
    title: detail.title,
    lede: detail.lede,
    toc: [
      ["quickstart", "Category quickstart"],
      ["capabilities", `${features.length} capabilities`],
      ["output", "Output and boundary"],
      ["next", "Next steps"]
    ],
    content: `
      <section id="quickstart"><p class="eyebrow">01 - Start</p><h2>Start from the category's smallest useful contract.</h2><p>${capabilityPrerequisite(category)}</p>${codeBlock(`category-${docsSlug(category)}-quickstart`, terminalCategory ? "terminal" : "quickstart.mjs", capabilityQuickstart(category), terminalCategory ? "text" : "javascript")}</section>
      <section id="capabilities"><p class="eyebrow">02 - ${features.length} capabilities</p><h2>Open one capability at a time.</h2><div class="capability-page-list">${features.map((feature, index) => `<a href="${capabilityPath(feature)}"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${feature[1]}</strong><p>${feature[2]}</p><code>${escapeHtml(feature[3])}</code></div><em>Read the complete page -></em></a>`).join("")}</div></section>
      <section id="output"><p class="eyebrow">03 - Contract</p><h2>Know the result and the boundary.</h2><div class="reference-cards"><article><strong>What you receive</strong><p>${detail.output}</p></article><article><strong>What remains fixed</strong><p>${detail.boundary}</p></article></div></section>
      <section id="next"><p class="eyebrow">04 - Go deeper</p><h2>Move from capability to complete workflow.</h2><div class="next-links"><a href="${detail.manual[0]}"><span>Task manual</span><strong>${detail.manual[1]} -></strong></a><a href="/docs/capabilities/"><span>All features</span><strong>Browse all 50 capabilities -></strong></a><a href="/docs/reference/"><span>Typed reference</span><strong>Inspect the complete public surface -></strong></a></div></section>`
  });
}

function capabilityDetailPage(feature, index, features) {
  const [category, title, description, usage] = feature;
  const detail = capabilityCategoryDetails(category);
  const categoryFeatures = features.filter(([candidate]) => candidate === category);
  const categoryIndex = categoryFeatures.findIndex((candidate) => candidate[1] === title);
  const previous = categoryFeatures[categoryIndex - 1];
  const next = categoryFeatures[categoryIndex + 1];
  const uniqueId = `capability-${String(index + 1).padStart(2, "0")}`;
  const terminalCategory = ["Deploy", "Sources", "Agents"].includes(category);
  return docsManualPage({
    currentPath: capabilityPath(feature),
    eyebrow: `Capability ${String(index + 1).padStart(2, "0")} of ${features.length} - ${category}`,
    title,
    lede: description,
    toc: [
      ["purpose", "Purpose and fit"],
      ["start", "How to start"],
      ["result", "Result contract"],
      ["boundary", "Boundary and failures"],
      ["related", "Related pages"]
    ],
    content: `
      <section id="purpose"><p class="eyebrow">01 - Purpose</p><h2>Use ${title.toLowerCase()} when this behavior belongs in the job contract.</h2><p>${description}</p><div class="reference-cards"><article><strong>Good fit</strong><p>Choose this capability when the application needs the behavior explicitly and can keep the related origin, credential, browser, or resource authority in trusted host configuration.</p></article><article><strong>Prerequisite</strong><p>${capabilityPrerequisite(category)}</p></article></div></section>
      <section id="start"><p class="eyebrow">02 - Public surface</p><h2>Activate the capability through this option, function, field, or command.</h2>${codeBlock(`${uniqueId}-surface`, "public surface", usage, "javascript")}<p>This snippet names the reviewed ${documentationVersion} prerelease surface. Combine it with the complete quickstart below when the fragment is an option or output field.</p>${codeBlock(`${uniqueId}-quickstart`, terminalCategory ? "terminal" : "category quickstart", capabilityQuickstart(category), terminalCategory ? "text" : "javascript")}</section>
      <section id="result"><p class="eyebrow">03 - Result</p><h2>Keep the output attached to its evidence.</h2><p>${detail.output}</p><p>Inspect structured failures, warnings, and final statistics before treating a partial job as complete. Preserve canonical URLs, retrieval time, hashes, and source identity beside derived chunks or summaries.</p></section>
      <section id="boundary"><p class="eyebrow">04 - Operating boundary</p><h2>This capability cannot silently expand authority.</h2><p>${detail.boundary}</p><div class="callout warning"><strong>Failure handling</strong><p>Unknown options, invalid inputs, unavailable optional dependencies, denied destinations, exhausted budgets, and provider access challenges return explicit failures or errors. They do not turn into a broader fallback route.</p></div></section>
      <section id="related"><p class="eyebrow">05 - Continue</p><h2>Follow the workflow, not a scrolling wall.</h2><div class="next-links">${previous ? `<a href="${capabilityPath(previous)}"><span>Previous ${category.toLowerCase()} capability</span><strong>${previous[1]} -></strong></a>` : ""}${next ? `<a href="${capabilityPath(next)}"><span>Next ${category.toLowerCase()} capability</span><strong>${next[1]} -></strong></a>` : ""}<a href="${capabilityCategoryPath(category)}"><span>${category} index</span><strong>See all ${category.toLowerCase()} capabilities -></strong></a><a href="${detail.manual[0]}"><span>Complete workflow</span><strong>${detail.manual[1]} -></strong></a></div></section>`
  });
}

function capabilityCategoryPages() {
  const categories = [...new Set(crawlerFeatureCatalog().map(([category]) => category))];
  return [
    {
      slug: "docs/capabilities",
      active: "Docs",
      title: "All 50 capabilities - Cockroach Crawler",
      description: "Browse every Cockroach Crawler crawl, browser, extraction, source, agent, deployment, and security capability with its own detailed documentation page.",
      body: capabilityLibraryPage()
    },
    ...categories.map((category) => {
      const detail = capabilityCategoryDetails(category);
      return {
        slug: `docs/capabilities/${docsSlug(category)}`,
        active: "Docs",
        title: `${detail.title} - Cockroach Crawler capabilities`,
        description: detail.lede,
        body: capabilityCategoryPage(category)
      };
    })
  ];
}

function capabilityDocsPages() {
  const features = crawlerFeatureCatalog();
  return features.map((feature, index) => ({
    slug: capabilityPath(feature).replace(/^\/|\/$/g, ""),
    active: "Docs",
    title: `${feature[1]} capability - Cockroach Crawler`,
    description: feature[2],
    body: capabilityDetailPage(feature, index, features)
  }));
}

function renderFeatureCatalog() {
  const features = crawlerFeatureCatalog();
  const categories = [...new Set(features.map(([category]) => category))];
  return `<section id="feature-reference" class="feature-reference" aria-labelledby="feature-reference-title">
    <div class="feature-reference-head">
      <div><p class="eyebrow">Complete feature index · ${features.length} capabilities</p><h2 id="feature-reference-title">Find the exact API surface.</h2><p>Every entry names the option, function, command, or output field that activates the capability in the reviewed ${documentationVersion} prerelease.</p></div>
      <label class="feature-search"><span>Filter documentation</span><input type="search" data-feature-search placeholder="Try “PDF”, “MCP”, “YouTube”, or “adaptive”" autocomplete="off" /></label>
    </div>
    <div class="feature-filter-row" aria-label="Feature categories"><button type="button" data-feature-category="all" aria-pressed="true">All</button>${categories.map((category) => `<button type="button" data-feature-category="${escapeHtml(category)}" aria-pressed="false">${escapeHtml(category)}</button>`).join("")}</div>
    <p class="feature-result-count" data-feature-count aria-live="polite">${features.length} capabilities shown</p>
    <div class="feature-catalog">${features.map(([category, title, description, usage], index) => `<article class="feature-entry" data-feature-entry data-category="${escapeHtml(category)}" data-search="${escapeHtml(`${category} ${title} ${description} ${usage}`.toLowerCase())}">
      <div class="feature-entry-meta"><span>${String(index + 1).padStart(2, "0")}</span><em>${escapeHtml(category)}</em></div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
      <pre tabindex="0" aria-label="${escapeHtml(title)} usage"><code>${escapeHtml(usage)}</code></pre>
      <a class="feature-guide-link" href="${capabilityPath([category, title])}">Open the complete capability page →</a>
    </article>`).join("")}</div>
  </section>`;
}

function docsPage() {
  const categories = [...new Set(crawlerFeatureCatalog().map(([category]) => category))];
  return docsManualPage({
    currentPath: "/docs/",
    eyebrow: `Cockroach Crawler ${documentationVersion} prerelease documentation`,
    title: "The complete web toolkit for JavaScript AI agents.",
    lede: "Install one Node.js package, choose a workflow, then open the exact capability page for its API, output, failure behavior, boundary, and related surfaces.",
    toc: [
      ["quickstart", "Two-minute quickstart"],
      ["workflows", "Workflow manuals"],
      ["capabilities", "50 capability pages"],
      ["choose-surface", "Choose a surface"]
    ],
    content: `
      <section id="quickstart"><p class="eyebrow">01 - Quickstart</p><h2>Turn one public site into agent-ready evidence.</h2><p>Use maintained Node.js 22, 24, or 26. Start with finite budgets, inspect pages and failures together, then add browser, extraction, provider, or agent surfaces only where the job needs them.</p>${codeBlock("docs-overview-quickstart", "terminal", `npm install cockroach-crawler@${documentationVersion}
npx cockroach-crawl https://example.com/docs \\
  --max-pages 20 \\
  --max-requests 80 \\
  --max-duration 60000 \\
  --jsonl \\
  --output crawl.jsonl`)}</section>
      <section id="workflows"><p class="eyebrow">02 - Workflow manuals</p><h2>Start with the result you need.</h2><nav class="doc-route-grid" aria-label="Documentation workflows">${[
        ["Deep crawling", "BFS, DFS, best-first, adaptive relevance, sitemaps, filters, cache, callbacks, and exact budgets.", "/docs/crawling/"],
        ["Browser evidence", "Chromium rendering, waits, clicks, virtual scroll, open Shadow DOM, readable iframes, screenshots, PDFs, hooks, and profiles.", "/docs/browser/"],
        ["Extraction", "Core and Node quality Markdown, fail-closed admission, CSS, XPath, local PDF parsing, metadata, hashes, and optional schema-validated model extraction.", "/docs/extraction/"],
        ["Agents and MCP", "Strict creator-owned tool limits, native stdio MCP, Codex and Claude setup, and optional Maqam composition.", "/docs/mcp/"],
        ["Docker and API", "Authenticated Node or Docker API, health checks, dashboard, playground, and deployment configuration.", "/docs/docker/"],
        ["Providers", "Public web and GitHub, no-key YouTube routes, official APIs, session-backed reads, feeds, doctor states, and routing.", "/docs/providers/"]
      ].map(([title, text, href]) => `<a href="${href}"><strong>${title}</strong><span>${text}</span><em>Open manual -></em></a>`).join("")}</nav></section>
      <section id="capabilities"><p class="eyebrow">03 - 50 capability pages</p><h2>Navigate by category instead of scrolling through one wall.</h2><p>Each capability now has a stable route with its purpose, prerequisite, public surface, quickstart, result contract, failure behavior, operating boundary, and previous or next link.</p><div class="capability-category-grid">${categories.map((category) => {
        const detail = capabilityCategoryDetails(category);
        const count = crawlerFeatureCatalog().filter(([candidate]) => candidate === category).length;
        return `<a href="${capabilityCategoryPath(category)}"><span>${String(count).padStart(2, "0")} capabilities</span><strong>${detail.title}</strong><p>${detail.lede}</p><em>Browse ${category.toLowerCase()} -></em></a>`;
      }).join("")}</div><div class="page-actions"><a class="button primary" href="/docs/capabilities/">Search all 50</a><a class="button secondary" href="/docs/reference/">Open typed reference</a></div></section>
      <section id="choose-surface"><p class="eyebrow">04 - Interfaces</p><h2>Use the smallest interface that fits the host.</h2><div class="reference-cards"><article><strong>JavaScript</strong><p>Typed library calls for applications, queues, test fixtures, and evidence pipelines.</p><a class="text-link" href="/docs/javascript/">Open JavaScript guide -></a></article><article><strong>CLI</strong><p>Repeatable local exports, CI jobs, scheduled snapshots, and content inventories.</p><a class="text-link" href="/docs/cli/">Open CLI guide -></a></article><article><strong>MCP</strong><p>Native read-only tools for Codex, Claude Code, and other stdio MCP clients.</p><a class="text-link" href="/docs/mcp/">Open MCP guide -></a></article><article><strong>Docker or Worker</strong><p>Token-authenticated service deployment or a smaller fixed-origin edge fetch profile.</p><a class="text-link" href="/docs/docker/">Open deployment guide -></a></article></div></section>`
  });

  const tocLinks = `<a href="#quickstart">Quickstart</a><a href="#deep-crawl">Deep crawling</a><a href="#browser-suite">Browser suite</a><a href="#extraction-suite">Extraction</a><a href="#agent-deploy">Agents and MCP</a><a href="#feature-reference">All features</a><a href="#output">Output</a><a href="#deployment">Deployment</a>`;
  return `
    <section class="page-hero shell docs-hero"><p class="eyebrow">Cockroach Crawler ${documentationVersion} prerelease documentation</p><h1>The complete web toolkit for JavaScript AI agents.</h1><p class="lede">Crawl static and rendered pages, prioritize the right links, extract exact data, capture browser evidence, parse PDFs, route public sources, and connect through JavaScript, CLI, MCP, Docker, or Maqam.</p><div class="page-actions"><a class="button primary" href="#quickstart">Start in two minutes</a><a class="button secondary" href="#feature-reference">Explore ${crawlerFeatureCatalog().length} capabilities</a></div><div class="docs-command" aria-label="Installation command"><code>npm install cockroach-crawler@next</code><button type="button" class="copy-button" data-copy-value="npm install cockroach-crawler@next" aria-describedby="docs-install-copy">Copy</button><span class="sr-only" id="docs-install-copy" aria-live="polite"></span></div></section>
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
        <section id="extraction-suite"><p class="eyebrow">04 · Extraction</p><h2>Choose deterministic selectors, restricted patterns, or your own model adapter.</h2><p>CSS, XPath, and restricted regex extraction are local and deterministic. Model-assisted extraction is optional: your host supplies the adapter, bounds the disclosed content, and receives output only after JSON Schema validation.</p>${codeBlock("extraction-suite-example", "extract.mjs", `import { extractWithXPath, extractWithRegex, extractWithLlm } from "cockroach-crawler/extractors";

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

const identifiers = extractWithRegex(page.text, {
  fields: { invoice: { pattern: "Invoice\\\\s+#([A-Z0-9-]+)", group: 1 } }
});

console.log(fields.data, identifiers.data, semantic.data);`, "javascript")}<p>Local PDFs use <code>parsePdf(bytes)</code>; searchable compact site maps use <code>mapSite({ search, maxResults })</code>; normal page records already include Markdown, readable text, links, metadata, and evidence hashes.</p></section>
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

docker build -t cockroach-crawler:0.7.0 .
docker run --rm -p 3878:3878 \\
  -e COCKROACH_API_TOKEN="replace-with-a-long-random-secret" \\
  -e COCKROACH_ALLOWED_ORIGINS="https://docs.example.com" \\
  cockroach-crawler:0.7.0`)}</section>
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
        <section id="sources"><p class="eyebrow">05 · Release candidate · 0.7.0</p><h2>Inspect provider capability before dispatch.</h2><div class="callout candidate"><strong>Publication status</strong><p>This contract is present in candidate source commit <code>${candidateCommit.slice(0, 7)}</code>. npm <code>latest</code> remains ${publishedVersion}.</p></div>${codeBlock("sources-doctor", "candidate source", `npm install github:AjnasNB/cockroach-crawler#${candidateCommit}\nnpx cockroach-sources doctor --json\nnpx cockroach-reach doctor --json`)}${codeBlock("sources-example", "sources.mjs", `import { createSourceRegistryFromEnv } from "cockroach-crawler/sources";

const sources = createSourceRegistryFromEnv(process.env);
console.table(sources.doctor());

const repositories = await sources.search("github", {
  query: "topic:web-crawler language:javascript",
  maxResults: 5
});

console.log(repositories);`, "javascript")}<p>Public GitHub REST is ready with optional token authentication. YouTube metadata reads work through public oEmbed; search needs <code>YOUTUBE_API_KEY</code> and transcripts remain unavailable. X requires <code>X_BEARER_TOKEN</code>. Reddit requires official client credentials and a contact-aware user agent.</p></section>
        <section id="serverless"><p class="eyebrow">06 · Serverless · 0.7.0 release candidate</p><h2>A smaller edge boundary with named tradeoffs.</h2><p>The candidate includes a self-hosted Cloudflare Worker entry point. It accepts only token-authenticated <code>POST /v1/crawl</code>, requires configured HTTPS origins, and is rate-limited by the deployment. The Worker does not import the Node-native quality backend.</p>${codeBlock("serverless-config", "worker/wrangler.jsonc", `{
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
    <section class="page-hero shell"><p class="eyebrow">Provider coverage · 0.7.0 release candidate</p><h1>Know what is public, keyed, and session-backed.</h1><p class="lede">The 0.7.0 candidate combines the crawler with a tested provider registry, ordered routing, optional read-only reach providers, a Maqam-compatible browser-host contract, and a separate restricted serverless tier.</p><div class="page-actions"><a class="button primary" href="/docs/providers/">Inspect the API</a><a class="button secondary" href="${repository}/issues">Propose an adapter</a></div></section>
    <section class="section shell feature-stage"><figure><img src="/assets/provider-map.svg" width="720" height="560" alt="Provider coverage map distinguishing public web, GitHub, official APIs, no-key YouTube, and optional read-only session routes" /><figcaption>Doctor status is capability-based: public, keyed, credentialed, no-key, session-backed, partial, and unavailable states remain distinct.</figcaption></figure><div><p class="eyebrow">Know before dispatch</p><h2>Every adapter reports its exact access state.</h2><p>Each adapter reports its authority and availability before dispatch, together with its rate-limit and data-shape contract.</p><div class="candidate-note compact"><span>Stable contract</span><p><code>cockroach-sources doctor --json</code> and <code>cockroach-reach doctor --json</code> report runtime status without serializing secrets.</p></div></div></section>
    <section class="section shell"><div class="table-wrap" tabindex="0" role="region" aria-label="Provider capability status table"><table class="status-table"><thead><tr><th>Surface</th><th>0.7.0 source status</th><th>Access path</th></tr></thead><tbody>
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
      <p class="eyebrow">AI web crawler alternatives - reviewed 8 August 2026</p>
      <h1>Compare the layer you actually need.</h1>
      <p class="lede">Crawler frameworks, browser engines, content extractors, and hosted web-data APIs solve different jobs. This guide places Cockroach Crawler beside representative maintained alternatives without turning unlike measurements into one false leaderboard.</p>
      <div class="page-actions"><a class="button primary" href="/docs/">Try Cockroach Crawler</a><a class="button secondary" href="#matrix">Compare capabilities</a></div>
    </section>
    <section class="section shell">
      <div class="section-head"><div><p class="eyebrow">Short answer</p><h2>Five categories - not one interchangeable market.</h2></div><p>This is a representative current landscape from official repositories and documentation. It is not a paid ranking and cannot enumerate every scraper, fork, hosted wrapper, or private deployment.</p></div>
      <div class="fit-grid">
        <article class="fit-yes"><span>Governed local evidence</span><h3>Cockroach Crawler</h3><p>Node-first crawling, mapping, rendering, structured extraction, explicit network ceilings, and normalized source evidence in one bounded package.</p></article>
        <article><span>Managed web data</span><h3>Firecrawl, Apify, ScrapingBee</h3><p>Hosted acquisition, search, proxy infrastructure, asynchronous jobs, actors, and operational scale.</p></article>
        <article><span>Programmable crawler systems</span><h3>Crawlee, Scrapy, Crawl4AI</h3><p>Broader queues, routers, browser pools, storage, deep strategies, and language-native customization.</p></article>
        <article><span>Specialist primitives</span><h3>Extraction and browser automation</h3><p>Main-content extraction or direct browser automation that a larger acquisition system can compose.</p></article>
      </div>
    </section>
    <section class="section shell" id="matrix">
      <div class="section-head"><div><p class="eyebrow">Category map</p><h2>Choose by product center.</h2></div><p>Cockroach Crawler ${candidateVersion} is published on npm <code>next</code>. It is a prerelease evidence surface, not a claim that it replaces every framework, browser, extractor, or managed platform.</p></div>
      <div class="table-wrap" tabindex="0" role="region" aria-label="AI crawler and web extraction alternatives by category">
        <table class="status-table">
          <thead><tr><th>Product</th><th>Category</th><th>Choose it when</th><th>Important boundary</th></tr></thead>
          <tbody>
            <tr><th scope="row"><a href="${repository}">Cockroach Crawler</a></th><td>Governed local acquisition</td><td>Agents need bounded crawling, rendering, extraction, and source evidence in Node.js</td><td>Not a managed proxy fleet or browser-automation engine; ${candidateVersion} remains a prerelease</td></tr>
            <tr><th scope="row"><a href="${firecrawlRepository}">Firecrawl</a></th><td>Managed and self-hosted web-data API</td><td>Search, scrape, crawl, browser interaction, document handling, and managed reach belong behind one API</td><td>Managed features and operational scale are broader than this compact local package</td></tr>
            <tr><th scope="row"><a href="${crawl4aiRepository}">Crawl4AI</a></th><td>Python LLM crawler</td><td>Python workflows need browser sessions, deep/adaptive crawling, caching, and multiple extraction strategies</td><td>Different language ecosystem and a materially broader self-hosted browser surface</td></tr>
            <tr><th scope="row"><a href="${crawleeRepository}">Crawlee</a></th><td>Programmable crawler framework</td><td>You want queues, routers, sessions, storage, proxies, and HTTP/browser engines to build a custom system</td><td>Lower-level and more extensible; application code defines the final evidence contract</td></tr>
            <tr><th scope="row"><a href="${scrapyRepository}">Scrapy</a></th><td>Python crawler framework</td><td>High-volume asynchronous Python crawling and mature middleware, pipelines, scheduling, and extensions are central</td><td>Framework rather than an agent-specific normalized evidence product</td></tr>
            <tr><th scope="row"><a href="${trafilaturaDocs}">Trafilatura</a></th><td>Main-content extractor</td><td>Python crawling/discovery and high-quality text/metadata extraction are the primary job</td><td>Cockroach's opt-in Node quality surface is Trafilatura-backed; it is not an independent extractor beating Trafilatura</td></tr>
            <tr><th scope="row"><a href="${playwrightRepository}">Direct browser automation</a></th><td>Browser-automation primitives</td><td>You need direct page, browser, testing, or automation control</td><td>Not a like-for-like extraction product; Cockroach composes a bounded crawler above optional browser automation</td></tr>
            <tr><th scope="row"><a href="${apifyDocs}">Apify</a></th><td>Managed actors and data platform</td><td>Hosted actors, schedules, datasets, proxy infrastructure, and operational deployment are the job</td><td>Cockroach does not claim distributed cloud or marketplace scale</td></tr>
            <tr><th scope="row"><a href="${scrapingBeeDocs}">ScrapingBee</a></th><td>Managed scraping API</td><td>JavaScript rendering, proxy rotation, and anti-block infrastructure should be externally operated</td><td>Hosted acquisition service rather than a local evidence and policy runtime</td></tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="section shell" id="evidence">
      <div class="section-head"><div><p class="eyebrow">Extraction evidence</p><h2>Same scorer first. Different studies stay separate.</h2></div><p>The numbers below are development observations, not universal product rankings. The quality profile uses exact npm <code>trafilatura@0.2.0</code>; Python Trafilatura 2.2.0 is a separately generated baseline under the same 511-page WCEB scorer.</p></div>
      <div class="table-wrap" tabindex="0" role="region" aria-label="Observed and rejected WCEB extraction evidence"><table><thead><tr><th>Surface and corpus</th><th>Precision</th><th>Recall</th><th>F1</th><th>Interpretation</th></tr></thead><tbody>
        <tr><td>Cockroach quality balanced - observed 511</td><td><strong>0.894101</strong></td><td><strong>0.926022</strong></td><td><strong>0.890524</strong></td><td>Trafilatura-backed Node profile; observed development evidence</td></tr>
        <tr><td>Python Trafilatura 2.2.0 - observed 511</td><td>0.890108</td><td>0.868258</td><td>0.860042</td><td>Same cached pages and scorer; different package/configuration</td></tr>
        <tr><td>Cockroach quality balanced - WCEB development 1,497</td><td>0.852784</td><td>0.896259</td><td>0.847064</td><td>Broader development workload; not held-out confirmation</td></tr>
        <tr><td>Raw-DOM attempt 003 - WCEB development 1,497</td><td>0.860252</td><td>0.884690</td><td>0.844419</td><td>Rejected after five gate violations; never integrated</td></tr>
      </tbody></table></div>
      <div class="callout warning"><strong>Do not compare unlike leaderboards</strong><p><a href="${trafilaturaEvaluation}">Trafilatura's published evaluation</a> uses a different 750-document segment corpus and scorer. Its values cannot be ranked directly against these WCEB page-level macro word metrics.</p></div>
    </section>
    <section class="section shell feature-stage reverse">
      <figure><img src="/assets/security-boundary.svg" width="720" height="560" alt="Public web requests crossing DNS, redirect, origin, robots, and resource checks before extraction" /><figcaption>Cockroach Crawler competes on what an agent is allowed to reach and what evidence returns, not on a universal page-coverage claim.</figcaption></figure>
      <div><p class="eyebrow">Where Cockroach Crawler is different</p><h2>Security and provenance are part of the return type.</h2><p>The Node transport validates the complete DNS answer set, pins a public address for each hop, rechecks redirects and robots, and applies exact traversal and byte budgets. The strict agent adapter cannot expand the limits selected by its creator.</p><ul class="check-list"><li>No hosted crawler account required for normal public URLs</li><li>No model call required for deterministic extraction</li><li>No cookie extraction or silent credential reuse</li><li>No CAPTCHA, paywall, login, or authorization bypass</li></ul></div>
    </section>
    <section class="section shell">
      <div class="section-head"><div><p class="eyebrow">Where alternatives win</p><h2>Use the specialist when its larger surface is the job.</h2></div><p>Cockroach Crawler should earn adoption through a precise contract, not by hiding capabilities it has not shipped.</p></div>
      <div class="card-grid">
        <article><h3>Choose Firecrawl for managed operations</h3><p>Hosted search, proxy and anti-block infrastructure, large asynchronous jobs, managed browser interaction, document parsing, and operational scale remain outside Cockroach Crawler's compact package.</p><a class="text-link" href="${firecrawlDocs}">Read Firecrawl documentation →</a></article>
        <article><h3>Choose Crawl4AI for broad Python workflows</h3><p>Adaptive crawling, session-rich browser control, policy-aware caching, PDF and media processing, multiple extraction strategies, and Python-native orchestration are broader in Crawl4AI today.</p><a class="text-link" href="${crawl4aiDocs}">Read Crawl4AI documentation →</a></article>
        <article><h3>Choose Crawlee or Scrapy to build the crawler</h3><p>Both are mature programmable frameworks with queues, routing, hooks, storage, retry, and extension surfaces that can support architectures beyond one opinionated evidence product.</p><a class="text-link" href="${crawleeRepository}">Inspect Crawlee →</a></article>
        <article><h3>Choose a direct browser library for page-level automation</h3><p>Direct libraries expose browser primitives and testing APIs. Cockroach Browser and Crawler add narrower authority and evidence contracts above an established browser runtime.</p><a class="text-link" href="${playwrightRepository}">Inspect the runtime →</a></article>
      </div>
    </section>
    <section class="section shell proof-section">
      <div><p class="eyebrow">Verify before choosing</p><h2>Run the complete crawler yourself.</h2><p>Install the exact reviewed prerelease, then exercise mapping, adaptive traversal, browser evidence, quality extraction, native MCP, and provider diagnostics against your own fixtures.</p><div class="button-row"><a class="button primary" href="/docs/">Run the quickstart</a><a class="button secondary" href="/security/">Audit the security model</a></div></div>
      ${codeBlock("compare-proof", "published npm prerelease", `npm install cockroach-crawler@${candidateVersion}\nnpx cockroach-sources doctor --json\nnpx cockroach-crawl https://example.com/docs --max-pages 20 --jsonl`)}
    </section>
    <section class="section shell faq-section"><div><p class="eyebrow">Crawler selection FAQ</p><h2>Choose the smallest trustworthy surface.</h2></div><div class="faq-list">
      <details><summary>What is the best AI web crawler for agents?</summary><p>There is no universal best. Choose by layer: Cockroach for bounded local evidence, a managed service for hosted reach, a programmable framework for a custom crawler, a specialist extractor for article text, or a direct browser library for page-level automation.</p></details>
      <details><summary>Is Cockroach Crawler better than Trafilatura?</summary><p>No universal ranking is established. Cockroach's quality surface delegates main-content extraction to exact <code>trafilatura@0.2.0</code> and adds crawling, rendering, policy, structured extraction, and evidence around it.</p></details>
      <details><summary>How does Cockroach Crawler differ from direct browser automation?</summary><p>Direct automation exposes page and browser primitives. Cockroach Crawler composes a bounded acquisition, extraction, and evidence contract above an optional browser runtime.</p></details>
      <details><summary>Can I replace either product without testing?</summary><p>No. Match URL sets, rendering mode, output fields, robots policy, retries, concurrency, network conditions, and deployment requirements before migrating.</p></details>
      <details><summary>Where did the comparison data come from?</summary><p>Product claims were reviewed against the linked official repositories and documentation on 8 August 2026. Benchmark rows come from Cockroach Crawler's pinned WCEB artifacts; Trafilatura's separate official study is linked only to explain why its scorer is not directly comparable.</p></details>
    </div></section>`;
}

function ecosystemPage() {
  return `
    <article class="ecosystem-page">
      <header class="page-hero shell ecosystem-hero">
        <nav class="article-breadcrumbs" aria-label="Breadcrumb"><a href="/">Cockroach Crawler</a><span aria-hidden="true">/</span><span>Open-source ecosystem</span></nav>
        <p class="eyebrow">Open-source toolkit for governed AI agents</p>
        <h1>Choose a layer, then keep its authority visible.</h1>
        <p class="lede">A useful agent system may need orchestration, project memory, approval, browser execution, web acquisition, main-content extraction, and document conversion. These projects solve different jobs. The safest composition starts by naming each boundary.</p>
        <div class="article-byline"><span>By Ajnas N B</span><span>Reviewed 9 August 2026</span><span>13 official project sources</span></div>
        <div class="page-actions"><a class="button primary" href="#first-party">Map the four local layers</a><a class="button secondary" href="#project-map">Compare adjacent projects</a></div>
      </header>

      <section class="section shell ecosystem-principle" aria-labelledby="ecosystem-principle-title">
        <p class="eyebrow">Short answer</p>
        <h2 id="ecosystem-principle-title">No single package owns the whole agent.</h2>
        <p>Qarinah compiles cited project memory. Maqam governs selected registered actions. Cockroach Browser runs permitted browser work above Playwright. Cockroach Crawler acquires bounded web evidence. An agent runtime such as LangGraph or the OpenAI Agents SDK can call these layers, but installation alone does not connect or secure them.</p>
        <aside><strong>Deployment rule</strong><p>The host still owns identity, credentials, process isolation, durable storage, model choice, network placement, and every route that bypasses the registered boundary.</p></aside>
      </section>

      <section class="section shell" id="first-party" aria-labelledby="first-party-title">
        <div class="section-head"><div><p class="eyebrow">Four inspectable responsibilities</p><h2 id="first-party-title">The local toolkit keeps memory, action, browser, and web evidence separate.</h2></div><p>Each project is independently installable and reviewable. Use only the responsibilities the deployment actually needs.</p></div>
        <div class="ecosystem-core" id="projects">
          <article class="memory"><span>01 - memory</span><h3>Qarinah</h3><p>Local-first, evidence-linked project memory for coding agents. It records permitted project events and compiles compact, cited context and handoff artifacts.</p><div class="source-links"><a href="${qarinahSite}">Official site</a><a href="${qarinahRepository}">Source</a></div></article>
          <article class="governance"><span>02 - action</span><h3>Maqam</h3><p>A compact TypeScript boundary for registered actions with policy, exact-input approval, one-use consumption, execution, and receipts.</p><div class="source-links"><a href="https://maqamagent.com">Official site</a><a href="${maqamRepository}">Source</a></div></article>
          <article class="browser"><span>03 - browser</span><h3>Cockroach Browser</h3><p>An operator-controlled browser runtime for agents with scoped capabilities and evidence. It uses <code>playwright-core</code>. It is not a new browser engine and does not replace Playwright.</p><div class="source-links"><a href="${cockroachBrowserSite}">Official site</a><a href="${cockroachBrowserRepository}">Source</a></div></article>
          <article class="crawler"><span>04 - web evidence</span><h3>Cockroach Crawler</h3><p>Bounded local web acquisition with explicit origin, redirect, robots, request, byte, depth, and time controls. Its opt-in quality option is Trafilatura-backed and delegates main-content extraction to exact <code>trafilatura@0.2.0</code>.</p><div class="source-links"><a href="${siteUrl}">Official site</a><a href="${repository}">Source</a></div></article>
        </div>
      </section>

      <section class="section shell" id="project-map" aria-labelledby="project-map-title">
        <div class="section-head"><div><p class="eyebrow">Adjacent open-source centers</p><h2 id="project-map-title">Start with the primary job, not a universal ranking.</h2></div><p>The tools below can be alternatives at one layer and complements at another. Every name links to the project's own documentation or source.</p></div>
        <ol class="ecosystem-layers">
          <li>
            <div class="layer-index">A</div>
            <div class="layer-copy"><span>Agent runtime and orchestration</span><h3>Build the loop, state, and workflow first.</h3><p><a href="${openAiAgentsDocs}">OpenAI Agents SDK</a> provides agent loops, tools, handoffs, guardrails, sessions, tracing, and human involvement. <a href="${langGraphDocs}">LangGraph</a> centers long-running stateful workflows, durable execution, streaming, and human-in-the-loop control. Neither is replaced by a memory, approval, browser, or crawler layer.</p></div>
          </li>
          <li>
            <div class="layer-index">B</div>
            <div class="layer-copy"><span>Browser automation primitives</span><h3>Control browsers directly when code is the product center.</h3><p><a href="${playwrightRepository}">The optional runtime</a> automates Chromium, Firefox, and WebKit through a cross-browser API. Cockroach Browser adds a narrower operator-owned authority and evidence contract above that runtime.</p></div>
          </li>
          <li>
            <div class="layer-index">C</div>
            <div class="layer-copy"><span>AI browser frameworks</span><h3>Add model-directed observation and action when the workflow needs it.</h3><p><a href="${browserUseRepository}">Browser Use</a> is an open-source Python framework for agents that interact with websites. <a href="${stagehandSite}">Stagehand</a> is an open-source AI browser automation framework that combines code with AI-powered observation, action, and extraction. Evaluate their model, browser, cloud, and credential boundaries separately from Cockroach Browser.</p></div>
          </li>
          <li>
            <div class="layer-index">D</div>
            <div class="layer-copy"><span>Web acquisition and extraction</span><h3>Choose local evidence or managed reach by deployment need.</h3><p><a href="${firecrawlDocs}">Firecrawl</a> centers a web API for search, scrape, crawl, map, and interaction. Cockroach Crawler centers bounded local acquisition and normalized evidence. <a href="${trafilaturaDocs}">Trafilatura</a> specializes in web text, metadata, comments, discovery, and structured output. Cockroach Crawler's quality path delegates main-content extraction to its exact Trafilatura backend rather than claiming an independent extractor.</p></div>
          </li>
          <li>
            <div class="layer-index">E</div>
            <div class="layer-copy"><span>Document conversion</span><h3>Use a document specialist for complex files.</h3><p><a href="${doclingDocs}">Docling</a> converts PDFs, office documents, images, HTML, and Markdown into a structured document representation and export formats. It is a stronger category match when layout, tables, images, OCR, or complex document structure is the main problem. Cockroach Crawler's PDF path is not presented as a Docling replacement.</p></div>
          </li>
        </ol>
      </section>

      <section class="section shell ecosystem-route" aria-labelledby="ecosystem-route-title">
        <div><p class="eyebrow">One explicit composition</p><h2 id="ecosystem-route-title">The host connects the route and preserves every handoff.</h2><p>This is an architecture example, not an automatic bundled pipeline.</p></div>
        <ol>
          <li><span>01</span><div><strong>Plan</strong><p>LangGraph, the OpenAI Agents SDK, or another runtime chooses a task and tool call.</p></div></li>
          <li><span>02</span><div><strong>Contextualize</strong><p>Qarinah can supply compact cited project context when the task needs local history.</p></div></li>
          <li><span>03</span><div><strong>Authorize</strong><p>Maqam can gate a selected registered effect with policy and exact-input approval.</p></div></li>
          <li><span>04</span><div><strong>Acquire</strong><p>Cockroach Browser handles permitted interaction, or Cockroach Crawler reads permitted web resources.</p></div></li>
          <li><span>05</span><div><strong>Transform</strong><p>The host may use Trafilatura-backed extraction, Docling, Firecrawl, or another explicit specialist route.</p></div></li>
          <li><span>06</span><div><strong>Return proof</strong><p>Source records, browser evidence, execution receipts, and cited context return to the agent runtime.</p></div></li>
        </ol>
      </section>

      <section class="section shell" aria-labelledby="decision-guide-title">
        <div class="section-head"><div><p class="eyebrow">Decision guide</p><h2 id="decision-guide-title">Pick the smallest contract that covers the job.</h2></div><p>No row is a benchmark result or a claim of product superiority.</p></div>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Open-source governed agent toolkit decision guide"><table><thead><tr><th>Primary need</th><th>Start with</th><th>Keep explicit</th></tr></thead><tbody>
          <tr><td>Agent loop, handoffs, tools, or tracing</td><td>OpenAI Agents SDK</td><td>Model, session, sandbox, and provider authority</td></tr>
          <tr><td>Durable stateful workflow orchestration</td><td>LangGraph</td><td>Checkpoint storage and side-effect boundaries</td></tr>
          <tr><td>Evidence-linked local coding memory</td><td>Qarinah</td><td>Workspace consent, capture, disclosure, and trust checkpoint</td></tr>
          <tr><td>Exact registered-action approval</td><td>Maqam</td><td>Every real effect must pass through the gateway</td></tr>
          <tr><td>Direct cross-browser automation</td><td>Playwright</td><td>Browser process, profile, credentials, and target isolation</td></tr>
          <tr><td>Agent browser authority and evidence above Playwright</td><td>Cockroach Browser</td><td>Allowed origins, capabilities, profiles, and artifact handling</td></tr>
          <tr><td>Natural-language browser automation</td><td>Browser Use or Stagehand</td><td>Model calls, browser provider, credentials, and action review</td></tr>
          <tr><td>Bounded local web evidence</td><td>Cockroach Crawler</td><td>Origins, redirects, robots, limits, and browser isolation</td></tr>
          <tr><td>Managed web API and operations</td><td>Firecrawl</td><td>Service plan, data handling, network policy, and provider limits</td></tr>
          <tr><td>Main-content extraction</td><td>Trafilatura</td><td>Corpus, configuration, output contract, and scorer</td></tr>
          <tr><td>Complex document conversion</td><td>Docling</td><td>Format pipeline, models, OCR, resources, and output validation</td></tr>
        </tbody></table></div>
      </section>

      <section class="section shell ecosystem-method" aria-labelledby="ecosystem-method-title">
        <div><p class="eyebrow">Method and limits</p><h2 id="ecosystem-method-title">Official sources, one review date, no hidden benchmark.</h2></div>
        <div><p>Descriptions were reviewed against the linked official sites, documentation, or source repositories on 9 August 2026. External projects change independently. Verify the current license, release, hosted-service terms, security model, and exact integration before adoption.</p><p>This page maps product centers and composition boundaries. It does not establish a matched performance comparison, security certification, production capacity result, or universal best choice.</p></div>
      </section>

      <section class="section shell" aria-labelledby="ecosystem-faq-title">
        <div class="section-head"><div><p class="eyebrow">Visible FAQ</p><h2 id="ecosystem-faq-title">Direct answers before you compose the stack.</h2></div></div>
        <div class="ecosystem-faq">
          <article><h3>Do these projects form one automatic control plane?</h3><p>No. They are independent projects. The deployment must explicitly connect selected layers and still owns identity, secrets, isolation, storage, and operations.</p></article>
          <article><h3>Does Cockroach Browser replace Playwright?</h3><p>No. Cockroach Browser uses <code>playwright-core</code> and adds an operator-owned authority, evidence, and integration boundary above Playwright.</p></article>
          <article><h3>Is Cockroach Crawler's quality extractor independent of Trafilatura?</h3><p>No. The opt-in Node quality path delegates main-content extraction to exact <code>trafilatura@0.2.0</code>. Crawler policy and evidence wrap that backend.</p></article>
          <article><h3>Where do LangGraph and the OpenAI Agents SDK fit?</h3><p>They are runtime and orchestration choices. They can call governed browser or crawler tools, but they are not replaced by the memory, approval, or evidence layers.</p></article>
          <article><h3>When should a team use Firecrawl or Docling?</h3><p>Consider Firecrawl for managed web acquisition. Consider Docling for document conversion and complex layout. Test the exact workload and deployment boundary before choosing.</p></article>
          <article><h3>Is this a best-tools ranking?</h3><p>No. It is a category and architecture map built from official product sources. It contains no matched cross-project benchmark.</p></article>
        </div>
      </section>
    </article>`;
}

function stackPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Governed agent stack</p><h1>One agent stack. Four explicit controls.</h1><p class="lede">Reach, action, context, and evidence compose without pretending that installation alone governs every call.</p><div class="page-actions"><a class="button primary" href="/docs/agents/">Govern a crawler tool</a><a class="button secondary" href="${productLoopRepository}">Inspect ProductLoop OS</a></div></section>
    <section class="section shell stack-flow" aria-labelledby="stack-flow-title">
      <div class="stack-flow-copy"><p class="eyebrow">Execution model</p><h2 id="stack-flow-title">The host chooses the route. Each layer proves one job.</h2><p>ProductLoop coordinates the workflow. Qarinah compiles approved project context. Maqam decides whether a registered operation may execute. Cockroach Crawler collects bounded public evidence. Results return as records, receipts, and context references.</p></div>
      <ol class="stack-path">
        <li><span>01</span><div><h3>Compose</h3><strong>ProductLoop OS</strong><p>Workflow runtime, policies, approvals, connectors, skills, evaluations, provenance, and research plans.</p></div></li>
        <li><span>02</span><div><h3>Contextualize</h3><strong>Qarinah</strong><p>Local event ledger, deterministic graph/index, and compact cited context packs. Public npm 0.1.5+ with a 0.1.6-compatible handoff contract.</p></div></li>
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
      <tr><td>Durable compact project context</td><td>Qarinah</td><td><span class="status stable">Public 0.1.5+</span></td><td>The handoff contract is 0.1.6-compatible; explicit workspace consent and machine-local trust remain required.</td></tr>
      <tr><td>Cross-package workflow and evaluation</td><td>ProductLoop OS</td><td><span class="status shipped">Available</span></td><td>External browsers, models, secrets, identity, and durable services remain deployment choices.</td></tr>
    </tbody></table></div></section>
    <section class="section shell feature-stage"><figure><img src="/assets/provider-map.svg" width="720" height="560" alt="Provider inputs crossing explicit access checks before becoming normalized source records" /><figcaption>Reach enters the system as untrusted source data. It becomes useful only after policy, provenance, and retrieval boundaries remain visible.</figcaption></figure><div><p class="eyebrow">Original composition</p><h2>Learn from strong tools without cloning their product.</h2><p>Broad capability installers demonstrate the value of one command and a useful doctor. In-page agents demonstrate low-friction browser control. Knowledge graphs demonstrate compact retrieval across project relationships. This stack keeps a different center: governed execution and evidence-linked context across replaceable adapters.</p><ul class="check-list"><li>No imported upstream branding or silent dependency</li><li>No claim that free access is unlimited or provider-approved</li><li>No browser-cookie extraction or login reuse</li><li>No claim that an in-process policy is an operating-system sandbox</li></ul></div></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Try the public layers</p><h2>Check web reach, then prove exact approval.</h2><p>Cockroach Crawler reports source access, Maqam demonstrates its separate tool-approval boundary, ProductLoop composes workflows, and Qarinah 0.1.5+ provides compact cited handoffs.</p></div>${codeBlock("stack-public-proof", "published packages", `npx -y --package cockroach-crawler@${candidateVersion} cockroach-sources doctor\nnpx -y --package cockroach-crawler@${candidateVersion} cockroach-reach doctor\nnpx -y maqam@0.3.3 demo approval\nnpx -y qarinah@0.1.6 --help`)}</section>
    <section class="section shell faq-section"><div><p class="eyebrow">Boundaries</p><h2>What one install cannot promise.</h2></div><div class="faq-list"><details><summary>Does the stack include a model or paid API?</summary><p>No. Model providers are deployment choices. Public web, GitHub, and selected optional routes may work without a developer key; every provider keeps its own authentication, login, terms, and availability constraints.</p></details><details><summary>Does Maqam automatically control every browser or shell?</summary><p>No. Only registered operations routed through the gateway are governed. Direct shell, browser, SDK, or provider calls bypass that boundary.</p></details><details><summary>Is Qarinah publicly installable?</summary><p>Yes. Qarinah is public on npm at 0.1.5+; the documented handoff contract is compatible with the coordinated 0.1.6 release. Workspace consent and machine-local trust are still required.</p></details></div></section>`;
}

function benchmarkPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">0.7.0 candidate development evidence · WCEB v1.0</p><h1>Two corpora. Four named profiles. Every raw row.</h1><p class="lede">These values describe observed development workloads, not a published release. The Node quality <code>balanced</code> path records ${qualityPrecision} precision, ${qualityRecall} recall, and ${qualityF1} F1 on 511 observed development pages, plus ${qualityDevelopmentPrecision} precision, ${qualityDevelopmentRecall} recall, and ${qualityDevelopmentF1} F1 on the 1,497-page WCEB development split.</p><div class="page-actions"><a class="button primary" href="#public-quality">Inspect the results</a><a class="button secondary" href="${repository}/blob/main/bench/results/wceb-quality-observed-0.7.0.json">Open raw JSON</a><a class="button secondary" href="${repository}/blob/main/docs/BENCHMARK.md">Read the method</a></div></section>
    <section class="section shell" id="public-quality"><div class="section-head"><div><p class="eyebrow">Human-reviewed cached HTML</p><h2>Quality and admission are separate measurements.</h2></div><p>WCEB calls the 511-page partition <code>test</code>, but this project previously inspected it and iterated against its failures. We report it as observed development evidence, not untouched held-out proof. The 1,497-page partition is upstream development evidence. No row establishes universal 0.90 precision.</p></div><div class="table-wrap" tabindex="0" role="region" aria-label="WCEB extraction profile results"><table><thead><tr><th>Surface and corpus</th><th>Precision</th><th>Recall</th><th>F1</th><th>Required</th><th>Unwanted</th><th>Abstained</th></tr></thead><tbody><tr><td>Core structural · observed 511</td><td>${corePrecision}</td><td>${coreRecall}</td><td>${coreF1}</td><td>0.835584</td><td>0.178735</td><td>-</td></tr><tr><td>Quality balanced · observed 511</td><td><strong>${qualityPrecision}</strong></td><td><strong>${qualityRecall}</strong></td><td><strong>${qualityF1}</strong></td><td>${qualityRequiredRecall}</td><td>${qualityUnwanted}</td><td>-</td></tr><tr><td>Quality balanced · WCEB development 1,497</td><td>${qualityDevelopmentPrecision}</td><td>${qualityDevelopmentRecall}</td><td>${qualityDevelopmentF1}</td><td>${qualityDevelopmentRequired}</td><td>${qualityDevelopmentUnwanted}</td><td>-</td></tr><tr><td>Quality balanced + fail-closed · observed 511</td><td>${failClosedPrecision}</td><td>${failClosedRecall}</td><td>${failClosedF1}</td><td>${failClosedRequired}</td><td>${failClosedUnwanted}</td><td>${failClosedAbstentions}</td></tr></tbody></table></div><div class="callout warning"><strong>Native quality boundary</strong><p>The quality surface uses exact <code>trafilatura@0.2.0</code> and never silently falls back. Its prebuilt matrix covers Windows, macOS, and glibc Linux on x64/ARM64; Alpine/musl, 32-bit, and other operating systems are unsupported. Core and serverless remain isolated.</p></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Observed comparison</p><h2>Core, quality, and separately generated baselines.</h2></div><p>Under the same scorer on the observed 511 pages, Python trafilatura 2.2.0 records 0.890108 precision, 0.868258 recall, and 0.860042 F1; readability-lxml records 0.869408, 0.626326, and 0.656537. The Node quality path records ${qualityPrecision}, ${qualityRecall}, and ${qualityF1}. Baseline text was generated in a separate Python process, then evaluated by that shared scorer. Similar package names do not imply identical implementations or configurations.</p></div><div class="page-actions"><a class="button secondary" href="${repository}/blob/main/bench/results/extraction-comparison-0.7.0.json">Open comparison JSON</a><a class="button secondary" href="${repository}/blob/main/docs/EXTRACTION-COMPARISON.md">Read comparison scope</a></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Public-source conformance</p><h2>Policy and URL behavior have their own proof.</h2></div><p>These checks run independently of extraction quality and throughput.</p></div><div class="fit-grid"><article class="fit-yes"><span>Robots dispatch</span><h3>${robotsPassed}/${robotsCases} passed</h3><p>Adapted Google vectors exercise precedence, wildcards, anchors, groups, comments, and case behavior through the real HTTP dispatch path.</p></article><article class="fit-yes"><span>HTTP(S) canonicalization</span><h3>${wptPassed}/${wptCases} passed</h3><p>Applicable credential-free cases come from an exact, SHA-256-verified Web Platform Tests URL corpus revision.</p></article><article><span>Exact scope</span><h3>Source-pinned, not self-certified</h3><p>The result does not claim complete RFC, WHATWG, browser-engine, OCR, or hosted-network certification.</p></article></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Four evidence tracks</p><h2>Do not mix unlike measurements.</h2></div><p>Extraction quality, fail-closed coverage, conformance pass rates, and local pages per second answer different questions.</p></div><div class="fit-grid"><article class="fit-yes"><span>Measured</span><h3>Cached-HTML extraction</h3><p>Human-reviewed precision, recall, F1, and snippet rates for exact engine/profile pairs.</p></article><article class="fit-yes"><span>Measured</span><h3>Fail-closed admission</h3><p>Quality metrics plus abstention count and reasons; 43 observed pages returned no admitted body.</p></article><article class="fit-yes"><span>Measured</span><h3>Public-vector conformance</h3><p>Named Google robots and WPT URL cases at exact source revisions and hashes.</p></article><article class="fit-yes"><span>Measured</span><h3>Local crawler regression</h3><p>Traversal and extraction across 120 deterministic loopback pages under one environment.</p></article></div></section>
    ${localBenchmarkPage()}
  `;
}

function localBenchmarkPage() {
  return `
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">CI-validated local regression benchmark</p><h2>Repeat the same workload. Catch the regression.</h2></div><p>A clean exact-commit CI run completed ${benchmarkMeasuredRuns} measured passes of the deterministic ${benchmarkPages}-page loopback fixture at a ${benchmarkElapsedMedian} ms median and ${benchmarkThroughputMedian} pages per second median. All correctness and policy probes passed.</p></div><div class="page-actions"><a class="button primary" href="#reproduce">Reproduce it</a><a class="button secondary" href="${benchmarkRun}">Open the CI run</a><a class="button secondary" href="${repository}/blob/main/docs/BENCHMARK.md">Read the method</a></div></section>
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

function paperPage() {
  return `
    <article class="paper-page">
      <header class="paper-hero shell">
        <p class="eyebrow">Technical white paper · release candidate</p>
        <h1>A governed, evidence-preserving web acquisition layer for AI agents.</h1>
        <p class="lede">This manuscript describes the architecture, trust boundaries, evaluation protocol, and publication gate for Cockroach Crawler ${candidateVersion}. It is pinned to source commit <code>${candidateCommit.slice(0, 7)}</code>; npm <code>latest</code> remains ${publishedVersion}.</p>
        <div class="page-actions"><a class="button primary" href="/paper/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf">Read the PDF</a><a class="button secondary" href="${repository}/blob/main/docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.md">Inspect the manuscript source</a><a class="text-link" href="${candidateSource}">Review exact candidate →</a></div>
        <dl class="paper-facts"><div><dt>Status</dt><dd>Published release-candidate report</dd></div><div><dt>Stable package</dt><dd>${publishedVersion}</dd></div><div><dt>Candidate source</dt><dd>${candidateCommit.slice(0, 12)}</dd></div><div><dt>DOI</dt><dd><a href="${paperDoiUrl}">${paperDoi}</a> · public</dd></div></dl>
      </header>
      <section class="section shell paper-answer" aria-labelledby="paper-answer-title"><p class="eyebrow">Plain-language answer</p><h2 id="paper-answer-title">What does Cockroach Crawler do?</h2><p>Cockroach Crawler is a Node.js acquisition layer that reads permitted HTTP(S) resources for AI workflows. It validates targets, applies robots and resource budgets, records provenance, and keeps browser, provider, quality, and serverless authority in separate entry points.</p></section>
      <section class="section shell"><div class="section-head"><div><p class="eyebrow">Architecture</p><h2>Five paths. No hidden authority merge.</h2></div><p>The design separates local crawling, source routing, optional browser-host integration, opt-in main-content extraction, and a deliberately narrower serverless profile.</p></div><ol class="paper-architecture"><li><span>01</span><div><h3>Admit</h3><p>Normalize URLs, reject credential-bearing or disallowed targets, validate every redirect, and retain creator-owned limits.</p></div></li><li><span>02</span><div><h3>Acquire</h3><p>Resolve and pin public addresses in the Node transport, apply robots and sensitive-path policy, and enforce request, byte, queue, retry, depth, concurrency, and deadline ceilings.</p></div></li><li><span>03</span><div><h3>Extract</h3><p>Return bounded records from the dependency-light core or call the explicit Node-only quality subpath. Backend failure is an error, not a silent substitution.</p></div></li><li><span>04</span><div><h3>Govern</h3><p>Expose a strict agent schema and a separate Maqam-compatible browser-host contract. Model input cannot widen creator-owned origins or budgets.</p></div></li><li><span>05</span><div><h3>Record</h3><p>Preserve source URLs, hashes, warnings, failures, statistics, and retrieval provenance so downstream reasoning can distinguish evidence from instructions.</p></div></li></ol></section>
      <section class="section shell" aria-labelledby="paper-evidence-title"><div class="section-head"><div><p class="eyebrow">Frozen evaluation outcome</p><h2 id="paper-evidence-title">The raw-DOM candidate was rejected.</h2></div><p>Attempt 003 was executed under the frozen raw-DOM protocol. It violated five declared gates and therefore supplies negative development evidence only; the attempted algorithm was not integrated into ${candidateVersion}.</p></div><div class="table-wrap" tabindex="0" role="region" aria-label="Rejected frozen development evaluation"><table><thead><tr><th>Precision</th><th>Recall</th><th>F1</th><th>Required recall</th><th>Unwanted inclusion</th><th>Page-type precision improvement</th></tr></thead><tbody><tr><td>0.860252</td><td>0.884690</td><td>0.844419</td><td>0.758829</td><td>0.092846</td><td>6 of 10 types; 8 required</td></tr></tbody></table></div><div class="callout warning"><strong>Publication consequence</strong><p>No algorithm integration, stable promotion, best-crawler statement, or universal 0.90 claim follows from this result. The reviewed package is independently available on npm <code>next</code>; a later method must pass the same declared gate before any numerical leadership language is reconsidered.</p></div></section>
      <section class="section shell"><div class="section-head"><div><p class="eyebrow">Claim ledger</p><h2>Every statement has a status.</h2></div><p>The paper treats implementation facts, development observations, and release claims as different evidence classes.</p></div><div class="claim-ledger"><article><span class="status shipped">Verified in source</span><h3>Architecture and bounded interfaces</h3><p>Review the pinned source, tests, package exports, and generated documentation.</p></article><article><span class="status conditional">Development only</span><h3>Frozen attempt 003</h3><p>The negative result is retained with its protocol and gate failure. It is not promoted into product positioning.</p></article><article><span class="status shipped">Published</span><h3>Paper DOI</h3><p><a href="${paperRecord}">${paperDoi}</a> resolves to the open Zenodo report and its seven immutable files.</p></article></div></section>
      <section class="section shell faq-section"><div><p class="eyebrow">Research questions</p><h2>Answers without marketing drift.</h2></div><div class="faq-list"><details open><summary>Is ${candidateVersion} a stable release?</summary><p>No. It is published on npm <code>next</code> for opt-in evaluation; ${publishedVersion} remains <code>latest</code>.</p></details><details><summary>Did the frozen crawler reach 0.90 precision?</summary><p>No. Attempt 003 was rejected and cannot support that claim.</p></details><details><summary>Why publish a rejected result?</summary><p>Negative evidence makes the gate auditable, prevents selective reporting, and states exactly why an attempted algorithm was not integrated.</p></details><details><summary>Has a Zenodo record been published?</summary><p>Yes. The open report is public at <a href="${paperRecord}">${paperDoi}</a>. The report captures the release-candidate state at deposition; the package was subsequently published on npm <code>next</code>.</p></details></div></section>
    </article>`;
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
      <article><div><span class="status planned">Candidate · 0.7.0</span><h2>Node quality extraction</h2></div><ul><li>Exact <code>trafilatura@0.2.0</code> backend behind a separate Node-only export</li><li>Balanced, precision, and recall profiles with bounded validation</li><li>Optional fail-closed abstention with explicit reasons and no silent core fallback</li><li>Observed 511-page, development 1,497-page, comparison, and conformance artifacts retained as development evidence</li></ul></article>
      <article><div><span class="status shipped">Released · 0.6.1</span><h2>Deep AI crawler</h2></div><ul><li>BFS, DFS, best-first, and adaptive relevance traversal</li><li>Persistent cache, compact mapping, robots, sitemaps, and exact crawl budgets</li><li>CLI, typed JavaScript API, strict agent adapter, and normalized evidence records</li><li>Public-network admission, DNS pinning, and validated redirects in the Node transport</li></ul></article>
      <article><div><span class="status shipped">Released · 0.6.1</span><h2>Browser and extraction suite</h2></div><ul><li>JavaScript rendering, waits, clicks, virtual scroll, Shadow DOM, and same-origin iframes</li><li>Screenshots, PDF generation and parsing, dedicated persistent profiles, and reviewed page hooks</li><li>Markdown, CSS, XPath, and optional schema-validated host LLM extraction</li><li>Artifact sizes, SHA-256 hashes, metadata, failures, and crawl statistics</li></ul></article>
      <article><div><span class="status shipped">Released · 0.6.1</span><h2>Agent and deployment surfaces</h2></div><ul><li>Native MCP crawl, mapping, extraction, and capability resource</li><li>Authenticated Docker/Node API, responsive dashboard, and playground</li><li>Maqam-compatible structural browser host and registered-tool composition</li><li>Fetch-only Cloudflare Worker profile for fixed deployment origins</li></ul></article>
      <article><div><span class="status shipped">Released · 0.6.1</span><h2>Provider and reach routing</h2></div><ul><li>Web, GitHub, YouTube, X, Reddit, Facebook, Instagram, LinkedIn, and Xiaohongshu doctor states</li><li>Public GitHub REST and optional no-key YouTube reads</li><li>Official credentials or explicit operator-controlled read-only sessions</li><li>Ordered provider/proxy escalation with attempt provenance and challenge-aware stopping</li></ul></article>
      <article><div><span class="status planned">Next evidence</span><h2>Broader coverage and independent use</h2></div><ul><li>Collect reproducible external installation reports</li><li>Verify npm registry provenance and clean packed consumers</li><li>Add transcript support only through a reviewed provider contract</li><li>Use benchmark distributions and raw evidence, not a single headline number</li></ul></article>
    </section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Community checkpoint</p><h2>Independent reproduction is roadmap evidence.</h2></div><p>Issue #20 is a credential-free starting point. A useful result records the commit, Node version, commands, and deterministic fixture; a green check without that context is not enough.</p></div><div class="page-actions"><a class="button primary" href="${contributorTestIssue}">Review issue #20</a><a class="button secondary" href="${repository}/blob/main/CONTRIBUTING.md">Read CONTRIBUTING.md</a></div></section>
    <section class="section shell proof-section"><div><p class="eyebrow">A useful issue</p><h2>Name one capability and one boundary.</h2><p>Prefer a deterministic fixture and an acceptance checklist over a broad “support everything” request. Do not add partnership, certification, or universal-coverage claims.</p></div>${codeBlock("issue-template", "issue outline", "Context\nOne current limitation and who it blocks.\n\nScope\nOne provider contract or crawler behavior.\n\nAcceptance\n- allow case dispatches once\n- deny case dispatches zero times\n- no live account or side effect\n- limits remain documented")}</section>`;
}

function communityPage() {
  return `
    <section class="page-hero shell"><p class="eyebrow">Community</p><h1>Test it, question it, or improve it.</h1><p class="lede">Reproduce the benchmark, discuss an integration, report one failing fixture, or contribute a reviewable capability. Maintainers review and merge; contributors work through branches and pull requests.</p><div class="page-actions"><a class="button primary" href="${discussions}">Start a discussion</a><a class="button secondary" href="${repository}/fork">Fork the repository</a><a class="button secondary" href="/benchmark/">Reproduce the benchmark</a></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Contribution path</p><h2>From idea to verified pull request.</h2></div><p>No external contributor can directly merge into the maintainer's protected branch without repository permission and review.</p></div><ol class="process-grid"><li><span>01</span><h3>Choose scope</h3><p>Comment on an issue or open one with a narrow acceptance checklist.</p></li><li><span>02</span><h3>Fork and branch</h3><p>Make the smallest change that proves the requested behavior.</p></li><li><span>03</span><h3>Run gates</h3><p>Tests, types, browser checks where relevant, license audit, and package dry-run.</p></li><li><span>04</span><h3>Open a PR</h3><p>Include evidence, limitations, provenance, and docs in the same review.</p></li></ol></section>
    <section class="section shell card-grid"><article><p class="eyebrow">Technical discussion</p><h2>Bring a design question.</h2><p>Use Discussions for integrations, architecture, provider contracts, benchmark interpretation, and ideas that are not yet scoped bugs.</p><a class="text-link" href="${discussions}">Open GitHub Discussions →</a></article><article><p class="eyebrow">Benchmark testing</p><h2>Reproduce public evidence.</h2><p>Run the pinned WCEB, robots, URL, and local fixtures. Share the exact commit, Node version, command, raw result, and a reproducible difference.</p><a class="text-link" href="/benchmark/">Read the benchmark method →</a></article><article><p class="eyebrow">Good first contributions</p><h2>Improve the proof surface.</h2><ul class="check-list"><li>Offline integration fixture</li><li>Clear error-message test</li><li>Copy-paste example from a packed consumer</li><li>Benchmark metadata or raw output</li></ul><a class="text-link" href="${goodFirstIssues}">See maintained tasks →</a></article><article><p class="eyebrow">Security findings</p><h2>Use a private advisory.</h2><p>Never post tokens, cookies, private content, or metadata responses in an issue.</p><a class="text-link" href="${repository}/security/advisories/new">Open a private report →</a></article></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Local checks</p><h2>Leave the repository easier to trust.</h2><p>Run the full release gate for changes that affect transport, browser behavior, packaging, or public types.</p></div>${codeBlock("contributor-check", "terminal", "npm ci --ignore-scripts\nnpm run release:check")}</section>`;
}

function selectorBlogPost() {
  return `
    <article class="section shell prose">
      <p class="eyebrow">Engineering · 6 August 2026</p>
      <h1>Why CSS selectors break, and what to do about it</h1>
      <p class="lede">Every scraper dies the same way. It runs green for six weeks, the site ships a redesign, and <code>h2.title</code> matches nothing. The usual response is to patch the selector and wait for it to happen again. It is worth asking why this keeps happening, because the answer points at a fix.</p>

      <h2>A selector is a path, not an identity</h2>
      <p>When you write <code>div.products &gt; li.product h2.title</code>, you are not describing the element. You are describing a route to it: start at a container with this class, descend through a list item with that class, find a heading with this other class. Every step is a fact about the document's current shape, and none of them are facts about the thing you actually want.</p>
      <p>So consider what a front-end developer does in an ordinary week. They rename <code>.product</code> to <code>.item card</code> because the design system changed. They promote <code>h2</code> to <code>h3</code> because a section heading moved above it. They wrap the list in a <code>&lt;section&gt;</code> to hang a grid layout off it. None of these touch the element you care about. The heading still says "Widget A", still sits inside the same list item, still sits beside the same price. Every one of those edits breaks your selector anyway.</p>
      <p>That is the structural problem. Selectors are coupled to the parts of a document that change most often, and decoupled from the parts that stay stable. Brittleness is not a sign you wrote a bad selector. It is what selectors are.</p>

      <h2>What actually stays stable</h2>
      <p>Watch a page across a year of redesigns and a clear ordering emerges. Class names churn constantly - they are the front-end's scratch space. Tag names change occasionally, and usually within a family: <code>h2</code> becomes <code>h3</code>, <code>div</code> becomes <code>section</code>. Nesting depth drifts as wrappers come and go.</p>
      <p>Meanwhile: the <em>text</em> is usually still the text. Identity attributes like <code>data-testid</code>, <code>id</code>, and <code>name</code> survive far longer than classes, because something else depends on them. The <em>relative</em> ancestor chain stays recognisable even when absolute depth changes. And the element keeps roughly the same neighbours.</p>
      <p>So the fix is to record the signals that survive, and weight them by how much they survive.</p>

      <h2>Fingerprint the element, not the path</h2>
      <p>Cockroach Crawler stores a fingerprint the first time a selector resolves: tag name and family, identity attributes, class set, normalized text, the ancestor tag chain, sibling position, and child tag signature. When the selector later matches nothing, every element in the new document is scored against that fingerprint and the best match wins - if it clears a threshold.</p>
      <p>Two details in the scoring do most of the work.</p>

      <h3>Ancestors compare as a subsequence, not a suffix</h3>
      <p>The obvious way to compare two ancestor chains is a common suffix: walk up from the element and count matching tags until they diverge. This fails immediately on the single most common redesign edit. Insert one <code>&lt;section&gt;</code> wrapper and the chains are <code>[html, body, div, main, ul, li]</code> and <code>[html, body, div, main, section, ul, li]</code>. They diverge at the fifth step from the end, and a suffix comparison throws away everything above it.</p>
      <p>A longest common subsequence over the two chains, normalized by the shorter one, returns <strong>1.0</strong> for that pair - the shorter chain appears in the longer one, in order, uninterrupted by the insertion. Wrapper insertion and removal is exactly the operation an LCS is indifferent to, which is why it is the right measure here. This one change is the difference between recovering an element after a redesign and not.</p>
      <p>The same reasoning says to exclude the element's own tag from the chain comparison. It is already scored separately, and including it means any tag change zeroes the structural signal too - double-counting one edit.</p>

      <h3>Tags score by family</h3>
      <p>Comparing tags with equality is too harsh. <code>h2</code> and <code>h3</code> are both headings; <code>div</code> and <code>section</code> are both containers; <code>ul</code> and <code>ol</code> are both lists. Partial credit within a family keeps a heading-to-heading promotion from looking like the element was replaced. Exact match scores 1.0, same family 0.5, unrelated 0.</p>

      <h2>Worked example</h2>
      <p>Here is a real redesign - tag changed, both class names changed, wrapper inserted:</p>
      ${codeBlock("blog-before", "before", `<ul class="products">
  <li class="product">
    <h2 class="title">Widget A</h2>
    <span class="price">$10</span>
  </li>
</ul>`, "html")}
      ${codeBlock("blog-after", "after", `<section>
  <ul class="items grid">
    <li class="item card">
      <h3 class="name">Widget A</h3>
      <span class="cost">$10</span>
    </li>
  </ul>
</section>`, "html")}
      <p>Every class the selector relied on is gone. The tag changed. The depth changed. Scoring the stored fingerprint against the new document gives <strong>0.796</strong>, comfortably above the 0.62 threshold, and resolves to <code>li.item.card:nth-of-type(1) &gt; h3.name</code> - the correct element. Text carries most of the weight, the ancestor LCS contributes a clean 1.0, and the heading-family partial credit keeps the tag change from dragging it under.</p>
      ${codeBlock("blog-code", "usage", `import { ElementFingerprintStore, createAdaptiveLocator } from "cockroach-crawler/adaptive";

const locate = createAdaptiveLocator(
  new ElementFingerprintStore({ directory: ".cockroach/elements" })
);

await locate("product-title", before, { selector: "h2.title" });
// { locatedBy: "selector",  score: 1,     text: "Widget A" }

await locate("product-title", after, { selector: "h2.title" });
// { locatedBy: "relocated", score: 0.796, text: "Widget A" }`, "javascript")}

      <h2>The part everyone gets wrong: abstain</h2>
      <p>A system that always returns its best guess is worse than a broken selector, and it is worse in a way you will not notice. A broken selector throws. A confident wrong match quietly writes the site's cookie banner text into your price column for three weeks.</p>
      <p>So relocation has an explicit threshold and reports a miss below it. If the element genuinely is not on the page - the product was delisted, the page is now a 404 body, the form was removed - the honest answer is that it is not there. A miss is recoverable: retry, escalate, alert. A silent wrong answer corrupts the dataset and the corruption is discovered downstream, if ever.</p>
      <p>This is the same reason the threshold, the weights, and the node ceilings are all caller-visible rather than tuned constants buried in the library. If you are scraping prices you may want a higher bar than if you are scraping article bodies.</p>

      <h2>When not to use it</h2>
      <p>If the site gives you a stable <code>data-testid</code> or a real <code>id</code>, use it. A direct selector that will not break is better than machinery that repairs one that does. Fingerprinting is for the common case where you do not control the markup and the site has no interest in your integration's stability.</p>
      <p>It also does not help when the underlying content genuinely changed. If the product was renamed, the text signal moves with it, and no amount of structural scoring recovers a thing that is no longer there. That is correct behaviour, and the abstention path is what surfaces it.</p>

      <h2>Try it</h2>
      ${codeBlock("blog-install", "install", "npm install cockroach-crawler", "shell")}
      <p>The adaptive engine is MIT-licensed and runs locally with no service dependency. Full details are in the <a href="/docs/">selector documentation</a>, and the scoring implementation is <a href="${repository}/blob/main/src/adaptive.js">readable in one file</a>.</p>
      <div class="button-row"><a class="button primary" href="/docs/">Read the docs</a><a class="button secondary" href="${repository}">Source on GitHub</a></div>
    </article>`;
}

function releasePage() {
  return `
    <section class="page-hero shell release-hero"><p class="eyebrow">Published prerelease · ${candidateVersion}</p><h1>Test the complete 0.7 surface without moving stable.</h1><p class="lede">The reviewed npm <code>next</code> package adds a bounded Node-only quality surface backed by exact <code>trafilatura@0.2.0</code>, while keeping core and serverless exports isolated. npm <code>latest</code> remains ${publishedVersion}.</p><div class="page-actions"><a class="button primary" href="${candidatePackage}">Open npm prerelease</a><a class="button secondary" href="${candidateSource}">Inspect exact source</a><a class="button secondary" href="/benchmark/">Review development evidence</a></div></section>
    <section class="release-banner"><div class="shell"><span>Install reviewed npm next ${candidateVersion}</span><code>npm install cockroach-crawler@next</code><button type="button" class="copy-button" data-copy-value="npm install cockroach-crawler@next" aria-describedby="release-copy-status">Copy</button><span class="sr-only" id="release-copy-status" aria-live="polite"></span></div></section>
    <section class="section shell"><div class="section-head"><div><p class="eyebrow">Evaluation outcome</p><h2>The frozen raw-DOM attempt did not pass.</h2></div><p>Attempt 003 violated five gates and improved precision in six of ten page types where eight were required. It remains negative development evidence and was not integrated into the prerelease.</p></div><div class="callout warning"><strong>No ranking claim</strong><p>The rejected result authorizes no algorithm integration, no stable promotion, no best-crawler statement, and no universal 0.90 claim. The prerelease publishes the separately reviewed product surface for opt-in evaluation.</p></div></section>
    <section class="section shell"><div class="table-wrap" tabindex="0" role="region" aria-label="Release status table"><table><thead><tr><th>Publication item</th><th>Status</th></tr></thead><tbody><tr><td>npm stable</td><td>${publishedVersion} on <code>latest</code></td></tr><tr><td>npm prerelease</td><td><a href="${candidatePackage}">${candidateVersion}</a> on <code>next</code></td></tr><tr><td>Reviewed source</td><td><code>${candidateCommit.slice(0, 12)}</code></td></tr><tr><td>Frozen attempt 003</td><td>Rejected; five gate violations; not integrated</td></tr><tr><td>White-paper DOI</td><td><a href="${paperRecord}">${paperDoi}</a> · published</td></tr><tr><td>Stable promotion gate</td><td>Blocked until a later frozen candidate passes every declared gate and all release checks agree</td></tr></tbody></table></div></section>
    <section class="section shell candidate-release"><div><p class="eyebrow">Reviewable architecture</p><h2>The candidate keeps every extraction path named.</h2><p>Core structural, quality balanced, and quality fail-closed paths stay separate. Engine, profile, abstention state, source fingerprint, and corpus status travel with each evidence artifact.</p><div class="callout warning"><strong>Native boundary</strong><p>The exact <code>trafilatura@0.2.0</code> backend targets Windows, macOS, and glibc Linux on its documented architectures. Alpine/musl, 32-bit, and other operating systems are unsupported; core and serverless stay isolated from the native import.</p></div></div><div class="candidate-facts"><div><span>Core</span><strong>No native import</strong></div><div><span>Quality</span><strong>Exact native backend</strong></div><div><span>Safety</span><strong>Explicit abstention</strong></div><div><span>Evidence</span><strong>Gate-controlled</strong></div></div></section>
    <section class="section shell proof-section"><div><p class="eyebrow">Candidate proof</p><h2>Verify source, browser, audit, MCP, Docker, and tarball.</h2><p>The complete gate checks the candidate artifact but cannot publish it or override a failed frozen evaluation.</p></div>${codeBlock("release-check", "terminal", "npm ci --ignore-scripts\nnpm run release:check\nnpm audit signatures")}</section>
    <section class="section shell card-grid"><article><p class="eyebrow">Upgrade</p><h2>Adopt features incrementally.</h2><p>Existing crawl calls continue to work. Add traversal, cache, browser artifacts, extractors, MCP, or Docker only where the application needs them.</p></article><article><p class="eyebrow">Contribute</p><h2>Bring a real web fixture.</h2><p>Open an issue with a reproducible page, expected record, Node version, and the smallest configuration that demonstrates the improvement.</p><a class="text-link" href="${repository}/issues">Open an issue →</a></article></section>`;
}

const notFound = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found - Cockroach Crawler</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/styles.css?v=${assetVersion}"></head><body><main id="main" tabindex="-1"><section class="page-hero shell not-found"><p class="eyebrow">404</p><h1>This route is outside the crawl map.</h1><p class="lede">The page may have moved. Return to the documentation or inspect the project source.</p><div class="page-actions"><a class="button primary" href="/">Go home</a><a class="button secondary" href="/docs/">Read the docs</a></div></section></main></body></html>`;

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, "assets"), join(dist, "assets"), { recursive: true });
await cp(join(root, "paper"), join(dist, "paper"), { recursive: true });
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
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url><loc>${siteUrl}${page.slug ? `/${page.slug}/` : "/"}</loc><lastmod>${page.lastModified ?? "2026-08-08"}</lastmod></url>`).join("\n")}\n</urlset>\n`,
  "utf8"
);
await writeFile(
  join(dist, "search.json"),
  JSON.stringify(pages.map((page) => ({
    title: page.title,
    description: page.description,
    url: `${siteUrl}${page.slug ? `/${page.slug}/` : "/"}`,
    updated: page.lastModified ?? "2026-08-08"
  })), null, 2),
  "utf8"
);
await writeFile(join(dist, "site.webmanifest"), JSON.stringify({ name: "Cockroach Crawler", short_name: "Crawler", start_url: "/", display: "standalone", background_color: "#07100e", theme_color: "#07100e", icons: [{ src: "/assets/mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] }, null, 2), "utf8");
await writeFile(join(dist, "_headers"), `/*\n  Cache-Control: public, max-age=0, s-maxage=300, must-revalidate, no-transform\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n\n/assets/*\n  Cache-Control: public, max-age=300, must-revalidate, no-transform\n\n/media/*\n  Cache-Control: public, max-age=3600, must-revalidate, no-transform\n`, "utf8");
await writeFile(join(dist, "_redirects"), `/docs /docs/ 301\n/docs/cli /docs/cli/ 301\n/docs/javascript /docs/javascript/ 301\n/docs/crawling /docs/crawling/ 301\n/docs/browser /docs/browser/ 301\n/docs/extraction /docs/extraction/ 301\n/docs/map-and-extract /docs/map-and-extract/ 301\n/docs/agents /docs/agents/ 301\n/docs/mcp /docs/mcp/ 301\n/docs/docker /docs/docker/ 301\n/docs/providers /docs/providers/ 301\n/docs/serverless /docs/serverless/ 301\n/docs/reference /docs/reference/ 301\n/security /security/ 301\n/providers /providers/ 301\n/compare /compare/ 301\n/ecosystem /ecosystem/ 301\n/benchmark /benchmark/ 301\n/paper /paper/ 301\n/media /media/ 301\n/launch /launch/ 301\n/roadmap /roadmap/ 301\n/community /community/ 301\n/release /release/ 301\n`, "utf8");
await writeFile(join(dist, "llms.txt"), `# Cockroach Crawler

Cockroach Crawler is an open-source Node.js web toolkit for AI agents, RAG pipelines, documentation indexing, research, content inventory, and QA. npm latest is ${publishedVersion}; the reviewed ${candidateVersion} prerelease at commit ${candidateCommit} is published on npm next for opt-in evaluation.

The package crawls static and rendered pages and emits LLM-ready Markdown, JSON, or JSONL with canonical URLs, redirect history, content hashes, retrieval metadata, failures, warnings, and provenance. It supports BFS, DFS, best-first, and adaptive traversal; robots and sitemap discovery; validated redirects; persistent cache; searchable fetch-validated site maps; JavaScript rendering; screenshots; PDFs; CSS, XPath, and restricted regex extraction; and optional host-model extraction with JSON Schema validation.

The ${candidateVersion} prerelease adds an opt-in Node-only quality surface backed by exact trafilatura@0.2.0. Historical balanced results are development evidence because the project inspected and iterated against the corpus; they are not fresh confirmation and do not support a universal 0.90 claim.

The separately frozen raw-DOM attempt 003 was rejected: precision 0.860252, recall 0.884690, F1 0.844419, required-snippet recall 0.758829, and unwanted inclusion 0.092846. It violated five gates and improved precision in 6 of 10 page types where 8 were required. It authorizes no integration, release, ranking, or best-crawler statement.

The dependency-light core structural path remains separately measured at ${corePrecision} precision, ${coreRecall} recall, and ${coreF1} F1 on the observed 511 pages. Quality balanced with fail-closed admission records ${failClosedPrecision} precision, ${failClosedRecall} recall, ${failClosedF1} F1, ${failClosedRequired} required-snippet recall, ${failClosedUnwanted} unwanted inclusion, and ${failClosedAbstentions} abstentions. Fail-closed is a separate safety profile; abstained pages return no admitted body.

The native quality backend never silently falls back. Upstream prebuilt binaries cover Windows x64/ARM64, macOS x64/ARM64, and glibc Linux x64/ARM64. Alpine/musl, 32-bit, and other operating systems are unsupported. Core and serverless do not import the native backend.

Alternatives belong to different layers. Some center managed web acquisition, others are programmable crawler frameworks or specialist main-content extractors, and direct browser libraries expose page-level automation primitives. Cockroach Crawler centers bounded local acquisition and normalized evidence. No universal best-crawler or cross-benchmark superiority claim is made.

The governed-agent ecosystem guide maps thirteen source-linked projects by layer. Qarinah supplies evidence-linked project memory, Maqam governs selected registered actions, Cockroach Browser supplies an operator-owned browser authority and evidence runtime, and Cockroach Crawler supplies bounded web acquisition. Cockroach Browser uses playwright-core and does not replace Playwright. Cockroach Crawler's opt-in quality option is Trafilatura-backed and delegates main-content extraction to exact trafilatura@0.2.0. LangGraph and the OpenAI Agents SDK remain orchestration choices; Browser Use and Stagehand remain AI browser frameworks; Firecrawl remains a managed web-acquisition option; Docling remains a document-conversion specialist. This is a category map, not a ranking.

Agent and deployment surfaces include a typed JavaScript API, CLI, strict agent tool, native MCP stdio service with official Registry metadata, authenticated Docker/Node API, bounded process-local asynchronous jobs, dashboard and playground, a fixed operator-owned proxy gateway adapter, a Maqam-compatible browser host, and a restricted Cloudflare Worker profile. Model-facing inputs can narrow but cannot expand deployment-owned origins, credentials, proxy endpoints, browser hooks, profiles, or resource ceilings.

Public conformance evidence records ${robotsPassed}/${robotsCases} adapted Google robots dispatch vectors and ${wptPassed}/${wptCases} applicable credential-free HTTP(S) cases from the pinned WPT URL corpus. Extraction quality, fail-closed coverage, conformance, and local throughput remain separate evidence tracks.

- Complete documentation and searchable 50-capability index: ${siteUrl}/docs/
- Extraction benchmark and scope: ${siteUrl}/benchmark/
- Extraction engineering history: ${siteUrl}/blog/we-benchmarked-ourselves-and-lost/
- Why CSS selectors break: ${siteUrl}/blog/why-css-selectors-break/
- AI crawler comparison: ${siteUrl}/compare/
- Open-source governed-agent ecosystem: ${siteUrl}/ecosystem/
- CLI guide: ${siteUrl}/docs/cli/
- JavaScript guide: ${siteUrl}/docs/javascript/
- Deep crawling and cache: ${siteUrl}/docs/crawling/
- Browser rendering and evidence: ${siteUrl}/docs/browser/
- Quality, Markdown, CSS, XPath, regex, PDF, and LLM extraction: ${siteUrl}/docs/extraction/
- Searchable map and extraction guide: ${siteUrl}/docs/map-and-extract/
- Agent and Maqam guide: ${siteUrl}/docs/agents/
- Native MCP and Registry setup: ${siteUrl}/docs/mcp/
- Docker API, bounded jobs, dashboard, and playground: ${siteUrl}/docs/docker/
- Provider guide: ${siteUrl}/docs/providers/
- Serverless guide: ${siteUrl}/docs/serverless/
- Complete JavaScript and CLI reference: ${siteUrl}/docs/reference/
- Security: ${siteUrl}/security/
- Provider status: ${siteUrl}/providers/
- Technical white paper and frozen-gate status: ${siteUrl}/paper/
- Stable ${publishedVersion} and npm-next ${candidateVersion} status: ${siteUrl}/release/
- Maqam documentation: ${maqamDocs}
- Source: ${repository}
- npm registry: ${npmPackage}
`, "utf8");
const llmsSummary = await readFile(join(dist, "llms.txt"), "utf8");
const publicRouteIndex = pages
  .map((page) => `- ${page.title}: ${siteUrl}${page.slug ? `/${page.slug}/` : "/"}`)
  .join("\n");
await writeFile(
  join(dist, "llms-full.txt"),
  `${llmsSummary}\n## Complete public route index\n\n${publicRouteIndex}\n`,
  "utf8"
);
console.log(`Built ${pages.length} pages in ${dist}`);
