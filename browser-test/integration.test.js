import assert from "node:assert/strict";
import { createSocket } from "node:dgram";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { chromium } from "playwright";
import coreBundle from "playwright-core/lib/coreBundle";
import { parsePdf } from "../src/documents.js";
import { crawl } from "../src/index.js";

const servers = new Set();
const udpSockets = new Set();

async function listenServer(handler) {
  const server = createServer(handler);
  servers.add(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

async function listen(handler) {
  return (await listenServer(handler)).url;
}

const testTlsCredentials = coreBundle.utils.generateSelfSignedCertificate();

async function listenHttpsServer(handler) {
  const server = createHttpsServer(testTlsCredentials, handler);
  servers.add(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `https://127.0.0.1:${server.address().port}` };
}

async function withTestTls(callback) {
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    return await callback();
  } finally {
    if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
  }
}

afterEach(async () => {
  await Promise.all([
    ...[...servers].map((server) => new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections?.();
    })),
    ...[...udpSockets].map((socket) => new Promise((resolve) => socket.close(() => resolve())))
  ]);
  servers.clear();
  udpSockets.clear();
});

test("browser mode renders JavaScript and performs bounded explicit clicks", async () => {
  const baseUrl = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<!doctype html><main><h1 id="title">Before</h1><button id="load">Load</button></main>
      <script>
        document.querySelector('#load').addEventListener('click', () => {
          document.querySelector('#title').textContent = 'Rendered';
          const result = document.createElement('p');
          result.className = 'loaded';
          result.textContent = 'JavaScript content';
          document.querySelector('main').append(result);
        });
      </script>`);
  });

  const pages = await crawl({
    seeds: [baseUrl],
    maxPages: 1,
    delayMs: 0,
    allowPrivateNetworks: true,
    browser: {
      waitUntil: "domcontentloaded",
      click: ["#load"],
      waitFor: ".loaded"
    }
  });
  assert.equal(pages.length, 1);
  assert.equal(pages[0].h1, "Rendered");
  assert.match(pages[0].text, /JavaScript content/);
});

test("advanced browser mode scrolls, runs trusted hooks, flattens DOM, and records artifacts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cockroach-browser-artifacts-"));
  const baseUrl = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<!doctype html><body style="min-height:3000px"><main><h1>Before hook</h1>
      <agent-card></agent-card>
      <iframe srcdoc="<p>Iframe evidence</p>"></iframe>
    </main><script>
      const host = document.querySelector('agent-card');
      host.attachShadow({mode:'open'}).innerHTML = '<p>Shadow evidence</p>';
      addEventListener('scroll', () => {
        if (!document.querySelector('.scrolled')) {
          const item = document.createElement('p');
          item.className = 'scrolled';
          item.textContent = 'Virtual scroll evidence';
          document.querySelector('main').append(item);
        }
      }, {once:true});
    </script>`);
  });

  try {
    const pages = await crawl({
      seeds: [baseUrl],
      maxPages: 1,
      delayMs: 0,
      allowPrivateNetworks: true,
      browser: {
        waitUntil: "load",
        scroll: { maxSteps: 3, stableIterations: 1, delayMs: 10 },
        hooks: [() => {
          document.querySelector("h1").textContent = "Trusted hook";
          return { changed: true };
        }],
        allowPageJavaScript: true,
        flattenShadowDom: true,
        flattenIframes: true,
        artifactDirectory: directory,
        screenshot: true,
        pdf: true
      }
    });
    assert.equal(pages[0].h1, "Trusted hook");
    assert.match(pages[0].text, /Virtual scroll evidence/);
    assert.match(pages[0].text, /Shadow evidence/);
    assert.match(pages[0].text, /Iframe evidence/);
    assert.deepEqual(pages[0].browserDetails.hooks, [{ changed: true }]);
    assert.ok(pages[0].browserDetails.scroll.steps >= 1);
    assert.ok(pages[0].browserDetails.flattened.shadowRoots >= 1);
    assert.ok(pages[0].browserDetails.flattened.frames >= 1);
    assert.equal((await readFile(pages[0].artifacts.screenshot.path)).subarray(1, 4).toString(), "PNG");
    const pdf = await parsePdf(await readFile(pages[0].artifacts.pdf.path), {
      maxPages: 5,
      maxTextCharacters: 100_000
    });
    assert.ok(pdf.pageCount >= 1 && pdf.pageCount <= 5);
    assert.match(pdf.text, /Trusted hook/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("explicit persistent browser profiles retain authorized site state", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cockroach-profile-"));
  const baseUrl = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>Profile</h1><p id="state"></p></main><script>
      document.querySelector('#state').textContent = localStorage.getItem('evidence') || 'empty';
      localStorage.setItem('evidence', 'retained');
    </script>`);
  });
  try {
    const options = {
      seeds: [baseUrl],
      maxPages: 1,
      delayMs: 0,
      allowPrivateNetworks: true,
      browser: {
        waitUntil: "load",
        profileDirectory: directory,
        allowPersistentProfile: true
      }
    };
    const first = await crawl(options);
    const second = await crawl(options);
    assert.match(first[0].text, /empty/);
    assert.match(second[0].text, /retained/);
    assert.equal(second[0].browserDetails.persistentProfile, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("browser mode blocks cross-origin subrequests before they reach the target", async () => {
  let targetHits = 0;
  const target = await listen((request, response) => {
    targetHits += 1;
    response.end("secret");
  });
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>Source</h1></main><script>fetch('${target}/secret').catch(() => {});</script>`);
  });

  await assert.rejects(
    () => crawl({
      seeds: [source],
      maxPages: 1,
      delayMs: 0,
      allowPrivateNetworks: true,
      browser: { waitUntil: "domcontentloaded", waitFor: "ms:100" }
    }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );
  assert.equal(targetHits, 0);
});

