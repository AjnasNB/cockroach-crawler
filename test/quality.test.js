import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  extractPageQuality,
  qualityBackend,
  QualityExtractionError
} from "../src/quality.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ARTICLE = `<html><head><title>Evidence article</title></head><body>
  <nav>Home About Pricing Contact</nav>
  <article>
    <h1>Reliable extraction</h1>
    <p>${"This paragraph contains detailed evidence about deterministic content extraction. ".repeat(8)}</p>
    <p>${"A second paragraph confirms the implementation keeps useful prose and removes navigation. ".repeat(6)}</p>
  </article>
  <footer>Privacy Terms Copyright</footer>
</body></html>`;

const SHELL = `<html><body><div id="__next"></div><script src="/app.js"></script></body></html>`;
const CHALLENGE = `<html><head><title>Just a moment...</title></head><body>
  <div class="cf-chl-widget">Verify you are human</div>
</body></html>`;

test("quality extraction uses the exact Node backend with a deterministic balanced default", () => {
  assert.deepEqual(qualityBackend, {
    name: "trafilatura",
    version: "0.2.0",
    runtime: "node-native"
  });

  const options = {
    url: "https://example.com/evidence",
    failClosed: true,
    diagnostics: true
  };
  const first = extractPageQuality(ARTICLE, options);
  const second = extractPageQuality(ARTICLE, options);

  assert.deepEqual(second, first);
  assert.equal(first.status, "accepted");
  assert.equal(first.accepted, true);
  assert.equal(first.profile, "balanced");
  assert.match(first.text, /Reliable extraction/);
  assert.match(first.text, /deterministic content extraction/);
  assert.doesNotMatch(first.text, /Home About Pricing/);
  assert.match(first.markdown, /^# Reliable extraction/m);
  assert.equal(first.metadata.url, "https://example.com/evidence");
  assert.equal(first.metadata.pageType, "article");
  assert.equal(first.abstention, null);
  assert.deepEqual(first.diagnostics.riskSignals, []);
  assert.equal(first.diagnostics.nativeFallbackUsed, false);
  assert.equal(first.diagnostics.metadataTruncated, false);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.metadata), true);
  assert.equal(Object.isFrozen(first.warnings), true);
});

test("fail-closed quality extraction abstains on application shells and challenge pages", () => {
  const shell = extractPageQuality(SHELL, {
    url: "https://example.com/app",
    failClosed: true
  });
  assert.equal(shell.status, "abstained");
  assert.equal(shell.accepted, false);
  assert.equal(shell.text, null);
  assert.ok(shell.abstention.reasons.includes("APPLICATION_SHELL"));
  assert.ok(shell.abstention.reasons.includes("EMPTY_OUTPUT"));
  assert.equal(shell.diagnostics.shellDetected, true);

  const challenge = extractPageQuality(CHALLENGE, {
    url: "https://example.com/protected",
    failClosed: true,
    diagnostics: true
  });
  assert.equal(challenge.status, "abstained");
  assert.equal(challenge.accepted, false);
  assert.equal(challenge.text, null);
  assert.equal(challenge.markdown, null);
  assert.ok(challenge.abstention.reasons.includes("CHALLENGE_PAGE"));
  assert.equal(challenge.diagnostics.challengeDetected, true);
  assert.equal(challenge.diagnostics.nativeFallbackUsed, true);
});

test("quality extraction enforces input, option, and output bounds", () => {
  assert.throws(() => extractPageQuality(""), /non-empty string/);
  assert.throws(() => extractPageQuality(null), /non-empty string/);
  assert.throws(() => extractPageQuality(ARTICLE, []), /plain object/);
  assert.throws(() => extractPageQuality(ARTICLE, Object.create({ failClosed: true })), /plain object/);
  assert.throws(() => extractPageQuality(ARTICLE, { unknown: true }), /Unknown quality option/);
  assert.throws(() => extractPageQuality(ARTICLE, { profile: "maximum" }), /balanced, precision, or recall/);
  assert.throws(() => extractPageQuality(ARTICLE, { failClosed: "yes" }), /must be a boolean/);
  assert.throws(() => extractPageQuality(ARTICLE, { minQuality: Number.NaN }), /finite number/);
  assert.throws(() => extractPageQuality(ARTICLE, { pageType: "landing" }), /pageType must be one of/);
  assert.throws(() => extractPageQuality(ARTICLE, { targetLanguage: "not a tag!" }), /language tag/);
  assert.throws(() => extractPageQuality(ARTICLE, { url: "file:///secret" }), /HTTP\(S\)/);
  assert.throws(() => extractPageQuality(ARTICLE, { url: "https://user:pass@example.com" }), /credentials/);
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "profile", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "balanced";
    }
  });
  assert.throws(() => extractPageQuality(ARTICLE, accessor), /own enumerable data property/);
  assert.equal(getterCalls, 0);

  assert.throws(
    () => extractPageQuality(ARTICLE, { maxInputCharacters: 100 }),
    (error) => error instanceof RangeError && error.code === "QUALITY_INPUT_LIMIT"
  );
  assert.throws(
    () => extractPageQuality(ARTICLE, {
      minOutputCharacters: 0,
      minOutputWords: 0,
      maxOutputCharacters: 100
    }),
    (error) => error instanceof RangeError && error.code === "QUALITY_OUTPUT_LIMIT"
  );

  const bounded = extractPageQuality(ARTICLE, {
    failClosed: true,
    minOutputCharacters: 0,
    minOutputWords: 0,
    maxOutputCharacters: 100
  });
  assert.equal(bounded.status, "abstained");
  assert.equal(bounded.text, null);
  assert.ok(bounded.abstention.reasons.includes("OUTPUT_LIMIT_EXCEEDED"));
});

test("precision and recall profiles remain explicit without changing the core API", () => {
  const precision = extractPageQuality(ARTICLE, {
    profile: "precision",
    minOutputCharacters: 0,
    minOutputWords: 0
  });
  const recall = extractPageQuality(ARTICLE, {
    profile: "recall",
    minOutputCharacters: 0,
    minOutputWords: 0
  });
  assert.equal(precision.profile, "precision");
  assert.equal(recall.profile, "recall");
  assert.equal(precision.backend, qualityBackend);
  assert.equal(recall.backend, qualityBackend);
  assert.equal(Object.hasOwn(precision, "diagnostics"), false);
});

test("quality subpath pins and discloses the reviewed native dependency without entering core", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const lockfile = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  const licenses = await readFile(path.join(root, "docs", "DEPENDENCY_LICENSES.md"), "utf8");
  const coreSource = await readFile(path.join(root, "src", "index.js"), "utf8");
  const serverlessSource = await readFile(path.join(root, "src", "serverless.js"), "utf8");

  assert.equal(manifest.dependencies.trafilatura, "0.2.0");
  assert.deepEqual(manifest.exports["./quality"], {
    types: "./types/quality.d.ts",
    import: "./src/quality.js",
    default: "./src/quality.js"
  });
  assert.ok(manifest.files.includes("docs/QUALITY.md"));
  assert.equal(lockfile.packages["node_modules/trafilatura"].version, "0.2.0");
  assert.ok(
    Object.values(lockfile.packages["node_modules/trafilatura"].optionalDependencies)
      .every((version) => version === "0.2.0")
  );
  assert.match(licenses, /trafilatura[^\n]+0\.2\.0[^\n]+Node-native[^\n]+MIT/i);
  assert.doesNotMatch(coreSource, /trafilatura|\.\/quality\.js/iu);
  assert.doesNotMatch(serverlessSource, /trafilatura|\.\/quality\.js/iu);
});

test("core and serverless stay usable when the native quality backend is unavailable", () => {
  const missingBinding = path.join(root, ".does-not-exist", "trafilatura.node");
  const environment = {
    ...process.env,
    NAPI_RS_NATIVE_LIBRARY_PATH: missingBinding
  };
  delete environment.NAPI_RS_FORCE_WASI;

  const core = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      "const core = await import('./src/index.js'); const serverless = await import('./src/serverless.js'); if (typeof core.extractPage !== 'function' || typeof serverless.createServerlessCrawler !== 'function') process.exit(2);"
    ],
    { cwd: root, env: environment, encoding: "utf8" }
  );
  assert.equal(core.status, 0, core.stderr);

  const quality = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      "try { await import('./src/quality.js'); process.exit(2); } catch (error) { if (error?.code !== 'QUALITY_BACKEND_UNAVAILABLE' || !/no core-extractor fallback was attempted/i.test(error.message)) { console.error(error); process.exit(3); } }"
    ],
    { cwd: root, env: environment, encoding: "utf8" }
  );
  assert.equal(quality.status, 0, quality.stderr);
});

test("native backend errors expose a stable error type", () => {
  const error = new QualityExtractionError("QUALITY_TEST", "test failure");
  assert.equal(error.name, "QualityExtractionError");
  assert.equal(error.code, "QUALITY_TEST");
  assert.match(error.message, /test failure/);
});
