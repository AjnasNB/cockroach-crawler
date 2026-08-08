import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const errors = [];

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

async function bytes(path) {
  return readFile(new URL(path, root));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requireValue(condition, message) {
  if (!condition) errors.push(message);
}

const packageJson = JSON.parse(await text("package.json"));
const softwareZenodo = JSON.parse(await text(".zenodo.json"));
const codeMeta = JSON.parse(await text("codemeta.json"));
const paperZenodo = JSON.parse(await text("docs/zenodo/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.metadata.json"));
const receipt = JSON.parse(await text("docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.build.json"));
const citation = await text("CITATION.cff");
const manuscript = await bytes("docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.md");
const builder = await bytes("scripts/build-crawler-whitepaper-pdf.py");
const outputPdf = await bytes("output/pdf/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf");
const docsPdf = await bytes("docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf");
const sitePdf = await bytes("website/paper/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf");
const checksum = (await text("docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.sha256")).trim();

requireValue(packageJson.version === "0.7.0", "package source version must remain 0.7.0 for this candidate");
for (const path of ["CITATION.cff", "codemeta.json", "docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.md"]) {
  requireValue(packageJson.files.includes(path), `npm files must include ${path}`);
}
requireValue(packageJson.scripts["paper:build"] === "python scripts/build-crawler-whitepaper-pdf.py", "package script must expose the paper builder");
requireValue(packageJson.scripts["publication:check"] === "node scripts/check-publication.mjs", "package script must expose publication validation");

requireValue(softwareZenodo.upload_type === "software", ".zenodo.json must describe software");
requireValue(softwareZenodo.version === "0.7.0-rc.1", ".zenodo.json must identify the release candidate");
requireValue(softwareZenodo.description.includes("attempt 003 was rejected"), ".zenodo.json must preserve the frozen rejection");
requireValue(!JSON.stringify(softwareZenodo).includes('"doi"'), ".zenodo.json must not claim an unreserved DOI");
requireValue(codeMeta["@type"] === "SoftwareSourceCode", "codemeta.json must describe source code");
requireValue(codeMeta.identifier === "90825063d447f07345388d040b1428a311109c2b", "codemeta.json must pin the candidate commit");
requireValue(paperZenodo.metadata.upload_type === "publication" && paperZenodo.metadata.publication_type === "report", "paper Zenodo metadata must describe a report");
requireValue(paperZenodo.metadata.prereserve_doi === true, "paper Zenodo draft must request DOI reservation");
requireValue(!Object.hasOwn(paperZenodo.metadata, "doi"), "paper Zenodo draft must not invent a DOI");
requireValue(!/orcid:/i.test(citation), "CITATION.cff must not invent an ORCID");
requireValue(citation.includes("version: 0.7.0-rc.1"), "CITATION.cff must identify the manuscript version");
requireValue(citation.includes("preferred-citation:"), "CITATION.cff must provide the paper citation");

const outputHash = sha256(outputPdf);
requireValue(sha256(docsPdf) === outputHash, "docs PDF copy must be byte-identical");
requireValue(sha256(sitePdf) === outputHash, "website PDF copy must be byte-identical");
requireValue(receipt.inputs.manuscript.sha256 === sha256(manuscript), "receipt manuscript hash must match");
requireValue(receipt.inputs.builder.sha256 === sha256(builder), "receipt builder hash must match");
requireValue(receipt.output.sha256 === outputHash, "receipt PDF hash must match");
requireValue(checksum === `${outputHash}  Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf`, "PDF checksum file must match");
requireValue(receipt.frozenEvaluation.status === "rejected" && receipt.frozenEvaluation.authorizesReleaseClaim === false, "receipt must preserve the rejected gate");
requireValue(receipt.archive.doiReserved === false && receipt.archive.published === false, "receipt must preserve draft-only archive status");

const publicationSources = await Promise.all([
  "README.md",
  "SECURITY.md",
  "docs/launch/POSITIONING.md",
  "docs/launch/README.md",
  "docs/launch/RELEASE-NOTES.md",
  "docs/launch/SOCIAL-AND-VIDEO.md",
  "website/build.mjs",
  "website/blog.mjs"
].map(async (path) => ({ path, source: await text(path) })));

for (const { path, source } of publicationSources) {
  for (const phrase of [
    "The stable 0.7.0 release",
    "current stable release represented by this source tree",
    "built to be the best AI crawler",
    "Version `0.7.0` is MIT licensed and available on npm"
  ]) {
    requireValue(!source.includes(phrase), `${path} retains forbidden publication claim: ${phrase}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    paperVersion: receipt.paperVersion,
    candidateCommit: receipt.implementation.candidateCommit,
    frozenEvaluation: receipt.frozenEvaluation.status,
    pdfSha256: outputHash,
    zenodo: "draft_metadata_only"
  }, null, 2));
}
