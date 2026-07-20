# Release provenance

Review date: 2026-07-20

- Runtime source, tests, documentation, and deployment configuration are maintained in this repository under the project MIT license.
- Website and launch illustrations are generated from the committed SVG/build sources in `website/assets/` and `media/launch-assets/`.
- Release videos are rendered from the committed Remotion project. Their command evidence, captions, narration script, posters, and render manifest are retained beside the editable source.
- The local regression result is a committed deterministic fixture record, not a hosted-capacity measurement. Its method and limits are documented in `docs/BENCHMARK.md`.
- Direct runtime and development dependencies are pinned in `package-lock.json`; `npm run audit:licenses` verifies the reviewed license set recorded in `docs/DEPENDENCY_LICENSES.md`.
- Optional reach providers call separately installed OpenCLI 1.8.6 and yt-dlp 2025.5.22 through original adapter code in this repository. No upstream source was copied or vendored. Exact read-command maps, process restrictions, and manual browser-session consent are documented in `docs/EXTERNAL-SOURCES.md`.

Any future vendored or adapted third-party material must record its exact source, revision, license, modifications, and required notices before it is merged.