test("browser mode validates redirect targets before navigation", async () => {
  let targetHits = 0;
  const target = await listen((request, response) => {
    targetHits += 1;
    response.end("must not load");
  });
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.writeHead(302, { location: `${target}/private` });
    response.end();
  });

  await assert.rejects(
    () => crawl({
      seeds: [`${source}/start`],
      maxPages: 1,
      delayMs: 0,
      allowPrivateNetworks: true,
      browser: { waitUntil: "domcontentloaded" }
    }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );
  assert.equal(targetHits, 0);
});

test("browser redirect hops are pinned, counted, and bounded", async () => {
  let finalHits = 0;
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (request.url === "/one") {
      response.writeHead(302, { location: "/two" });
      response.end();
      return;
    }
    if (request.url === "/two") {
      response.writeHead(302, { location: "/final" });
      response.end();
      return;
    }
    finalHits += 1;
    response.setHeader("content-type", "text/html");
    response.end("<main><h1>Final</h1></main>");
  });

  const blocked = await crawl({
    seeds: [`${source}/one`],
    maxPages: 1,
    maxRedirects: 1,
    delayMs: 0,
    allowPrivateNetworks: true,
    browser: { waitUntil: "domcontentloaded" }
  });
  assert.equal(blocked.length, 0);
  assert.equal(blocked.failures[0]?.code, "CRAWL_REDIRECT_LIMIT");
  assert.equal(finalHits, 0);

  const pages = await crawl({
    seeds: [`${source}/one`],
    maxPages: 1,
    maxRedirects: 2,
    delayMs: 0,
    allowPrivateNetworks: true,
    browser: { waitUntil: "domcontentloaded" }
  });
  assert.equal(pages[0].h1, "Final");
  assert.equal(pages[0].redirectChain.length, 2);
  assert.equal(finalHits, 1);
});

