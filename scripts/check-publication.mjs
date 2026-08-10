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

function canonicalTextBytes(value) {
  const source = value.toString("utf8");
  const withoutCrLf = source.replaceAll("\r\n", "\n");
  if (withoutCrLf.includes("\r")) {
    throw new Error("publication text inputs must use LF or Git-compatible CRLF line endings");
  }
  return Buffer.from(withoutCrLf, "utf8");
}

function requireValue(condition, message) {
  if (!condition) errors.push(message);
}

const packageJson = JSON.parse(await text("package.json"));
const softwareVersion = packageJson.version;
const softwareZenodo = JSON.parse(await text(".zenodo.json"));
const codeMeta = JSON.parse(await text("codemeta.json"));
const paperZenodo = JSON.parse(await text("docs/zenodo/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.metadata.json"));
const publication = JSON.parse(await text("docs/zenodo/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.publication.json"));
const receipt = JSON.parse(await text("docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.build.json"));
const citation = await text("CITATION.cff");
const manuscript = await bytes("docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.md");
const builder = await bytes("scripts/build-crawler-whitepaper-pdf.py");
const outputPdf = await bytes("output/pdf/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf");
const docsPdf = await bytes("docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf");
const sitePdf = await bytes("website/paper/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf");
const checksum = (await text("docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.sha256")).trim();

requireValue(/^0\.8\.0-rc\.1$/.test(softwareVersion), "package source version must identify the reviewed 0.8 prerelease");
for (const path of ["CITATION.cff", "codemeta.json", "docs/Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.md"]) {
  requireValue(packageJson.files.includes(path), `npm files must include ${path}`);
}
requireValue(packageJson.scripts["paper:build"] === "python scripts/build-crawler-whitepaper-pdf.py", "package script must expose the paper builder");
requireValue(packageJson.scripts["publication:check"] === "node scripts/check-publication.mjs", "package script must expose publication validation");

requireValue(softwareZenodo.upload_type === "software", ".zenodo.json must describe software");
requireValue(softwareZenodo.version === "0.7.0-rc.1", ".zenodo.json must preserve the historical RC software snapshot");
requireValue(softwareZenodo.description.includes("attempt 003 was rejected"), ".zenodo.json must preserve the frozen rejection");
requireValue(!JSON.stringify(softwareZenodo).includes('"doi"'), ".zenodo.json must not claim an unreserved DOI");
requireValue(codeMeta["@type"] === "SoftwareSourceCode", "codemeta.json must describe source code");
requireValue(codeMeta.version === softwareVersion, "codemeta.json must identify the current software version");
requireValue(codeMeta.identifier === `https://github.com/AjnasNB/cockroach-crawler/releases/tag/v${softwareVersion}`, "codemeta.json must identify the current release tag target");
requireValue(codeMeta.referencePublication === "https://doi.org/10.5281/zenodo.21851008", "codemeta.json must retain the historical RC paper reference");
requireValue(paperZenodo.metadata.upload_type === "publication" && paperZenodo.metadata.publication_type === "report", "paper Zenodo metadata must describe a report");
requireValue(paperZenodo.metadata.prereserve_doi === false, "paper Zenodo metadata must not request a second DOI");
requireValue(paperZenodo.metadata.doi === "10.5281/zenodo.21851008", "paper Zenodo metadata must bind the reserved DOI");
requireValue(publication.record.id === 21851008 && publication.record.doi === paperZenodo.metadata.doi, "publication receipt must bind the public record and DOI");
requireValue(publication.record.published === true && publication.record.accessRight === "open" && publication.record.license === "cc-by-4.0", "publication receipt must preserve open CC BY 4.0 publication");
requireValue(publication.claimBoundary.softwareReleaseAuthorized === false && publication.claimBoundary.bestCrawlerClaimAuthorized === false, "historical paper receipt must preserve its release and ranking claim boundary");
requireValue(!/orcid:/i.test(citation), "CITATION.cff must not invent an ORCID");
requireValue(new RegExp(`^version: ${softwareVersion.replaceAll(".", "\\.")}$`, "m").test(citation), "CITATION.cff must identify the current software version");
requireValue(citation.includes("preferred-citation:"), "CITATION.cff must provide the paper citation");
requireValue(/preferred-citation:[\s\S]*?version: 0\.7\.0-rc\.1/.test(citation), "CITATION.cff must preserve the historical RC paper version");
requireValue(citation.includes('doi: "10.5281/zenodo.21851008"'), "CITATION.cff must bind the reserved paper DOI");

const outputHash = sha256(outputPdf);
requireValue(sha256(docsPdf) === outputHash, "docs PDF copy must be byte-identical");
requireValue(sha256(sitePdf) === outputHash, "website PDF copy must be byte-identical");
requireValue(receipt.inputs.manuscript.sha256 === sha256(canonicalTextBytes(manuscript)), "receipt manuscript hash must match canonical Git text bytes");
requireValue(receipt.inputs.builder.sha256 === sha256(canonicalTextBytes(builder)), "receipt builder hash must match canonical Git text bytes");
requireValue(receipt.output.sha256 === outputHash, "receipt PDF hash must match");
requireValue(checksum === `${outputHash}  Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf`, "PDF checksum file must match");
const depositedPdf = publication.files.find((file) => file.name.endsWith(".pdf"));
requireValue(depositedPdf?.sha256 === outputHash, "publication receipt PDF hash must match the repository PDF");
requireValue(receipt.frozenEvaluation.status === "rejected" && receipt.frozenEvaluation.authorizesReleaseClaim === false, "receipt must preserve the rejected gate");
requireValue(receipt.archive.doi === "10.5281/zenodo.21851008" && receipt.archive.doiReserved === true && receipt.archive.published === false, "receipt must preserve the reserved, unpublished archive status");

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
    "built to be the best AI crawler",
    "best crawler in the world",
    "achieves universal 0.90 precision",
    "proves universal 0.90 precision",
    "the paper authorizes the stable release",
    "the paper certifies the stable release"
  ]) {
    requireValue(!source.toLowerCase().includes(phrase.toLowerCase()), `${path} retains forbidden publication claim: ${phrase}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    paperVersion: receipt.paperVersion,
    historicalCandidateCommit: receipt.implementation.candidateCommit,
    softwareVersion: packageJson.version,
    frozenEvaluation: receipt.frozenEvaluation.status,
    pdfSha256: outputHash,
    zenodo: "published",
    doi: publication.record.doi,
    record: publication.record.url
  }, null, 2));
}
