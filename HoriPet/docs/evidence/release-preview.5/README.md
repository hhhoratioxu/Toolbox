# Preserved HoriPet release acceptance

Original GitHub Actions run: `39229117084`, release `v0.1.0-preview.5`, tested 2026-10-19. These JSON reports and screenshots were downloaded from the original workflow before retiring its repository; migration does not turn historical checks into new device acceptance.

| Platform | Checks passed | Original report |
|---|---|---|
| macos-arm64 | 10/10 | [macos-arm64/desktop-smoke.json](macos-arm64/desktop-smoke.json) |
| macos-intel | 10/10 | [macos-intel/desktop-smoke.json](macos-intel/desktop-smoke.json) |
| windows-x64 | 14/14 | [windows-x64/desktop-smoke.json](windows-x64/desktop-smoke.json) |

Windows x64 includes native SetCursorPos/SendInput acceptance. Windows ARM64 was cross-built only; no ARM device run is claimed. Mac CI reports describe any CI-only rendering configuration.