test("browser redirect hops preserve cookies and target-origin cookie recomputation", async () => {
  let finalCookie = null;
  const target = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    finalCookie = request.headers.cookie || null;
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>${finalCookie || "NO_COOKIE"}</h1></main>`);
  });
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.writeHead(302, {
      location: `${target}/final`,
      "set-cookie": "redirect_session=abc123; Path=/; HttpOnly; SameSite=Lax"
    });
    response.end();
  });

  const pages = await crawl({
    seeds: [`${source}/start`],
    maxPages: 1,
    sameOrigin: false,
    allowedOrigins: [source, target],
    delayMs: 0,
    allowPrivateNetworks: true,
    browser: { waitUntil: "domcontentloaded" }
  });
  assert.match(finalCookie || "", /(?:^|; )redirect_session=abc123(?:;|$)/);
  assert.match(pages[0].h1, /redirect_session=abc123/);
  assert.deepEqual(pages[0].redirectChain, [{
    from: `${source}/start`,
    to: `${target}/final`,
    status: 302
  }]);
});

test("browser redirect provenance resets after a later main-frame navigation", async () => {
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (request.url === "/start") {
      response.writeHead(302, { location: "/landing" });
      response.end();
      return;
    }
    response.setHeader("content-type", "text/html");
    if (request.url === "/landing") {
      response.end('<main><a id="next" href="/final">Next</a></main>');
      return;
    }
    response.end("<main><h1>Final navigation</h1></main>");
  });

  const pages = await crawl({
    seeds: [`${source}/start`],
    maxPages: 1,
    delayMs: 0,
    allowPrivateNetworks: true,
    browser: { waitUntil: "domcontentloaded", click: ["#next"] }
  });
  assert.equal(pages[0].url, `${source}/final`);
  assert.equal(pages[0].h1, "Final navigation");
  assert.deepEqual(pages[0].redirectChain, []);
});

test("browser cookies use the tracked top-level and frame site context", async () => {
  let subresourceCookie = null;
  let topLevelCookie = null;
  const { server: targetServer } = await listenServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (request.url === "/pixel") {
      subresourceCookie = request.headers.cookie || "";
      response.statusCode = 204;
      response.end();
      return;
    }
    topLevelCookie = request.headers.cookie || "";
    response.setHeader("content-type", "text/html");
    response.end("<main><h1>Cookie destination</h1></main>");
  });
  const target = `http://localhost:${targetServer.address().port}`;
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<main>
      <img src="${target}/pixel">
      <a id="navigate" href="${target}/final">Navigate</a>
    </main>`);
  });

  const directory = await mkdtemp(join(tmpdir(), "cockroach-cookie-site-"));
  const storageState = join(directory, "state.json");
  await writeFile(storageState, JSON.stringify({
    cookies: [
      { name: "strict_cookie", value: "strict", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Strict" },
      { name: "lax_cookie", value: "lax", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" },
      { name: "none_secure", value: "secure", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: true, sameSite: "None" },
      { name: "none_insecure", value: "insecure", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "None" }
    ],
    origins: []
  }), "utf8");

  try {
    const pages = await crawl({
      seeds: [`${source}/start`],
      maxPages: 1,
      sameOrigin: false,
      allowedOrigins: [source, target],
      delayMs: 0,
      allowPrivateNetworks: true,
      dnsLookup: async (hostname) => {
        assert.equal(hostname, "localhost");
        return [{ address: "127.0.0.1", family: 4 }];
      },
      browser: {
        storageState,
        waitUntil: "load",
        click: ["#navigate"]
      }
    });
    assert.equal(pages[0].url, `${target}/final`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  assert.equal(subresourceCookie, "", "Strict/Lax cookies must not ride a cross-site subresource request");
  assert.match(topLevelCookie || "", /(?:^|; )lax_cookie=lax(?:;|$)/);
  assert.doesNotMatch(topLevelCookie || "", /strict_cookie|none_secure|none_insecure/);
});

test("browser cookies retain the complete A-to-B-to-A iframe site chain", async () => {
  let nestedNavigationCookie = null;
  let nestedSubresourceCookie = null;
  const { server } = await listenServer((request, response) => {
    const port = server.address().port;
    const source = `http://source.test:${port}`;
    const middle = `http://middle.test:${port}`;
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    if (request.url === "/top") {
      response.end(`<main><iframe src="${middle}/middle"></iframe></main>`);
      return;
    }
    if (request.url === "/middle") {
      response.end(`<main><iframe src="${source}/nested"></iframe></main>`);
      return;
    }
    if (request.url === "/nested") {
      nestedNavigationCookie = request.headers.cookie || "";
      response.end(`<main><img src="${source}/probe"></main>`);
      return;
    }
    if (request.url === "/probe") {
      nestedSubresourceCookie = request.headers.cookie || "";
      response.statusCode = 204;
      response.end();
      return;
    }
    response.statusCode = 404;
    response.end("not found");
  });
  const port = server.address().port;
  const source = `http://source.test:${port}`;
  const middle = `http://middle.test:${port}`;
  const directory = await mkdtemp(join(tmpdir(), "cockroach-cookie-ancestor-"));
  const storageState = join(directory, "state.json");
  await writeFile(storageState, JSON.stringify({
    cookies: [
      { name: "strict_cookie", value: "strict", domain: "source.test", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Strict" },
      { name: "lax_cookie", value: "lax", domain: "source.test", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }
    ],
    origins: []
  }), "utf8");

  try {
    await crawl({
      seeds: [`${source}/top`],
      maxPages: 1,
      sameOrigin: false,
      allowedOrigins: [source, middle],
      delayMs: 0,
      allowPrivateNetworks: true,
      dnsLookup: async (hostname) => {
        assert.ok(["source.test", "middle.test"].includes(hostname));
        return [{ address: "127.0.0.1", family: 4 }];
      },
      browser: {
        storageState,
        waitUntil: "load",
        waitFor: "ms:100"
      }
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  assert.equal(nestedNavigationCookie, "", "Strict/Lax cookies must not ride the nested A-to-B-to-A navigation");
  assert.equal(nestedSubresourceCookie, "", "Strict/Lax cookies must not ride a nested A-to-B-to-A subresource");
});

test("browser rejects cross-site response cookie planting while preserving top-level Set-Cookie", async () => {
  let finalNavigationCookie = null;
  let sameSiteProbeCookie = null;
  const { server } = await listenServer((request, response) => {
    const port = server.address().port;
    const source = `http://source.test:${port}`;
    const target = `http://target.test:${port}`;
    const hostname = String(request.headers.host || "").split(":", 1)[0];
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (hostname === "source.test" && request.url === "/top") {
      response.setHeader("content-type", "text/html");
      response.end(`<main>
        <img src="${target}/set-subresource">
        <iframe src="${target}/set-frame"></iframe>
        <a id="navigate" href="${target}/final">Navigate</a>
      </main>`);
      return;
    }
    if (hostname === "target.test" && request.url === "/set-subresource") {
      response.setHeader("set-cookie", [
        "strict_subresource=planted; SameSite=Strict; Path=/; HttpOnly",
        "lax_subresource=planted; SameSite=Lax; Path=/; HttpOnly",
        "default_subresource=planted; Path=/; HttpOnly"
      ]);
      response.statusCode = 204;
      response.end();
      return;
    }
    if (hostname === "target.test" && request.url === "/set-frame") {
      response.setHeader("set-cookie", [
        "strict_frame=planted; SameSite=Strict; Path=/; HttpOnly",
        "lax_frame=planted; SameSite=Lax; Path=/; HttpOnly",
        "default_frame=planted; Path=/; HttpOnly"
      ]);
      response.setHeader("content-type", "text/html");
      response.end("<main>cross-site frame</main>");
      return;
    }
    if (hostname === "target.test" && request.url === "/final") {
      finalNavigationCookie = request.headers.cookie || "";
      response.setHeader("set-cookie", "top_level_strict=allowed; SameSite=Strict; Path=/; HttpOnly");
      response.setHeader("content-type", "text/html");
      response.end(`<main>target</main>
        <img src="${target}/set-same-site">
        <button id="probe" onclick="const image = document.createElement('img'); image.src = '/probe'; document.body.append(image)">Probe</button>`);
      return;
    }
    if (hostname === "target.test" && request.url === "/set-same-site") {
      response.setHeader("set-cookie", "same_site_subresource=allowed; SameSite=Strict; Path=/; HttpOnly");
      response.statusCode = 204;
      response.end();
      return;
    }
    if (hostname === "target.test" && request.url === "/probe") {
      sameSiteProbeCookie = request.headers.cookie || "";
      response.statusCode = 204;
      response.end();
      return;
    }
    response.statusCode = 404;
    response.end("not found");
  });
  const port = server.address().port;
  const source = `http://source.test:${port}`;
  const target = `http://target.test:${port}`;

  const pages = await crawl({
    seeds: [`${source}/top`],
    maxPages: 1,
    sameOrigin: false,
    allowedOrigins: [source, target],
    delayMs: 0,
    allowPrivateNetworks: true,
    dnsLookup: async (hostname) => {
      assert.ok(["source.test", "target.test"].includes(hostname));
      return [{ address: "127.0.0.1", family: 4 }];
    },
    browser: {
      waitUntil: "load",
      click: ["#navigate", "#probe"],
      waitFor: "ms:100"
    }
  });

  assert.equal(pages[0].url, `${target}/final`);
  assert.equal(finalNavigationCookie, "", "cross-site Strict/Lax/default cookies must not be stored or sent");
  assert.match(sameSiteProbeCookie || "", /(?:^|; )top_level_strict=allowed(?:;|$)/);
  assert.match(sameSiteProbeCookie || "", /(?:^|; )same_site_subresource=allowed(?:;|$)/);
  assert.doesNotMatch(
    sameSiteProbeCookie || "",
    /strict_subresource|lax_subresource|default_subresource|strict_frame|lax_frame|default_frame/,
    "cross-site response cookies must not appear after the target becomes top-level"
  );
});

test("browser cookie bridge matches native rejection of unsafe HTTPS response cookies", async () => {
  let nativeFinalCookie = null;
  let crawlerFinalCookie = null;
  const { server } = await listenHttpsServer((request, response) => {
    const port = server.address().port;
    const source = `https://source.test:${port}`;
    const target = `https://target.test:${port}`;
    const hostname = String(request.headers.host || "").split(":", 1)[0];
    const mode = request.url.includes("native") ? "native" : "crawler";
    if (hostname === "source.test" && ["/native", "/crawler"].includes(request.url)) {
      response.setHeader("content-type", "text/html");
      response.end(`<main>
        <img src="${target}/plant-${mode}">
        <a id="navigate" href="${target}/final-${mode}">Navigate</a>
      </main>`);
      return;
    }
    if (hostname === "target.test" && request.url === `/plant-${mode}`) {
      response.setHeader("set-cookie", [
        "valid_none=ok; SameSite=None; Secure; Path=/",
        "none_without_secure=blocked; SameSite=None; Path=/",
        "public_suffix=blocked; SameSite=None; Secure; Domain=test; Path=/",
        "partitioned_cookie=blocked; SameSite=None; Secure; Partitioned; Path=/",
        "__Secure-no-secure=blocked; SameSite=None; Path=/",
        "__Host-no-secure=blocked; SameSite=None; Path=/",
        "__Http-no-http-only=blocked; SameSite=None; Secure; Path=/",
        "__Host-Http-no-http-only=blocked; SameSite=None; Secure; Path=/"
      ]);
      response.statusCode = 204;
      response.end();
      return;
    }
    if (hostname === "target.test" && request.url === "/final-native") {
      nativeFinalCookie = request.headers.cookie || "";
      response.end("native final");
      return;
    }
    if (hostname === "target.test" && request.url === "/final-crawler") {
      crawlerFinalCookie = request.headers.cookie || "";
      response.end("crawler final");
      return;
    }
    response.statusCode = 404;
    response.end("not found");
  });
  const port = server.address().port;
  const source = `https://source.test:${port}`;
  const target = `https://target.test:${port}`;
  const browser = await chromium.launch({
    headless: true,
    args: ["--host-resolver-rules=MAP source.test 127.0.0.1, MAP target.test 127.0.0.1"]
  });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    await context.addCookies([{
      name: "credential_seed",
      value: "ok",
      url: `${target}/`,
      expires: -1,
      httpOnly: true,
      secure: true,
      sameSite: "None"
    }]);
    const page = await context.newPage();
    await page.goto(`${source}/native`, { waitUntil: "load" });
    await Promise.all([page.waitForURL(/target\.test/), page.click("#navigate")]);
    await context.close();
  } finally {
    await browser.close();
  }

  const directory = await mkdtemp(join(tmpdir(), "cockroach-cookie-native-"));
  const storageState = join(directory, "state.json");
  await writeFile(storageState, JSON.stringify({
    cookies: [{
      name: "credential_seed",
      value: "ok",
      domain: "target.test",
      path: "/",
      expires: -1,
      httpOnly: true,
      secure: true,
      sameSite: "None"
    }],
    origins: []
  }), "utf8");
  try {
    await withTestTls(() => crawl({
      seeds: [`${source}/crawler`],
      maxPages: 1,
      sameOrigin: false,
      allowedOrigins: [source, target],
      obeyRobots: false,
      delayMs: 0,
      allowPrivateNetworks: true,
      dnsLookup: async () => [{ address: "127.0.0.1", family: 4 }],
      browser: { storageState, waitUntil: "load", click: ["#navigate"] }
    }));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  for (const [mode, cookie] of [["native", nativeFinalCookie], ["crawler", crawlerFinalCookie]]) {
    assert.match(cookie || "", /(?:^|; )credential_seed=ok(?:;|$)/, `${mode} keeps the credential seed`);
    assert.match(cookie || "", /(?:^|; )valid_none=ok(?:;|$)/, `${mode} accepts the valid None cookie`);
    assert.doesNotMatch(
      cookie || "",
      /none_without_secure|public_suffix|partitioned_cookie|__Secure-no-secure|__Host-no-secure|__Http-no-http-only|__Host-Http-no-http-only/
    );
  }
});

test("browser cookie bridge accepts an explicitly Secure SameSite=None HTTPS navigation cookie like native Chromium", async () => {
  let nativeCookie = null;
  let crawlerCookie = null;
  const { server } = await listenHttpsServer((request, response) => {
    const mode = request.url.includes("native") ? "native" : "crawler";
    if (["/native", "/crawler"].includes(request.url)) {
      response.setHeader("set-cookie", "valid_none=ok; SameSite=None; Secure; Path=/; HttpOnly");
      response.setHeader("content-type", "text/html");
      response.end(`<a id="navigate" href="/final-${mode}">Navigate</a>`);
      return;
    }
    if (request.url === "/final-native") {
      nativeCookie = request.headers.cookie || "";
      response.end("native final");
      return;
    }
    if (request.url === "/final-crawler") {
      crawlerCookie = request.headers.cookie || "";
      response.end("crawler final");
      return;
    }
    response.statusCode = 404;
    response.end("not found");
  });
  const port = server.address().port;
  const origin = `https://target.test:${port}`;
  const browser = await chromium.launch({
    headless: true,
    args: ["--host-resolver-rules=MAP target.test 127.0.0.1"]
  });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.goto(`${origin}/native`, { waitUntil: "load" });
    await Promise.all([page.waitForURL(/final-native/), page.click("#navigate")]);
    await context.close();
  } finally {
    await browser.close();
  }

  await withTestTls(() => crawl({
    seeds: [`${origin}/crawler`],
    maxPages: 1,
    obeyRobots: false,
    delayMs: 0,
    allowPrivateNetworks: true,
    dnsLookup: async () => [{ address: "127.0.0.1", family: 4 }],
    browser: { waitUntil: "load", click: ["#navigate"] }
  }));

  assert.match(nativeCookie || "", /(?:^|; )valid_none=ok(?:;|$)/);
  assert.match(crawlerCookie || "", /(?:^|; )valid_none=ok(?:;|$)/);
});

test("browser cookie bridge keeps host-only cookies off sibling subdomains like native Chromium", async () => {
  let nativeCookie = null;
  let crawlerCookie = null;
  const { server } = await listenServer((request, response) => {
    const port = server.address().port;
    const hostname = String(request.headers.host || "").split(":", 1)[0];
    if (hostname === "target.test" && ["/native", "/crawler"].includes(request.url)) {
      response.setHeader("set-cookie", "host_only=secret; SameSite=Lax; Path=/; HttpOnly");
      response.setHeader("content-type", "text/html");
      response.end(`<a id="navigate" href="http://sub.target.test:${port}/final-${request.url.slice(1)}">Navigate</a>`);
      return;
    }
    if (hostname === "sub.target.test" && request.url === "/final-native") {
      nativeCookie = request.headers.cookie || "";
      response.end("native final");
      return;
    }
    if (hostname === "sub.target.test" && request.url === "/final-crawler") {
      crawlerCookie = request.headers.cookie || "";
      response.end("crawler final");
      return;
    }
    response.statusCode = 404;
    response.end("not found");
  });
  const port = server.address().port;
  const target = `http://target.test:${port}`;
  const sibling = `http://sub.target.test:${port}`;
  const browser = await chromium.launch({
    headless: true,
    args: ["--host-resolver-rules=MAP target.test 127.0.0.1, MAP sub.target.test 127.0.0.1"]
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${target}/native`, { waitUntil: "load" });
    await Promise.all([page.waitForURL(/sub\.target\.test/), page.click("#navigate")]);
    await context.close();
  } finally {
    await browser.close();
  }
  await crawl({
    seeds: [`${target}/crawler`],
    maxPages: 1,
    sameOrigin: false,
    allowedOrigins: [target, sibling],
    obeyRobots: false,
    delayMs: 0,
    allowPrivateNetworks: true,
    dnsLookup: async () => [{ address: "127.0.0.1", family: 4 }],
    browser: { waitUntil: "load", click: ["#navigate"] }
  });
  assert.equal(nativeCookie, "");
  assert.equal(crawlerCookie, "");
});

test("browser cookie bridge rejects Secure cookies from HTTP responses like native Chromium", async () => {
  let nativeCookie = null;
  let crawlerCookie = null;
  const { server } = await listenServer((request, response) => {
    const hostname = String(request.headers.host || "").split(":", 1)[0];
    if (hostname === "target.test" && ["/native", "/crawler"].includes(request.url)) {
      response.setHeader("set-cookie", "secure_from_http=blocked; Secure; SameSite=Lax; Path=/; HttpOnly");
      response.setHeader("content-type", "text/html");
      response.end(`<img src="/probe-${request.url.slice(1)}">`);
      return;
    }
    if (hostname === "target.test" && request.url === "/probe-native") {
      nativeCookie = request.headers.cookie || "";
      response.statusCode = 204;
      response.end();
      return;
    }
    if (hostname === "target.test" && request.url === "/probe-crawler") {
      crawlerCookie = request.headers.cookie || "";
      response.statusCode = 204;
      response.end();
      return;
    }
    response.statusCode = 404;
    response.end("not found");
  });
  const target = `http://target.test:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    args: ["--host-resolver-rules=MAP target.test 127.0.0.1"]
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${target}/native`, { waitUntil: "load" });
    await context.close();
  } finally {
    await browser.close();
  }
  await crawl({
    seeds: [`${target}/crawler`],
    maxPages: 1,
    obeyRobots: false,
    delayMs: 0,
    allowPrivateNetworks: true,
    dnsLookup: async () => [{ address: "127.0.0.1", family: 4 }],
    browser: { waitUntil: "load" }
  });
  assert.equal(nativeCookie, "");
  assert.equal(crawlerCookie, "");
});

test("browser cookie bridge matches native credentials, path, and negative Max-Age behavior", async () => {
  const observed = {
    native: Object.create(null),
    crawler: Object.create(null)
  };
  const baseUrl = await listen((request, response) => {
    const parsed = new URL(request.url, "http://local.test");
    const mode = parsed.searchParams.get("mode") || parsed.pathname.split("/").at(-1);
    if (["/dir/native", "/dir/crawler"].includes(parsed.pathname)) {
      response.setHeader("set-cookie", [
        "top_cookie=ok; SameSite=Strict; Path=/",
        "doomed_cookie=alive; SameSite=Strict; Path=/",
        "scoped_cookie=ok; SameSite=Lax; Path=/foo",
        "default_path_cookie=ok; SameSite=Lax"
      ]);
      response.setHeader("content-type", "text/html");
      response.end(`<body><script>
        (async () => {
          const mode = ${JSON.stringify(mode)};
          await fetch('/omit?mode=' + mode, { credentials: 'omit' });
          await fetch('/delete?mode=' + mode);
          await fetch('/dir/probe?mode=' + mode);
          await fetch('/foo?mode=' + mode);
          await fetch('/foobar?mode=' + mode);
          await fetch('/probe?mode=' + mode);
          document.body.dataset.done = 'yes';
        })();
      </script></body>`);
      return;
    }
    if (!["native", "crawler"].includes(mode)) {
      response.statusCode = 404;
      response.end("not found");
      return;
    }
    if (parsed.pathname === "/omit") {
      observed[mode].omit = request.headers.cookie || "";
      response.setHeader("set-cookie", "omit_planted=blocked; SameSite=Strict; Path=/");
    } else if (parsed.pathname === "/delete") {
      observed[mode].delete = request.headers.cookie || "";
      response.setHeader("set-cookie", "doomed_cookie=gone; Max-Age=-1; SameSite=Strict; Path=/");
    } else if (parsed.pathname === "/dir/probe") {
      observed[mode].insideDefaultPath = request.headers.cookie || "";
    } else if (parsed.pathname === "/foo") {
      observed[mode].exactPath = request.headers.cookie || "";
    } else if (parsed.pathname === "/foobar") {
      observed[mode].pathPrefix = request.headers.cookie || "";
    } else if (parsed.pathname === "/probe") {
      observed[mode].final = request.headers.cookie || "";
    }
    response.end("ok");
  });

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseUrl}/dir/native`, { waitUntil: "load" });
    await page.waitForSelector('body[data-done="yes"]');
    await context.close();
  } finally {
    await browser.close();
  }
  await crawl({
    seeds: [`${baseUrl}/dir/crawler`],
    maxPages: 1,
    obeyRobots: false,
    delayMs: 0,
    allowPrivateNetworks: true,
    browser: { waitUntil: "load", waitFor: 'body[data-done="yes"]' }
  });

  for (const mode of ["native", "crawler"]) {
    const result = observed[mode];
    assert.equal(result.omit, "");
    assert.match(result.delete || "", /(?:^|; )doomed_cookie=alive(?:;|$)/);
    assert.match(result.insideDefaultPath || "", /(?:^|; )default_path_cookie=ok(?:;|$)/);
    assert.match(result.exactPath || "", /(?:^|; )scoped_cookie=ok(?:;|$)/);
    assert.doesNotMatch(result.pathPrefix || "", /scoped_cookie/);
    assert.match(result.final || "", /(?:^|; )top_cookie=ok(?:;|$)/);
    assert.doesNotMatch(result.final || "", /omit_planted|doomed_cookie|scoped_cookie|default_path_cookie/);
  }
});

test("browser cookie bridge treats sandboxed opaque frames as incomplete like native Chromium", async () => {
  const observed = {
    native: Object.create(null),
    crawler: Object.create(null)
  };
  const baseUrl = await listen((request, response) => {
    const parsed = new URL(request.url, "http://local.test");
    const mode = parsed.searchParams.get("mode") || parsed.pathname.slice(1);
    if (["/native", "/crawler"].includes(parsed.pathname)) {
      response.setHeader("set-cookie", "strict_top=secret; SameSite=Strict; Path=/; HttpOnly");
      response.setHeader("content-type", "text/html");
      response.end(`<iframe sandbox="allow-scripts" src="/frame?mode=${mode}"></iframe>`);
      return;
    }
    if (parsed.pathname === "/frame") {
      response.setHeader("content-type", "text/html");
      response.end(`<script>
        (async () => {
          await fetch('/sandbox-probe?mode=${mode}', { credentials: 'include' }).catch(() => {});
          await fetch('/sandbox-after?mode=${mode}', { credentials: 'include' }).catch(() => {});
        })();
      </script>`);
      return;
    }
    if (parsed.pathname === "/sandbox-probe") {
      observed[mode].probe = request.headers.cookie || "";
      response.setHeader("access-control-allow-origin", "null");
      response.setHeader("access-control-allow-credentials", "true");
      response.setHeader("set-cookie", "sandbox_planted=blocked; SameSite=Strict; Path=/");
      response.end("probe");
      return;
    }
    if (parsed.pathname === "/sandbox-after") {
      observed[mode].after = request.headers.cookie || "";
      response.setHeader("access-control-allow-origin", "null");
      response.setHeader("access-control-allow-credentials", "true");
      response.end("after");
      return;
    }
    response.statusCode = 404;
    response.end("not found");
  });

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseUrl}/native`, { waitUntil: "load" });
    await page.waitForTimeout(150);
    await context.close();
  } finally {
    await browser.close();
  }
  await crawl({
    seeds: [`${baseUrl}/crawler`],
    maxPages: 1,
    obeyRobots: false,
    delayMs: 0,
    allowPrivateNetworks: true,
    browser: { waitUntil: "load", waitFor: "ms:150" }
  });

  for (const mode of ["native", "crawler"]) {
    assert.equal(observed[mode].probe, "");
    assert.equal(observed[mode].after, "");
  }
});

test("sensitive browser paths are blocked for fetches, resources, and redirects", async () => {
  const hits = { admin: 0, login: 0, account: 0, redirect: 0, encoded: 0, encodedRedirect: 0 };
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (request.url === "/admin/secret") hits.admin += 1;
    if (request.url === "/login/pixel.png") hits.login += 1;
    if (request.url === "/account/secret") hits.account += 1;
    if (/%(?:25)*61dmin/i.test(request.url)) hits.encoded += 1;
    if (request.url === "/redirect-me") {
      hits.redirect += 1;
      response.writeHead(302, { location: "/account/secret" });
      response.end();
      return;
    }
    if (request.url === "/encoded-redirect") {
      hits.encodedRedirect += 1;
      response.writeHead(302, { location: "/%252561dmin/secret" });
      response.end();
      return;
    }
    response.setHeader("content-type", "text/html");
    if (request.url === "/fetch-page") {
      response.end("<main>fetch</main><script>fetch('/admin/secret').catch(() => {});</script>");
    } else if (request.url === "/image-page") {
      response.end('<main>image</main><img src="/login/pixel.png">');
    } else if (request.url === "/redirect-page") {
      response.end("<main>redirect</main><script>fetch('/redirect-me').catch(() => {});</script>");
    } else if (request.url === "/encoded-fetch-page") {
      response.end("<main>encoded fetch</main><script>fetch('/%61dmin/secret').catch(() => {});</script>");
    } else if (request.url === "/encoded-image-page") {
      response.end('<main>encoded image</main><img src="/%2561dmin/pixel.png">');
    } else if (request.url === "/encoded-redirect-page") {
      response.end("<main>encoded redirect</main><script>fetch('/encoded-redirect').catch(() => {});</script>");
    } else {
      response.end("secret");
    }
  });

  for (const page of [
    "fetch-page",
    "image-page",
    "redirect-page",
    "encoded-fetch-page",
    "encoded-image-page",
    "encoded-redirect-page"
  ]) {
    await assert.rejects(
      () => crawl({
        seeds: [`${source}/${page}`],
        maxPages: 1,
        delayMs: 0,
        allowPrivateNetworks: true,
        browser: { waitUntil: "domcontentloaded", waitFor: "ms:75" }
      }),
      (error) => error.code === "CRAWLER_URL_BLOCKED"
    );
  }
  assert.equal(hits.admin, 0);
  assert.equal(hits.login, 0);
  assert.equal(hits.account, 0);
  assert.equal(hits.encoded, 0);
  assert.equal(hits.redirect, 1, "the permitted first hop is counted, but its sensitive target is not contacted");
  assert.equal(hits.encodedRedirect, 1);
});

test("browser session finalization never resolves after a late blocked request was sent", async () => {
  let lateHits = 0;
  let forbiddenHits = 0;
  const forbidden = await listen((request, response) => {
    forbiddenHits += 1;
    response.end("must not load");
  });
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (request.url === "/late") {
      lateHits += 1;
      setTimeout(() => {
        response.writeHead(302, { location: `${forbidden}/blocked` });
        response.end();
      }, 20);
      return;
    }
    const delay = Number(new URL(request.url, source).searchParams.get("delay") || 0);
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>Race</h1></main><script>
      setTimeout(() => fetch('/late').catch(() => {}), ${delay});
    </script>`);
  });

  for (const delay of [0, 1, 2, 4, 8, 16]) {
    const before = lateHits;
    let resolved = false;
    try {
      await crawl({
        seeds: [`${source}/race?delay=${delay}`],
        maxPages: 1,
        delayMs: 0,
        allowPrivateNetworks: true,
        browser: { waitUntil: "domcontentloaded" }
      });
      resolved = true;
    } catch (error) {
      assert.equal(error.code, "CRAWLER_URL_BLOCKED");
    }
    assert.equal(resolved && lateHits > before, false, `delay ${delay} resolved after proxying a late request`);
  }
  assert.equal(forbiddenHits, 0);
});

