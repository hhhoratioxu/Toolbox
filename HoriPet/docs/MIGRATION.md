# HoriPet repository migration

On 2026-10-28 HoriPet moved into `hhhoratioxu/Toolbox`, under `HoriPet/`. The project remains MIT-licensed and its original license and third-party notices are retained.

- Original main commit: `3855a37bc5aac5818a9da2ee235d9c4828486c86`. A non-squashed Git subtree import preserves every original main-history commit as an ancestor of Toolbox.
- Original candidate tags are preserved under `horipet-legacy/`. New Toolbox releases use `horipet-v*`, independently of other tools.
- Current download: [HoriPet v0.1.0-preview.5](https://github.com/hhhoratioxu/Toolbox/releases/tag/horipet-v0.1.0-preview.5). The eight installers/archives and SHA256SUMS.txt are copied byte for byte from the original release. No rebuilt binary is substituted for an original verified artifact.
- [Original asset hashes and sizes](evidence/release-preview.5/release-assets.json) and [original acceptance reports](evidence/release-preview.5/README.md) remain inspectable after the old repository is retired.
- The monorepo workflow is `.github/workflows/horipet.yml` at the Toolbox root. It works from `HoriPet/`, uses the project lockfile and isolates artifact names and release tags.

Run development commands from `Toolbox/HoriPet`; existing installed apps and local pet saves do not need to move.
