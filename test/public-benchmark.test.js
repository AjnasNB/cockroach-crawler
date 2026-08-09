import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function canonicalizeHistoricalLockSnapshot(bytes) {
  const text = bytes.toString("utf8");
  assert.deepEqual(Buffer.from(text, "utf8"), bytes, "snapshot must contain valid UTF-8 bytes");
  assert.doesNotMatch(text, /\r(?!\n)/, "snapshot contains a bare carriage return");
  if (text.includes("\r\n")) {
    assert.doesNotMatch(text.replaceAll("\r\n", ""), /\n/, "snapshot mixes LF and CRLF newlines");
  }
  return text.replaceAll("\r\n", "\n");
}

function replaceFirstNewline(text, replacement) {
  const index = text.indexOf("\n");
  assert.notEqual(index, -1, "snapshot mutation fixture requires at least one newline");
  return `${text.slice(0, index)}${replacement}${text.slice(index + 1)}`;
}

test("public benchmark evidence is source-pinned, packaged, and independently verifiable", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const sources = JSON.parse(await readFile(path.join(root, "bench", "public", "sources.json"), "utf8"));

  assert.ok(manifest.files.includes("bench/public/"));
  assert.ok(manifest.files.includes("bench/results/wceb-test-0.6.1.json"));
  assert.ok(manifest.files.includes("bench/results/public-conformance-0.6.1.json"));
  assert.equal(sources.wceb.revision, "62ff86d12ea72c80c31fb810ff1a724fad687bea");
  assert.equal(sources.googleRobots.revision.length, 40);
  assert.equal(sources.wptUrl.revision.length, 40);
  assert.match(sources.wptUrl.sha256, /^[a-f0-9]{64}$/);

  const output = execFileSync(process.execPath, ["bench/public/verify-results.mjs"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(output, /verified against 0\.6\.1/);
  assert.match(output, /ff7000579240658bfd99f3def6df4e59e6911b28/);
  assert.match(output, /e71ee10f6fd3931b9fd6c09f8a69bf7808d4a316/);
  assert.match(output, /b9008158d90b1b050cad6ab566b44fd794f9c1dd/);
  assert.match(output, /from package 0\.6\.2/);
});

test("the packed verifier uses only the exact immutable historical lock snapshot", async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), "cockroach-crawler-packed-verifier-"));
  try {
    const packDirectory = path.join(temporary, "pack");
    const extractDirectory = path.join(temporary, "extract");
    await mkdir(packDirectory);
    await mkdir(extractDirectory);
    const npmCli = process.env.npm_execpath || path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js"
    );
    execFileSync(process.execPath, [
      npmCli,
      "pack",
      "--ignore-scripts",
      "--pack-destination",
      packDirectory,
      "--json"
    ], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const tarball = path.join(packDirectory, "cockroach-crawler-0.6.2.tgz");
    execFileSync("tar", ["-xzf", tarball, "-C", extractDirectory], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    const packedRoot = path.join(extractDirectory, "package");
    await assert.rejects(readFile(path.join(packedRoot, "package-lock.json")), { code: "ENOENT" });
    const snapshotPath = path.join(packedRoot, "bench", "public", "package-lock-0.6.1.json");
    const snapshot = canonicalizeHistoricalLockSnapshot(await readFile(snapshotPath));
    assert.equal(
      createHash("sha256").update(snapshot).digest("hex"),
      "6916a86bc65bb2c85692814c0f385ea9e756784a03c57f8377f21c335e9d8c8e"
    );

    const verify = () => spawnSync(process.execPath, ["bench/public/verify-results.mjs"], {
      cwd: packedRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const valid = verify();
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /verified against 0\.6\.1/);
    assert.match(valid.stdout, /from package 0\.6\.2/);

    const crlfSnapshot = Buffer.from(snapshot.replaceAll("\n", "\r\n"), "utf8");
    assert.equal(canonicalizeHistoricalLockSnapshot(crlfSnapshot), snapshot);
    await writeFile(snapshotPath, crlfSnapshot);
    const crlfCopy = verify();
    assert.equal(crlfCopy.status, 0, crlfCopy.stderr);
    assert.match(crlfCopy.stdout, /verified against 0\.6\.1/);

    const dependencyTamper = snapshot.replace('"ajv": "^8.18.0"', '"ajv": "^8.99.0"');
    assert.notEqual(dependencyTamper, snapshot);
    await writeFile(snapshotPath, dependencyTamper, "utf8");
    const tampered = verify();
    assert.notEqual(tampered.status, 0);
    assert.match(tampered.stderr, /SHA-256 does not match the immutable v0\.6\.1 lockfile/);

    const malformedVersion = snapshot.replace('"version": "0.6.1"', '"version":"0.6.1"');
    assert.notEqual(malformedVersion, snapshot);
    await writeFile(snapshotPath, malformedVersion, "utf8");
    const malformed = verify();
    assert.notEqual(malformed.status, 0);
    assert.match(malformed.stderr, /does not have the exact historical-version shape/);

    await writeFile(snapshotPath, replaceFirstNewline(snapshot, "\r"), "utf8");
    const bareCarriageReturn = verify();
    assert.notEqual(bareCarriageReturn.status, 0);
    assert.match(bareCarriageReturn.stderr, /contains a bare carriage return/);

    await writeFile(snapshotPath, replaceFirstNewline(snapshot, "\r\n"), "utf8");
    const mixedNewlines = verify();
    assert.notEqual(mixedNewlines.status, 0);
    assert.match(mixedNewlines.stderr, /mixes LF and CRLF newlines/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