test("browser mode blocks WebSockets before a cross-origin handshake", async () => {
  let upgradeHits = 0;
  const { server: targetServer, url: target } = await listenServer((request, response) => {
    response.end("HTTP fallback");
  });
  targetServer.on("upgrade", (request, socket) => {
    upgradeHits += 1;
    socket.destroy();
  });
  const socketUrl = target.replace(/^http:/, "ws:");
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>Socket source</h1></main><script>
      try { new WebSocket('${socketUrl}/socket'); } catch {}
    </script>`);
  });

  await assert.rejects(
    () => crawl({
      seeds: [source],
      maxPages: 1,
      delayMs: 0,
      allowPrivateNetworks: true,
      browser: { waitUntil: "domcontentloaded", waitFor: "ms:150" }
    }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );
  assert.equal(upgradeHits, 0);
});

test("context routing covers the first request from target=_blank popups", async () => {
  let targetHits = 0;
  const target = await listen((request, response) => {
    targetHits += 1;
    response.end("must not open");
  });
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<main><a id="open" target="_blank" href="${target}/private">Open</a></main>`);
  });

  await assert.rejects(
    () => crawl({
      seeds: [source],
      maxPages: 1,
      delayMs: 0,
      allowPrivateNetworks: true,
      browser: { waitUntil: "domcontentloaded", click: ["#open"], waitFor: "ms:100" }
    }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );
  assert.equal(targetHits, 0);
});

