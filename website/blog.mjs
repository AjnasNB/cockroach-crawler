function article({ eyebrow, title, lede, body }) {
  return `
    <article class="section shell prose">
      <p class="eyebrow">${eyebrow}</p>
      <h1>${title}</h1>
      <p class="lede">${lede}</p>
      ${body}
    </article>`;
}

function techArticleSchema({ siteUrl, slug, headline, description, keywords, questions = [] }) {
  const graph = [
    {
      "@type": "TechArticle",
      headline,
      description,
      datePublished: "2026-08-06",
      dateModified: "2026-08-06",
      author: { "@type": "Person", name: "Ajnas N B" },
      publisher: { "@type": "Organization", name: "Cockroach Crawler", url: siteUrl },
      mainEntityOfPage: `${siteUrl}/${slug}/`,
      keywords
    }
  ];
  if (questions.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: questions.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: { "@type": "Answer", text: entry.answer }
      }))
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function blogIndexPage(posts) {
  const cards = posts
    .map((post) => `<li><a href="/${post.slug}/"><h3>${post.cardTitle}</h3><p>${post.cardSummary}</p></a></li>`)
    .join("");
  return `
    <section class="section shell">
      <p class="eyebrow">Writing</p>
      <h1>Notes on crawling things that keep changing</h1>
      <p class="lede">Mechanisms, not announcements. How the pieces of a resilient crawler actually work, and where each one stops working.</p>
      <ul class="card-list blog-index">${cards}</ul>
    </section>`;
}

