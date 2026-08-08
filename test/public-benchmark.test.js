import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertWcebCheckout } from "../bench/public/wceb-integrity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceFiles = [
  "wceb-core-observed-0.7.0.json",
  "wceb-quality-development-0.7.0.json",
  "wceb-quality-observed-0.7.0.json",
  "wceb-quality-fail-closed-observed-0.7.0.json",
  "extraction-comparison-0.7.0.json",
  "public-conformance-0.7.0.json"
];

test("WCEB integrity rejects untracked evaluated inputs but permits outputs elsewhere", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "cockroach-wceb-integrity-"));
  const groundTruth = path.join(temporaryDirectory, "test", "ground-truth");
  const html = path.join(temporaryDirectory, "test", "html");
  const output = path.join(temporaryDirectory, "benchmark-output.json");

  try {
    await mkdir(groundTruth, { recursive: true });
    await mkdir(html, { recursive: true });
    await writeFile(path.join(groundTruth, "page.json"), "{}\n", "utf8");
    await writeFile(path.join(html, "page.html.gz"), "fixture", "utf8");

    execFileSync("git", ["init", "--quiet"], { cwd: temporaryDirectory });
    execFileSync("git", ["config", "user.email", "benchmark-test@example.invalid"], {
      cwd: temporaryDirectory
    });
    execFileSync("git", ["config", "user.name", "Benchmark Test"], { cwd: temporaryDirectory });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: temporaryDirectory });
    execFileSync("git", ["add", "test"], { cwd: temporaryDirectory });
    execFileSync("git", ["commit", "--quiet", "-m", "fixture"], { cwd: temporaryDirectory });
    const revision = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: temporaryDirectory,
      encoding: "utf8"
    }).trim();

    await writeFile(output, "untracked benchmark output\n", "utf8");
    assert.equal(assertWcebCheckout({
      dataset: temporaryDirectory,
      split: "test",
      expectedRevision: revision,
      output
    }), revision);

    const injectedTruth = path.join(groundTruth, "injected.json");
    await writeFile(injectedTruth, "{}\n", "utf8");
    assert.throws(
      () => assertWcebCheckout({
        dataset: temporaryDirectory,
        split: "test",
        expectedRevision: revision,
        output
      }),
      /evaluated inputs must be clean.*untracked/isu
    );
    await rm(injectedTruth);

    const injectedHtml = path.join(html, "injected.html.gz");
    await writeFile(injectedHtml, "fixture", "utf8");
    assert.throws(
      () => assertWcebCheckout({
        dataset: temporaryDirectory,
        split: "test",
        expectedRevision: revision,
        output
      }),
      /evaluated inputs must be clean.*untracked/isu
    );
    await rm(injectedHtml);

    await writeFile(
      path.join(temporaryDirectory, ".git", "info", "exclude"),
      "test/ground-truth/ignored.json\n",
      "utf8"
    );
    const ignoredTruth = path.join(groundTruth, "ignored.json");
    await writeFile(ignoredTruth, "{}\n", "utf8");
    assert.throws(
      () => assertWcebCheckout({
        dataset: temporaryDirectory,
        split: "test",
        expectedRevision: revision,
        output
      }),
      /evaluated inputs must be clean.*ignored/isu
    );
    await rm(ignoredTruth);

    assert.throws(
      () => assertWcebCheckout({
        dataset: temporaryDirectory,
        split: "test",
        expectedRevision: revision,
        output: path.join(groundTruth, "result.json")
      }),
      /output must be outside evaluated WCEB inputs/iu
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("0.7.0 benchmark evidence is packaged, versioned, and independently verifiable", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const sources = JSON.parse(await readFile(path.join(root, "bench", "public", "sources.json"), "utf8"));

  assert.ok(manifest.files.includes("bench/public/"));
  for (const filename of evidenceFiles) {
    assert.ok(manifest.files.includes(`bench/results/${filename}`), `${filename} must be packed.`);
  }
  assert.equal(sources.wceb.revision, "62ff86d12ea72c80c31fb810ff1a724fad687bea");
  assert.equal(sources.googleRobots.revision.length, 40);
  assert.equal(sources.wptUrl.revision.length, 40);
  assert.match(sources.wptUrl.sha256, /^[a-f0-9]{64}$/u);

  const development = JSON.parse(
    await readFile(path.join(root, "bench", "results", "wceb-quality-development-0.7.0.json"), "utf8")
  );
  const observed = JSON.parse(
    await readFile(path.join(root, "bench", "results", "wceb-quality-observed-0.7.0.json"), "utf8")
  );
  assert.equal(development.scope.confirmatoryEligible, false);
  assert.equal(observed.scope.evaluationStatus, "observed-development-evidence-after-project-iteration");
  assert.ok(observed.results.precision < 0.9, "0.894101 must not be rounded into a 0.90 claim.");

  const verification = execFileSync(
    process.execPath,
    ["bench/public/verify-results.mjs", "--historical-source"],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  assert.match(verification, /immutable historical evidence/iu);
  assert.match(verification, /90825063d447f07345388d040b1428a311109c2b/iu);
  assert.match(verification, /current source was not asserted/iu);
});

test("historical evidence verification does not waive current-source drift", () => {
  const verification = spawnSync(process.execPath, ["bench/public/verify-results.mjs"], {
    cwd: root,
    encoding: "utf8"
  });

  assert.notEqual(verification.status, 0);
  assert.match(
    verification.stderr,
    /source fingerprint does not match current implementation/iu
  );
});

test("benchmark verification fails closed on profile, implementation, or metric drift", async () => {
  const evidenceDirectory = path.join(root, "bench", "results");
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "cockroach-benchmark-evidence-"));
  const observedFilename = "wceb-quality-observed-0.7.0.json";

  try {
    for (const filename of evidenceFiles) {
      await writeFile(
        path.join(temporaryDirectory, filename),
        await readFile(path.join(evidenceDirectory, filename), "utf8"),
        "utf8"
      );
    }

    const observedPath = path.join(temporaryDirectory, observedFilename);
    const original = JSON.parse(await readFile(observedPath, "utf8"));

    const profileDrift = structuredClone(original);
    profileDrift.configuration.qualityProfile = "precision";
    await writeFile(observedPath, `${JSON.stringify(profileDrift, null, 2)}\n`, "utf8");
    let verification = spawnSync(
      process.execPath,
      [
        "bench/public/verify-results.mjs",
        "--historical-source",
        "--results-dir",
        temporaryDirectory
      ],
      { cwd: root, encoding: "utf8" }
    );
    assert.notEqual(verification.status, 0);
    assert.match(verification.stderr, /qualityProfile|balanced|precision/iu);

    const uncovered = structuredClone(original);
    uncovered.package.source.inputs = uncovered.package.source.inputs.filter(
      (entry) => entry !== "src/quality.js"
    );
    await writeFile(observedPath, `${JSON.stringify(uncovered, null, 2)}\n`, "utf8");
    verification = spawnSync(
      process.execPath,
      [
        "bench/public/verify-results.mjs",
        "--historical-source",
        "--results-dir",
        temporaryDirectory
      ],
      { cwd: root, encoding: "utf8" }
    );
    assert.notEqual(verification.status, 0);
    assert.match(verification.stderr, /quality implementation/iu);

    const inflated = structuredClone(original);
    inflated.results.precision = 0.9;
    await writeFile(observedPath, `${JSON.stringify(inflated, null, 2)}\n`, "utf8");
    verification = spawnSync(
      process.execPath,
      [
        "bench/public/verify-results.mjs",
        "--historical-source",
        "--results-dir",
        temporaryDirectory
      ],
      { cwd: root, encoding: "utf8" }
    );
    assert.notEqual(verification.status, 0);
    assert.match(verification.stderr, /precision drifted/iu);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