test("browser mode never falls through to Chromium DNS after trusted validation", async () => {
  let privateHits = 0;
  const { server, url } = await listenServer((request, response) => {
    if (request.url === "/rebind") privateHits += 1;
    response.end("private");
  });
  const seed = `http://localhost:${server.address().port}/rebind`;

  const pages = await crawl({
    seeds: [seed],
    maxPages: 1,
    delayMs: 0,
    obeyRobots: false,
    allowPrivateNetworks: true,
    timeoutMs: 300,
    // The 300 ms request budget proves the pinning behavior. The larger total
    // budget only accommodates Chromium startup/teardown under loaded CI hosts.
    maxDurationMs: 30_000,
    dnsLookup: async () => [{ address: "127.0.0.2", family: 4 }],
    browser: { waitUntil: "domcontentloaded" }
  });
  assert.equal(pages.length, 0);
  assert.equal(privateHits, 0, `Chromium must not resolve ${url} independently`);
});

test("robots policy blocks browser subresources before a request is sent", async () => {
  let blockedHits = 0;
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nDisallow: /blocked\nAllow: /\n");
      return;
    }
    if (request.url === "/blocked") {
      blockedHits += 1;
      response.end("must not load");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>Allowed document</h1></main><script>fetch('/blocked').catch(() => {});</script>`);
  });

  const pages = await crawl({
    seeds: [source],
    maxPages: 1,
    delayMs: 0,
    allowPrivateNetworks: true,
    browser: { waitUntil: "domcontentloaded", waitFor: "ms:100" }
  });
  assert.equal(pages.length, 0);
  assert.equal(pages.stats.skippedRobots, 1);
  assert.equal(blockedHits, 0);
});

test("oversized browser subresources trip the exact total decoded-byte budget", async () => {
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (request.url === "/large.bin") {
      response.setHeader("content-type", "application/octet-stream");
      response.end(Buffer.alloc(4_096, 7));
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>Budget</h1></main><img src="/large.bin">`);
  });

  await assert.rejects(
    () => crawl({
      seeds: [source],
      maxPages: 1,
      delayMs: 0,
      maxBytes: 8_192,
      maxTotalBytes: 1_024,
      allowPrivateNetworks: true,
      browser: { waitUntil: "load" }
    }),
    (error) => error.code === "CRAWL_TOTAL_BYTES_LIMIT"
  );
});