export function blogPosts({ codeBlock, siteUrl, repository }) {
  return [
    {
      slug: "blog/coherent-request-identity",
      cardTitle: "The header mismatch that gets you blocked",
      cardSummary:
        "A crawler that sends a Chrome user agent with no client hints and a Linux TCP fingerprint describes a browser that does not exist. Here is what coherence means and why it is a correctness problem, not an evasion one.",
      title: "The header mismatch that gets you blocked | Cockroach Crawler",
      description:
        "Why setting a browser user agent alone makes a crawler more suspicious, not less, and what a coherent request identity actually consists of across the HTTP and browser tiers.",
      body: article({
        eyebrow: "Engineering · 6 August 2026",
        title: "The header mismatch that gets you blocked",
        lede:
          "The first thing everyone does when a site returns 403 is set a Chrome user agent. It often makes things worse. Here is why, and what to do instead.",
        body: `
      <h2>A user agent is one field out of about a dozen</h2>
      <p>When real Chrome 141 on Windows requests a page it sends a coordinated set: a user agent naming Chrome and Windows, <code>sec-ch-ua</code> listing the brand and version, <code>sec-ch-ua-platform</code> saying <code>"Windows"</code>, <code>sec-ch-ua-mobile</code> saying <code>?0</code>, an <code>Accept</code> string in Chrome's exact preference order, <code>Accept-Language</code>, a <code>sec-fetch-*</code> quartet describing the navigation, and a TLS handshake with Chrome's cipher and extension ordering.</p>
      <p>Set only the user agent and you have produced something that has never existed: a client claiming to be Chrome on Windows, sending no client hints at all, with an <code>Accept</code> header in a different order and a TLS fingerprint that says Node.js. That is not a browser wearing a disguise. It is a distinctly identifiable non-browser, and it is easier to classify than the honest default would have been.</p>
      <p>This is the part people miss. The <code>curl/8.4.0</code> user agent is unremarkable — it is one of millions of scripts, and most sites do not care. A user agent that <em>claims</em> Chrome while contradicting itself in six other fields is anomalous, and anomalous is the thing detection systems are built to find.</p>

      <h2>What coherence looks like</h2>
      <p>A named identity profile fixes the whole set together:</p>
      ${codeBlock("identity-basic", "coherent identity", `import { resolveIdentity, identityHeaders } from "cockroach-crawler/identity";

const identity = resolveIdentity("chrome-windows");
identityHeaders(identity);
// {
//   "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/141.0.0.0 ...",
//   "sec-ch-ua": '"Chrome";v="141", "Chromium";v="141", "Not?A_Brand";v="24"',
//   "sec-ch-ua-platform": '"Windows"',
//   "sec-ch-ua-mobile": "?0",
//   "accept-language": "en-US,en;q=0.9",
//   ...
// }`, "javascript")}
      <p>Ask for a Firefox profile and the Chromium client hints disappear entirely, because Firefox does not send them. Ask for <code>safari-ios</code> and you get a mobile user agent, <code>sec-ch-ua-mobile: ?1</code>, a 393×852 viewport, and a 3× device pixel ratio — the combination an actual iPhone reports. Getting the viewport wrong matters more than people expect: a mobile user agent paired with a 1920×1080 viewport is its own contradiction, and it is the one that changes what markup you receive.</p>

      <h2>The same identity has to drive the browser tier</h2>
      <p>The failure mode that wastes an afternoon is a static crawl and a rendered crawl that disagree. You tune headers for the HTTP path, the page needs JavaScript, you switch to browser mode, and Playwright launches with its own defaults. Now you are sending a different identity from the same crawler and getting different markup back, with no obvious reason.</p>
      ${codeBlock("identity-crawl", "one declaration, both tiers", `import { crawl } from "cockroach-crawler";

await crawl({
  seeds: ["https://shop.example/catalog"],
  identity: "chrome-windows"      // HTTP requests
});

await crawl({
  seeds: ["https://shop.example/catalog"],
  identity: "chrome-windows",     // and the browser context
  browser: true
});`, "javascript")}
      <p>Setting both <code>identity</code> and <code>userAgent</code> is rejected rather than silently resolved in favour of one. Two sources of truth for the same field is how the mismatch gets reintroduced.</p>

      <h2>Where this stops helping</h2>
      <p>A coherent identity fixes the case where a site is refusing you because your client looks broken. It does not fix a site that has decided it does not want automated traffic and is enforcing that with challenges. Those are different problems, and conflating them is how people end up on an escalation ladder they should have stepped off at the first rung.</p>
      <p>A profile also sets the transport's cipher list, curves, signature algorithms, and ALPN to match the browser it names, because a Chrome user agent over a Node-default handshake is the same incoherence one layer down. It controls most of what a JA3 fingerprint hashes, but not extension ordering or GREASE, so the handshake is browser-shaped rather than byte-identical. Cockroach Crawler ships no fingerprint randomiser and no solver. Profiles are named, version-pinned, and inspectable in the package, and none of them impersonates a specific person, session, or account. If a site is challenging you, the honest next step is <a href="/blog/challenges-are-not-content/">treating that as a signal</a>, not a puzzle.</p>

      <h2>Try it</h2>
      ${codeBlock("identity-install", "install", "npm install cockroach-crawler", "shell")}
      <p>Profiles, overrides, and the browser-context mapping are documented in the <a href="/docs/">selector and identity guide</a>, and the implementation is <a href="${repository}/blob/main/src/identity.js">one readable file</a>.</p>`
      }),
      schema: techArticleSchema({
        siteUrl,
        slug: "blog/coherent-request-identity",
        headline: "The header mismatch that gets you blocked",
        description:
          "Setting a browser user agent without the matching client hints, Accept ordering, viewport, and TLS profile produces a client that has never existed, which is easier to classify than an honest default.",
        keywords: ["web scraping", "user agent", "client hints", "http headers", "browser fingerprint", "web crawler", "403 forbidden"],
        questions: [
          {
            question: "Why does setting a browser user agent still get my scraper blocked?",
            answer:
              "A user agent is one field among many. Real Chrome also sends sec-ch-ua client hints, a specific Accept ordering, sec-fetch headers, and a distinctive TLS handshake. Setting only the user agent produces a client that claims to be Chrome while contradicting itself elsewhere, which is more anomalous than an honest default."
          },
          {
            question: "What is a coherent request identity?",
            answer:
              "A coherent identity fixes the user agent, client hints, Accept and Accept-Language, viewport, platform, locale, and timezone together so they describe one real browser, and applies the same declaration to both HTTP requests and the browser rendering context."
          }
        ]
      })
    },

    {
      slug: "blog/challenges-are-not-content",
      cardTitle: "A challenge page is not content",
      cardSummary:
        "The worst scraper bug is the one that succeeds. If an interstitial gets parsed as a page, you get a clean-looking record full of nothing. Detection first, decision second.",
      title: "A challenge page is not content | Cockroach Crawler",
      description:
        "Why treating an access challenge as a first-class outcome instead of page content prevents silent data corruption, and what a governed challenge policy looks like.",
      body: article({
        eyebrow: "Engineering · 6 August 2026",
        title: "A challenge page is not content",
        lede:
          "The expensive scraper bug is not the one that crashes. It is the one that returns a tidy record for a page it never actually read.",
        body: `
      <h2>The failure that looks like success</h2>
      <p>A site starts challenging your crawler. The response is HTTP 403 with a full HTML body: a title, a script tag, a little markup. Your extractor does what it always does — strips tags, takes the text, produces a record. The record has a URL, a timestamp, a content hash, and almost no text.</p>
      <p>Nothing threw. Nothing logged. The row lands in your dataset next to ten thousand real ones, and the only signal is that the page got shorter. Multiply by a few weeks and you have a corpus where an unknown fraction of rows are interstitials, and no way to tell which without refetching everything.</p>
      <p>Compare that with a hard failure. A crawler that stops and says "this URL returned a Cloudflare interstitial" gives you a decision to make. A crawler that quietly returns thin content gives you a decision you do not know you need to make.</p>

      <h2>Detect first, decide second</h2>
      <p>Detection and response are separate concerns and should be separately configurable. Cockroach Crawler always detects; what happens next is policy.</p>
      ${codeBlock("challenge-detect", "detection", `import { detectChallenge } from "cockroach-crawler/identity";

detectChallenge({ status: 403, headers, body, url });
// {
//   challenged: true,
//   vendor: "cloudflare",
//   kind: "interstitial",
//   evidence: ["body:cloudflare:challenges\\\\.cloudflare\\\\.com", "body:cloudflare:<title>\\\\s*just a moment"]
// }`, "javascript")}
      <p>Vendor signatures cover Cloudflare, DataDome, PerimeterX, Akamai, reCAPTCHA, and hCaptcha across both headers and body markers. A bare 403 or 429 with a short body is reported as a block or rate limit with <code>vendor: "unknown"</code> rather than being attributed to whichever vendor happened to be first in the list — an honest "something refused you" beats a confident wrong attribution.</p>
      <p>The <code>evidence</code> array matters more than it looks. When you are debugging why a crawl went thin at 3am, "this matched the Turnstile script URL and a <em>Just a moment</em> title" is a different quality of information from "blocked: true".</p>

      <h2>Three policies</h2>
      ${codeBlock("challenge-policy", "policy modes", `// deny (default) — record a CHALLENGE_ENCOUNTERED failure, do not admit the page
await crawl({ seeds });

// report — admit the page, hand the decision back to you
await crawl({ seeds, challengePolicy: { mode: "report" } });`, "javascript")}
      <p>Deny is the default because the safe behaviour when you cannot read a page is to say so. Under it a challenged page never becomes a row; it becomes a structured failure with a code you can filter on.</p>

      <h2>The governed third option</h2>
      <p>There is a real case that neither mode covers. You are authorized to crawl a site — you own it, or you have a contract, or it is your own staging environment — and an over-broad protection rule is blocking you anyway. That is a legitimate problem and it deserves a legitimate path.</p>
      ${codeBlock("challenge-operator", "operator mode", `const policy = {
  mode: "operator",
  authorization: "I operate shop.example and hold a WAF allowlist for this crawler.",
  allowOrigins: ["https://shop.example"],
  handler: async ({ origin }) => ({
    resolved: true,
    headers: { "cf-clearance": await myIssuedToken(origin) }
  })
};`, "javascript")}
      <p>Operator mode fails closed and demands three things: a written authorization statement, an explicit origin allowlist, and a handler you supply. A challenge from an origin outside the allowlist is refused even when the handler is valid, so a redirect cannot quietly widen the scope of what you meant to authorize.</p>
      <p>The design point is where the capability comes from. The package ships no solver and calls no solving service. Whatever resolves the challenge is authority <em>you already hold</em> — an allowlist entry, an issued clearance token, a contract-backed credential, or a human who answered the challenge once in an attended browser. The policy records that authority in a string, which means it is auditable later by someone who was not there.</p>
      <p>That is a real distinction, not a euphemism. A tool that solves challenges works identically whether you are authorized or not. A tool that carries <em>your</em> authorization only works where you actually have some.</p>

      <h2>What this does not do</h2>
      <p>If a site is challenging you and you have no authorization, this gives you a clear error instead of a bypass. That is the intended outcome. The failure mode it is designed to prevent is not "you got blocked" — it is "you got blocked and your pipeline did not notice for three weeks."</p>
      ${codeBlock("challenge-install", "install", "npm install cockroach-crawler", "shell")}`
      }),
      schema: techArticleSchema({
        siteUrl,
        slug: "blog/challenges-are-not-content",
        headline: "A challenge page is not content",
        description:
          "Treating an access challenge as a first-class crawl outcome rather than as page content prevents silent dataset corruption, and separates detection from the decision about what to do next.",
        keywords: ["web scraping", "cloudflare", "bot detection", "captcha", "data quality", "web crawler"],
        questions: [
          {
            question: "Why is my scraper returning empty pages instead of an error?",
            answer:
              "An access challenge is usually served as a normal HTML body with a 403 status. A generic extractor strips the tags and produces a valid-looking record containing almost no text, so nothing throws and nothing logs. Detecting the challenge explicitly turns a silent thin row into a structured failure."
          },
          {
            question: "How do I handle Cloudflare when crawling a site I own?",
            answer:
              "Use authority you already hold rather than a solver: a WAF allowlist entry for your crawler, an issued clearance token, or a human-answered challenge in an attended session. Cockroach Crawler's operator mode carries that authorization through a handler you supply, gated by an explicit origin allowlist."
          }
        ]
      })
    },

    {
      slug: "blog/resumable-crawls",
      cardTitle: "Crawls that survive being interrupted",
      cardSummary:
        "A 40-minute crawl that dies at minute 38 and restarts from zero is not a crawler, it is a lottery ticket. Frontier checkpointing, adaptive throttling, and why fixed delays are wrong.",
      title: "Crawls that survive being interrupted | Cockroach Crawler",
      description:
        "How frontier checkpointing makes a long crawl resumable, why a fixed request delay is the wrong shape for adaptive throttling, and how to back off from a server that is refusing you.",
      body: article({
        eyebrow: "Engineering · 6 August 2026",
        title: "Crawls that survive being interrupted",
        lede:
          "Any crawl long enough to be useful is long enough to be interrupted. Designing for that from the start costs very little; retrofitting it costs a rewrite.",
        body: `
      <h2>The frontier is the state that matters</h2>
      <p>A crawler's real state is two sets: what it has visited, and what it still intends to visit. Everything else — parsed items, statistics, logs — is downstream and reproducible. If you persist those two sets atomically, a crawl becomes resumable. If you do not, every interruption costs the entire run.</p>
      ${codeBlock("spider-checkpoint", "resumable spider", `import { Spider, SpiderCheckpoint } from "cockroach-crawler/spider";

const checkpoint = new SpiderCheckpoint({ directory: ".cockroach/spiders", name: "shop" });

const spider = new Spider({
  startUrls: ["https://shop.example/"],
  maxPages: 5_000,
  checkpoint
});

await spider.run();   // interrupted at page 3,200

// same name, later:
await new Spider({ startUrls: ["https://shop.example/"], maxPages: 5_000, checkpoint }).run();
// resumes at 3,200 rather than refetching`, "javascript")}
      <p>Writes are atomic — temp file, then rename — because a checkpoint torn in half by a crash is worse than no checkpoint. Checkpoints are namespaced by name, so two spiders sharing a directory never read each other's frontier, which is the bug you get exactly once and remember forever.</p>
      <p><code>checkpointEvery</code> trades write frequency against how much a crash costs. Every batch is the safe default; every ten batches is reasonable when pages are cheap and the disk is not.</p>

      <h2>Fixed delays are the wrong shape</h2>
      <p>Most crawlers offer a fixed delay between requests, and every value is wrong. Set it high and a fast server takes hours it did not need to. Set it low and a struggling server gets hammered exactly when it can least afford it. The delay you want is not a constant, it is a function of how the server is currently coping.</p>
      ${codeBlock("spider-throttle", "adaptive throttling", `const spider = new Spider({
  startUrls: ["https://shop.example/"],
  autoThrottle: { targetLatencyMs: 800, minDelayMs: 50, maxDelayMs: 10_000 }
});`, "javascript")}
      <p>The throttle measures per-page latency and moves the delay toward a target, smoothed so a single slow response does not swing it. Response time is a decent proxy for load: a server under pressure gets slower before it starts refusing, so latency gives you a signal ahead of the errors.</p>

      <h2>Back off fast, recover slowly</h2>
      <p>One asymmetry is worth being deliberate about. A challenge or a 429 <strong>doubles</strong> the delay immediately rather than easing toward a new target.</p>
      <p>The reasoning: latency is a soft signal that can drift for many reasons, so a smoothed response is right. A 429 is not soft. It is the server explicitly telling you to stop, and the correct reply is to stop noticeably, not to ease off by fifteen percent and try again. Gradual response to an explicit refusal is how a temporary rate limit becomes a permanent block.</p>
      <p>Recovery stays gradual, because a server that just refused you has not necessarily recovered by the next request.</p>

      <h2>Items stream, failures accumulate</h2>
      ${codeBlock("spider-stream", "streaming", `for await (const item of spider.stream()) {
  await save(item);
}`, "javascript")}
      <p>Streaming matters for the same reason checkpointing does: a crawl that buffers 50,000 items and then crashes has produced nothing. One that writes as it goes has produced 49,000 useful rows and a resumable frontier.</p>
      <p>A failing page collects into <code>failures</code> rather than aborting the run — one 404 should not kill a 5,000-page crawl. But check the array before treating a run as complete. Forty items and sixty failures describes a very different site from forty items and none, and only one of those is a result.</p>
      ${codeBlock("spider-install", "install", "npm install cockroach-crawler", "shell")}
      <p>Rules, sitemap spiders, and the full option set are in the <a href="/docs/">spider guide</a>.</p>`
      }),
      schema: techArticleSchema({
        siteUrl,
        slug: "blog/resumable-crawls",
        headline: "Crawls that survive being interrupted",
        description:
          "Frontier checkpointing makes a long crawl resumable, and adaptive throttling replaces a fixed request delay with one derived from how the server is currently coping.",
        keywords: ["web crawler", "resumable crawl", "checkpoint", "autothrottle", "rate limiting", "web scraping"],
        questions: [
          {
            question: "How do I resume a web crawl after it is interrupted?",
            answer:
              "Persist the visited set and the remaining frontier atomically, then reload both on start. Cockroach Crawler's SpiderCheckpoint writes those two sets via a temp file and rename, namespaced by checkpoint name, so a restarted spider continues from where it stopped instead of refetching."
          },
          {
            question: "What is a good delay between crawler requests?",
            answer:
              "There is no single correct fixed value. Adaptive throttling derives the delay from observed response latency against a target, and backs off sharply on an explicit 429 or challenge rather than easing gradually, because a rate limit is an explicit refusal rather than a soft signal."
          }
        ]
      })
    },

    {
      slug: "blog/cookies-and-proxies",
      cardTitle: "Cookie jars are mostly about refusing cookies",
      cardSummary:
        "Most of the RFC 6265 rules exist to stop one origin setting cookies for another. Plus why sticky proxy rotation usually beats round-robin.",
      title: "Cookie jars are mostly about refusing cookies | Cockroach Crawler",
      description:
        "The interesting half of a cookie jar is the rules for rejecting cookies, not storing them. Plus why sticky proxy assignment beats round-robin for most crawls.",
      body: article({
        eyebrow: "Engineering · 6 August 2026",
        title: "Cookie jars are mostly about refusing cookies",
        lede:
          "Storing a cookie is a hash map. The part that takes thought is deciding which cookies you are not allowed to store, and which you are not allowed to send.",
        body: `
      <h2>The rules are all about scope</h2>
      <p>Read RFC 6265 looking for the storage mechanism and you will be disappointed — it is a set of name/value pairs. Almost the entire specification is about scope: which origin may set a cookie for which domain, which paths it applies to, whether it may cross from HTTPS to HTTP.</p>
      <p>Those rules exist because cookies are ambient authority. A cookie set by one response is attached automatically to future requests, so a mistake in scoping is a mistake in who gets your credentials.</p>
      ${codeBlock("cookie-scope", "scope enforcement", `import { CookieJar } from "cockroach-crawler/session";

const jar = new CookieJar();

// an origin may widen to its own registrable domain
jar.store("https://x.test/", "a=1; Domain=x.test");
jar.headerFor("https://sub.x.test/");     // "a=1"

// but never to somebody else's
jar.store("https://evil.test/", "a=1; Domain=x.test");   // false
jar.headerFor("https://x.test/");                         // ""

// Secure cookies never downgrade
jar.store("https://x.test/", "sid=abc; Secure");
jar.headerFor("http://x.test/");                          // ""`, "javascript")}
      <p>The <code>evil.test</code> case is the one that matters. Without that check, any response your crawler touches can set a cookie that gets attached to requests for an unrelated site. In a crawler that follows arbitrary links, that is a genuine cross-origin leak, not a hypothetical.</p>

      <h2>Ordering is part of correctness</h2>
      <p>When several stored cookies match a request, the specification says to send more specific paths first. That sounds cosmetic. It is not: servers commonly read the first occurrence of a name, so a jar that emits <code>a=root</code> before <code>a=deep</code> can send a logged-out session to a page that had a scoped one.</p>
      <p>Host-only scoping deserves the same care. A cookie set without a <code>Domain</code> attribute belongs to that exact host and must not leak to subdomains — a distinction easy to collapse when you are storing by registrable domain for convenience.</p>

      <h2>Sessions should outlive processes</h2>
      ${codeBlock("cookie-persist", "persistence", `const state = JSON.stringify(jar.toJSON());
await writeFile(".cockroach/session.json", state);

const restored = CookieJar.fromJSON(JSON.parse(state));`, "javascript")}
      <p>Expired cookies are dropped on load rather than resurrected, and every ceiling is re-applied, so a serialised jar cannot be used to smuggle a larger jar back in.</p>

      <h2>Sticky beats round-robin more often than you would think</h2>
      <p>The reflex with a proxy pool is round-robin: spread requests evenly, use everything. For crawling that is frequently the wrong default.</p>
      <p>Round-robin means consecutive requests to the same site arrive from different addresses. If that site keeps any per-address state — a session, a rate-limit bucket, a consent cookie — you have just made yourself look like a distributed crowd sharing one session, which is both more suspicious and functionally broken.</p>
      ${codeBlock("proxy-sticky", "sticky rotation", `import { ProxyRotator } from "cockroach-crawler/session";

const rotator = new ProxyRotator({
  proxies: ["http://a.example:8080", "http://b.example:8080"],
  strategy: "sticky",
  maxFailures: 3,
  cooldownMs: 60_000
});

rotator.next("https://shop.example");   // same egress for this site
rotator.report(proxyUrl, false);        // three strikes, then cooled down`, "javascript")}
      <p>Sticky assigns one egress per site and keeps it. You still get parallelism across sites, without splitting a single site's session across addresses. Round-robin remains right when you are spreading load across many hosts and holding no per-host state.</p>
      <p>Failure handling has one deliberate property: when every proxy is cooling down, the rotator returns one anyway rather than throwing. A crawl slowed by a degraded proxy is more useful than a crawl that stopped, and the caller can inspect <code>healthy</code> to decide whether to keep going.</p>
      ${codeBlock("session-install", "install", "npm install cockroach-crawler", "shell")}`
      }),
      schema: techArticleSchema({
        siteUrl,
        slug: "blog/cookies-and-proxies",
        headline: "Cookie jars are mostly about refusing cookies",
        description:
          "The substance of a cookie jar is scope enforcement — which origin may set which domain, path matching, and Secure downgrade rules — plus why sticky proxy assignment suits crawling better than round-robin.",
        keywords: ["cookie jar", "rfc 6265", "proxy rotation", "web scraping", "session management", "web crawler"],
        questions: [
          {
            question: "Why does my scraper lose its session between requests?",
            answer:
              "Usually because cookies are not being stored and replayed with correct scope, or because a rotating proxy pool sends consecutive requests to the same site from different addresses. A persistent cookie jar plus sticky proxy assignment keeps one coherent session per site."
          },
          {
            question: "Is round-robin or sticky proxy rotation better for crawling?",
            answer:
              "Sticky is usually better for crawling a single site, because it keeps one egress address per host so per-address session and rate-limit state stays coherent. Round-robin suits spreading load across many hosts where no per-host state is held."
          }
        ]
      })
    },

    {
      slug: "blog/we-benchmarked-ourselves-and-lost",
      cardTitle: "We benchmarked our extractor against trafilatura and lost",
      cardSummary:
        "511 pages, one scorer, three tools, and a result that does not flatter us. Here is the number, why we published it anyway, and what it took to close the gap by a third.",
      title: "We benchmarked our extractor against trafilatura and lost | Cockroach Crawler",
      description:
        "A reproducible comparison of Cockroach Crawler, trafilatura, and readability-lxml on all 511 pages of WCEB v1.0 using one scorer, published including the result where Cockroach Crawler loses.",
      body: article({
        eyebrow: "Engineering · 7 August 2026",
        title: "We benchmarked our extractor against trafilatura and lost",
        lede:
          "Content extraction comparisons are mostly unfalsifiable. Everyone picks their own corpus, their own scoring, and publishes the run that looked good. So we ran the tools that matter on one corpus with one scorer, and published what came back.",
        body: `
      <h2>The result</h2>
      <p>All 511 pages of the WCEB v1.0 test split, pinned to revision <code>62ff86d1</code>, macro word precision, recall, and F1, one scorer applied identically to every tool.</p>
      <table><thead><tr><th>Tool</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead><tbody>
        <tr><td>trafilatura 2.2.0</td><td>0.8901</td><td>0.8683</td><td><strong>0.8600</strong></td></tr>
        <tr><td>cockroach-crawler 0.6.0</td><td>0.7938</td><td><strong>0.8738</strong></td><td>0.7915</td></tr>
        <tr><td>readability-lxml</td><td>0.8694</td><td>0.6263</td><td>0.6565</td></tr>
      </tbody></table>
      <p>Trafilatura wins by 0.069 macro F1. That is not a rounding difference and we are not going to describe it as one.</p>

      <h2>Why publish a loss</h2>
      <p>Because a benchmark that only appears when it flatters the author is marketing wearing a lab coat. The moment you publish only your wins, every number you produce becomes unfalsifiable, including the ones that are true.</p>
      <p>There is a practical reason too. A measured gap is a work item. Before the comparison existed, &quot;our extraction is a bit noisy&quot; was a feeling. Afterwards it was 0.3885 unwanted-snippet inclusion against trafilatura's 0.0824, with a page-class breakdown pointing at product, article, and forum pages. That is something you can fix and re-measure.</p>

      <h2>What the gap actually was</h2>
      <p>The shape was consistent everywhere: highest recall of the three tools, lowest precision. We kept more of the annotated content than anyone, and a great deal else besides.</p>
      <p>The cause was embarrassingly simple. Extraction picked <code>main</code>, <code>article</code>, or <code>[role=main]</code>, and when a page had none of those it took the entire <code>&lt;body&gt;</code>. Nothing removed navigation, footers, sidebars, or cookie banners. Nothing scored one block against another. The extractor was trusting the markup to be well behaved.</p>
      <p>Splitting the corpus made the cost visible: 412 pages carrying a landmark scored 0.7810 precision, and the 99 without one scored 0.6368.</p>

      <h2>Three changes, each measured</h2>
      <p><strong>Landmark removal.</strong> Drop <code>nav</code>, <code>aside</code>, <code>footer</code>, and the equivalent ARIA roles. The specification already says these sit outside main content, so this costs no measurable recall: 0.9041 to 0.9038. Unwanted inclusion fell by a quarter.</p>
      <p><strong>Block scoring.</strong> When there is no landmark, score candidate subtrees on text length, paragraph count, punctuation, link text, and class-name hints, then use the winner instead of the body. Precision 0.7530 to 0.7749.</p>
      <p><strong>Sentence-aware filtering.</strong> This one needed looking at the failures rather than guessing. The worst pages were e-commerce menus surviving as prose:</p>
      <pre tabindex="0" aria-label="Worst scoring pages and the boilerplate text that survived extraction"><code>0.021  shop all bakeware baking liners bread pans bundt pans cookie cutters
0.051  filterscategorygamingwebcamswearablescell phone casesscreen protectors</code></pre>
      <p>Link density alone cannot catch those, because a paragraph citing six sources is link-dense and is content. The separating signal is sentence punctuation. Menus and widget output run long without ever ending a sentence, so a block is removed only when it is both link-heavy and punctuation-starved. Precision 0.7749 to 0.7938.</p>
      <p>One detail is load-bearing. The size floor counts characters, not tokens. Anchor text concatenates without separators, so that second example is a 200-character run of five whitespace-delimited tokens, and a token floor let exactly the blocks we were targeting slip through.</p>

      <h2>Where it landed</h2>
      <table><thead><tr><th>Stage</th><th>Precision</th><th>Recall</th><th>F1</th><th>Unwanted</th></tr></thead><tbody>
        <tr><td>Before</td><td>0.7330</td><td>0.9041</td><td>0.7653</td><td>0.3885</td></tr>
        <tr><td>After</td><td>0.7938</td><td>0.8738</td><td>0.7915</td><td>0.1787</td></tr>
      </tbody></table>
      <p>Surviving boilerplate down 54% for 0.026 of recall. The gap to trafilatura closed from 0.095 to 0.069, and to 0.056 with the opt-in <code>balanced</code> preset.</p>
      <p>We still lose. The remaining difference is that trafilatura filters at paragraph and sentence granularity throughout, where we now choose the right container and strip obvious non-prose but keep what remains inside it.</p>

      <h2>The thing we did not do</h2>
      <p>We did not tune against the corpus until the number looked good. Every threshold is a round default chosen for a stated reason, and the presets were compared as whole configurations rather than searched. It would have been straightforward to fit these 511 pages into the high 0.8s and meaningless the moment anyone ran it on their own pages.</p>
      <p>Relatedly: <code>aggressive</code> scores <em>worse</em> F1 than <code>balanced</code>, in every version of the algorithm we tried. More removal is not monotonically better, and that stayed in the documentation because it is the kind of thing you only find by measuring.</p>

      <h2>Run it yourself</h2>
      ${codeBlock("bench-repro", "reproduce", `git clone https://github.com/Murrough-Foley/web-content-extraction-benchmark.git wceb
git -C wceb checkout 62ff86d12ea72c80c31fb810ff1a724fad687bea

pip install trafilatura readability-lxml
python bench/public/baselines/extract_baselines.py --dataset ./wceb --out ./baselines
npm run bench:public:comparison -- --dataset ./wceb --baselines ./baselines`, "shell")}
      <p>Extraction and scoring are separate processes. The scorer never invokes another extractor; it only scores text files it is handed, so nobody has to trust that we ran the competition fairly. Baselines run at documented defaults, and trafilatura's recall-favouring mode was not used, which is disclosed because it might change the result.</p>
      <p>Method, page-class breakdown, and the claims these numbers do <strong>not</strong> support are in the <a href="/docs/">comparison documentation</a>.</p>
`
      }),
      schema: techArticleSchema({
        siteUrl,
        slug: "blog/we-benchmarked-ourselves-and-lost",
        headline: "We benchmarked our extractor against trafilatura and lost",
        description:
          "A reproducible comparison of Cockroach Crawler, trafilatura, and readability-lxml across all 511 pages of WCEB v1.0 with one scorer, published including the losing result.",
        keywords: [
          "trafilatura vs readability",
          "content extraction benchmark",
          "best html content extractor",
          "boilerplate removal",
          "main content extraction",
          "readability alternative",
          "trafilatura alternative nodejs",
          "web scraping precision recall"
        ],
        questions: [
          {
            question: "Which content extractor is most accurate: trafilatura, readability, or Cockroach Crawler?",
            answer:
              "On all 511 pages of WCEB v1.0 scored with one metric implementation, trafilatura 2.2.0 leads with 0.8600 macro F1, Cockroach Crawler 0.6.0 follows at 0.7915, and readability-lxml scores 0.6565. Cockroach Crawler has the highest recall of the three at 0.8738, meaning it retains more annotated content, while trafilatura is better balanced overall."
          },
          {
            question: "How do you remove boilerplate from HTML without losing content?",
            answer:
              "Remove the HTML landmarks the specification already places outside main content, score candidate blocks when no landmark exists, and drop blocks that are both link-heavy and lacking sentence punctuation. Guard every rule with a text-share ceiling so a container holding most of the page is never removed regardless of its class name."
          },
          {
            question: "Is there a Node.js alternative to trafilatura?",
            answer:
              "Cockroach Crawler provides main-content extraction in Node.js alongside crawling, rendering, and structured extraction. On the WCEB benchmark it scores lower than trafilatura on macro F1 and higher on recall, so the choice depends on whether losing content or retaining boilerplate is the more expensive failure for your pipeline."
          }
        ]
      })
    },
    {
      slug: "blog/blocking-what-you-do-not-read",
      cardTitle: "Most of a page is not the page",
      cardSummary:
        "A rendered crawl downloads fonts, hero images, and forty analytics beacons your extractor never reads. Blocking them is the cheapest speedup available, with three traps.",
      title: "Most of a page is not the page | Cockroach Crawler",
      description:
        "Blocking images, fonts, and trackers in a rendered crawl is the cheapest available speedup. Here are the three ways naive blocking silently changes what you extract.",
      body: article({
        eyebrow: "Engineering · 6 August 2026",
        title: "Most of a page is not the page",
        lede:
          "Open a typical article page in a rendered crawler and count the requests. One is the document. The rest are images, fonts, stylesheets, and beacons that no extractor will ever look at.",
        body: `
      <h2>The cheapest optimisation in crawling</h2>
      <p>If you are extracting text, structured fields, or Markdown, you are reading the document and possibly running scripts that build it. You are not reading the hero image, the icon font, or the analytics beacon. Yet a default rendered crawl fetches every one, and pays for them in bytes, latency, and memory.</p>
      ${codeBlock("block-basic", "resource blocking", `import { crawl } from "cockroach-crawler";

await crawl({
  seeds: ["https://docs.example/"],
  browser: {
    requestPolicy: { blockResources: "assets", blockTrackers: true }
  }
});`, "javascript")}
      <p>Presets cover the usual shapes: <code>media</code> drops images, video, and fonts; <code>assets</code> adds stylesheets; <code>text</code> additionally drops scripts. That last one is only safe on server-rendered pages — which is the first trap.</p>

      <h2>Trap one: scripts often are the content</h2>
      <p>Blocking scripts on a server-rendered documentation site is free. Blocking them on a single-page app means the document you receive is an empty shell, and your extractor faithfully reports that the page has no content. The failure is silent and looks exactly like a thin page.</p>
      <p>If you are rendering at all, you probably need scripts. Reach for <code>assets</code> rather than <code>text</code> unless you have checked.</p>

      <h2>Trap two: blocking the document</h2>
      <p>A blocklist that can match the navigation request can block the page itself, producing an empty result with no obvious cause. Cockroach Crawler rejects <code>document</code> as a blockable type at configuration time rather than at request time, and never applies the policy to a navigation request. Failing at validation is much kinder than failing at 3am.</p>

      <h2>Trap three: over-broad domain rules</h2>
      <p>Blocking a CDN because it also serves ads takes out the images and stylesheets you actually needed. So <code>allowDomains</code> overrides everything else:</p>
      ${codeBlock("block-allow", "targeted exemption", `browser: {
  requestPolicy: {
    blockTrackers: true,
    blockResources: "assets",
    allowDomains: ["images.shop.example"]   // wins over every block rule
  }
}`, "javascript")}
      <p>The precedence is deliberate. A broad policy plus a narrow exemption is easier to reason about than a policy you keep narrowing until it no longer does anything.</p>

      <h2>Blocked is not the same as absent</h2>
      <p>Every blocked request is recorded with its reason and the rule that matched. When a crawl comes back thin, the first question is whether the page was thin or whether you blocked something structural — and that is a question you want answered from a log, not by bisecting your config.</p>
      <p>One more deliberate choice: a URL that fails to parse is passed through rather than blocked. Failing to parse a URL is not evidence that it is a tracker, and defaulting to "block what I do not understand" makes crawls fail in ways that are very hard to explain.</p>

      <h2>Opt in, not out</h2>
      <p>The tracker list covers around 140 analytics, advertising, session-replay, and consent hosts. It is off by default. A crawler that silently changes which requests a page makes is a crawler whose results you cannot compare across versions, so this is something you turn on, and turning it on is recorded in your config where the next person can see it.</p>
      ${codeBlock("block-install", "install", "npm install cockroach-crawler", "shell")}`
      }),
      schema: techArticleSchema({
        siteUrl,
        slug: "blog/blocking-what-you-do-not-read",
        headline: "Most of a page is not the page",
        description:
          "Blocking images, fonts, stylesheets, and tracker requests is the cheapest speedup in rendered crawling, with three traps: blocking scripts on client-rendered pages, blocking the document, and over-broad domain rules.",
        keywords: ["web scraping performance", "playwright", "block resources", "ad blocking", "tracker blocking", "web crawler"],
        questions: [
          {
            question: "How do I make Playwright scraping faster?",
            answer:
              "Block the resource types your extractor never reads. Images, fonts, and stylesheets are usually safe to drop; scripts are only safe on server-rendered pages. Blocking known analytics and advertising hosts removes further requests that never contribute to extracted content."
          },
          {
            question: "Why did my page come back empty after blocking resources?",
            answer:
              "Most often because scripts were blocked on a client-rendered page, so the document arrived as an empty shell. Blocking the navigation request itself, or an over-broad domain rule removing a CDN that also served content, produce the same symptom."
          }
        ]
      })
    }
  ];
}
