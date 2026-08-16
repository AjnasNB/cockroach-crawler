const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/;

const stableAssets = Object.freeze([
  "SHA256SUMS.txt",
  "extraction-comparison-0.7.0.json",
  "wceb-quality-observed-0.7.0.json"
]);

const governedBrowserPrereleaseAssets = Object.freeze([
  "SHA256SUMS.txt",
  "RELEASE-NOTES.md",
  "browser-automation-capabilities.schema.json",
  "browser-automation-capability-matrix.json",
  "browser-automation-real-engine-verified-actions.json",
  "release-receipt.json"
]);

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function releaseChannelForVersion(version, stableSiteVersion = "0.7.0") {
  requireValue(VERSION_PATTERN.test(version), `invalid release version: ${version}`);
  requireValue(VERSION_PATTERN.test(stableSiteVersion), `invalid stable site version: ${stableSiteVersion}`);
  const isPrerelease = version.includes("-");
  return Object.freeze({
    version,
    isPrerelease,
    distTag: isPrerelease ? "next" : "latest",
    expectedLatest: isPrerelease ? stableSiteVersion : version,
    requiredAssets: isPrerelease ? governedBrowserPrereleaseAssets : stableAssets
  });
}

export function validateRegistryState({ version, publishedVersion, publishedTag, publishedLatest, stableSiteVersion = "0.7.0" }) {
  const channel = releaseChannelForVersion(version, stableSiteVersion);
  requireValue(publishedVersion === version, `exact package is ${publishedVersion || "missing"}, expected ${version}`);
  requireValue(publishedTag === version, `npm ${channel.distTag} is ${publishedTag || "missing"}, expected ${version}`);
  requireValue(publishedLatest === channel.expectedLatest, `npm latest is ${publishedLatest || "missing"}, expected ${channel.expectedLatest}`);
  return channel;
}

export function validateReleaseState({ release, ref, tag, compare, expectedVersion, expectedSha, stableSiteVersion = "0.7.0" }) {
  const channel = releaseChannelForVersion(expectedVersion, stableSiteVersion);
  requireValue(release?.tag_name === `v${expectedVersion}`, "GitHub release tag does not match the package version");
  requireValue(release?.draft === false, "GitHub release must not be a draft");
  requireValue(release?.prerelease === channel.isPrerelease, `GitHub release prerelease flag must be ${channel.isPrerelease}`);
  requireValue(ref?.object?.type === "tag", "release ref must point to an annotated tag object");
  requireValue(tag?.object?.type === "commit", "annotated release tag must point directly to a commit");
  const targetSha = tag.object.sha;
  requireValue(/^[0-9a-f]{40}$/.test(targetSha), "annotated release tag target must be a full commit SHA");
  requireValue(/^[0-9a-f]{40}$/.test(expectedSha), "deployment commit must be a full commit SHA");
  requireValue(["identical", "ahead"].includes(compare?.status), "release tag target must be the deployment commit or its ancestor");
  requireValue(compare?.base_commit?.sha === targetSha, "comparison base must equal the release tag target");
  if (compare.status === "identical") {
    requireValue(targetSha === expectedSha, "an identical comparison must bind the release tag target to the deployment commit");
  } else {
    requireValue(compare?.head_commit?.sha === expectedSha, "an ahead comparison must end at the deployment commit");
  }
  const assets = new Map((release?.assets || []).map((asset) => [asset.name, asset]));
  for (const name of channel.requiredAssets) {
    const asset = assets.get(name);
    requireValue(asset?.state === "uploaded", `release asset is missing or incomplete: ${name}`);
    requireValue(Number.isSafeInteger(asset?.size) && asset.size > 0, `release asset has invalid size: ${name}`);
  }
  return channel;
}