test("slow browser responses are cancelled at the total crawl deadline", async () => {
  let slowRequestStarted = false;
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (request.url === "/slow.js") {
      slowRequestStarted = true;
      const timer = setTimeout(() => response.end("window.slowLoaded = true;"), 10_000);
      timer.unref();
      request.once("close", () => clearTimeout(timer));
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>Deadline</h1></main><script src="/slow.js"></script>`);
  });

  const startedAt = Date.now();
  await assert.rejects(
    () => crawl({
      seeds: [source],
      maxPages: 1,
      delayMs: 0,
      timeoutMs: 15_000,
      maxDurationMs: 1_800,
      allowPrivateNetworks: true,
      browser: { waitUntil: "domcontentloaded" }
    }),
    (error) => error.code === "CRAWL_DURATION_LIMIT"
  );
  assert.equal(slowRequestStarted, true);
  assert.ok(Date.now() - startedAt < 4_000, "browser work must close promptly at the crawl deadline");
});

test("browser ms waits cannot outlive the total crawl deadline", async () => {
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end("<main><h1>Wait</h1></main>");
  });

  const startedAt = Date.now();
  await assert.rejects(
    () => crawl({
      seeds: [source],
      maxPages: 1,
      delayMs: 0,
      timeoutMs: 5_000,
      maxDurationMs: 800,
      allowPrivateNetworks: true,
      browser: { waitUntil: "domcontentloaded", waitFor: "ms:5000" }
    }),
    (error) => error.code === "CRAWL_DURATION_LIMIT"
  );
  assert.ok(Date.now() - startedAt < 2_500);
});

test("browser mode disables WebRTC before STUN can send UDP", async () => {
  let udpPackets = 0;
  const udp = createSocket("udp4");
  udpSockets.add(udp);
  udp.on("message", () => { udpPackets += 1; });
  await new Promise((resolve) => udp.bind(0, "127.0.0.1", resolve));
  const stunPort = udp.address().port;

  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>RTC</h1></main><script>
      (async () => {
        try {
          const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:127.0.0.1:${stunPort}' }] });
          peer.createDataChannel('blocked');
          await peer.setLocalDescription(await peer.createOffer());
        } catch {}
      })();
    </script>`);
  });

  const pages = await crawl({
    seeds: [source],
    maxPages: 1,
    delayMs: 0,
    allowPrivateNetworks: true,
    browser: { waitUntil: "domcontentloaded", waitFor: "ms:300" }
  });
  assert.equal(pages.length, 1);
  assert.equal(udpPackets, 0);
});

test("state-changing browser methods are blocked before server contact", async () => {
  let postHits = 0;
  const source = await listen((request, response) => {
    if (request.url === "/robots.txt") {
      response.end("User-agent: *\nAllow: /\n");
      return;
    }
    if (request.method === "POST") {
      postHits += 1;
      response.end("mutated");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(`<main><h1>Methods</h1></main><script>
      fetch('/mutate', { method: 'POST', body: 'x' }).catch(() => {});
    </script>`);
  });

  await assert.rejects(
    () => crawl({
      seeds: [source],
      maxPages: 1,
      delayMs: 0,
      allowPrivateNetworks: true,
      browser: { waitUntil: "domcontentloaded", waitFor: "ms:100" }
    }),
    (error) => error.code === "CRAWLER_URL_BLOCKED"
  );
  assert.equal(postHits, 0);
});
