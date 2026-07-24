# Release provenance

Review date: 2026-07-20

- Runtime source, tests, documentation, and deployment configuration are maintained in this repository under the project MIT license.
- Website and launch illustrations are generated from the committed SVG/build sources in `website/assets/` and `media/launch-assets/`.
- Release videos are rendered from the committed Remotion project. Their command evidence, captions, narration script, posters, and render manifest are retained beside the editable source.
- The local regression result is a committed deterministic fixture record, not a hosted-capacity measurement. Its method and limits are documented in `docs/BENCHMARK.md`.
- Direct runtime and development dependencies are pinned in `package-lock.json`; `npm run audit:licenses` verifies the reviewed license set recorded in `docs/DEPENDENCY_LICENSES.md`.
- Optional reach providers call separately installed OpenCLI 1.8.6 and yt-dlp 2025.5.22 through original adapter code in this repository. No upstream source was copied or vendored. Exact read-command maps, process restrictions, and manual browser-session consent are documented in `docs/EXTERNAL-SOURCES.md`.
- The public extraction-quality result uses WCEB v1.0 at commit `62ff86d12ea72c80c31fb810ff1a724fad687bea` under CC-BY-4.0. The dataset is downloaded separately and is not committed or packed. Cockroach Crawler's evaluator and machine-readable derived metrics are original project code and output.
- The public robots conformance fixture adapts test inputs from Google's `robotstxt` repository at commit `22b355ff855419e6a3ff8ff09c0ad7fdb17116f9`, `robots_test.cc` blob `35853def27a3e811cf86cd8ef76b50d1f82e3d01`, under Apache-2.0. The adaptation represents selected allow/disallow expectations as JSON and runs them through the crawler's HTTP dispatch path.
- The URL conformance evaluator downloads `url/resources/urltestdata.json` from Web Platform Tests commit `94dbeafcf5092c7be5e15ec78c95dca966d5ee26`, verifies SHA-256 `355c9f1e5f34aae66ba8adfabf3c853f5cd30ea22964ef7a53eb292e7975d81e`, and retains only derived pass/fail rows. WPT is BSD-3-Clause.

Any future vendored or adapted third-party material must record its exact source, revision, license, modifications, and required notices before it is merged.
