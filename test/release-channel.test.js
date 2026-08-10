import assert from "node:assert/strict";
import test from "node:test";

import {
  releaseChannelForVersion,
  validateRegistryState,
  validateReleaseState
} from "../scripts/release-channel.mjs";

const stableSha = "b80984625256821484731f29aca4d65011507628";
const candidateSha = "1234567890abcdef1234567890abcdef12345678";
const uploaded = (name) => ({ name, state: "uploaded", size: 64 });

test("stable deployment requires npm latest and a non-prerelease annotated release", () => {
  const channel = validateRegistryState({
    version: "0.7.0",
    publishedVersion: "0.7.0",
    publishedTag: "0.7.0",
    publishedLatest: "0.7.0"
  });
  assert.deepEqual(channel, {
    version: "0.7.0",
    isPrerelease: false,
    distTag: "latest",
    expectedLatest: "0.7.0",
    requiredAssets: [
      "SHA256SUMS.txt",
      "extraction-comparison-0.7.0.json",
      "wceb-quality-observed-0.7.0.json"
    ]
  });
  assert.equal(validateReleaseState({
    release: {
      tag_name: "v0.7.0",
      draft: false,
      prerelease: false,
      assets: channel.requiredAssets.map(uploaded)
    },
    ref: { object: { type: "tag", sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } },
    tag: { object: { type: "commit", sha: stableSha } },
    compare: { status: "identical", base_commit: { sha: stableSha }, head_commit: null },
    expectedVersion: "0.7.0",
    expectedSha: stableSha
  }).distTag, "latest");
});

test("0.8 prerelease deployment requires npm next, keeps latest stable, and requires candidate assets", () => {
  const channel = validateRegistryState({
    version: "0.8.0-rc.1",
    publishedVersion: "0.8.0-rc.1",
    publishedTag: "0.8.0-rc.1",
    publishedLatest: "0.7.0"
  });
  assert.equal(channel.distTag, "next");
  assert.equal(channel.expectedLatest, "0.7.0");
  assert.deepEqual(channel.requiredAssets, [
    "SHA256SUMS.txt",
    "RELEASE-NOTES.md",
    "browser-automation-capabilities.schema.json",
    "browser-automation-capability-matrix.json",
    "browser-automation-real-engine-verified-actions.json",
    "release-receipt.json"
  ]);
  assert.equal(validateReleaseState({
    release: {
      tag_name: "v0.8.0-rc.1",
      draft: false,
      prerelease: true,
      assets: channel.requiredAssets.map(uploaded)
    },
    ref: { object: { type: "tag", sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" } },
    tag: { object: { type: "commit", sha: candidateSha } },
    compare: { status: "identical", base_commit: { sha: candidateSha }, head_commit: null },
    expectedVersion: "0.8.0-rc.1",
    expectedSha: candidateSha
  }).distTag, "next");
});

test("prerelease gates reject latest movement, stable release flags, lightweight tags, and missing assets", () => {
  assert.throws(() => validateRegistryState({
    version: "0.8.0-rc.1",
    publishedVersion: "0.8.0-rc.1",
    publishedTag: "0.8.0-rc.1",
    publishedLatest: "0.8.0-rc.1"
  }), /npm latest/);

  const base = {
    release: {
      tag_name: "v0.8.0-rc.1",
      draft: false,
      prerelease: true,
      assets: releaseChannelForVersion("0.8.0-rc.1").requiredAssets.map(uploaded)
    },
    ref: { object: { type: "tag", sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" } },
    tag: { object: { type: "commit", sha: candidateSha } },
    compare: { status: "identical", base_commit: { sha: candidateSha }, head_commit: null },
    expectedVersion: "0.8.0-rc.1",
    expectedSha: candidateSha
  };
  assert.throws(() => validateReleaseState({ ...base, release: { ...base.release, prerelease: false } }), /prerelease flag/);
  assert.throws(() => validateReleaseState({ ...base, ref: { object: { type: "commit", sha: candidateSha } } }), /annotated tag/);
  assert.throws(() => validateReleaseState({ ...base, release: { ...base.release, assets: [uploaded("SHA256SUMS.txt")] } }), /missing or incomplete/);
  assert.throws(() => validateReleaseState({
    ...base,
    tag: { object: { type: "commit", sha: stableSha } },
    compare: { status: "identical", base_commit: { sha: stableSha }, head_commit: null }
  }), /identical comparison/);
  assert.throws(() => validateReleaseState({
    ...base,
    tag: { object: { type: "commit", sha: stableSha } },
    compare: { status: "ahead", base_commit: { sha: stableSha }, head_commit: { sha: "c".repeat(40) } }
  }), /ahead comparison/);
  assert.equal(validateReleaseState({
    ...base,
    tag: { object: { type: "commit", sha: stableSha } },
    compare: { status: "ahead", base_commit: { sha: stableSha }, head_commit: { sha: candidateSha } }
  }).distTag, "next");
});
