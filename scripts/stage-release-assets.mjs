import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const version = "0.8.0-rc.1";

if (packageJson.version !== version) {
  throw new Error(`release asset staging supports ${version}; package is ${packageJson.version}`);
}

const matrix = JSON.parse(await readFile(new URL("docs/browser-automation-capability-matrix.json", root), "utf8"));
const sources = new Map([
  ["browser-automation-capability-matrix.json", new URL("docs/browser-automation-capability-matrix.json", root)],
  ["browser-automation-real-engine-verified-actions.json", new URL("docs/browser-automation-real-engine-verified-actions.json", root)],
  ["browser-automation-capabilities.schema.json", new URL("schemas/browser-automation-capabilities.schema.json", root)],
  ["RELEASE-NOTES.md", new URL(`docs/releases/v${version}.md`, root)]
]);
const expectedNames = [...sources.keys(), "release-receipt.json", "SHA256SUMS.txt"].sort();
const defaultDirectory = new URL(`release-assets/v${version}/`, root);

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function expectedAssets() {
  const assets = new Map();
  for (const [name, source] of sources) assets.set(name, await readFile(source));
  const receipt = {
    schemaVersion: "cockroach.release-assets.v1",
    package: packageJson.name,
    version,
    npmDistTag: "next",
    stableLatest: "0.7.0",
    capabilityAccounting: {
      catalogedActions: matrix.summary.catalogedActions,
      catalogedCategories: matrix.summary.catalogedCategories,
      builtInHandlerActions: matrix.summary.builtInHandlerActions,
      trustedServiceRequiredActions: matrix.summary.trustedServiceRequiredActions,
      maximumConfiguredHandlers: matrix.summary.builtInHandlerActions + matrix.summary.trustedServiceRequiredActions,
      explicitlyUnsupportedActions: matrix.summary.explicitlyUnsupportedActions,
      realEngineIntegrationVerifiedActionsPerEngine: matrix.summary.realEngineIntegrationVerifiedActions,
      testedEngines: ["chromium", "firefox"]
    },
    npmArtifact: {
      recordedBy: ".github/workflows/publish-npm.yml",
      note: "The trusted-publishing workflow records the exact tarball size, SHA-256, and npm integrity for the merge commit."
    }
  };
  assets.set("release-receipt.json", Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8"));
  const checksums = [...assets]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, bytes]) => `${digest(bytes)}  ${name}`)
    .join("\n");
  assets.set("SHA256SUMS.txt", Buffer.from(`${checksums}\n`, "utf8"));
  return assets;
}

async function verifyDirectory(directory, assets) {
  const resolvedDirectory = directory instanceof URL ? fileURLToPath(directory) : resolve(directory);
  const actualNames = (await readdir(resolvedDirectory)).sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(`release asset names differ: ${actualNames.join(", ")}`);
  }
  for (const [name, expected] of assets) {
    const actual = await readFile(join(resolvedDirectory, name));
    if (!actual.equals(expected)) throw new Error(`release asset differs: ${name}`);
  }
  return { directory: resolvedDirectory, files: expectedNames, sha256Manifest: digest(assets.get("SHA256SUMS.txt")) };
}

const assets = await expectedAssets();
const checkIndex = process.argv.indexOf("--check");
const verifyIndex = process.argv.indexOf("--verify-directory");

if (checkIndex !== -1 && verifyIndex !== -1) throw new Error("choose --check or --verify-directory");

if (verifyIndex !== -1) {
  const argument = process.argv[verifyIndex + 1];
  if (!argument) throw new Error("--verify-directory requires a path");
  console.log(JSON.stringify(await verifyDirectory(resolve(argument), assets), null, 2));
} else if (checkIndex !== -1) {
  console.log(JSON.stringify(await verifyDirectory(new URL(`release-assets/v${version}/`, root), assets), null, 2));
} else {
  await mkdir(defaultDirectory, { recursive: true });
  for (const [name, source] of sources) await cp(source, new URL(`release-assets/v${version}/${name}`, root));
  for (const name of ["release-receipt.json", "SHA256SUMS.txt"]) {
    await writeFile(new URL(`release-assets/v${version}/${name}`, root), assets.get(name));
  }
  console.log(JSON.stringify(await verifyDirectory(defaultDirectory, assets), null, 2));
}
