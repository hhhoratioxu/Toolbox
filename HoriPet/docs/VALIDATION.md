# HoriPet verification record

This record is updated as checks are actually completed. Build success, automated application checks and native device acceptance are separate layers.

## Local delivery evidence, 2026-10-19

- Host: macOS 27.2 (26B5112a), Apple Silicon ARM64, Retina desktop.
- 42/42 Vitest checks and TypeScript/production build passed.
- Both ARM64 and Intel DMG + ZIP were built locally with electron-builder 26.15.3 and Electron 44.9.0. Signing was explicitly skipped.
- The ARM64 DMG passed image checksum validation, was mounted read-only and installed to the user's Applications folder. The mounted payload, installed payload and unpacked build had identical `app.asar` SHA256: `ef24de237743c874c33b7ec1a9840f5e44d97a209a105dfa349e44e21b989a2d`.
- The **installed** ARM64 app passed 14/14 live desktop checks. Four of these used explicitly authorized CGEvent OS input: transparent-corner click-through to a separate underlying window, cat clicks without changing the underlying keyboard focus, native drag by -95/-65 DIP, and cursor following with automatic return to idle.
- Normal quit was checked against the parent and all three observed descendants; all four processes exited. Restart restored the edited settings, skin, name, statistics and saved position.
- A native right-click menu was separately observed in the macOS UI after a real CGEvent right-click on the installed cat. It contained care actions, movement toggles, recovery, preferences and quit; Escape dismissed it.
- The local report and snapshots are in `test-results/installed-macos-arm64/`. Representative UI captures are committed in `docs/images/`; full transient test profiles are ignored and never packaged.

An idle sample with the installed app, one visible cat, preferences closed and autonomous movement/following disabled used 5 seconds of warmup and a 10-second observation. Electron reported a summed process CPU figure of approximately **3.5%**, and summed working sets of approximately **409 MiB**. Working-set sums include shared pages more than once; this is not a measurement of unique physical memory. This short automated sample is not a battery or long-duration benchmark. Electron carries a material runtime memory and download-size cost, even for a small character. The release does not claim native-app-level memory usage.

## Automated logic

42 Vitest checks cover bounded settings and corrupt inputs, offline time progression, mutually exclusive behavior priorities, drag interruption, waking, autonomous naps, cursor-follow exit, work-area clamping with negative/missing monitors, scale-independent hit regions, atomic persistence, backup recovery, immediate quit flush and the optional offline AI contract.

TypeScript checking and the production Electron/Vite build are executed before packaging. Exact results and platform-specific desktop reports are recorded with delivery evidence.

## Desktop automation

`scripts/desktop-smoke.mjs` launches a real Electron app with an isolated local profile. It checks first visible render, native transparent window color, alpha pixels, focusability, sandbox, click/double-click transitions, care actions, input rejection, hide/show/recovery, preferences and immediate settings, settings-close lifetime, offline operation, process termination and persistence across a real restart.

Playwright-delivered mouse events exercise the live renderer and IPC. They **do not alone establish native OS mouse delivery, native drag movement or transparent-region click-through**. Those require separate OS input checks. Captured PNG alpha proves the rendered surface, not every external compositor or graphics driver.

Windows x64 adds genuine OS input using `SetCursorPos` and `SendInput` in the Windows runner; all four native checks passed in [archived release-run evidence](evidence/release-preview.5/README.md). That runner also passed 14 desktop checks with the packaged EXE. These are Windows hosted-runner results, not physical Windows 10/11 device acceptance. Release v0.1.0-preview.5 passed all four platform jobs. Both Mac jobs passed 10 live desktop checks; Windows x64 passed 14 including native OS input. Windows ARM64 was cross-built without a native ARM device run. The release workflow publishes eight installers/archives and SHA256SUMS.txt after all jobs succeed.

On virtual macOS GPUs, native `capturePage` can return `UnknownVizError` before a capture surface is available. The test retries a bounded number of times, then records an explicit live Chromium-renderer capture fallback if needed. It does not wait indefinitely on animation frames that an occluded virtual window is allowed to suspend. The capture method is included in the JSON report, so it is not confused with physical compositor acceptance.

Hosted macOS desktop tests explicitly disable background throttling on their test windows to prevent an occluded, non-focusable window from suspending test callbacks. This is recorded in the report. Production defaults and the locally installed CGEvent acceptance keep normal background throttling enabled; CI therefore makes no claim about real idle power consumption.

Quit acceptance uses the application's actual preload/IPC Quit action, with a ten-second exit deadline and observed child-process termination. It does not use Playwright's debugger-context shutdown as the application acceptance criterion. The deadline exposed an ARM macOS tray-only termination edge in earlier CI candidates. The app now flushes durable state, stops its timers, removes the tray and explicitly exits Electron rather than waiting for Cocoa activation/termination callbacks. Legitimate Quit IPC is still source-validated but never rate-limited. A deadline failure fails the test and triggers cleanup; forced test-driver cleanup is never recorded as a passed quit check.

## Platform acceptance boundaries

- macOS Apple Silicon: local native application checks and installer verification are performed during delivery; the evidence report specifies completed checks.
- macOS Intel: Actions builds on an Intel runner and launches the packaged app if that job succeeds. This does not constitute manual Intel hardware/multi-monitor acceptance.
- Windows x64: Actions builds on Windows and launches the packaged app if that job succeeds. Windows 10 and Windows 11 physical desktop acceptance remains separate.
- Windows ARM64: cross-build from Windows x64; native ARM hardware execution is not claimed.
- Multi-monitor negative coordinates and DPI calculations have logic coverage. Physical monitor hot-plugging, mixed-DPI transitions, macOS Space changes and login-after-reboot must be checked on matching hardware.
- Signature/notarization, store distribution and end-user security prompts are not passed or bypassed by CI.

## Manual acceptance procedure

1. Install from the downloaded artifact, start offline, confirm the cat and a native tray icon.
2. Look behind every corner of the small pet window: no opaque rectangle, frame or shadow. Click an ordinary app through a transparent corner; that app must receive its click. Click the cat and verify the previous app keeps keyboard focus.
3. Drag the cat, including to a second monitor, release and observe a smooth state recovery. Verify right-click menu and nearby cursor follow. Move/stop the cursor and observe autonomous recovery.
4. Change language, themes, size, speed, name, skin, topmost, show/hide, sound and pause. Close preferences: the cat must remain alive. Recover from the tray.
5. Disconnect a monitor, change resolution/scaling and re-open the app with a previously out-of-range saved position. The cat must remain recoverable inside a work area.
6. Enable login startup from an installed copy, sign out and back in; disable it and verify no subsequent auto-start. Only the user enables this integration during acceptance.
7. Quit normally and inspect the process tree. Restart and verify the latest saved values. Confirm no app HTTP requests are needed.

Record the OS, CPU architecture, scaling, displays, exact artifact SHA256 and evidence for every claimed pass. Leave unexecuted items marked unverified.

## Repository migration, 2026-10-28

HoriPet is now maintained in [Toolbox/HoriPet](https://github.com/hhhoratioxu/Toolbox/tree/main/HoriPet). Original Actions evidence is preserved under `docs/evidence/release-preview.5/`; those reports remain historical 2026-10-19 acceptance and are not new hardware tests. See [migration provenance](MIGRATION.md) for the original commit history and unchanged release-asset digests.
